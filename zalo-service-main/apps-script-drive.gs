/**
 * Apps Script Web App — dùng Google Drive làm chỗ lưu file cho zalo-service.
 * Thay thế Firebase Storage (Spark plan không còn Storage).
 *
 * ── CÀI ĐẶT ──────────────────────────────────────────────────────────
 * 1. script.google.com → New project → dán toàn bộ file này
 * 2. Project Settings → Script properties → thêm 2 property:
 *      TOKEN     = một chuỗi random dài do bạn tự tạo
 *      FOLDER_ID = ID thư mục Drive để chứa file (xem cách lấy bên dưới)
 * 3. Deploy → New deployment → type "Web app"
 *      Execute as:      Me
 *      Who has access:  Anyone
 *    (Chọn "Anyone" là bắt buộc để backend gọi được. Bảo mật dựa vào TOKEN,
 *     nên TOKEN phải dài và không được để lộ.)
 * 4. Copy URL dạng https://script.google.com/macros/s/XXXX/exec
 *
 * Lấy FOLDER_ID: mở thư mục trên Drive, ID là đoạn cuối URL
 * drive.google.com/drive/folders/1AbC...  →  FOLDER_ID = 1AbC...
 *
 * ── DÙNG ─────────────────────────────────────────────────────────────
 * Lưu file (từ web quản lý):
 *   POST <url>
 *   { "token": "...", "action": "save",
 *     "filename": "hoc-phi-an.pdf",
 *     "mimeType": "application/pdf",
 *     "base64": "JVBERi0..." }
 *   → { "ok": true, "fileId": "...", "fetchUrl": "<url>?token=...&id=..." }
 *
 * Đọc file (zalo-service gọi):
 *   GET <url>?token=...&id=<fileId>
 *   → { "filename": "...", "mimeType": "...", "base64": "..." }
 *
 * Truyền thẳng "fetchUrl" vào field "url" của /send-file là xong.
 */

function getConfig_() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('TOKEN');
  var folderId = props.getProperty('FOLDER_ID');

  if (!token) throw new Error('Chưa đặt Script property TOKEN');
  if (!folderId) throw new Error('Chưa đặt Script property FOLDER_ID');

  return { token: token, folderId: folderId };
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * So sánh token theo kiểu không phụ thuộc thời gian, tránh rò rỉ qua timing.
 */
function tokenOk_(given, expected) {
  if (!given || given.length !== expected.length) return false;

  var diff = 0;
  for (var i = 0; i < expected.length; i++) {
    diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/** GET — trả file dưới dạng JSON base64 cho zalo-service. */
function doGet(e) {
  try {
    var cfg = getConfig_();
    var params = (e && e.parameter) || {};

    if (!tokenOk_(params.token, cfg.token)) {
      return json_({ error: 'Sai token' });
    }

    var fileId = params.id;
    if (!fileId) return json_({ error: 'Thiếu tham số id' });

    var file = DriveApp.getFileById(fileId);

    // Chỉ cho đọc file nằm trong thư mục đã cấu hình, để token bị lộ cũng
    // không đọc được toàn bộ Drive của bạn.
    var inFolder = false;
    var parents = file.getParents();
    while (parents.hasNext()) {
      if (parents.next().getId() === cfg.folderId) { inFolder = true; break; }
    }
    if (!inFolder) return json_({ error: 'File không nằm trong thư mục được phép' });

    var blob = file.getBlob();

    // Web App có trần phản hồi khoảng 10MB, base64 phình 33% nên chặn ở 7MB.
    if (blob.getBytes().length > 7 * 1024 * 1024) {
      return json_({ error: 'File quá lớn để trả qua Apps Script (trên 7MB)' });
    }

    return json_({
      filename: file.getName(),
      mimeType: file.getMimeType(),
      base64: Utilities.base64Encode(blob.getBytes()),
    });
  } catch (err) {
    return json_({ error: String(err && err.message ? err.message : err) });
  }
}

/** POST — lưu file lên Drive. */
function doPost(e) {
  try {
    var cfg = getConfig_();
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    if (!tokenOk_(body.token, cfg.token)) {
      return json_({ error: 'Sai token' });
    }

    if (body.action === 'delete') {
      if (!body.fileId) return json_({ error: 'Thiếu fileId' });
      DriveApp.getFileById(body.fileId).setTrashed(true);
      return json_({ ok: true, deleted: body.fileId });
    }

    // Mặc định là lưu file
    if (!body.filename || !body.base64) {
      return json_({ error: 'Cần filename và base64' });
    }

    var bytes = Utilities.base64Decode(body.base64);
    var blob = Utilities.newBlob(
      bytes,
      body.mimeType || 'application/octet-stream',
      body.filename
    );

    var folder = DriveApp.getFolderById(cfg.folderId);
    var file = folder.createFile(blob);

    var base = ScriptApp.getService().getUrl();

    return json_({
      ok: true,
      fileId: file.getId(),
      filename: file.getName(),
      size: bytes.length,
      // Truyền thẳng URL này vào field "url" của /send-file
      fetchUrl: base + '?token=' + encodeURIComponent(cfg.token) + '&id=' + file.getId(),
    });
  } catch (err) {
    return json_({ error: String(err && err.message ? err.message : err) });
  }
}

/**
 * Dọn file cũ. Đặt Trigger chạy hàng tuần để Drive không phình theo thời gian.
 * Sửa số 90 nếu muốn giữ lâu hơn.
 */
function cleanupOldFiles() {
  var cfg = getConfig_();
  var cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  var files = DriveApp.getFolderById(cfg.folderId).getFiles();
  var removed = 0;

  while (files.hasNext()) {
    var file = files.next();
    if (file.getDateCreated() < cutoff) {
      file.setTrashed(true);
      removed++;
    }
  }

  console.log('Đã chuyển vào thùng rác ' + removed + ' file cũ hơn 90 ngày');
}
