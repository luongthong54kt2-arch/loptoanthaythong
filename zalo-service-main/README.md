# zalo-service — cầu nối Zalo cho web quản lý trung tâm

Service HTTP đứng giữa web quản lý của bạn và Zalo. Web chỉ gọi REST API, không cần biết gì về `zca-js`.

```
Web trung tâm  ──HTTP──>  zalo-service (PM2)  ──>  Zalo
```

## Đọc phần này trước

Service dùng **tài khoản Zalo cá nhân** qua API không chính thức. Với mục đích kinh doanh (thông báo học phí cho phụ huynh), đây là **vi phạm điều khoản Zalo** và tài khoản có thể bị khóa vĩnh viễn — nghĩa là bạn mất kênh liên lạc với toàn bộ phụ huynh cùng lịch sử chat.

**Khuyến nghị chia đôi nghiệp vụ:**

| Việc | Nên dùng | Lý do |
|---|---|---|
| Thông báo học phí hàng tháng | **Zalo ZNS** (OA chính thức) | Có template duyệt sẵn, gửi tới SĐT bất kỳ, không cần kết bạn, không sợ khóa. ~vài trăm đến 1.000đ/tin |
| Thông báo chung (nghỉ lễ, đổi lịch) | Nhóm Zalo | Miễn phí, 1 tin cho cả nhóm |
| Chat qua lại thường ngày | Service này | Phụ huynh đã là bạn bè, tương tác tự nhiên |

Đăng ký OA: `oa.zalo.me` → tạo app: `developers.zalo.me`

**Tuyệt đối không gửi học phí vào nhóm chung.** Số tiền của từng gia đình là thông tin riêng — có em học thêm buổi, có em được giảm, có em đang nợ. Học phí, điểm số, nhận xét học sinh phải nhắn riêng.

## Cài đặt trên VPS

Yêu cầu Node.js 18+. Nên đặt VPS ở Việt Nam để IP không bị Zalo coi là bất thường.

```bash
npm install
cp .env.example .env
nano .env          # đổi API_KEY thành chuỗi random dài
```

Chạy service:

```bash
npm i -g pm2
pm2 start server.js --name zalo-service
pm2 save && pm2 startup
```

Service chỉ listen trên `127.0.0.1`. Nếu web ở máy khác, đưa qua Nginx có HTTPS — **đừng mở port này ra internet trần.**

## API

Mọi request cần header `x-api-key: <API_KEY trong .env>`

### `GET /health`
```json
{ "ok": true, "zalo": "ready", "quotaLeft": 143, "queueDepth": 0 }
```

### `POST /resolve` — tra userId từ số điện thoại
```json
{ "phone": "0985692879" }
```

### `POST /send` — gửi 1 tin
```json
{ "phone": "0985692879", "message": "Chào anh/chị..." }
```

### `POST /send-bulk` — gửi hàng loạt, nội dung riêng từng người
```json
{
  "items": [
    { "phone": "0985692879", "message": "Học phí tháng 8 của em An: 1.200.000đ" },
    { "phone": "0912345678", "message": "Học phí tháng 8 của em Bình: 900.000đ" }
  ]
}
```
Trả về `jobId` ngay, gửi chạy nền. Theo dõi qua `GET /job/:jobId`.

### `GET /job/:jobId` — tiến độ
```json
{ "ok": true, "total": 50, "sent": 12, "failed": 1, "status": "running", "results": [...] }
```

## Gọi từ web của bạn

**PHP / Laravel**

```php
$res = Http::withHeaders(['x-api-key' => env('ZALO_API_KEY')])
    ->post('http://127.0.0.1:3939/send-bulk', [
        'items' => $hocSinh->map(fn($hs) => [
            'phone'   => $hs->sdt_phu_huynh,
            'message' => "Kính gửi phụ huynh em {$hs->ten},\n\n"
                       . "Học phí tháng {$thang}: "
                       . number_format($hs->hoc_phi) . "đ\n"
                       . "Vui lòng thanh toán trước ngày 10.\n\n"
                       . "Trung tâm xin cảm ơn.",
        ])->values()->all(),
    ]);

$jobId = $res->json('jobId');
```

