import React, { useMemo, useState } from "react";
import {
  AtSign, BellOff, CheckCheck, Droplets, Drumstick, Dumbbell, Flame, Hourglass, Play, Scale, Timer, Trophy, Users,
} from "lucide-react";
import { Avatar, Button, Chip, IconWell, Label, Screen, TopBar, cx, num } from "../../components/ui/kit";
import { useChatStore } from "../../lib/chat/chatContext";
import { findUser } from "../../lib/chat/chatStore";
import { relativeTime } from "../../lib/chat/chatModel";
import { useTrainingStore } from "../../lib/training/trainingContext";
import { useChecklistStore } from "../../lib/checklistContext";
import { useNutritionStore } from "../../lib/nutrition/nutritionContext";
import { appAlerts, loadReadIds, saveReadIds, unreadAppAlerts, withReadState } from "../../lib/notifications";

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
    emptyApp: "You're all caught up. Reminders from your training, checklists and food diary show up here.",
    markAll: "Read all",
  },
  fa: {
    title: "اعلان‌ها", filter: "فیلتر", all: "همه", mentions: "منشن‌ها", app: "اپ",
    messages: "پیام‌ها", unreadMentions: "منشن خوانده‌نشده", unread: "خوانده‌نشده", reply: "پاسخ",
    mentioned: (who, where) => <><b className="font-bold">{who}</b> در <b className="font-bold">{where}</b> از شما نام برد</>,
    emptyMessages: "وقتی کسی شما را در گروهی نام ببرد یا به کامیونیتی بپیوندید، اینجا می‌بینید.",
    emptyApp: "همه‌چیز خوانده شده. یادآوری‌های تمرین، چک‌لیست و دفتر غذا اینجا می‌آیند.",
    markAll: "خواندن همه",
  },
};

// App alerts are derived from the training, checklist and diary stores (see
// lib/notifications); which ones were read is kept on this device.
const ALERT_ICONS = {
  dumbbell: Dumbbell, play: Play, trophy: Trophy, flame: Flame, hourglass: Hourglass, timer: Timer,
  drumstick: Drumstick, droplets: Droplets, scale: Scale,
};

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

// Where tapping an app alert takes the athlete.
const ALERT_TARGET = {
  training: { tab: "train" },
  nutrition: { tab: "fuel" },
  checklist: { sub: "checklist" },
};

export default function NotificationsPage({ onBack, isRtl, onOpenChat, onGo }) {
  const c = COPY[isRtl ? "fa" : "en"];
  const store = useChatStore();
  const [filter, setFilter] = useState("all");
  const training = useTrainingStore();
  const checklist = useChecklistStore();
  const nutrition = useNutritionStore();
  const [readIds, setReadIds] = useState(loadReadIds);
  const alerts = useMemo(() => appAlerts({ training, checklist, nutrition }), [training, checklist, nutrition]);
  const notifications = withReadState(alerts, readIds);
  const appUnread = unreadAppAlerts(alerts, readIds);
  const rel = REL[isRtl ? "fa" : "en"];
  const markAppRead = (ids) => {
    const next = new Set([...readIds, ...ids]);
    setReadIds(next);
    saveReadIds(next);
  };
  // Mentions and joins are read by marking their chats read, as opening them would.
  const unreadChats = [...new Set(store.notifications.filter((n) => n.unread).map((n) => n.chatId))];
  const anyUnread = unreadChats.length > 0 || appUnread > 0;
  const markAllRead = () => {
    unreadChats.forEach((id) => store.markRead(id));
    markAppRead(notifications.map((n) => n.id));
  };

  const filters = [
    { id: "all", label: c.all },
    { id: "mentions", label: c.mentions, count: store.unreadMentionTotal },
    { id: "app", label: c.app, count: appUnread },
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
          {notifications.length === 0 && (
            <p className="m-0 p-4 rounded-3xl bg-card text-sm leading-relaxed text-muted flex gap-3 items-start">
              <BellOff className="w-5 h-5 shrink-0 text-faint" strokeWidth={2} />{c.emptyApp}
            </p>
          )}
          {notifications.length > 0 && (
            <ul className="m-0 p-0 py-1 list-none rounded-3xl bg-card divide-y divide-hair">
              {notifications.map((n) => {
                const Icon = ALERT_ICONS[n.icon] || Dumbbell;
                return (
                  <li key={n.id} className="list-none">
                    <button type="button"
                      onClick={() => {
                        if (!n.read) markAppRead([n.id]);
                        const target = n.kind === "streak" ? { sub: "streakDetail" } : ALERT_TARGET[n.source];
                        if (target) onGo?.(target);
                      }}
                      className="w-full flex gap-3 px-4 py-3.5 text-start bg-transparent border-0 cursor-pointer active:bg-sunk transition-colors">
                    <IconWell tone={n.tone} size={44} square><Icon className="w-5 h-5" strokeWidth={2} /></IconWell>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <div className="flex gap-2 items-start">
                        <span className={cx("flex-1 min-w-0 text-[15px] font-bold leading-snug", n.read && "text-ink/80")}>{isRtl ? n.titleFa : n.titleEn}</span>
                        <span className="text-xs text-muted whitespace-nowrap" dir={isRtl ? undefined : "ltr"}>{num(relativeTime(n.at, rel), isRtl)}</span>
                        {!n.read && <UnreadDot label={c.unread} />}
                      </div>
                      <p className="m-0 text-sm leading-snug text-muted">{isRtl ? n.bodyFa : n.bodyEn}</p>
                    </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </Screen>
  );
}
