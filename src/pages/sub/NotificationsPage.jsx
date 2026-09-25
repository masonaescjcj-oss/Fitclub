import React, { useState } from "react";
import { AtSign, CheckCheck, Dumbbell, Flame, Sparkles, Users } from "lucide-react";
import { Avatar, Button, Chip, IconWell, Label, Screen, TopBar, cx, num } from "../../components/ui/kit";
import { useChatStore } from "../../lib/chat/chatContext";
import { findUser } from "../../lib/chat/chatStore";
import { relativeTime } from "../../lib/chat/chatModel";

const REL = {
  en: { justNow: "now", minShort: "m", hourShort: "h", dayShort: "d" },
  fa: { justNow: "اکنون", minShort: " د", hourShort: " س", dayShort: " ر" },
};

const COPY = {
  en: {
    title: "Notifications", filter: "Filter", all: "All", mentions: "Mentions", app: "App",
    messages: "Messages", unreadMentions: "unread mentions", unread: "Unread", reply: "Reply",
    mentioned: (who, where) => <><b className="font-bold">{who}</b> mentioned you in <b className="font-bold">{where}</b></>,
    emptyMessages: "When someone mentions you in a group or you join a community, it shows up here.",
    markAll: "Mark all read",
  },
  fa: {
    title: "اعلان‌ها", filter: "فیلتر", all: "همه", mentions: "منشن‌ها", app: "اپ",
    messages: "پیام‌ها", unreadMentions: "منشن خوانده‌نشده", unread: "خوانده‌نشده", reply: "پاسخ",
    mentioned: (who, where) => <><b className="font-bold">{who}</b> در <b className="font-bold">{where}</b> از شما نام برد</>,
    emptyMessages: "وقتی کسی شما را در گروهی نام ببرد یا به کامیونیتی بپیوندید، اینجا می‌بینید.",
    markAll: "خواندن همه",
  },
};