**Node / Express**

```js
const res = await fetch("http://127.0.0.1:3939/send-bulk", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-api-key": process.env.ZALO_API_KEY },
  body: JSON.stringify({ items }),
});
const { jobId } = await res.json();
```

## Các lớp bảo vệ đã có sẵn

Tất cả cấu hình trong `.env`:

- **Delay 8–15 giây ngẫu nhiên** giữa mỗi tin. Đừng hạ dưới 5 giây.
- **Trần 150 tin/ngày**, đếm theo giờ VN, lưu ra file nên restart không mất.
- **Nghỉ 2 phút sau mỗi 20 tin**, giống người nghỉ tay.
- **Chỉ gửi 7h–21h**. Ngoài giờ thì queue tự ngủ, sáng gửi tiếp. Gửi lúc 2h sáng vừa bất lịch sự vừa đáng ngờ.
- **Tự kết nối lại** mỗi 5 phút nếu session rớt.
- **Log mọi lần gửi** ra `send-log.jsonl` để đối chiếu khi phụ huynh nói không nhận được.

Với 100 phụ huynh, một đợt gửi học phí mất khoảng 25–30 phút. Đừng cố rút ngắn.

## Bảo trì

- `session.json` là **mật khẩu tài khoản dạng file**. Đặt quyền `chmod 600`, không commit, không backup lên cloud công khai.
- Cookie hết hạn sau vài tuần đến vài tháng. `GET /health` trả `zalo: "expired"` là lúc cần chạy lại `npm run login`.
- **Đừng mở Zalo Web trên trình duyệt** khi service đang chạy — Zalo chỉ cho một web session mỗi tài khoản, mở là service bị đá ra.
- Version `zca-js` được ghim cứng. Đừng `npm audit fix --force`.

## Deploy lên Render

### Đăng nhập Zalo — không cần máy cá nhân

Bạn quét QR **ngay trên trình duyệt** qua trang `/ket-noi` của frontend. Server tạo mã QR, gửi ảnh về trình duyệt, bạn quét bằng app Zalo.

Cách này tốt hơn việc đăng nhập ở máy nhà rồi mang session lên server: session được sinh ra và sử dụng từ **cùng một IP**, nên Zalo không thấy session "nhảy" quốc gia — đúng cái dấu hiệu mà Zalo dùng để nhận diện tài khoản bị chiếm.

Sau khi quét xong, trang `/ket-noi` hiện một chuỗi base64. Copy và dán vào biến `ZALO_SESSION` trên Render để lần deploy sau tự kết nối, không phải quét lại.

Nếu bạn thích làm ở máy local (ví dụ chạy trên VPS không có frontend), vẫn dùng được:

```bash
npm run login          # quét QR trên máy
npm run session-env    # tạo session.base64.txt
```

### Cấu hình trên Render

1. Push code lên GitHub (`.gitignore` đã loại `session.json` và `.env`)
2. Render Dashboard → New → Web Service → chọn repo
3. Cấu hình:
   - **Region: Singapore** (gần VN nhất, ít bị Zalo coi là bất thường)
   - **Plan: Starter $7/tháng** — KHÔNG dùng Free
   - Build: `npm install`
   - Start: `node server.js`
4. Environment → thêm biến:
   - `API_KEY` = chuỗi random dài do bạn tự tạo (không phải key của Zalo)
   - `ZALO_SESSION` = để trống lúc đầu; điền sau khi quét QR ở `/ket-noi`

Hoặc dùng file `render.yaml` có sẵn (Render tự đọc cấu hình).

### Tại sao không dùng Free tier

Free tier tự ngủ sau 15 phút không có request. Tiến trình chết là session Zalo mất; mỗi lần thức lại phải login lại, và Zalo sẽ thấy hàng loạt lần đăng nhập bất thường từ IP nước ngoài → khóa tài khoản rất nhanh.

### Rủi ro IP nước ngoài

Đây là hạn chế thật của Render, không phải lỗi code. Session được tạo ở Việt Nam nhưng dùng từ IP Singapore — Zalo coi đây là dấu hiệu chiếm tài khoản. Thực tế: session có thể bị vô hiệu sau vài ngày đến vài tuần, phải quét QR lại.

