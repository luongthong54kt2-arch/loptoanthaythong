// [FRONTEND] app/api/zalo/route.js
// Proxy chạy trên server Vercel. API key nằm ở đây, KHÔNG bao giờ xuống browser.
// Đường dẫn backend truyền qua query param `p` (ví dụ ?p=send) để tránh phải dùng
// thư mục catch-all [...path] — tên thư mục có dấu ngoặc vuông làm hỏng bộ upload web của GitHub.
import { cookies } from "next/headers";
import { createHmac } from "node:crypto";

const BACKEND = process.env.BACKEND_URL;
const API_KEY = process.env.BACKEND_API_KEY;
const PASSWORD = process.env.APP_PASSWORD;

// Chỉ cho phép các đường dẫn backend đã biết. Chặn việc dùng proxy để gọi bừa.
const ALLOWED = new Set([
  "health",
  "resolve",
  "send",
  "send-bulk",
  "threads",
  "messages",
  "updates",
  "read",
  "job",
  "login/start",
  "login/state",
  "login/retry",
]);

function authorized() {
  const token = createHmac("sha256", PASSWORD ?? "chua-dat-mat-khau")
    .update("zalo-web")
    .digest("hex");
  return cookies().get("zw_auth")?.value === token;
}

async function forward(req) {
  if (!authorized()) {
    return Response.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  }
  if (!BACKEND || !API_KEY) {
    return Response.json(
      { ok: false, error: "Thiếu BACKEND_URL hoặc BACKEND_API_KEY trong biến môi trường" },
      { status: 500 },
    );
  }

  const incoming = new URL(req.url);
  const p = incoming.searchParams.get("p") ?? "";

  // Dạng "messages/123" → gốc là "messages"
  const root = p.split("/")[0];
  if (!ALLOWED.has(p) && !ALLOWED.has(root)) {
    return Response.json({ ok: false, error: `Đường dẫn không hợp lệ: ${p}` }, { status: 400 });
  }

  const url = new URL(`${BACKEND.replace(/\/$/, "")}/${p}`);
  for (const [k, v] of incoming.searchParams) {
    if (k !== "p") url.searchParams.set(k, v);
  }

  const init = {
    method: req.method,
    headers: { "x-api-key": API_KEY, "Content-Type": "application/json" },
    cache: "no-store",
  };
  if (req.method === "POST") init.body = await req.text();

  try {
    const res = await fetch(url, init);
    return new Response(await res.text(), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: `Không kết nối được máy chủ Zalo: ${err.message}` },
      { status: 502 },
    );
  }
}

export async function GET(req) {
  return forward(req);
}

export async function POST(req) {
  return forward(req);
}
