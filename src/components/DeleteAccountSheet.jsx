import React, { useState } from "react";
import { Button, Sheet, Toggle } from "./ui/kit";
import { deleteAccount } from "../lib/backend/account";

const COPY = {
  en: {
    title: "Delete account",
    lead: "This deletes everything FitClub keeps about you, on every device. It can't be undone.",
    goes: [
      "Your profile, photo and username",
      "Your workouts, food diary, checklists, coach chats and settings",
      "The messages and photos you sent: others see them as deleted",
      "Your private chats, for both sides",
      "Your place on leaderboards, your notifications and your messages to the team",
    ],
    passes: "Groups, channels and shared lists you own pass to their longest-standing admin or member.",
    email: "Your email sign-in stays, so signing in again later starts an empty account. To have it removed too, write to us from Help & feedback first.",
    understand: "I understand this can't be undone",
    delete: "Delete my account", deleting: "Deleting…", close: "Close",
    network: "No connection. Nothing was deleted; try again when you're online.",
    failed: "Couldn't delete the account. Try again in a moment.",
  },
  fa: {
    title: "حذف حساب",
    lead: "هر چه فیت‌کلاب از تو نگه داشته، روی همه‌ی دستگاه‌ها پاک می‌شود. این کار برگشت ندارد.",
    goes: [
      "پروفایل، عکس و نام کاربری‌ات",
      "تمرین‌ها، دفترچه‌ی غذا، چک‌لیست‌ها، گفتگوهای مربی و تنظیماتت",
      "پیام‌ها و عکس‌هایی که فرستاده‌ای: دیگران آن‌ها را پاک‌شده می‌بینند",
      "چت‌های خصوصی‌ات، برای هر دو طرف",
      "جایگاهت در جدول رتبه‌بندی، اعلان‌ها و پیام‌هایت به تیم",
    ],
    passes: "گروه‌ها، کانال‌ها و لیست‌های مشترکی که مال توست به قدیمی‌ترین مدیر یا عضوشان می‌رسد.",
    email: "ورودت با ایمیل می‌ماند، پس اگر بعداً دوباره وارد شوی حسابی خالی شروع می‌شود. اگر می‌خواهی آن هم پاک شود، اول از «راهنما و بازخورد» به ما بنویس.",
    understand: "می‌دانم این کار برگشت ندارد",
    delete: "حذف همیشگی حساب", deleting: "در حال حذف…", close: "بستن",
    network: "اینترنت وصل نیست. چیزی پاک نشد؛ وقتی آنلاین شدی دوباره امتحان کن.",
    failed: "حساب حذف نشد. کمی بعد دوباره امتحان کن.",
  },
};

/** Deleting the account from inside the app (supabase/migrations/0011). */
export default function DeleteAccountSheet({ isRtl, onClose, onDeleted }) {
  const c = COPY[isRtl ? "fa" : "en"];
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setBusy(true); setError(null);
    const res = await deleteAccount();
    if (res.error) { setBusy(false); setError(res.error === "network" || res.error === "offline" ? c.network : c.failed); return; }
    onDeleted?.();
  };

  return (
    <Sheet title={c.title} isRtl={isRtl} onClose={busy ? undefined : onClose} closeLabel={c.close}
      footer={(
        <Button tone="ink" size="lg" block className="!bg-alert !text-hero-fg dark:!text-jet" disabled={!sure || busy} onClick={run} aria-busy={busy}>
          {busy ? c.deleting : c.delete}
        </Button>
      )}>
      <p className="m-0 text-[15px] leading-[1.45] font-semibold text-ink">{c.lead}</p>
      <ul className="m-0 ps-5 flex flex-col gap-1.5 text-[14px] leading-[1.45] text-ink">
        {c.goes.map((line) => <li key={line}>{line}</li>)}
      </ul>
      <p className="m-0 text-[14px] leading-[1.45] text-muted">{c.passes}</p>
      <p className="m-0 text-[14px] leading-[1.45] text-muted">{c.email}</p>
      <label className="flex items-center justify-between gap-3 rounded-3xl bg-card px-4 py-3">
        <span className="text-[15px] font-medium">{c.understand}</span>
        <Toggle checked={sure} onChange={setSure} label={c.understand} disabled={busy} />
      </label>
      {error && <p className="m-0 px-1 text-[14px] text-alert" role="alert">{error}</p>}
    </Sheet>
  );
}