// App alerts are still local, so which ones were read is kept on this device.
const READ_KEY = "fitclub.inbox.read";
function loadRead() {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(READ_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function saveRead(ids) {
  try {
    window.localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
  } catch {
    // Still read for this visit.
  }
}

const UnreadDot = ({ label }) => (
  <span role="img" aria-label={label} className="w-[9px] h-[9px] mt-[5px] shrink-0 rounded-full bg-inv dark:bg-accent" />
);

/** Mentions of the athlete and membership events, straight from the messenger's own data. */
function MessengerAlerts({ isRtl, onOpenChat, onlyMentions }) {
  const store = useChatStore();
  const c = COPY[isRtl ? "fa" : "en"];
  const items = store.notifications.filter((x) => !onlyMentions || x.kind === "mention");
  const t = REL[isRtl ? "fa" : "en"];
  const titleOf = (chat) => (isRtl ? chat.titleFa || chat.title : chat.title);
  const nameOf = (id) => { const u = findUser(id); return isRtl ? u.nameFa || u.name : u.name; };
  const rows = items.map((n) => ({ n, chat: store.chats.find((ch) => ch.id === n.chatId) })).filter((r) => r.chat);
  return (
    <section className="flex flex-col gap-3" aria-labelledby="inbox-messages">
      <div className="flex items-center justify-between gap-3 mt-1.5">
        <Label as="h2" id="inbox-messages" className="m-0">{c.messages}</Label>
        {store.unreadMentionTotal > 0 && (
          <span className="h-6 px-2.5 rounded-full bg-jet text-accent inline-flex items-center text-[11px] font-bold dark:ring-1 dark:ring-inset dark:ring-line">
            {num(store.unreadMentionTotal, isRtl)} {c.unreadMentions}
          </span>
        )}
      </div>
      {rows.length === 0 && (
        <p className="m-0 p-4 rounded-3xl bg-card text-sm leading-relaxed text-muted">{c.emptyMessages}</p>
      )}
      {rows.length > 0 && (
        <ul className="m-0 p-0 py-1 list-none rounded-3xl bg-card divide-y divide-hair">
          {rows.map(({ n, chat }) => {
            const mention = n.kind === "mention";
            const sender = mention ? nameOf(n.senderId) : "";
            return (
              <li key={n.id}>
                <button type="button" onClick={() => onOpenChat?.(n.chatId, n.messageId)}
                  className="w-full flex gap-3 px-4 py-3.5 text-start bg-transparent border-0 cursor-pointer text-ink active:bg-sunk transition-colors">
                  {mention ? (
                    <span className="relative shrink-0 self-start h-11">
                      <Avatar name={sender} size={44} />
                      <span aria-hidden="true" className="absolute -end-0.5 -bottom-0.5 w-5 h-5 rounded-full bg-accent text-on-accent ring-2 ring-card flex items-center justify-center">
                        <AtSign className="w-3 h-3" strokeWidth={2.6} />
                      </span>
                    </span>
                  ) : (
                    <IconWell tone="sunk" size={44} square><Users className="w-5 h-5" strokeWidth={2} /></IconWell>
                  )}
                  <span className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <span className="flex gap-2 items-start">
                      <span className={cx("flex-1 min-w-0 text-[15px] leading-snug", !n.unread && "text-ink/80")}>
                        {mention ? (
                          c.mentioned(sender, titleOf(chat))
                        ) : (
                          <span className="font-bold">{titleOf(chat)}</span>
                        )}
                      </span>
                      <span className="text-xs text-muted whitespace-nowrap" dir={isRtl ? undefined : "ltr"}>{num(relativeTime(n.at, t), isRtl)}</span>
                      {n.unread && <UnreadDot label={c.unread} />}
                    </span>
                    {mention ? (
                      <>
                        <span className="rounded-xl bg-sunk px-2.5 py-2 text-sm leading-snug text-ink/80 line-clamp-2" dir="auto">{n.text}</span>
                        <span className="self-start h-[34px] px-3.5 rounded-full bg-inv text-on-inv inline-flex items-center text-[13px] font-semibold">{c.reply}</span>
                      </>
                    ) : (
                      <span className="text-sm leading-snug text-muted truncate" dir="auto">{(isRtl && n.textFa) || n.text}</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function NotificationsPage({ onBack, isRtl, onOpenChat }) {
  const c = COPY[isRtl ? "fa" : "en"];
  const store = useChatStore();
  const [filter, setFilter] = useState("all");
  const [readIds, setReadIds] = useState(loadRead);
  const alerts = [
    { id: "workout", titleEn: "Workout reminder", titleFa: "یادآوری تمرین امروز", bodyEn: "Your Day 1 Full Body Plus workout is waiting. Stay consistent!", bodyFa: "تمرین امروز شما آماده است. زنجیره موفقیت خود را حفظ کنید!", timeEn: "10 mins ago", timeFa: "۱۰ دقیقه پیش", read: false, Icon: Dumbbell, tone: "sunk" },
    { id: "streak", titleEn: "Streak milestone reached", titleFa: "رکورد استریک جدید", bodyEn: "You achieved a 14-day workout streak. +100 bonus XP awarded!", bodyFa: "شما ۱۴ روز تمرین متوالی را ثبت کردید. ۱۰۰ امتیاز اضافه دریافت شد!", timeEn: "2 hours ago", timeFa: "۲ ساعت پیش", read: false, Icon: Flame, tone: "accent" },
    { id: "plan", titleEn: "AI plan updated v2.0", titleFa: "برنامه هوشمند به‌روزرسانی شد", bodyEn: "Your custom macros have been recalibrated based on your new weight.", bodyFa: "ماکروهای رژیم شما بر اساس وزن جدید بازسنجی شدند.", timeEn: "Yesterday", timeFa: "دیروز", read: true, Icon: Sparkles, tone: "coach" },
  ];
  const notifications = alerts.map((n) => ({ ...n, read: n.read || readIds.has(n.id) }));
  const markAppRead = (ids) => {
    const next = new Set([...readIds, ...ids]);
    setReadIds(next);
    saveRead(next);
  };
  // Mentions and joins are read by marking their chats read, as opening them would.
  const unreadChats = [...new Set(store.notifications.filter((n) => n.unread).map((n) => n.chatId))];
  const anyUnread = unreadChats.length > 0 || notifications.some((n) => !n.read);
  const markAllRead = () => {
    unreadChats.forEach((id) => store.markRead(id));
    markAppRead(notifications.map((n) => n.id));
  };

  const filters = [
    { id: "all", label: c.all },
    { id: "mentions", label: c.mentions, count: store.unreadMentionTotal },
    { id: "app", label: c.app, count: notifications.filter((x) => !x.read).length },
  ];

  return (
    <Screen isRtl={isRtl}>
      <TopBar isRtl={isRtl} onBack={onBack} title={c.title}
        right={anyUnread && (
          <Button tone="card" size="sm" onClick={markAllRead} icon={<CheckCheck className="w-4 h-4" strokeWidth={2.2} />}>{c.markAll}</Button>
        )} />

      <div role="group" aria-label={c.filter} className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5">
        {filters.map((f) => (
          <Chip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
            {f.count > 0 && (
              <span className="min-w-[18px] h-[18px] px-[5px] rounded-full bg-accent text-on-accent text-[11px] font-bold inline-flex items-center justify-center">
                {num(f.count, isRtl)}
              </span>
            )}
          </Chip>
        ))}
      </div>

      {filter !== "app" && <MessengerAlerts isRtl={isRtl} onOpenChat={onOpenChat} onlyMentions={filter === "mentions"} />}

      {filter !== "mentions" && (
        <section className="flex flex-col gap-3" aria-labelledby="inbox-app">
          <Label as="h2" id="inbox-app" className="m-0 mt-1.5">{c.app}</Label>
          <ul className="m-0 p-0 py-1 list-none rounded-3xl bg-card divide-y divide-hair">
            {notifications.map(({ Icon, ...n }) => (
              <li key={n.id} className="flex gap-3 px-4 py-3.5" onClick={() => !n.read && markAppRead([n.id])}>
                <IconWell tone={n.tone} size={44} square><Icon className="w-5 h-5" strokeWidth={2} /></IconWell>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div className="flex gap-2 items-start">
                    <span className={cx("flex-1 min-w-0 text-[15px] font-bold leading-snug", n.read && "text-ink/80")}>{isRtl ? n.titleFa : n.titleEn}</span>
                    <span className="text-xs text-muted whitespace-nowrap">{isRtl ? n.timeFa : n.timeEn}</span>
                    {!n.read && <UnreadDot label={c.unread} />}
                  </div>
                  <p className="m-0 text-sm leading-snug text-muted">{isRtl ? n.bodyFa : n.bodyEn}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Screen>
  );
}
