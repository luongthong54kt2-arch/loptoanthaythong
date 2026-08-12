// queue.js — hàng đợi gửi tin có throttle, giới hạn ngày, và log ra file.
import fs from "node:fs";
import { config } from "./config.js";
import { sendText, sendFiles } from "./zalo.js";

const COUNTER_FILE = "daily-counter.json";
const LOG_FILE = "send-log.jsonl";

const jobs = new Map();   // jobId -> job
const pending = [];       // các task chờ gửi
let running = false;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = () =>
  config.minDelayMs + Math.random() * (config.maxDelayMs - config.minDelayMs);

// --- Đếm số tin đã gửi trong ngày, lưu ra file để restart không mất ---
function today() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
}

function readCounter() {
  try {
    const c = JSON.parse(fs.readFileSync(COUNTER_FILE, "utf8"));
    return c.date === today() ? c : { date: today(), count: 0 };
  } catch {
    return { date: today(), count: 0 };
  }
}

function bumpCounter() {
  const c = readCounter();
  c.count++;
  fs.writeFileSync(COUNTER_FILE, JSON.stringify(c));
  return c.count;
}

export function quotaLeft() {
  return Math.max(0, config.dailyLimit - readCounter().count);
}

function logLine(entry) {
  fs.appendFileSync(LOG_FILE, JSON.stringify({ at: new Date().toISOString(), ...entry }) + "\n");
}

function inSendWindow() {
  const h = Number(
    new Date().toLocaleString("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", hour12: false }),
  );
  return h >= config.sendHourFrom && h < config.sendHourTo;
}

// --- Vòng lặp xử lý ---
async function worker() {
  if (running) return;
  running = true;

  let sentInBatch = 0;

  while (pending.length > 0) {
    // Ngoài giờ gửi → ngủ 10 phút rồi kiểm tra lại.
    if (!inSendWindow()) {
      console.log("[queue] Ngoài giờ gửi, tạm dừng 10 phút.");
      await sleep(10 * 60 * 1000);
      continue;
    }

    if (quotaLeft() <= 0) {
      console.log("[queue] Hết quota ngày. Các tin còn lại chuyển sang mai.");
      await sleep(15 * 60 * 1000);
      continue;
    }

    const task = pending.shift();
    const job = jobs.get(task.jobId);

    try {
      // task.files có nghĩa là tin nhắn kèm file.
      const threadId = task.files
        ? (await sendFiles(task)).threadId
        : await sendText(task);
      bumpCounter();
      job.sent++;
      job.results.push({ to: task.phone ?? task.userId, ok: true, threadId });
      logLine({ jobId: task.jobId, to: task.phone ?? task.userId, ok: true });
      console.log(`[queue] ✓ ${task.phone ?? task.userId}`);
    } catch (err) {
      job.failed++;
      job.results.push({ to: task.phone ?? task.userId, ok: false, error: err.message });
      logLine({ jobId: task.jobId, to: task.phone ?? task.userId, ok: false, error: err.message });
      console.error(`[queue] ✗ ${task.phone ?? task.userId}: ${err.message}`);
    }

    if (job.sent + job.failed >= job.total) {
      job.status = "done";
      job.finishedAt = new Date().toISOString();
    }

    sentInBatch++;

    // Nghỉ dài sau mỗi lô.
    if (sentInBatch >= config.batchSize && pending.length > 0) {
      console.log(`[queue] Nghỉ ${config.batchPauseMs / 1000}s sau lô ${config.batchSize} tin.`);
      sentInBatch = 0;
      await sleep(config.batchPauseMs);
    } else if (pending.length > 0) {
      await sleep(randomDelay());
    }
  }

  running = false;
}

export function enqueue(items) {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  jobs.set(jobId, {
    jobId,
    total: items.length,
    sent: 0,
    failed: 0,
    status: "running",
    createdAt: new Date().toISOString(),
    results: [],
  });

  for (const it of items) pending.push({ ...it, jobId });

  worker(); // không await, chạy nền
  return jobs.get(jobId);
}

export function getJob(jobId) {
  return jobs.get(jobId) ?? null;
}

export function queueDepth() {
  return pending.length;
}
