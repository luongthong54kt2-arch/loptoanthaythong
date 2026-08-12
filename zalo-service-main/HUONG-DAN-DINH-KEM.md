# Hướng dẫn gửi file đính kèm qua Zalo

## Đặt file vào đâu

Cấu trúc trong gói đã khớp repo của bạn — copy nguyên thư mục `api/` và `src/` vào là được.

| File | Loại |
|---|---|
| `api/zalo.ts` | Ghi đè |
| `src/services/zaloService.ts` | Ghi đè |
| `src/components/ZaloSendDialog.tsx` | Ghi đè |
| `src/pages/Tuition.tsx` | Ghi đè |
| `src/pages/Grades.tsx` | Ghi đè |
| `src/services/zaloFiles.ts` | **File mới** |

`Attendance.tsx` không đổi. Không thêm biến môi trường nào mới.

Bên Render: thay cả repo bằng gói `RENDER-zalo-service`, rồi **`npm install`** vì có thêm dependency `image-size`.

---

## Cách dùng theo từng trang

### Học phí — QR tự động kèm theo

Không phải làm gì cả. Bấm nút Zalo như trước, mã QR chuyển khoản **tự được đính kèm**.

QR là của riêng từng em: đã nhúng sẵn số tiền và nội dung chuyển khoản có tên học sinh. Phụ huynh quét bằng app ngân hàng là mọi thứ điền sẵn, không phải nhập số tài khoản hay gõ cú pháp nội dung.

Tin nhắn text giữ nguyên như cũ, đầy đủ số buổi học, học phí mỗi buổi, tổng tiền, số tài khoản, và link phiếu học phí.

QR **không** được đính trong 3 trường hợp:

- Học sinh **đã thu** học phí — lúc đó QR vô nghĩa
- Lớp **chưa cấu hình** tài khoản nhận học phí — link QR sẽ là link rác
- Học phí bằng **0 đồng** — app ngân hàng từ chối QR 0 đồng

Nếu QR không đến mà tin text vẫn đến, nguyên nhân gần như chắc chắn là lớp đó chưa cấu hình tài khoản. Kiểm tra phần cấu hình học phí của lớp trước khi tìm lỗi ở đâu khác.

### Điểm số — ảnh bài kiểm tra của từng em

Bấm nút Zalo **ở đúng dòng của em đó**, rồi bấm "Chọn ảnh hoặc file" trong hộp thoại. Chụp bài kiểm tra đã chấm bằng điện thoại là được, ảnh tự nén.

Khi bấm **"Gửi Zalo cả lớp"**, phần chọn file **không xuất hiện**. Đây là cố ý: lúc cần gửi ảnh kèm điểm, thứ có sẵn trên màn hình là bảng điểm cả lớp — mà đó chính là cái không được gửi, vì mỗi phụ huynh sẽ thấy điểm của những em khác. Muốn gửi ảnh thì gửi riêng từng em.

### Điểm danh — ảnh thông báo chung

Đính file được ở cả hai chế độ. Phù hợp cho ảnh hoạt động ngoại khoá, thông báo nghỉ lễ, ảnh lịch học mới.

---

## Đính file khi gửi hàng loạt

File chọn trong hộp thoại đi **giống nhau** tới mọi người nhận. Vì vậy khi gửi nhiều người kèm file, hệ thống hiện một checkbox xác nhận và **khoá nút Gửi** cho đến khi bạn tick.

Trước khi tick, tự hỏi: ảnh này có tên hay điểm của học sinh khác không? Nếu có thì đừng gửi.

An toàn để gửi chung: ảnh thông báo, ảnh hoạt động, ảnh đề bài, lịch học.
Không được gửi chung: ảnh bảng điểm, danh sách học sinh, phiếu học phí của nhiều em, sổ theo dõi.

---

## Giới hạn dung lượng

Ảnh được tự nén trong trình duyệt trước khi gửi: cạnh dài về 1600px, JPEG chất lượng 0.82. Ảnh điện thoại 6MB thường ra dưới 400KB mà vẫn đọc rõ chữ viết tay trên bài kiểm tra.

| Loại | Trần |
|---|---|
| Mỗi ảnh sau nén | ~2.6MB |
| Tổng cả lô khi gửi nhiều người | ~3MB |
| File không phải ảnh (PDF, docx) | ~2.6MB, không nén được |
| Số file mỗi tin | 5 |

Trần này do Vercel giới hạn body request 4.5MB, và base64 làm phình dữ liệu thêm 33%.

File lớn hơn cần tải lên Google Drive trước rồi gửi bằng đường link — xem `apps-script-drive.gs` trong gói Render.

Định dạng nhận: ảnh (jpg, png, webp, gif), pdf, doc, docx, xls, xlsx. Zalo tự chặn các đuôi nguy hiểm như exe.

---

## Thời gian gửi

Backend nghỉ 8–15 giây giữa mỗi tin và chỉ gửi trong khung 7h–21h. Đây là cố ý để tài khoản Zalo không bị đánh dấu spam — đừng giảm.

Một lớp 30 phụ huynh kèm QR mất khoảng 6–8 phút. Hộp thoại hiển thị tiến độ, và **backend vẫn gửi tiếp nếu bạn đóng hộp thoại**. Không bấm gửi lại khi thấy chậm, nếu không phụ huynh sẽ nhận hai tin.

Trần mặc định 150 tin mỗi ngày. Nếu trung tâm nhiều hơn 150 phụ huynh, sửa `DAILY_LIMIT` trên Render — nhưng đừng vượt 200–250.

---

## Lỗi thường gặp

**Ảnh không đến mà text vẫn đến** — với học phí là do lớp chưa cấu hình tài khoản nhận tiền. Với các trang khác, kiểm tra log Vercel xem `api/zalo` báo gì.

**"Ảnh vẫn còn XMB sau khi nén"** — ảnh gốc quá lớn hoặc quá chi tiết. Chụp lại gần hơn, hoặc cắt bớt phần không cần.

**"Link trả về trang HTML chứ không phải file"** — bạn đang dùng link chia sẻ Google Drive thông thường. Link đó trả về trang web, không phải file. Dùng `fetchUrl` từ Apps Script, hoặc đặt chia sẻ thành "Bất kỳ ai có đường liên kết".

**Nút Gửi bị mờ khi đã đính file** — chưa tick checkbox xác nhận. Đọc lại nội dung cảnh báo trước khi tick.

**Phụ huynh không nhận được gì** — kiểm tra `/health` trên Render. Nếu `zalo` khác `"ready"` thì session đã hết hạn, vào `/ket-noi` quét QR lại. Cũng kiểm tra không ai đang mở Zalo Web trên trình duyệt — Zalo chỉ cho một web session mỗi tài khoản.

---

## Nhắc lại về rủi ro

Hệ thống dùng API không chính thức với tài khoản Zalo cá nhân. Gửi thông báo học phí là mục đích kinh doanh — đúng cái Zalo cấm rõ nhất. Tài khoản có thể bị khóa vĩnh viễn, và khi đó bạn mất kênh liên lạc với toàn bộ phụ huynh cùng lịch sử chat.

Dùng **tài khoản Zalo phụ**, không dùng số cá nhân của bạn. Với thông báo học phí chính thức, **Zalo ZNS** qua Official Account (`oa.zalo.me`) là giải pháp không sợ khóa, khoảng vài trăm đến hơn 1.000đ mỗi tin.
