// config.js — mọi thông số giới hạn nằm ở đây.
import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 3939),

  // Khóa để web của bạn xác thực khi gọi service. BẮT BUỘC đổi.
  apiKey: process.env.API_KEY ?? "doi-khoa-nay-di",

  // Chỉ cho phép các IP này gọi. Rỗng = cho phép tất cả (chỉ dùng khi test).
  allowedIps: (process.env.ALLOWED_IPS ?? "").split(",").filter(Boolean),

  // --- Giới hạn để tài khoản không bị đánh dấu spam ---
  // Nghỉ giữa 2 tin nhắn (ms). Đừng hạ dưới 5000.
  minDelayMs: Number(process.env.MIN_DELAY_MS ?? 8000),
  maxDelayMs: Number(process.env.MAX_DELAY_MS ?? 15000),

  // Trần số tin mỗi ngày. Trung tâm ~100 phụ huynh thì 150 là dư.
  dailyLimit: Number(process.env.DAILY_LIMIT ?? 150),

  // Nghỉ dài sau mỗi lô, giống người nghỉ tay.
  batchSize: Number(process.env.BATCH_SIZE ?? 20),
  batchPauseMs: Number(process.env.BATCH_PAUSE_MS ?? 120000),

  // Không gửi ngoài giờ này (giờ VN). Gửi lúc 2h sáng vừa bất lịch sự vừa đáng ngờ.
  sendHourFrom: Number(process.env.SEND_HOUR_FROM ?? 7),
  sendHourTo: Number(process.env.SEND_HOUR_TO ?? 21),
};
