// login.js — chạy MỘT LẦN để lấy session. Dùng cho zca-js 2.1.x.
// Chạy: npm run login
import { Zalo, LoginQRCallbackEventType } from "zca-js";
import { spawn } from "node:child_process";
import fs from "node:fs";

const QR_FILE = "qr.png";

// Mở file ảnh bằng app xem ảnh mặc định của hệ điều hành.
function openImage(path) {
  try {
    if (process.platform === "win32") spawn("cmd", ["/c", "start", "", path], { detached: true });
    else if (process.platform === "darwin") spawn("open", [path], { detached: true });
    else spawn("xdg-open", [path], { detached: true });
  } catch {
    console.log(`(Không mở được tự động — bạn tự mở file ${path} nhé)`);
  }
}

const zalo = new Zalo({ checkUpdate: false, logging: true });

// Session được bắt ngay tại event GotLoginInfo, không chờ đến cuối.
let session = null;

function saveSession(data) {
  session = {
    cookie: data.cookie,
    imei: data.imei,
    userAgent: data.userAgent,
    savedAt: new Date().toISOString(),
  };
  fs.writeFileSync("session.json", JSON.stringify(session, null, 2));
  console.log("\n✓ Đã lưu session.json — GIỮ BÍ MẬT, file này tương đương mật khẩu.");
}

let expiredCount = 0;

try {
  const api = await zalo.loginQR({ qrPath: QR_FILE }, async (event) => {
    switch (event.type) {
      case LoginQRCallbackEventType.QRCodeGenerated: {
        // QUAN TRỌNG: có callback thì phải tự gọi saveToFile, thư viện không tự ghi.
        await event.actions.saveToFile(QR_FILE);
        console.log(`\n[1/3] Đã tạo mã QR → ${QR_FILE}`);
        console.log("      Mở Zalo trên điện thoại → Thêm → icon QR → quét màn hình.");
        console.log("      Mã chỉ sống khoảng 1 phút, quét NGAY nhé.\n");
        openImage(QR_FILE);
        break;
      }

      case LoginQRCallbackEventType.QRCodeScanned: {
        console.log(`[2/3] Đã quét: ${event.data.display_name}`);
        console.log("      Bấm Đồng ý trên điện thoại để hoàn tất.");
        break;
      }

      case LoginQRCallbackEventType.QRCodeExpired: {
        expiredCount++;
        if (expiredCount > 3) {
          console.log("\nQR hết hạn 3 lần liên tiếp. Dừng lại, chạy lại script khi bạn sẵn sàng.");
          event.actions.abort();
          break;
        }
        console.log(`\n⏱  QR hết hạn (lần ${expiredCount}). Đang tạo mã mới...`);
        event.actions.retry();
        break;
      }

      case LoginQRCallbackEventType.QRCodeDeclined: {
        console.log("\n✗ Bạn đã từ chối đăng nhập trên điện thoại.");
        event.actions.abort();
        break;
      }

      case LoginQRCallbackEventType.GotLoginInfo: {
        console.log("[3/3] Đăng nhập thành công.");
        saveSession(event.data);
        break;
      }
    }
  });

  fs.rmSync(QR_FILE, { force: true });

  const me = await api.fetchAccountInfo();
  console.log(`\nTài khoản: ${me?.profile?.displayName ?? api.getOwnId()}`);
  console.log("Xong. Giờ chạy: npm run list");
  process.exit(0);
} catch (err) {
  fs.rmSync(QR_FILE, { force: true });

  if (session) {
    // Session đã bắt được ở GotLoginInfo, lỗi chỉ xảy ra ở bước sau → vẫn dùng được.
    console.log("\nCó lỗi ở bước cuối nhưng session đã lưu. Thử chạy: npm run list");
    process.exit(0);
  }

  console.error(`\n✗ Đăng nhập thất bại: ${err.message}`);
  console.error("\nNguyên nhân thường gặp:");
  console.error("  • Quét QR quá muộn (mã chỉ sống ~1 phút) → chạy lại, chuẩn bị điện thoại trước.");
  console.error("  • Không bấm Đồng ý trên điện thoại.");
  console.error("  • Đang mở Zalo Web trên trình duyệt → đóng hết tab Zalo Web rồi thử lại.");
  console.error("  • zca-js chưa theo kịp thay đổi của Zalo → thử: npm i zca-js@latest");
  process.exit(1);
}
