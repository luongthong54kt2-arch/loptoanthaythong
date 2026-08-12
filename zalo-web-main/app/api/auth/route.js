// [FRONTEND] app/api/auth/route.js — cổng mật khẩu cho nhân viên trung tâm.
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const PASSWORD = process.env.APP_PASSWORD;

function token() {
  return createHmac("sha256", PASSWORD ?? "chua-dat-mat-khau").update("zalo-web").digest("hex");
}

function samePassword(input) {
  if (!PASSWORD || !input) return false;
  const a = Buffer.from(String(input));
  const b = Buffer.from(PASSWORD);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));

  if (!PASSWORD) {
    return Response.json(
      { ok: false, error: "Chưa đặt APP_PASSWORD trên máy chủ" },
      { status: 500 },
    );
  }

  if (!samePassword(password)) {
    return Response.json({ ok: false, error: "Mật khẩu không đúng" }, { status: 401 });
  }

  cookies().set("zw_auth", token(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return Response.json({ ok: true });
}

export async function GET() {
  const ok = cookies().get("zw_auth")?.value === token();
  return Response.json({ ok });
}

export async function DELETE() {
  cookies().delete("zw_auth");
  return Response.json({ ok: true });
}
