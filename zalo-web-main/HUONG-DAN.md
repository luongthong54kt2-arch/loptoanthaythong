# Hướng dẫn triển khai chi tiết

Hai thứ hay gây rối nhất là `API_KEY` và `ZALO_SESSION`. Phần lớn tài liệu này nói về chúng.

---

## Phần 0 — Hiểu 3 chuỗi bí mật trước khi bắt đầu

Bạn sẽ gặp đúng 3 chuỗi. Nhầm lẫn giữa chúng là nguyên nhân gần như mọi lỗi khi cài đặt.

| Tên | Đặt ở đâu | Ai tạo ra | Dùng để làm gì |
|---|---|---|---|
| `API_KEY` | Render | **Bạn tự nghĩ ra** | Backend kiểm tra "ai đang gọi tôi" |
| `BACKEND_API_KEY` | Vercel | **Giống hệt `API_KEY` ở trên** | Frontend chứng minh mình là người được phép |
| `APP_PASSWORD` | Vercel | **Bạn tự chọn** | Mật khẩu nhân viên nhập để mở trang |
| `ZALO_SESSION` | Render | **Máy tạo ra** sau khi quét QR | Để server nhớ tài khoản Zalo, không phải quét lại |

**Không có cái nào phải xin phép Zalo hay đăng ký ở đâu.** Đây không phải Zalo OA API — không có app ID, không có app secret, không có access token.

---

## Phần 1 — API_KEY: tự tạo thế nào

### Tại sao cần

Backend trên Render có địa chỉ công khai, ví dụ `https://zalo-service-abc.onrender.com`. Nếu không có khóa, bất kỳ ai đoán được địa chỉ này đều gọi được `/send` và **nhắn tin từ tài khoản Zalo của trung tâm bạn**. `API_KEY` là cái chặn đó lại.

### Cách tạo

Chuỗi càng dài càng khó đoán. Tối thiểu 32 ký tự, chỉ dùng chữ, số, dấu gạch ngang và gạch dưới (tránh ký tự đặc biệt vì dễ lỗi khi dán vào biến môi trường).

**Cách 1 — PowerShell trên Windows** (nhấn Win, gõ "powershell", Enter):

```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 40 | % {[char]$_})
```

**Cách 2 — trình duyệt.** Nhấn F12 mở DevTools, tab Console, dán:

```javascript
Array.from(crypto.getRandomValues(new Uint8Array(30)), b => b.toString(36)).join('')
```

**Cách 3 — trên Render.** Khi thêm biến môi trường, Render có nút **Generate** tự sinh giá trị random. Nếu dùng cách này, nhớ bấm vào ô để xem và copy giá trị ra, vì bạn cần dán nó sang Vercel.

### Lưu ở đâu

Mở Notepad, dán chuỗi vào, lưu tạm. Bạn cần nó ở **hai chỗ**:

- Render → biến tên `API_KEY`
- Vercel → biến tên `BACKEND_API_KEY`

Hai tên biến khác nhau nhưng **giá trị phải giống hệt từng ký tự.** Đây là lỗi phổ biến nhất: dán thiếu một ký tự, hoặc copy kèm dấu cách ở đầu/cuối. Kết quả là frontend báo lỗi 401 "Sai API key".

Sau khi dán xong cả hai chỗ, xóa file Notepad đó.

---

## Phần 2 — ZALO_SESSION: máy tạo, bạn chỉ copy

### Nó là gì

Khi bạn quét QR, Zalo trả về một bộ gồm cookie đăng nhập, mã thiết bị (imei) và chuỗi nhận dạng trình duyệt (userAgent). Ba thứ này gộp lại rồi mã hóa base64 thành một chuỗi dài — đó là `ZALO_SESSION`.

**Đây là mật khẩu tài khoản Zalo của bạn ở dạng khác.** Ai có chuỗi này là đăng nhập được vào Zalo của bạn, đọc được mọi tin nhắn. Đừng gửi qua chat, đừng commit lên GitHub, đừng lưu vào Google Drive dùng chung.

### Tại sao cần dán vào Render

Render **xóa sạch ổ đĩa mỗi lần deploy hoặc restart**. Nếu chỉ quét QR mà không dán chuỗi vào biến môi trường, thì:

- Ngay lúc đó: dùng được bình thường
- Sau khi Render restart (tự động, thường vài ngày một lần): mất session, phải quét QR lại

Biến môi trường không bị xóa. Nên dán vào đó là để Render tự kết nối lại sau mỗi lần restart.

### Lấy chuỗi ở đâu

Sau khi deploy xong cả Render và Vercel:

