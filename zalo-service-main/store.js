// [BACKEND] store.js — lưu hội thoại trong RAM, ghi ra file để restart không mất.
import fs from "node:fs";

const LOG = "messages.jsonl";
const ALIAS_FILE = "aliases.json";
const MAX_PER_THREAD = 500;

const threads = new Map();  // threadId -> { threadId, name, type, lastText, lastAt, unread }
const messages = new Map(); // threadId -> [ { id, from, text, at } ]

let seq = 0;
const nextId = () => `m${Date.now()}${(seq = (seq + 1) % 1000).toString().padStart(3, "0")}`;

function touchThread({ threadId, name, type, text, at, incoming }) {
  const t = threads.get(threadId) ?? { threadId, name: name ?? threadId, type: type ?? "user", unread: 0 };
  if (name) t.name = name;
  if (type) t.type = type;
  t.lastText = text;
  t.lastAt = at;
  if (incoming) t.unread = (t.unread ?? 0) + 1;
  threads.set(threadId, t);
  return t;
}

function push(threadId, msg) {
  const list = messages.get(threadId) ?? [];
  list.push(msg);
  if (list.length > MAX_PER_THREAD) list.splice(0, list.length - MAX_PER_THREAD);
  messages.set(threadId, list);
}

export function record({ threadId, name, type, from, text, persist = true }) {
  const at = new Date().toISOString();
  const msg = { id: nextId(), threadId, from, text, at };

  push(threadId, msg);
  touchThread({ threadId, name, type, text, at, incoming: from === "them" });

  if (persist) {
    try {
      fs.appendFileSync(LOG, JSON.stringify({ ...msg, name, type }) + "\n");
    } catch (err) {
      console.error("[store] Không ghi được log:", err.message);
    }
  }

  return msg;
}

// Tên do người dùng tự đặt — ưu tiên hơn tên Zalo, và không bị tin mới ghi đè.
const aliases = new Map();

export function setAlias(threadId, alias) {
  const t = threads.get(threadId);
  if (!t) return false;

  if (alias && alias.trim()) {
    aliases.set(threadId, alias.trim());
    t.alias = alias.trim();
  } else {
    aliases.delete(threadId);
    delete t.alias;
  }

  try {
    fs.writeFileSync(ALIAS_FILE, JSON.stringify([...aliases]));
  } catch (err) {
    console.error("[store] Không lưu được tên tự đặt:", err.message);
  }

  return true;
}

// Cập nhật tên Zalo cho hội thoại đã có (dùng khi lấy tên muộn).
export function setZaloName(threadId, name) {
  const t = threads.get(threadId);
  if (t && name) t.name = name;
}

export function markRead(threadId) {
  const t = threads.get(threadId);
  if (t) t.unread = 0;
}

export function listThreads() {
  return [...threads.values()]
    .map((t) => ({ ...t, alias: aliases.get(t.threadId), label: aliases.get(t.threadId) ?? t.name }))
    .sort((a, b) => (b.lastAt ?? "").localeCompare(a.lastAt ?? ""));
}

// Hội thoại chưa có tên thật (tên đang là chính ID) — để backfill.
export function threadsMissingName() {
  return [...threads.values()]
    .filter((t) => !aliases.has(t.threadId) && (!t.name || t.name === t.threadId))
    .map((t) => ({ threadId: t.threadId, type: t.type }));
}

export function listMessages(threadId, since) {
  const list = messages.get(threadId) ?? [];
  return since ? list.filter((m) => m.at > since) : list;
}

// Trả về mọi tin mới hơn mốc `since`, ở mọi hội thoại — dùng cho polling.
export function changesSince(since) {
  const out = [];
  for (const [threadId, list] of messages) {
    for (const m of list) {
      if (!since || m.at > since) out.push({ ...m, threadId });
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

// Nạp lại lịch sử khi khởi động.
export function restore() {
  // Nạp tên tự đặt trước, để không bị tin nhắn cũ ghi đè.
  try {
    if (fs.existsSync(ALIAS_FILE)) {
      for (const [k, v] of JSON.parse(fs.readFileSync(ALIAS_FILE, "utf8"))) aliases.set(k, v);
      console.log(`[store] Nạp lại ${aliases.size} tên tự đặt`);
    }
  } catch { /* bỏ qua */ }

  if (!fs.existsSync(LOG)) return 0;

  let n = 0;
  for (const line of fs.readFileSync(LOG, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      push(e.threadId, { id: e.id, threadId: e.threadId, from: e.from, text: e.text, at: e.at });
      touchThread({ threadId: e.threadId, name: e.name, type: e.type, text: e.text, at: e.at, incoming: false });
      n++;
    } catch { /* bỏ dòng lỗi */ }
  }

  console.log(`[store] Nạp lại ${n} tin nhắn từ ${LOG}`);
  return n;
}
