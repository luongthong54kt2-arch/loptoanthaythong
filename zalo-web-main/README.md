# zalo-web — giao diện sổ liên lạc (deploy trên Vercel)

Trang web để nhân viên trung tâm nhắn tin qua lại với phụ huynh. Đây là **frontend**; nó không nói chuyện trực tiếp với Zalo mà gọi qua backend `zalo-service` chạy trên Render.

```
Trình duyệt ──> Vercel (trang này + proxy) ──> Render (zalo-service) ──> Zalo
```

## Vì sao phải có lớp proxy

API key của backend nằm trong Vercel Serverless Function (`app/api/zalo/route.js`), **không bao giờ được gửi xuống browser**. Nếu nhúng key vào code frontend, bất kỳ ai mở DevTools cũng đọc được và nhắn tin từ tài khoản Zalo của trung tâm. Browser chỉ gọi `/api/zalo?p=...` trên chính domain Vercel; proxy mới gắn key và chuyển tiếp sang Render. Proxy có danh sách đường dẫn được phép, nên không thể dùng nó để gọi bừa vào backend.

## Cấu trúc file

| File | Vai trò |
|---|---|
| `app/page.jsx` | Toàn bộ giao diện chat, chạy trên browser |
| `app/layout.jsx` | Khung HTML, nạp font |
| `app/globals.css` | Toàn bộ style |
| `app/api/zalo/route.js` | **Chạy trên server Vercel.** Proxy sang Render, giữ API key |
| `app/api/auth/route.js` | **Chạy trên server Vercel.** Cổng mật khẩu, đặt cookie httpOnly |

## Deploy

1. Push thư mục này lên một repo GitHub riêng (tách khỏi backend)
2. Vercel → Add New → Project → chọn repo
3. Framework tự nhận là Next.js, không cần sửa gì
4. Settings → Environment Variables, thêm 3 biến:

| Biến | Giá trị |
|---|---|
| `BACKEND_URL` | `https://zalo-service-xxxx.onrender.com` (không có `/` ở cuối) |
| `BACKEND_API_KEY` | Đúng chuỗi `API_KEY` đã đặt trên Render |
| `APP_PASSWORD` | Mật khẩu để nhân viên mở trang |

5. Deploy

## Chạy thử ở máy

```bash
npm install
cp .env.example .env.local   # điền 3 biến ở trên
npm run dev                  # http://localhost:3000
```

## Cách hoạt động

**Nhận tin (chiều về):** trang gọi `GET /updates?since=...` mỗi 3 giây. Backend trả về mọi tin mới hơn mốc thời gian đó. Dùng polling thay vì WebSocket vì Vercel Serverless không giữ kết nối dài được — 3 giây là đủ nhanh cho trao đổi với phụ huynh, và bền hơn nhiều so với cố duy trì socket qua serverless.

**Gửi tin (chiều đi):** `POST /send` → backend đưa vào queue có delay → Zalo.

**Mở hội thoại mới:** nhập số điện thoại → `POST /resolve` tra `userId` → mở khung chat.

## Về mật khẩu

Cổng mật khẩu ở đây là **một mật khẩu dùng chung cho cả trung tâm**, lưu trong cookie httpOnly có HMAC. Đủ để chặn người ngoài vào nhắn tin, nhưng không phân biệt được ai trong trung tâm đã gửi tin nào.

Nếu cần biết nhân viên nào nhắn gì cho phụ huynh nào — và với thông tin học phí thì bạn sẽ cần — hãy thay bằng đăng nhập từng người, dùng chung hệ thống tài khoản của trang quản lý trung tâm hiện có.

## Giới hạn cần biết

- Chỉ hỗ trợ **tin nhắn văn bản**. Ảnh, file, sticker mà phụ huynh gửi sẽ hiện dưới dạng nhãn `[đính kèm]` — bạn biết có gửi kèm nhưng phải mở Zalo để xem.
- Lịch sử hội thoại lưu ở backend, không lưu ở đây. Xem phần ổ đĩa ephemeral trong README của `zalo-service`.
