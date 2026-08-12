// [FRONTEND] app/ket-noi/page.jsx — quét QR để kết nối Zalo, không cần máy cá nhân.
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const api = (path, init) =>
  fetch(`/api/zalo?p=${path}`, { cache: "no-store", ...init }).then((r) => r.json());

const PHASES = {
  idle: "Chưa bắt đầu",
  waiting_scan: "Đang chờ bạn quét",
  scanned: "Đã quét — bấm Đồng ý trên điện thoại",
  done: "Đã kết nối",
  expired: "Mã đã hết hạn",
  declined: "Bạn đã từ chối trên điện thoại",
  error: "Không kết nối được",
};

export default function KetNoi() {
  const [state, setState] = useState({ phase: "idle" });
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  function poll() {
    api("login/state")
      .then((d) => d.ok && setState(d))
      .catch(() => {});
  }

  useEffect(() => {
    poll();
    timer.current = setInterval(poll, 2000);
    return () => clearInterval(timer.current);
  }, []);

  async function start() {
    setStarting(true);
    await api("login/start", { method: "POST" });
    setStarting(false);
    poll();
  }

  async function copySession() {
    await navigator.clipboard.writeText(state.sessionB64);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const label = PHASES[state.phase] ?? state.phase;

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "40px 24px" }}>
      <Link href="/" className="btn ghost" style={{ textDecoration: "none" }}>
        ← Về sổ liên lạc
      </Link>

      <h1 style={{ fontSize: 22, margin: "24px 0 4px" }}>Kết nối Zalo</h1>
      <p style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 0 }}>
        Quét mã bằng app Zalo trên điện thoại. Mã sống khoảng một phút.
      </p>

      <div className="status" style={{ marginBottom: 20 }}>
        <span className={`dot ${state.phase === "done" ? "on" : "off"}`} />
        {label}
        {state.name ? ` · ${state.name}` : ""}
      </div>

      {state.error && <div className="alert">{state.error}</div>}

      {/* Mã QR */}
      {state.qrImage && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--rule)",
            borderLeft: "3px solid var(--pen)",
            padding: 22,
            display: "grid",
            justifyItems: "center",
            gap: 12,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${state.qrImage}`}
            alt="Mã QR đăng nhập Zalo"
            width={260}
            height={260}
            style={{ imageRendering: "pixelated" }}
          />
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)", textAlign: "center" }}>
            Zalo → Thêm → icon QR ở góc trên → quét mã này
          </p>
        </div>
      )}

      {/* Nút bắt đầu / tạo lại */}
      {(state.phase === "idle" ||
        state.phase === "expired" ||
        state.phase === "declined" ||
        state.phase === "error") && (
        <button className="btn" onClick={start} disabled={starting} style={{ marginTop: 18 }}>
          {starting ? "Đang tạo mã…" : state.phase === "idle" ? "Tạo mã QR" : "Tạo mã mới"}
        </button>
      )}

      {/* Kết nối xong — đưa chuỗi session để dán vào Render */}
      {state.phase === "done" && (
        <div style={{ marginTop: 24 }}>
          <p style={{ fontSize: 14 }}>
            Zalo đã kết nối và bắt đầu nhận tin. Sổ liên lạc dùng được ngay.
          </p>

          <div
            style={{
              background: "var(--pen-wash)",
              borderLeft: "3px solid var(--pen)",
              padding: "14px 16px",
              fontSize: 13.5,
              lineHeight: 1.6,
            }}
          >
            <strong>Còn một bước nữa để không phải quét lại</strong>
            <p style={{ margin: "6px 0 0" }}>
              Render xóa dữ liệu mỗi lần deploy lại. Copy chuỗi dưới đây và dán vào biến
              môi trường <code>ZALO_SESSION</code> trên Render để lần khởi động sau tự kết nối.
            </p>
          </div>

          <textarea
            readOnly
            value={state.sessionB64 ?? ""}
            onClick={(e) => e.target.select()}
            style={{
              width: "100%",
              height: 110,
              marginTop: 12,
              padding: 10,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              border: "1px solid var(--rule)",
              background: "var(--paper)",
              resize: "vertical",
            }}
          />

          <button className="btn" onClick={copySession} style={{ marginTop: 8 }}>
            {copied ? "Đã copy" : "Copy chuỗi session"}
          </button>

          <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 14 }}>
            Chuỗi này tương đương mật khẩu tài khoản Zalo. Đừng gửi qua chat, đừng
            commit lên GitHub.
          </p>
        </div>
      )}
    </div>
  );
}
