// zalo.js — giữ một instance Zalo sống suốt đời tiến trình.
// Đọc session từ biến môi trường ZALO_SESSION (cho Render/Heroku — ổ đĩa ephemeral),
// nếu không có thì đọc từ file session.json (cho VPS thường).
import { Zalo, ThreadType } from "zca-js";
import fs from "node:fs";
import { record } from "./store.js";
import { prepare, describe } from "./attachments.js";

const SESSION_FILE = "session.json";

let api = null;
let status = "disconnected"; // disconnected | connecting | ready | expired
let lastError = null;
let connectedAt = null;

export function getStatus() {
  return { status, lastError, connectedAt, ownId: api?.getOwnId() ?? null };
}

// Session vừa lấy được qua đăng nhập web — ưu tiên cao nhất, dùng ngay không cần restart.
let sessionOverride = null;

export function setSessionOverride(session) {
  sessionOverride = session;
}

function loadSession() {
  if (sessionOverride) {
    console.log("[zalo] Dùng session vừa đăng nhập qua web");
    return sessionOverride;
  }

  // Ưu tiên biến môi trường — bắt buộc trên Render vì filesystem bị xóa mỗi lần deploy.
  if (process.env.ZALO_SESSION) {
    try {
      const json = Buffer.from(process.env.ZALO_SESSION, "base64").toString("utf8");
      console.log("[zalo] Đọc session từ biến môi trường ZALO_SESSION");
      return JSON.parse(json);
    } catch (err) {
      throw new Error(`ZALO_SESSION không đọc được (sai base64 hoặc JSON lỗi): ${err.message}`);
    }
  }

  if (fs.existsSync(SESSION_FILE)) {
    console.log("[zalo] Đọc session từ file session.json");
    return JSON.parse(fs.readFileSync(SESSION_FILE, "utf8"));
  }

  throw new Error(
    "Không có session. Đặt biến ZALO_SESSION, hoặc chạy `npm run login` để tạo session.json.",
  );
}

export async function connect() {
  status = "connecting";
  lastError = null;

  try {
    const { cookie, imei, userAgent } = loadSession();
    const zalo = new Zalo({ selfListen: false, checkUpdate: false, logging: false });

    api = await zalo.login({ cookie, imei, userAgent });
    status = "ready";
    connectedAt = new Date().toISOString();
    console.log(`[zalo] Đã kết nối, ownId=${api.getOwnId()}`);

    listening = false;
    startListener();

    return api;
  } catch (err) {
    status = "expired";
    lastError = err.message;
    api = null;
    console.error(`[zalo] Kết nối thất bại: ${err.message}`);
    throw err;
  }
}

export function getApi() {
  if (!api || status !== "ready") {
    throw new Error(`Zalo chưa sẵn sàng (status=${status}${lastError ? `: ${lastError}` : ""})`);
  }
  return api;
}

// Tra userId từ số điện thoại, có cache để không gọi API lặp lại.
const phoneCache = new Map();

export async function resolvePhone(phone) {
  const clean = String(phone).replace(/[\s.\-()]/g, "");
  if (phoneCache.has(clean)) return phoneCache.get(clean);

  const user = await getApi().findUser(clean);
  if (!user?.uid) throw new Error(`Không tìm thấy số ${clean}`);

  phoneCache.set(clean, user.uid);

  // Tra số đã trả về cả tên — cache luôn để không phải gọi thêm.
  const n = user.display_name || user.zalo_name;
  if (n) nameCache.set(user.uid, n);

  return user.uid;
}

// --- Lấy tên hiển thị của người dùng hoặc nhóm ---
const nameCache = new Map();

export async function resolveName(threadId, isGroup = false) {
  if (nameCache.has(threadId)) return nameCache.get(threadId);

  try {
    if (isGroup) {
      const info = await getApi().getGroupInfo(threadId);
      const g = info?.gridInfoMap?.[threadId];
      if (g?.name) {
        nameCache.set(threadId, g.name);
        return g.name;
      }
    } else {
      const info = await getApi().getUserInfo(threadId);
      const profiles = info?.changed_profiles ?? {};
      const p = profiles[threadId] ?? Object.values(profiles)[0];
      const n = p?.displayName || p?.zaloName;
      if (n) {
        nameCache.set(threadId, n);
        return n;
      }
    }
  } catch (err) {
    console.warn(`[zalo] Không lấy được tên của ${threadId}: ${err.message}`);
  }

  return null;
}

export async function sendText({ userId, phone, message, isGroup = false, name }) {
  const threadId = userId ?? (await resolvePhone(phone));
  const label = name ?? (await resolveName(threadId, isGroup)) ?? phone ?? threadId;

  await getApi().sendMessage(
    { msg: message },
    threadId,
    isGroup ? ThreadType.Group : ThreadType.User,
  );

  // Ghi vào store để UI thấy tin mình vừa gửi.
  record({
    threadId,
    name: label,
    type: isGroup ? "group" : "user",
    from: "me",
    text: message,
  });

  return threadId;
}

// --- Gửi kèm file: ảnh, PDF, tài liệu ---
export async function sendFiles({ userId, phone, files, message = "", isGroup = false, name }) {
  const threadId = userId ?? (await resolvePhone(phone));
  const label = name ?? (await resolveName(threadId, isGroup)) ?? phone ?? threadId;

  const { sources, names } = await prepare(files);

  await getApi().sendMessage(
    // msg đi kèm file trở thành chú thích dưới ảnh / tên file.
    { msg: message ?? "", attachments: sources },
    threadId,
    isGroup ? ThreadType.Group : ThreadType.User,
  );

  record({
    threadId,
    name: label,
    type: isGroup ? "group" : "user",
    from: "me",
    text: describe(names, message),
  });

  return { threadId, files: names };
}

// --- Nhận tin nhắn đến (chiều ngược) ---
let listening = false;

export function startListener() {
  if (listening) return;

  const a = getApi();

  a.listener.on("message", (message) => {
    const content = message.data?.content;
    if (message.isSelf) return;

    // Chỉ xử lý tin văn bản. Ảnh/file/sticker ghi nhãn để nhân viên biết có gửi kèm.
    const text =
      typeof content === "string"
        ? content
        : `[${message.data?.msgType ?? "đính kèm"}]`;

    record({
      threadId: message.threadId,
      name: message.data?.dName,
      type: message.type === ThreadType.Group ? "group" : "user",
      from: "them",
      text,
    });

    console.log(`[nhận] ${message.data?.dName ?? message.threadId}: ${text.slice(0, 60)}`);
  });

  a.listener.on("error", (err) => {
    console.error("[listener] Lỗi:", err?.message ?? err);
    status = "expired"; // để health loop kết nối lại
  });

  a.listener.start();
  listening = true;
  console.log("[listener] Đang lắng nghe tin nhắn đến");
}

// Tự kết nối lại mỗi 5 phút nếu bị rớt.
export function startHealthLoop() {
  setInterval(async () => {
    if (status === "expired" || status === "disconnected") {
      console.log("[zalo] Thử kết nối lại...");
      try { await connect(); } catch { /* đã log ở trên */ }
    }
  }, 5 * 60 * 1000);
}