1. Mở `https://<tên-app-của-bạn>.vercel.app/ket-noi`
2. Nhập `APP_PASSWORD`
3. Bấm **Tạo mã QR**
4. Mã QR hiện ra trên trang. Mở Zalo trên điện thoại → **Thêm** (góc dưới phải) → **icon QR** ở góc trên → quét mã trên màn hình
5. Bấm **Đồng ý** trên điện thoại
6. Trang hiện chuỗi base64 dài, kèm nút **Copy chuỗi session**

### Dán vào Render

1. Render Dashboard → chọn service `zalo-service`
2. Tab **Environment** → **Add Environment Variable**
3. Key: `ZALO_SESSION` — Value: dán chuỗi vừa copy
4. **Save Changes**

Render sẽ tự deploy lại. Đợi 1–2 phút, mở `https://<render-url>/health`, thấy `"zalo":"ready"` là xong.

### Chuỗi này rất dài

Khoảng 2.000–4.000 ký tự. Ô nhập của Render chứa được, nhưng **dễ copy sót** nếu bạn bôi đen bằng chuột. Dùng nút **Copy chuỗi session** trên trang `/ket-noi` để chắc chắn lấy đủ.

Dấu hiệu dán thiếu: `/health` trả về `zalo: "expired"` kèm `lastError` nói về base64 hoặc JSON lỗi.

---

## Phần 3 — Trình tự triển khai

Thứ tự này quan trọng, vì Vercel cần biết URL của Render.

### 3.1 Đưa code lên GitHub

Tạo **hai repo riêng biệt**. Đừng gộp — Vercel và Render sẽ tranh nhau build.

```
github.com/<tên-bạn>/zalo-service    ← nội dung file zalo-service.zip
github.com/<tên-bạn>/zalo-web        ← nội dung file zalo-web.zip
```

Cả hai repo nên đặt **Private**.

Cách đơn giản nếu bạn chưa quen Git: trên GitHub bấm **New repository** → tạo xong bấm **uploading an existing file** → kéo thả toàn bộ file trong thư mục đã giải nén.

Lưu ý khi kéo thả: giữ đúng cấu trúc thư mục của `zalo-web`. File `app/page.jsx` phải nằm trong thư mục `app`, không được nằm ngoài. Nếu GitHub web làm mất cấu trúc, dùng GitHub Desktop sẽ chắc hơn.

### 3.2 Deploy Render

1. `render.com` → **New** → **Web Service**
2. Connect repo `zalo-service`
3. Cấu hình:
   - **Region: Singapore** (gần Việt Nam nhất)
   - **Instance Type: Starter ($7/tháng)** — **không** dùng Free, xem lý do bên dưới
   - Build Command: `npm install`
   - Start Command: `node server.js`
4. **Environment Variables**, thêm:

   | Key | Value |
   |---|---|
   | `API_KEY` | chuỗi random bạn đã tạo ở Phần 1 |
   | `NODE_VERSION` | `22` |

   Chưa cần `ZALO_SESSION`.

5. **Create Web Service**, đợi build xong
6. Copy URL Render cấp cho bạn, dạng `https://zalo-service-abc.onrender.com`
7. Kiểm tra: mở `<url>/health` trên trình duyệt. Phải thấy JSON có `"zalo":"expired"` — đúng, vì chưa đăng nhập Zalo. Miễn là trang trả về JSON chứ không phải lỗi 404 hay 502 là backend đã chạy.

**Tại sao không dùng Free:** gói Free tự ngủ sau 15 phút không có request. Tiến trình chết là session Zalo mất và listener ngừng nhận tin. Mỗi lần thức lại phải đăng nhập lại — Zalo thấy hàng loạt lần đăng nhập bất thường từ IP nước ngoài và sẽ khóa tài khoản rất nhanh.

### 3.3 Deploy Vercel

1. `vercel.com` → **Add New** → **Project**
2. Import repo `zalo-web`. Vercel tự nhận Next.js, không cần sửa gì
3. Mở **Environment Variables**, thêm 3 biến:

   | Key | Value |
   |---|---|
   | `BACKEND_URL` | URL Render ở bước trên, **không có dấu `/` ở cuối** |
   | `BACKEND_API_KEY` | đúng chuỗi `API_KEY` đã đặt trên Render |
   | `APP_PASSWORD` | mật khẩu để nhân viên mở trang |

4. **Deploy**

### 3.4 Kết nối Zalo

Mở `https://<app>.vercel.app/ket-noi`, làm theo Phần 2 ở trên.

---

## Phần 4 — Kiểm tra hoạt động

