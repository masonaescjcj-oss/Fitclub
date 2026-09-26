import React, { useState } from "react";
import { Card, Toggle } from "./ui/kit";
import { disablePush, enablePush, loadPushPrefs, pushState } from "../lib/push";

const COPY = {
  en: {
    device: "Notifications on this phone", deviceSub: "Messages and reminders, even when FitClub is closed.",
    messages: "New messages", messagesSub: "From your chats and groups.",
    reminders: "Evening reminder", remindersSub: "Around 7 pm Iran time, only on days you haven't logged anything.",
    unsupported: "This browser can't show notifications from FitClub.",
    install: "On iPhone, add FitClub to your Home Screen first (Share → Add to Home Screen), then turn notifications on from there.",
    blocked: "Notifications are blocked for FitClub in this browser's settings. Allow them there, then come back.",
    failed: "Couldn't turn notifications on. Try again in a moment.",
  },
  fa: {
    device: "اعلان‌ها روی این گوشی", deviceSub: "پیام‌ها و یادآوری‌ها، حتی وقتی فیت‌کلاب بسته است.",
    messages: "پیام‌های تازه", messagesSub: "از چت‌ها و گروه‌هایت.",
    reminders: "یادآوری عصر", remindersSub: "حدود ساعت ۷ عصر به وقت ایران، فقط روزهایی که چیزی ثبت نکرده‌ای.",
    unsupported: "این مرورگر نمی‌تواند اعلان‌های فیت‌کلاب را نشان دهد.",
    install: "در آیفون اول فیت‌کلاب را به صفحه‌ی اصلی اضافه کن (اشتراک‌گذاری ← افزودن به صفحه‌ی اصلی) و از آنجا اعلان‌ها را روشن کن.",
    blocked: "اعلان‌های فیت‌کلاب در تنظیمات این مرورگر مسدود شده‌اند. آنجا اجازه بده و برگرد.",
    failed: "اعلان‌ها روشن نشدند. کمی بعد دوباره امتحان کن.",
  },
};

function ToggleRow({ title, sub, checked, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[15px] font-semibold">{title}</span>
        <span className="text-[13px] text-muted">{sub}</span>
      </span>
      <Toggle checked={checked} onChange={onChange} label={title} disabled={disabled} />
    </div>
  );
}

/** The Notifications card in Settings: this device on or off, and what it brings. */
export default function NotificationSettings({ isRtl }) {
  const c = COPY[isRtl ? "fa" : "en"];
  const [prefs, setPrefs] = useState(loadPushPrefs);
  const [state, setState] = useState(pushState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const lang = isRtl ? "fa" : "en";

  const apply = async (next) => {
    setBusy(true); setError(null);
    try {
      if (next.on) setPrefs(await enablePush(next, lang));
      else { await disablePush(); setPrefs({ ...next, on: false }); }
    } catch (e) {
      if (e.code === "blocked") setState("blocked"); else setError(c.failed);
    } finally {
      setBusy(false);
    }
  };

  const note = state === "unsupported" ? c.unsupported : state === "ios-install" ? c.install : state === "blocked" ? c.blocked : null;

  return (
    <Card className="flex flex-col gap-3" aria-label={c.device}>
      <ToggleRow title={c.device} sub={c.deviceSub} checked={prefs.on && state === "ready"} disabled={busy || state !== "ready"}
        onChange={(on) => apply({ ...prefs, on })} />
      {prefs.on && state === "ready" && (
        <div className="flex flex-col gap-3 pt-3 border-t border-hair">
          <ToggleRow title={c.messages} sub={c.messagesSub} checked={prefs.messages} disabled={busy} onChange={(v) => apply({ ...prefs, messages: v })} />
          <ToggleRow title={c.reminders} sub={c.remindersSub} checked={prefs.reminders} disabled={busy} onChange={(v) => apply({ ...prefs, reminders: v })} />
        </div>
      )}
      {(note || error) && <p className="m-0 text-[13px] leading-snug text-muted" role="status">{error || note}</p>}
    </Card>
  );
}
