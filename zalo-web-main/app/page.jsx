// [FRONTEND] app/page.jsx — giao diện chat với phụ huynh.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const POLL_MS = 3000;

const api = (path, init) =>
  fetch(`/api/zalo?p=${path}`, { cache: "no-store", ...init }).then((r) => r.json());

function when(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return d.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    ...(today ? {} : { day: "2-digit", month: "2-digit" }),
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* Dấu tích bút đỏ — đánh dấu hội thoại chưa đọc, như giáo viên tích vào sổ */
function Tick() {
  return (
    <svg className="tick" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M1 6.5 L4 10 L11 1.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Gate({ onIn }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }).then((r) => r.json());

    setBusy(false);
    if (res.ok) onIn();
    else setError(res.error ?? "Không đăng nhập được");
  }

  return (
    <div className="gate">
      <form onSubmit={submit}>
        <h1>Sổ liên lạc</h1>
        <p>Nhập mật khẩu của trung tâm để mở.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mật khẩu"
          autoFocus
          autoComplete="current-password"
        />
        {error && <div className="alert" style={{ margin: "0 0 14px" }}>{error}</div>}
        <button className="btn" disabled={busy || !password}>
          {busy ? "Đang mở…" : "Mở sổ"}
        </button>
      </form>
    </div>
  );
}

export default function Page() {
  const [authed, setAuthed] = useState(null);
  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [zalo, setZalo] = useState("…");
  const [draft, setDraft] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [mobileList, setMobileList] = useState(true);

  const since = useRef(null);
  const logRef = useRef(null);

  useEffect(() => {
    fetch("/api/auth").then((r) => r.json()).then((d) => setAuthed(d.ok));
  }, []);

  const poll = useCallback(async () => {
    const q = since.current ? `updates&since=${encodeURIComponent(since.current)}` : "updates";
    const d = await api(q).catch(() => null);
    if (!d?.ok) return;

    since.current = d.now;
    setZalo(d.zalo);
    setThreads(d.threads ?? []);

    if (d.messages?.length) {
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const add = d.messages.filter((m) => !seen.has(m.id));
        return add.length ? [...prev, ...add] : prev;
      });
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    poll();
    const t = setInterval(poll, POLL_MS);
    return () => clearInterval(t);
  }, [authed, poll]);

  // Đổi hội thoại → nạp toàn bộ lịch sử của hội thoại đó
  async function open(threadId) {
    setActive(threadId);
    setMobileList(false);
    setMessages([]);
    const d = await api(`messages/${threadId}`);
    if (d.ok) setMessages(d.messages);
    api(`read/${threadId}`, { method: "POST" });
    setThreads((prev) => prev.map((t) => (t.threadId === threadId ? { ...t, unread: 0 } : t)));
  }

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, active]);

  async function rename(threadId, current) {
    const alias = window.prompt(
      "Đặt tên cho hội thoại này (ví dụ: Mẹ em An - lớp 5A).\nĐể trống để dùng lại tên Zalo.",
      current,
    );
    if (alias === null) return; // bấm Huỷ

    const res = await api(`threads/${threadId}/name`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alias }),
    });

    if (res.ok) setThreads(res.threads);
    else setError(res.error ?? "Không đổi được tên");
  }

  async function send() {
    const text = draft.trim();
    if (!text || !active || sending) return;

    setSending(true);
    setError("");

    const thread = threads.find((t) => t.threadId === active);
    const res = await api("send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: active,
        message: text,
        isGroup: thread?.type === "group",
      }),
    }).catch((e) => ({ ok: false, error: e.message }));

    setSending(false);

    if (res.ok) setDraft("");
    else setError(res.error ?? "Không gửi được");
  }

  async function startWithPhone(e) {
    e.preventDefault();
    const p = phone.trim();
    if (!p) return;

    setError("");
    const res = await api("resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: p }),
    });

    if (res.ok) {
      setPhone("");
      await open(res.userId);
    } else {
      setError(`${res.error}. Số phải cho phép tìm kiếm trên Zalo.`);
    }
  }

  if (authed === null) return <div className="gate"><p>Đang mở sổ…</p></div>;
  if (authed === false) return <Gate onIn={() => setAuthed(true)} />;

  const shown = active ? messages.filter((m) => m.threadId === active) : [];
  const thread = threads.find((t) => t.threadId === active);

  return (
    <div className={`shell${mobileList ? " list-view" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <h1>Sổ liên lạc</h1>
          <p>Trao đổi với phụ huynh qua Zalo</p>
          <div className="status">
            <span className={`dot ${zalo === "ready" ? "on" : "off"}`} />
            {zalo === "ready" ? "Đã kết nối Zalo" : `Zalo: ${zalo}`}
          </div>

          {zalo !== "ready" && zalo !== "…" && (
            <a href="/ket-noi" className="btn ghost" style={{ marginTop: 10, display: "inline-block", textDecoration: "none", fontSize: 13 }}>
              Kết nối lại Zalo
            </a>
          )}
        </div>

        <form className="newchat" onSubmit={startWithPhone}>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Số điện thoại phụ huynh"
            inputMode="tel"
            aria-label="Số điện thoại phụ huynh"
          />
          <button className="btn ghost" disabled={!phone.trim()}>Mở</button>
        </form>

        {error && <div className="alert">{error}</div>}

        <div className="threads">
          {threads.length === 0 && (
            <p style={{ padding: "18px 16px", fontSize: 13, color: "var(--ink-soft)" }}>
              Chưa có hội thoại nào. Nhập số điện thoại phụ huynh ở trên để bắt đầu.
            </p>
          )}

          {threads.map((t) => (
            <button
              key={t.threadId}
              className="thread"
              aria-current={t.threadId === active}
              onClick={() => open(t.threadId)}
            >
              {t.unread > 0 && <Tick />}
              <span className="name">
                {t.label ?? t.name}
                {t.type === "group" ? " · nhóm" : ""}
              </span>
              <span className="preview">{t.lastText}</span>
              <span className="when">{when(t.lastAt)}</span>
            </button>
          ))}
        </div>
      </aside>

      <main className="panel">
        {!active ? (
          <div className="empty">
            <strong>Chọn một hội thoại</strong>
            Hoặc nhập số điện thoại phụ huynh để mở cuộc trao đổi mới.
          </div>
        ) : (
          <>
            <div className="panel-head">
              <button className="btn ghost back-to-list" onClick={() => setMobileList(true)}>
                ← Danh sách
              </button>
              <h2>
                {thread?.label ?? thread?.name ?? active}
                <button
                  className="rename"
                  onClick={() => rename(active, thread?.alias ?? "")}
                  title="Đặt tên riêng cho hội thoại này"
                >
                  Đổi tên
                </button>
              </h2>
              <span>{active}</span>
            </div>

            <div className="log" ref={logRef}>
              {shown.length === 0 && (
                <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>
                  Chưa có tin nào trong hội thoại này.
                </p>
              )}
              {shown.map((m) => (
                <div key={m.id} className={`bubble${m.from === "me" ? " me" : ""}`}>
                  {m.text}
                  <span className="meta">
                    {m.from === "me" ? "Trung tâm" : thread?.label ?? thread?.name ?? "Phụ huynh"} · {when(m.at)}
                  </span>
                </div>
              ))}
            </div>

            <div className="composer">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Nhập tin nhắn. Enter để gửi, Shift+Enter để xuống dòng."
                aria-label="Nội dung tin nhắn"
              />
              <button className="btn" onClick={send} disabled={sending || !draft.trim()}>
                {sending ? "Đang gửi…" : "Gửi"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