1. Mở `https://<app>.vercel.app` → nhập `APP_PASSWORD`
2. Góc trên trái phải thấy chấm xanh "Đã kết nối Zalo"
3. Nhập số điện thoại của **chính bạn** vào ô bên trái → bấm **Mở**
4. Gửi thử một tin
5. Kiểm tra Zalo trên điện thoại xem có nhận được không
6. Trả lời từ điện thoại → trong 3 giây tin phải hiện trên web

Nếu bước 6 không chạy: xem Phần 5, phần Zalo Web.

---

## Phần 5 — Lỗi thường gặp

**`/health` trả về `zalo: "expired"`**
Session hết hạn hoặc `ZALO_SESSION` dán thiếu. Mở `/ket-noi`, quét lại, copy chuỗi mới, cập nhật biến trên Render.

**Frontend báo "Sai API key" hoặc 401**
`API_KEY` trên Render và `BACKEND_API_KEY` trên Vercel không giống nhau. Kiểm tra dấu cách ở đầu/cuối. Dán lại cả hai từ cùng một nguồn.

**"Không kết nối được máy chủ Zalo" hoặc 502**
`BACKEND_URL` sai. Kiểm tra: đúng `https://`, không có dấu `/` ở cuối, và mở URL đó trực tiếp trên trình duyệt xem có trả về `zalo-service OK` không.

**Web ngừng nhận tin phụ huynh gửi**
Có người đang mở **Zalo Web** trên trình duyệt. Zalo chỉ cho một web session mỗi tài khoản — ai mở `chat.zalo.me` là listener trên Render bị đá ra ngay. Nhân viên trung tâm phải dùng **app điện thoại**, không dùng Zalo Web.

**Không tìm thấy số điện thoại phụ huynh**
Người đó tắt "cho phép tìm kiếm bằng số điện thoại" trong cài đặt riêng tư Zalo. Không có cách nào lấy được qua API — phải kết bạn thủ công trước.

**Gửi được nhưng phụ huynh không thấy thông báo**
Chưa là bạn bè, tin vào mục "Tin nhắn chờ" và không hiện thông báo. Kết bạn trước khi dùng automation.

**Lịch sử chat biến mất sau khi deploy lại**
Đúng như thiết kế — `messages.jsonl` nằm trên ổ đĩa ephemeral của Render. Muốn giữ lâu dài thì gắn Render Persistent Disk, hoặc sửa `store.js` ghi vào database của trang quản lý trung tâm.

---

## Phần 6 — Việc cần làm định kỳ

**Đặt lịch kiểm tra sức khỏe.** Vào `cron-job.org` (miễn phí), tạo job gọi `https://<render-url>/health` mỗi ngày một lần, bật thông báo email khi lỗi. Bạn muốn biết session chết vào sáng thứ Ba, chứ không phải phát hiện lúc đang cần gửi thông báo gấp cho phụ huynh.

**Đừng chạy `npm audit fix --force`.** Nó sẽ nâng cấp `zca-js` lên version khác và làm hỏng toàn bộ. Version đang được ghim cứng là `2.1.2`.

**Quét lại QR khi cần.** Session sẽ hết hạn — không phải "có thể" mà là "sẽ". Quy trình mất một phút và làm được từ điện thoại. Nếu bạn thấy phải làm việc này mỗi tuần, đó là dấu hiệu nên chuyển sang VPS Việt Nam thay vì Render.

---

## Phần 7 — Nhắc lại về rủi ro

Hệ thống này dùng API không chính thức với tài khoản Zalo cá nhân. Gửi thông báo học phí cho phụ huynh là **mục đích kinh doanh** — đúng cái Zalo cấm rõ nhất. Tài khoản có thể bị khóa vĩnh viễn, và khi đó bạn mất kênh liên lạc với toàn bộ phụ huynh cùng lịch sử chat.

Khuyến nghị vẫn giữ nguyên:

- **Học phí và thông báo chính thức** → dùng **Zalo ZNS** qua Official Account (`oa.zalo.me`). Có template được duyệt, gửi tới số bất kỳ, không sợ khóa. Khoảng vài trăm đến hơn 1.000đ mỗi tin
- **Thông báo chung** (nghỉ lễ, đổi lịch học) → nhóm Zalo, miễn phí
- **Chat qua lại thường ngày** → hệ thống này

Và **đừng gửi học phí vào nhóm chung.** Số tiền của từng gia đình là thông tin riêng — có em học thêm buổi, có em được giảm, có em đang nợ. Học phí, điểm số, nhận xét học sinh phải nhắn riêng.

Dùng **tài khoản Zalo phụ** cho hệ thống này, không dùng số cá nhân của bạn.
