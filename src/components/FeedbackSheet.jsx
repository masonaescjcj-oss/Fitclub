import React, { useEffect, useState } from "react";
import { Button, Segmented, Sheet, cx } from "./ui/kit";
import { supabase } from "../lib/backend/supabase";

const COPY = {
  en: {
    title: "Help & feedback", lead: "Found a bug, have an idea or a question? Write to the FitClub team. We read every message and reply by email.",
    kinds: { bug: "Bug", idea: "Idea", question: "Question" }, placeholder: "What happened, or what would help?",
    send: "Send", sending: "Sending…", close: "Close", sent: "Thanks. It's with the team.",
    failed: "Couldn't send it. Try again in a moment.", tooMany: "That's a lot of messages in an hour. Try again a little later.",
    history: "Your messages", status: { new: "Received", read: "Read", answered: "Answered by email", closed: "Closed" },
  },
  fa: {
    title: "راهنما و بازخورد", lead: "مشکلی دیدی، ایده یا سؤالی داری؟ به تیم فیت‌کلاب بنویس. همه‌ی پیام‌ها را می‌خوانیم و با ایمیل جواب می‌دهیم.",
    kinds: { bug: "مشکل", idea: "ایده", question: "سؤال" }, placeholder: "چه شد، یا چه چیزی کمک می‌کند؟",
    send: "فرستادن", sending: "در حال فرستادن…", close: "بستن", sent: "ممنون. به دست تیم رسید.",
    failed: "فرستاده نشد. کمی بعد دوباره امتحان کن.", tooMany: "در یک ساعت پیام زیادی فرستادی. کمی بعد دوباره امتحان کن.",
    history: "پیام‌های تو", status: { new: "دریافت شد", read: "خوانده شد", answered: "با ایمیل جواب داده شد", closed: "بسته شد" },
  },
};

const buildId = () => {
  try { return ([...document.scripts].map((s) => s.src).find((s) => /main\.[0-9a-f]+\.js/.test(s)) || "").match(/main\.([0-9a-f]+)\.js/)?.[1] || ""; } catch { return ""; }
};

/** Write to the team from inside the app (supabase/migrations/0009). */
export default function FeedbackSheet({ isRtl, onClose, onSent }) {
  const c = COPY[isRtl ? "fa" : "en"];
  const [kind, setKind] = useState("bug");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let live = true;
    supabase?.rpc("fitclub_my_feedback").then(({ data }) => { if (live && Array.isArray(data)) setHistory(data); });
    return () => { live = false; };
  }, []);

  const send = async () => {
    setBusy(true); setError(null);
    const { data, error: e } = await supabase.rpc("fitclub_send_feedback", {
      p_kind: kind, p_message: text,
      p_meta: { page: window.location.pathname, build: buildId(), lang: isRtl ? "fa" : "en", agent: navigator.userAgent.slice(0, 300) },
    });
    setBusy(false);
    if (e) { setError(/too_many/.test(e.message) ? c.tooMany : c.failed); return; }
    setHistory((h) => [data, ...h]);
    setText("");
    onSent?.(c.sent);
  };

  const date = (iso) => new Date(iso).toLocaleDateString(isRtl ? "fa-IR" : "en-GB", { day: "numeric", month: "short" });

  return (
    <Sheet title={c.title} isRtl={isRtl} onClose={onClose} closeLabel={c.close} tall
      footer={<Button tone="ink" size="lg" block disabled={busy || !text.trim()} onClick={send}>{busy ? c.sending : c.send}</Button>}>
      <p className="m-0 text-[15px] leading-[1.45] text-muted">{c.lead}</p>
      <Segmented value={kind} onChange={setKind} options={Object.entries(c.kinds).map(([id, label]) => ({ id, label }))} />
      <label className="block">
        <span className="sr-only">{c.placeholder}</span>
        <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 2000))} rows={6} dir="auto" placeholder={c.placeholder}
          className="w-full rounded-3xl bg-card border-0 p-4 text-[15px] leading-[1.45] text-ink resize-none !outline-none focus:ring-2 focus:ring-inset focus:ring-ink placeholder:text-muted" />
      </label>
      {error && <p className="m-0 px-1 text-[14px] text-ink" role="alert">{error}</p>}
      {history.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="px-1 text-[13px] font-semibold text-muted">{c.history}</span>
          <ul className="m-0 p-0 list-none rounded-3xl bg-card divide-y divide-hair">
            {history.slice(0, 10).map((f) => (
              <li key={f.id} className="px-4 py-3 flex flex-col gap-1">
                <span className="flex items-center justify-between gap-3 text-[12px] text-muted">
                  <span>{c.kinds[f.kind] || f.kind} · {date(f.at)}</span>
                  <span className={cx("font-semibold", f.status === "answered" && "text-ink")}>{c.status[f.status] || f.status}</span>
                </span>
                <span className="text-[14px] leading-snug line-clamp-3" dir="auto">{f.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Sheet>
  );
}
