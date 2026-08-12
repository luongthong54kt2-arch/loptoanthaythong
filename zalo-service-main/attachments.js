// [BACKEND] attachments.js — chuẩn bị file để gửi qua Zalo.
//
// Nhận hai dạng nguồn:
//   { filename: "hocphi.pdf", base64: "JVBERi0..." }   ← file nhỏ, gửi thẳng trong JSON
//   { filename: "hocphi.pdf", url: "https://..." }      ← file lớn, backend tự tải về
//
// Dạng URL quan trọng vì Vercel giới hạn body request 4.5MB. Base64 phình 33%
// nên qua proxy Vercel chỉ gửi được file ~3MB. Dùng URL thì không bị giới hạn đó.
import imageSize from "image-size";

// Trần dung lượng phía mình. Zalo còn có trần riêng và sẽ tự báo lỗi nếu vượt.
const MAX_BYTES = Number(process.env.MAX_FILE_MB ?? 20) * 1024 * 1024;
const MAX_FILES = 5;

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

const extOf = (name) => String(name).split(".").pop()?.toLowerCase() ?? "";

function sanitizeFilename(name) {
  const clean = String(name ?? "")
    .replace(/[\\/:*?"<>|]/g, "_")   // ký tự không hợp lệ
    .replace(/\s+/g, " ")
    .trim();

  if (!clean || !clean.includes(".")) {
    throw new Error(`Tên file phải có phần mở rộng: "${name}"`);
  }
  return clean;
}

/**
 * Link chia sẻ Google Drive trả về TRANG HTML, không phải file.
 * Nếu không chuyển đổi, backend sẽ tải HTML về rồi gửi cho phụ huynh một
 * file .pdf mở không được — mà không báo lỗi gì, vì việc tải vẫn "thành công".
 */
function normalizeUrl(url) {
  const raw = String(url).trim();

  // https://drive.google.com/file/d/<id>/view?usp=sharing
  // https://drive.google.com/open?id=<id>
  // https://drive.google.com/uc?id=<id>
  const byPath = raw.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/);
  const byQuery = raw.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([A-Za-z0-9_-]+)/);
  const id = byPath?.[1] ?? byQuery?.[1];

  if (id) return `https://drive.usercontent.google.com/download?id=${id}&export=download`;

  return raw;
}

/**
 * Chặn SSRF. Backend chạy trên Render, nếu cho tải URL tuỳ ý thì một link như
 * http://169.254.169.254/ (metadata của cloud) hoặc http://localhost:6379 có thể
 * bị dùng để đọc dữ liệu nội bộ. Chỉ cho http/https ra Internet công cộng.
 */
function assertPublicUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("URL không hợp lệ");
  }

  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error(`Chỉ hỗ trợ http/https, không hỗ trợ ${u.protocol}`);
  }

  const host = u.hostname.toLowerCase();

  // Tên miền nội bộ
  if (
    host === "localhost" ||
    host === "metadata.google.internal" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    throw new Error("Không cho phép địa chỉ nội bộ");
  }

  // Dải IP riêng và loopback
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = ipv4.slice(1).map(Number);
    const isPrivate =
      a === 0 || a === 127 || a === 10 ||
      (a === 169 && b === 254) ||          // link-local, gồm metadata cloud
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127);  // CGNAT
    if (isPrivate) throw new Error("Không cho phép địa chỉ IP nội bộ");
  }

  // IPv6 loopback và unique-local
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) {
    throw new Error("Không cho phép địa chỉ IPv6 nội bộ");
  }

  return u.toString();
}

async function fromUrl(url) {
  const target = assertPublicUrl(normalizeUrl(url));
  const res = await fetch(target, { redirect: "follow" });
  if (!res.ok) throw new Error(`Tải file thất bại (${res.status})`);

  // Chặn sớm nếu server cho biết dung lượng.
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared && declared > MAX_BYTES) {
    throw new Error(`File vượt ${MAX_BYTES / 1024 / 1024}MB`);
  }

  const contentType = (res.headers.get("content-type") ?? "").toLowerCase();

  // Apps Script Web App trả JSON { filename, mimeType, base64 } — cách đáng tin
  // nhất để lấy file từ Drive, không phụ thuộc chế độ chia sẻ.
  if (contentType.includes("application/json")) {
    const payload = await res.json().catch(() => null);

    if (payload?.error) throw new Error(`Apps Script báo lỗi: ${payload.error}`);
    if (!payload?.base64) throw new Error("Apps Script không trả về trường base64");

    const buf = Buffer.from(String(payload.base64), "base64");
    if (buf.length === 0) throw new Error("Apps Script trả về dữ liệu rỗng");
    if (buf.length > MAX_BYTES) throw new Error(`File vượt ${MAX_BYTES / 1024 / 1024}MB`);

    return { buf, filename: payload.filename };
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) throw new Error("File tải về rỗng");
  if (buf.length > MAX_BYTES) throw new Error(`File vượt ${MAX_BYTES / 1024 / 1024}MB`);

  // Lưới an toàn: nhận được HTML nghĩa là link không phải link tải trực tiếp.
  // Không chặn ở đây thì phụ huynh nhận được file hỏng mà mình không hay biết.
  const looksHtml =
    contentType.includes("text/html") ||
    buf.subarray(0, 512).toString("utf8").trim().toLowerCase().startsWith("<!doctype html") ||
    buf.subarray(0, 512).toString("utf8").trim().toLowerCase().startsWith("<html");

  if (looksHtml) {
    throw new Error(
      "Link trả về trang HTML chứ không phải file. Với Google Drive, đặt chia sẻ " +
        'thành "Bất kỳ ai có đường liên kết", hoặc dùng Apps Script Web App trả JSON base64.',
    );
  }

  return { buf };
}

