// [BACKEND] web-login.js — đăng nhập Zalo bằng QR ngay trên web, không cần máy cá nhân.
// Ưu điểm: session sinh ra và được dùng từ cùng một IP (server), Zalo ít coi là bất thường.
import { Zalo, LoginQRCallbackEventType } from "zca-js";
import fs from "node:fs";
import { connect, setSessionOverride } from "./zalo.js";

// phase: idle | waiting_scan | scanned | done | expired | declined | error
let state = {
  phase: "idle",
  qrImage: null,   // base64 PNG
  name: null,
  error: null,
  sessionB64: null,
  startedAt: null,
};

let actions = null;
let inFlight = false;

export function getLoginState() {
  return {
    phase: state.phase,
    qrImage: state.qrImage,
    name: state.name,
    error: state.error,
    sessionB64: state.sessionB64,
    startedAt: state.startedAt,
  };
}

export function retryQr() {
  if (actions?.retry) {
    actions.retry();
    return true;
  }
  return false;
}

export async function startWebLogin() {
  if (inFlight) return { ok: false, error: "Đang có một phiên đăng nhập chạy. Đợi hoặc tải lại trang." };

  inFlight = true;
  state = { phase: "waiting_scan", qrImage: null, name: null, error: null, sessionB64: null, startedAt: new Date().toISOString() };

  const zalo = new Zalo({ selfListen: false, checkUpdate: false, logging: false });

  // Không await — trả về ngay để client bắt đầu poll lấy ảnh QR.
  zalo
    .loginQR({}, (event) => {
      actions = event.actions;

      switch (event.type) {
        case LoginQRCallbackEventType.QRCodeGenerated:
          state.phase = "waiting_scan";
          state.qrImage = event.data.image; // base64 PNG, đã bỏ tiền tố data:
          console.log("[web-login] Đã tạo QR, chờ quét");
          break;

        case LoginQRCallbackEventType.QRCodeScanned:
          state.phase = "scanned";
          state.name = event.data.display_name;
          console.log(`[web-login] Đã quét: ${event.data.display_name}`);
          break;

        case LoginQRCallbackEventType.QRCodeExpired:
          state.phase = "expired";
          state.qrImage = null;
          console.log("[web-login] QR hết hạn");
          break;

        case LoginQRCallbackEventType.QRCodeDeclined:
          state.phase = "declined";
          state.qrImage = null;
          console.log("[web-login] Bị từ chối trên điện thoại");
          break;

        case LoginQRCallbackEventType.GotLoginInfo: {
          const session = {
            cookie: event.data.cookie,
            imei: event.data.imei,
            userAgent: event.data.userAgent,
            savedAt: new Date().toISOString(),
          };

          const raw = JSON.stringify(session, null, 2);
          state.sessionB64 = Buffer.from(raw).toString("base64");
          state.phase = "done";
          state.qrImage = null;

          // Dùng được ngay trong tiến trình này.
          setSessionOverride(session);

          // Ghi ra file cho VPS có ổ đĩa thật. Trên Render sẽ mất khi deploy lại,
          // nên vẫn cần dán sessionB64 vào biến ZALO_SESSION.
          try {
            fs.writeFileSync("session.json", raw);
          } catch (err) {
            console.warn("[web-login] Không ghi được session.json:", err.message);
          }

          console.log("[web-login] Đăng nhập xong");
          break;
        }
      }
    })
    .then(async () => {
      // Kết nối lại instance chính + bật listener với session mới.
      try {
        await connect();
      } catch (err) {
        state.error = err.message;
      }
      inFlight = false;
    })
    .catch((err) => {
      if (state.phase !== "done") {
        state.phase = "error";
        state.error = err.message;
      }
      inFlight = false;
      console.error("[web-login] Thất bại:", err.message);
    });

  return { ok: true };
}