**VPS Việt Nam ổn định hơn đáng kể** cho việc này (Viettel IDC, VNPT, BizFly, ~5–7$/tháng), và có ổ đĩa thật để giữ `session.json`.

### Khi session hết hạn

`GET /health` trả về `zalo: "expired"`, và trang sổ liên lạc hiện nút "Kết nối lại Zalo".

Mở `/ket-noi` → Tạo mã QR → quét → copy chuỗi mới → cập nhật `ZALO_SESSION` trên Render. Mất khoảng một phút, làm được từ điện thoại.

Nên đặt lịch kiểm tra `/health` hàng ngày (dùng cron-job.org miễn phí) để biết ngay khi session chết, thay vì phát hiện lúc cần gửi thông báo gấp.

### Lưu ý về giới hạn ngày trên Render

Bộ đếm `daily-counter.json` nằm trên ổ đĩa ephemeral, nên **restart là reset về 0**. Với nhu cầu chat qua lại từng phụ huynh thì không đáng lo. Nếu bạn gửi hàng loạt thường xuyên, nên gắn Render Persistent Disk hoặc chuyển bộ đếm sang database của web quản lý.

## Chiều nhận tin (2 chiều)

Backend tự bật listener ngay sau khi kết nối Zalo. Mọi tin phụ huynh gửi tới được ghi vào `store.js` và lộ ra qua các endpoint sau — frontend `zalo-web` poll chúng mỗi 3 giây.

| Endpoint | Việc |
|---|---|
| `GET /threads` | Danh sách hội thoại, kèm số tin chưa đọc |
| `GET /messages/:threadId` | Toàn bộ tin của một hội thoại |
| `GET /updates?since=<ISO>` | Mọi tin mới hơn mốc thời gian — dùng cho polling |
| `POST /read/:threadId` | Đánh dấu đã đọc |

Tin nhắn ghi ra `messages.jsonl` và được nạp lại khi khởi động, nên restart không mất lịch sử.

**Chỉ hỗ trợ tin văn bản.** Ảnh, file, sticker được ghi nhãn `[đính kèm]` — bạn biết có gửi kèm nhưng phải mở Zalo để xem.

**Lưu ý về ổ đĩa Render:** `messages.jsonl` nằm trên ổ đĩa ephemeral nên **mất khi deploy lại**. Với nhu cầu trao đổi hàng ngày thì chấp nhận được, nhưng nếu cần giữ lịch sử lâu dài (đối chiếu khi có tranh chấp về học phí), hãy gắn Render Persistent Disk, hoặc sửa `store.js` để ghi vào database của trang quản lý trung tâm.

**Quan trọng:** Zalo chỉ cho **một web session mỗi tài khoản**. Khi listener đang chạy, bạn mở Zalo Web trên trình duyệt là listener bị dừng ngay và không nhận được tin nữa. Nhân viên trung tâm phải dùng **app điện thoại**, không dùng Zalo Web.

## Gửi ảnh và file đính kèm

### `POST /send-file`

```json
{
  "phone": "0985692879",
  "message": "Phiếu học phí tháng 8 của em An",
  "files": [
    { "filename": "hoc-phi-thang-8.pdf", "url": "https://storage.../hoc-phi.pdf" },
    { "filename": "bang-diem.jpg", "base64": "..." }
  ]
}
```

`message` trở thành chú thích dưới ảnh hoặc kèm tên file. Tối đa 5 file mỗi tin.

### Chọn `url` hay `base64`

| | `base64` | `url` |
|---|---|---|
| Dung lượng tối đa | ~3MB (qua proxy Vercel) | 20MB, đổi bằng `MAX_FILE_MB` |
| Cách hoạt động | Gửi thẳng trong JSON | Backend tự tải file về |
| Dùng khi | Ảnh chụp nhỏ, file text | PDF học phí, ảnh chất lượng cao |