function fromBase64(b64) {
  // Chấp nhận cả dạng data URI: data:application/pdf;base64,....
  const raw = String(b64).replace(/^data:[^;]+;base64,/, "");
  const buf = Buffer.from(raw, "base64");

  if (buf.length === 0) throw new Error("Dữ liệu base64 rỗng hoặc sai định dạng");
  if (buf.length > MAX_BYTES) throw new Error(`File vượt ${MAX_BYTES / 1024 / 1024}MB`);

  return { buf };
}

/**
 * Chuyển danh sách file đầu vào thành AttachmentSource của zca-js.
 * @returns {Promise<{sources: Array, names: string[]}>}
 */
export async function prepare(files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("Thiếu danh sách file");
  }
  if (files.length > MAX_FILES) {
    throw new Error(`Mỗi tin nhắn tối đa ${MAX_FILES} file`);
  }

  const sources = [];
  const names = [];

  for (const [i, f] of files.entries()) {
    const label = `File thứ ${i + 1}`;

    if (!f?.base64 && !f?.url) {
      throw new Error(`${label}: cần có base64 hoặc url`);
    }

    // Không có filename mà có url thì thử lấy tên từ đường dẫn — nhưng chỉ khi
    // đoạn cuối thực sự có phần mở rộng. URL Apps Script kết thúc bằng "/exec",
    // không phải tên file.
    let filename = f.filename;
    if (!filename && f.url) {
      try {
        const tail = decodeURIComponent(new URL(f.url).pathname.split("/").pop() ?? "");
        if (/\.[A-Za-z0-9]{1,8}$/.test(tail)) filename = tail;
      } catch { /* bỏ qua */ }
    }

    // Nguồn URL có thể chưa biết tên (Apps Script sẽ trả về sau), nên hoãn kiểm tra.
    if (filename || f.base64) {
      try {
        filename = sanitizeFilename(filename);
      } catch (err) {
        throw new Error(`${label}: ${err.message}`);
      }
    }

    let got;
    try {
      got = f.base64 ? fromBase64(f.base64) : await fromUrl(f.url);
    } catch (err) {
      throw new Error(`${label} (${filename}): ${err.message}`);
    }

    const data = got.buf;

    // Apps Script biết tên thật của file trên Drive — dùng nếu mình chưa có tên tốt.
    if (got.filename && !f.filename) {
      try { filename = sanitizeFilename(got.filename); } catch { /* giữ tên cũ */ }
    }

    try {
      filename = sanitizeFilename(filename);
    } catch (err) {
      throw new Error(
        `${label}: ${err.message} Hãy truyền "filename" vì không lấy được tên từ nguồn.`,
      );
    }

    const metadata = { totalSize: data.length };

    // Ảnh bắt buộc có width/height, Zalo dùng để dựng khung xem trước.
    if (IMAGE_EXT.has(extOf(filename))) {
      try {
        const dim = imageSize(data);
        if (dim?.width && dim?.height) {
          metadata.width = dim.width;
          metadata.height = dim.height;
        }
      } catch {
        throw new Error(
          `${label} (${filename}): không đọc được kích thước ảnh. ` +
            "File có thể bị hỏng hoặc không phải ảnh thật.",
        );
      }
    }

    sources.push({ data, filename, metadata });
    names.push(filename);
  }

  return { sources, names };
}

// Nhãn hiển thị trong lịch sử chat.
export function describe(names, message) {
  const tag = names.length === 1 ? `[${names[0]}]` : `[${names.length} tệp: ${names.join(", ")}]`;
  return message?.trim() ? `${tag} ${message.trim()}` : tag;
}
