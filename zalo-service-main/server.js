// server.js — HTTP API để web quản lý trung tâm gọi vào.
// Bản dùng cho Render: bind 0.0.0.0, lấy PORT từ môi trường.
import express from "express";
import { config } from "./config.js";
import { connect, getStatus, resolvePhone, resolveName, startHealthLoop } from "./zalo.js";
import { enqueue, getJob, quotaLeft, queueDepth } from "./queue.js";
import {
  listThreads, listMessages, changesSince, markRead, restore,
  setAlias, setZaloName, threadsMissingName,
} from "./store.js";
import { startWebLogin, getLoginState, retryQr } from "./web-login.js";

const app = express();
app.use(express.json({ limit: process.env.JSON_LIMIT ?? "30mb" }));
app.set("trust proxy", 1); // Render đứng sau proxy

// CORS — chỉ cần khi frontend gọi trực tiếp (dev local). Bản deploy đi qua proxy Vercel.
app.use((req, res, next) => {
  const origin = process.env.FRONTEND_ORIGIN;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
  }
  next();
});

// --- Xác thực ---
app.use((req, res, next) => {
  if (req.path === "/health" || req.path === "/") return next();

  const key = req.get("x-api-key");
  if (key !== config.apiKey) {
    console.warn(`[auth] Từ chối ${req.ip} → ${req.path}`);
    return res.status(401).json({ ok: false, error: "Sai API key" });
  }

  if (config.allowedIps.length) {
    const ip = (req.get("x-forwarded-for") ?? req.ip).split(",")[0].trim();
    if (!config.allowedIps.includes(ip)) {
      return res.status(403).json({ ok: false, error: `IP ${ip} không được phép` });
    }
  }

  next();
});

// --- Trang gốc, để Render biết service còn sống ---
app.get("/", (_req, res) => res.send("zalo-service OK"));

// --- Kiểm tra tình trạng ---
app.get("/health", (_req, res) => {
  const z = getStatus();
  res.status(z.status === "ready" ? 200 : 503).json({
    ok: z.status === "ready",
    zalo: z.status,
    ownId: z.ownId,
    connectedAt: z.connectedAt,
    lastError: z.lastError,
    quotaLeft: quotaLeft(),
    queueDepth: queueDepth(),
  });
});

// --- Tra userId từ số điện thoại ---
app.post("/resolve", async (req, res) => {
  try {
    const userId = await resolvePhone(req.body.phone);
    res.json({ ok: true, userId });
  } catch (err) {
    res.status(404).json({ ok: false, error: err.message });
  }
});

// --- Gửi 1 tin (dùng cho chat qua lại từ web) ---
app.post("/send", async (req, res) => {
  const { phone, userId, message, isGroup } = req.body;

  if (!message) return res.status(400).json({ ok: false, error: "Thiếu message" });
  if (!phone && !userId) return res.status(400).json({ ok: false, error: "Thiếu phone hoặc userId" });
  if (quotaLeft() <= 0) return res.status(429).json({ ok: false, error: "Hết quota ngày" });

  const job = enqueue([{ phone, userId, message, isGroup: !!isGroup }]);
  res.json({ ok: true, jobId: job.jobId });
});

// --- Gửi kèm file: ảnh, PDF, tài liệu ---
// POST /send-file
// {
//   "phone": "0985692879",              (hoặc "userId")
//   "message": "Phiếu học phí tháng 8",  (tuỳ chọn, thành chú thích)
//   "files": [
//     { "filename": "hocphi.pdf", "url": "https://..." },
//     { "filename": "anh.jpg", "base64": "..." }
//   ]
// }
//
// Dùng "url" cho file lớn: proxy Vercel giới hạn body 4.5MB, base64 phình 33%
// nên chỉ gửi thẳng được file khoảng 3MB.
app.post("/send-file", (req, res) => {
  const { phone, userId, message, files, isGroup } = req.body;

  if (!phone && !userId) return res.status(400).json({ ok: false, error: "Thiếu phone hoặc userId" });
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ ok: false, error: "Thiếu danh sách files" });
  }
  if (quotaLeft() <= 0) return res.status(429).json({ ok: false, error: "Hết quota ngày" });

  const job = enqueue([{ phone, userId, message: message ?? "", files, isGroup: !!isGroup }]);
  res.json({ ok: true, jobId: job.jobId, note: "Gửi chạy nền. Theo dõi qua GET /job/:jobId" });
});