**Vercel giới hạn body request 4.5MB**, và base64 làm phình dữ liệu thêm 33%. Với file lớn hơn khoảng 3MB, hãy tải lên Firebase Storage trước rồi truyền `url` — backend tải trực tiếp, không đi qua Vercel nên không bị giới hạn.

Nếu dùng `url`, có thể bỏ `filename` và backend tự lấy tên từ đường dẫn. Nhưng nên đặt tên rõ ràng, vì đó là tên phụ huynh nhìn thấy.

### Định dạng

Ảnh (`jpg`, `jpeg`, `png`, `webp`, `gif`) được gửi dưới dạng ảnh xem trước được. Mọi loại khác (`pdf`, `docx`, `xlsx`…) gửi dưới dạng tệp. Zalo tự chặn một số đuôi nguy hiểm như `exe` và sẽ báo lỗi rõ.

Với ảnh, backend đọc kích thước bằng `image-size` để Zalo dựng khung xem trước đúng tỉ lệ. File đặt đuôi ảnh nhưng nội dung không phải ảnh sẽ bị chặn kèm thông báo.

### Đi qua queue giống tin văn bản

`/send-file` cũng chịu delay 8–15 giây, trần quota ngày và khung giờ 7h–21h. File tính là một tin nhắn trong quota.

## Dùng Google Drive thay cho Firebase Storage

Firebase Spark không còn Storage (Google bắt buộc Blaze từ cuối 2024). Dùng Apps Script + Drive thay thế, miễn phí hoàn toàn.

File `apps-script-drive.gs` là Web App làm chỗ lưu file. Xem hướng dẫn cài đặt trong chính file đó.

### Luồng hoạt động

```
Web quản lý ──POST──> Apps Script ──> Drive
                          │
                          └─> trả về fetchUrl
                                  │
Web quản lý ──/send-file {url: fetchUrl}──> zalo-service ──> tải file ──> Zalo
```

### Cái bẫy quan trọng nhất

**Link chia sẻ Drive không phải link tải file.** `drive.google.com/file/d/ID/view` trả về một trang HTML. Nếu truyền thẳng vào `/send-file`, backend sẽ tải HTML đó về, đặt tên `hoc-phi.pdf` và gửi cho phụ huynh một file mở không được — **không có lỗi nào báo**, vì việc tải vẫn thành công về mặt kỹ thuật.

Backend đã xử lý hai lớp:

1. **Tự chuyển đổi** link Drive dạng `/file/d/<id>/view`, `open?id=`, `uc?id=` sang link tải trực tiếp
2. **Chặn HTML** — nếu phản hồi vẫn là HTML, báo lỗi rõ ràng thay vì gửi file hỏng

Nhưng cách chắc chắn nhất vẫn là dùng `fetchUrl` của Apps Script, vì nó trả JSON base64 và không phụ thuộc chế độ chia sẻ của Drive.

### Giới hạn dung lượng theo từng chặng

| Chặng | Trần | Ghi chú |
|---|---|---|
| Apps Script Web App | ~7MB | Trần phản hồi 10MB, base64 phình 33% |
| Proxy Vercel (base64) | ~3MB | Body request 4.5MB |
| Backend tải qua `url` | 20MB | Đổi bằng `MAX_FILE_MB` |
| Zalo | Zalo tự quy định | Thư viện tự báo lỗi nếu vượt |

Với phiếu học phí PDF (thường dưới 500KB) thì mọi đường đều thoải mái.

### Bảo mật

Apps Script Web App phải đặt "Who has access: Anyone" để backend gọi được, nên **bảo mật dựa hoàn toàn vào TOKEN**. Hai lớp bảo vệ đã có:

- So sánh token theo kiểu không phụ thuộc thời gian
- `doGet` chỉ đọc được file **nằm trong FOLDER_ID đã cấu hình** — token bị lộ cũng không đọc được toàn bộ Drive của bạn

Đặt TOKEN dài, và đừng để `fetchUrl` lọt vào log công khai vì nó chứa token.

### Dọn file cũ

Hàm `cleanupOldFiles` xóa file cũ hơn 90 ngày. Vào Apps Script → Triggers → thêm trigger chạy hàng tuần, nếu không Drive sẽ phình dần theo từng tháng gửi học phí.
