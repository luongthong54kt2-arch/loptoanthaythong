// session-to-env.js — chuyển session.json thành chuỗi base64 để dán vào biến môi trường Render.
// Chạy trên máy local sau khi `npm run login`:  node session-to-env.js
import fs from "node:fs";

if (!fs.existsSync("session.json")) {
  console.error("Không thấy session.json. Chạy `npm run login` trước.");
  process.exit(1);
}

const raw = fs.readFileSync("session.json", "utf8");
const b64 = Buffer.from(raw).toString("base64");

fs.writeFileSync("session.base64.txt", b64);

console.log(`\nĐã ghi ra session.base64.txt (${b64.length} ký tự).`);
console.log("\nCác bước tiếp theo:");
console.log("  1. Mở session.base64.txt, copy toàn bộ nội dung");
console.log("  2. Render Dashboard → service của bạn → Environment");
console.log("  3. Add Environment Variable:");
console.log("       Key   = ZALO_SESSION");
console.log("       Value = (dán chuỗi vừa copy)");
console.log("  4. Save → Render tự deploy lại\n");
console.log("XÓA session.base64.txt sau khi dán xong. Chuỗi này tương đương mật khẩu tài khoản.");