// --- Gửi hàng loạt, mỗi người một nội dung riêng ---
app.post("/send-bulk", (req, res) => {
  const items = req.body.items;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ ok: false, error: "items phải là mảng không rỗng" });
  }
  // Tin chỉ có file thì message được phép rỗng — ảnh tự nói thay lời.
  const badIndex = items.findIndex(
    (i) => (!i.phone && !i.userId) || (!i.message?.trim() && !i.files?.length),
  );
  if (badIndex >= 0) {
    return res.status(400).json({
      ok: false,
      error: `Dòng thứ ${badIndex + 1}: cần phone/userId, và message hoặc files`,
    });
  }
  if (items.length > quotaLeft()) {
    return res.status(429).json({
      ok: false,
      error: `Chỉ còn ${quotaLeft()} tin trong quota ngày, bạn gửi ${items.length}`,
    });
  }

  const job = enqueue(items);

  // Tin có file mất thêm thời gian upload, cộng thêm ước lượng cho sát thực tế.
  const withFiles = items.filter((i) => i.files?.length).length;
  const est = Math.round(
    (items.length * (config.minDelayMs + config.maxDelayMs) / 2 + withFiles * 5000) / 60000,
  );

  res.json({
    ok: true,
    jobId: job.jobId,
    total: job.total,
    estimatedMinutes: est,
    note: "Gửi chạy nền. Theo dõi qua GET /job/:jobId",
  });
});

// --- Đăng nhập Zalo bằng QR ngay trên web ---
app.post("/login/start", async (_req, res) => {
  const r = await startWebLogin();
  res.status(r.ok ? 200 : 409).json(r);
});

app.get("/login/state", (_req, res) => {
  res.json({ ok: true, ...getLoginState() });
});

app.post("/login/retry", (_req, res) => {
  res.json({ ok: retryQr() });
});

// Lấy tên Zalo cho các hội thoại còn đang hiện ID. Mỗi lượt tối đa 8 cái
// để không làm chậm request và không gọi Zalo dồn dập.
async function backfillNames() {
  if (getStatus().status !== "ready") return;

  for (const t of threadsMissingName().slice(0, 8)) {
    const name = await resolveName(t.threadId, t.type === "group");
    if (name) setZaloName(t.threadId, name);
  }
}

// --- Danh sách hội thoại ---
app.get("/threads", async (_req, res) => {
  await backfillNames().catch(() => {});
  res.json({ ok: true, threads: listThreads() });
});

// --- Tự đặt tên cho hội thoại ---
// POST /threads/:threadId/name  { "alias": "Mẹ em An - lớp 5A" }
// Gửi alias rỗng để xóa, quay về tên Zalo.
app.post("/threads/:threadId/name", (req, res) => {
  const ok = setAlias(req.params.threadId, req.body?.alias ?? "");
  if (!ok) return res.status(404).json({ ok: false, error: "Không thấy hội thoại" });
  res.json({ ok: true, threads: listThreads() });
});

// --- Tin nhắn của một hội thoại ---
app.get("/messages/:threadId", (req, res) => {
  const { threadId } = req.params;
  res.json({
    ok: true,
    threadId,
    messages: listMessages(threadId, req.query.since),
  });
});

// --- Polling: mọi tin mới hơn mốc `since` ---
// GET /updates?since=2026-07-30T10:00:00.000Z
app.get("/updates", async (req, res) => {
  await backfillNames().catch(() => {});
  res.json({
    ok: true,
    now: new Date().toISOString(),
    messages: changesSince(req.query.since),
    threads: listThreads(),
    zalo: getStatus().status,
  });
});

// --- Đánh dấu đã đọc ---
app.post("/read/:threadId", (req, res) => {
  markRead(req.params.threadId);
  res.json({ ok: true });
});

// --- Xem tiến độ ---
app.get("/job/:jobId", (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ ok: false, error: "Không thấy job" });
  res.json({ ok: true, ...job });
});

// --- Khởi động ---
// Quan trọng: listen TRƯỚC khi connect Zalo, để Render thấy port mở và không kill service.
const port = Number(process.env.PORT ?? config.port);

restore();

app.listen(port, "0.0.0.0", async () => {
  console.log(`[server] Đang chạy tại 0.0.0.0:${port}`);

  try {
    await connect();
  } catch {
    console.error("[server] Chưa đăng nhập được. Service vẫn chạy, sẽ tự thử lại mỗi 5 phút.");
  }

  startHealthLoop();
  console.log(`[server] Quota còn lại hôm nay: ${quotaLeft()}`);
});
