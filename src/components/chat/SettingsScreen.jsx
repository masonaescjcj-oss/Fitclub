import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  Ban, BarChart3, BatteryMedium, BellRing, Check, ChevronLeft, ChevronRight, Crown, Folder, Gift,
  Globe, HelpCircle, Heart, KeyRound, Languages, Laptop, MessageCircle, MessagesSquare, Mic, Moon, Server, Smile, Star,
  Store, User, Zap,
} from "lucide-react";
import { AnimatePresence as AP } from "framer-motion";
import { GIFTS, PREF_TOGGLES, SETTINGS_ROWS } from "../../lib/chat/extras";
import { useTheme } from "../../lib/theme";
import { Button, Card, Field, IconWell, Label, List, Row, Screen, Sheet, Toggle, cx, num } from "../ui/kit";
import { Avatar } from "./ChatBits";
import { GiftTile, StatusIcon } from "./ProfileBits";

import { ForwardSheet } from "./ChatSheets";

/** Each settings row's icon, keyed by its id in SETTINGS_ROWS. */
const ROW_ICONS = {
  account: User, chatSettings: MessageCircle, privacy: KeyRound, notifications: BellRing,
  data: BarChart3, folders: Folder, devices: Laptop, power: BatteryMedium,
};

const well = (Icon, tone = "sunk") => (
  <IconWell tone={tone} size={36}><Icon className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>
);

/** A row with a kit toggle on the far side; the row is its label, so a tap anywhere flips it. */
function ToggleRow({ icon, label, sub, on, onChange }) {
  return (
    <li className="list-none">
      <label className="w-full min-h-[56px] flex items-center gap-3.5 px-4 py-2.5 cursor-pointer">
        {icon}
        <span className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="text-[15px] font-semibold leading-snug text-ink">{label}</span>
          {sub && <span className="text-[13px] leading-snug text-muted">{sub}</span>}
        </span>
        <Toggle checked={on} onChange={onChange} label={label} />
      </label>
    </li>
  );
}

/** A label and a quiet value, as a sheet's fact row. */
function FactRow({ label, value }) {
  return (
    <li className="list-none min-h-[52px] flex items-center justify-between gap-3 px-4 py-2.5">
      <span className="text-[15px] font-semibold text-ink">{label}</span>
      {value && <span className="text-sm text-muted text-end">{value}</span>}
    </li>
  );
}

/** Detail sheet for one settings row: prefs where they exist, facts otherwise. */
function DetailSheet({ id, me, store, theme, isRtl, t, onClose }) {
  const toggles = PREF_TOGGLES[id === "notifications" ? "notifications" : id === "data" ? "data" : id === "power" ? "power" : ""] || [];
  const label = SETTINGS_ROWS.find((r) => r.id === id)?.label;
  // Same lookup as the row itself: notifications has its own row label.
  const title = t[id === "notifications" ? "notificationsRow" : label] || t[label] || "";
  const L = (en, fa) => (isRtl ? fa : en);

  const FACTS = {
    account: [[t.mobile, <span dir="ltr">{me.phone}</span>], [t.usernameLabel, <span dir="ltr">@{me.username}</span>], [t.bio, me.bio]],
    privacy: [
      [L("Last Seen", "آخرین بازدید"), L("Everybody", "همه")],
      [L("Profile Photo", "عکس پروفایل"), L("Everybody", "همه")],
      [L("Calls", "تماس‌ها"), L("My Contacts", "مخاطبین من")],
      [L("Two-Step Verification", "تأیید دومرحله‌ای"), L("On", "روشن")],
    ],
    chatSettings: [
      [L("Wallpaper", "تصویر زمینه"), L("FitClub pattern", "طرح فیت‌کلاب")],
      [t.nightMode, theme === "dark" ? L("On", "روشن") : L("Off", "خاموش")],
      [L("Message Size", "اندازه پیام"), num(14, isRtl)],
    ],
    folders: [[t.all, ""], [t.unreadFolder, ""], [t.family, ""], [t.gym, ""], [t.work, ""], [t.people, ""]],
    devices: [[t.thisDevice, t.webSession]],
  };
  const facts = FACTS[id] || [];

  return (
    <Sheet title={title} isRtl={isRtl} closeLabel={t.close} onClose={onClose}>
      {facts.length > 0 && (
        <List>
          {facts.map(([label, value]) => <FactRow key={label} label={label} value={value} />)}
        </List>
      )}
      {toggles.length > 0 && (
        <List>
          {toggles.map((tg) => (
            <ToggleRow key={tg.key} label={t[tg.label]}
              on={me.prefs?.[tg.key] ?? tg.def}
              onChange={(v) => store.setPref(tg.key, v)} />
          ))}
        </List>
      )}
      <p className="m-0 px-1 text-[13px] leading-snug text-muted">{t.uiOnlyNote}</p>
    </Sheet>
  );
}

const FEATURES = [
  [Zap, "featLimits", "featLimitsSub"],
  [Mic, "featVoice", "featVoiceSub"],
  [Globe, "featTranslate", "featTranslateSub"],
  [Heart, "featReactions", "featReactionsSub"],
  [Smile, "featStatus", "featStatusSub"],
  [Star, "featBadge", "featBadgeSub"],
  [Ban, "featNoAds", "featNoAdsSub"],
];

function PremiumSheet({ isRtl, t, onClose }) {
  return (
    <Sheet title={t.premiumTitle} isRtl={isRtl} closeLabel={t.close} onClose={onClose}>
      <Card tone="hero" className="flex items-center gap-3.5">
        <IconWell tone="accent" size={48}><Crown className="w-6 h-6" strokeWidth={2} /></IconWell>
        <span className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="font-display font-extrabold text-[20px] leading-tight tracking-[-0.02em]">{t.premiumTitle}</span>
          <span className="text-[13px] text-hero-muted">{t.premiumActive}</span>
        </span>
      </Card>
      <List>
        {FEATURES.map(([Icon, label, sub]) => (
          <Row key={label} icon={well(Icon)} title={t[label]} subtitle={t[sub]}
            right={<Check className="w-[18px] h-[18px] text-ink" strokeWidth={2.6} />} />
        ))}
      </List>
    </Sheet>
  );
}

function GiftPicker({ me, isRtl, t, onPick, onClose }) {
  return (
    <Sheet title={t.chooseGift} isRtl={isRtl} closeLabel={t.close} onClose={onClose}>
      <div className="grid grid-cols-3 gap-2">
        {GIFTS.map((g, i) => (
          <button key={g.id} type="button" onClick={() => onPick(g)} disabled={g.stars > me.stars}
            className="rounded-[22px] border-0 p-0 bg-transparent cursor-pointer transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
            <GiftTile gift={g} index={i} isRtl={isRtl} className="!bg-card h-full">
              <span className="h-6 px-2 rounded-full bg-sunk inline-flex items-center gap-1 text-[11px] font-bold text-ink">
                <Star className="w-3 h-3" strokeWidth={2.4} />{num(g.stars, isRtl)}
              </span>
            </GiftTile>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

/** A small dot for the server's state: accent on ink when online. */
function StatusDot({ status }) {
  const tone = status === "online" ? "bg-accent ring-2 ring-jet" : status === "error" ? "bg-alert" : status === "connecting" ? "bg-ochre" : "bg-faint";
  return <span aria-hidden="true" className={cx("w-2.5 h-2.5 rounded-full shrink-0", tone)} />;
}

const serverLine = (server, t) => (
  server?.status === "online" ? t.serverSubOnline(server.url)
    : server?.status === "connecting" ? t.serverSubConnecting
      : server?.status === "error" ? t.serverSubError : t.serverSubOffline
);

/** Where the messenger talks to: sign in to a server, or stay on this device. */
function ServerSheet({ store, name, isRtl, t, onClose, onToast }) {
  const [url, setUrl] = useState(store.server?.url || process.env.REACT_APP_CHAT_API || "http://localhost:4000");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const me = store.me;
  const connected = !!store.server?.token;
  const connect = async () => {
    setBusy(true); setError("");
    try {
      const user = await store.connectServer({ url: url.trim(), name: me.name || name, username: me.username });
      onToast?.(t.connectedAs(user.name, user.username));
      onClose();
    } catch (e) {
      setError(e.code === "username_taken" ? t.serverUsernameTaken : `${t.connectFailed} ${e.message || ""}`.trim());
    } finally { setBusy(false); }
  };
  const status = store.server?.status || "offline";
  return (
    <Sheet title={t.serverTitle} isRtl={isRtl} closeLabel={t.close} onClose={onClose}
      footer={
        connected ? (
          <>
            <Button tone="card" className="flex-1 !text-alert" onClick={() => { store.disconnectServer(); onClose(); }}>{t.disconnect}</Button>
            <Button tone="ink" className="flex-1"
              onClick={() => { store.syncNow().then(() => onToast?.(t.done)).catch(() => onToast?.(t.serverSubError)); }}>{t.syncNow}</Button>
          </>
        ) : (
          <>
            <Button tone="card" className="flex-1" onClick={onClose}>{t.cancel}</Button>
            <Button tone="ink" className="flex-1" disabled={busy || !url.trim()} onClick={connect}>{busy ? t.connecting : t.connect}</Button>
          </>
        )
      }>
      <Field label={t.serverUrl} aria-label={t.serverUrl} value={url} onChange={(e) => setUrl(e.target.value)}
        disabled={connected} dir="ltr" inputMode="url" inputClass="disabled:text-muted" />
      <p className="m-0 px-1 text-[13px] leading-snug text-muted">{t.serverHint}</p>
      <Card className="flex items-start gap-3">
        <IconWell tone={status === "online" ? "inv" : "sunk"} size={36}><Server className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>
        <span className="flex-1 min-w-0 flex flex-col gap-1 text-[13px]">
          <span className="text-[15px] font-semibold text-ink">
            {connected ? t.connectedAs(store.server.me?.name || name, store.server.me?.username || me.username) : t.connectNameHint}
          </span>
          <span className={cx("inline-flex items-center gap-2", status === "error" ? "text-alert" : status === "online" ? "text-ink font-medium" : "text-muted")}
            data-server-status={status}>
            <StatusDot status={status} />
            {serverLine(store.server, t)}
          </span>
        </span>
      </Card>
      {error && <p className="m-0 px-1 text-[13px] text-alert">{error}</p>}
    </Sheet>
  );
}

/**
 * The messenger's settings, Telegram's order in the app's cards: who you
 * are, the account rows, appearance and server, Premium, and Help.
 */
export default function SettingsScreen({ store, name, isRtl, t, onGoProfile, onToast, onToggleLanguage }) {
  const me = store.me;
  const [theme, setTheme] = useTheme();
  const [detail, setDetail] = useState(null); // settings row id
  const [sheet, setSheet] = useState(null);   // "premium" | "gift" | "server"
  const [gift, setGift] = useState(null);     // chosen gift, awaiting a recipient
  const Chevron = isRtl ? ChevronLeft : ChevronRight;
  const status = store.server?.status || "offline";

  return (
    <Screen isRtl={isRtl} tabbed>
      <header className="flex items-center gap-3">
        <h1 className="m-0 flex-1 min-w-0 truncate font-display font-extrabold text-[34px] leading-none tracking-[-0.04em] text-ink">{t.settingsTitle}</h1>
        <button type="button" onClick={onGoProfile}
          className="h-11 px-[18px] rounded-full bg-card text-ink text-[15px] font-semibold border-0 cursor-pointer shrink-0 transition-transform active:scale-[0.98]">
          {t.edit}
        </button>
      </header>

      {/* Profile strip */}
      <button type="button" onClick={onGoProfile}
        className="w-full rounded-3xl bg-card px-4 py-3 flex items-center gap-3 text-start border-0 cursor-pointer transition-transform active:scale-[0.99]">
        <Avatar user={{ ...me, id: "me", name: me.name || name, online: false, emojiStatus: null }} size={52} showStatus={false} />
        <span className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="text-base font-bold text-ink truncate">{me.name || name}</span>
            <span className="w-5 h-5 rounded-full bg-jet text-accent inline-flex items-center justify-center shrink-0 dark:ring-1 dark:ring-inset dark:ring-line" aria-label={t.emojiStatus}>
              <StatusIcon status={me.emojiStatus} className="w-3 h-3" />
            </span>
          </span>
          <span className="flex flex-wrap gap-x-3 text-[13px] text-muted">
            <span dir="ltr">@{me.username}</span>
            <span dir="ltr">{me.phone}</span>
          </span>
        </span>
        <Chevron className="w-[18px] h-[18px] text-muted shrink-0" strokeWidth={2} />
      </button>

      {/* Main rows */}
      <List>
        {SETTINGS_ROWS.map((row) => (
          <Row key={row.id} isRtl={isRtl} chevron icon={well(ROW_ICONS[row.id] || User)}
            title={t[row.id === "notifications" ? "notificationsRow" : row.label] || t[row.label]}
            subtitle={t[row.sub]}
            onClick={() => setDetail(row.id)} />
        ))}
      </List>

      <Label as="h2" className="m-0 mt-2 px-1">{isRtl ? "ظاهر و اتصال" : "Appearance & server"}</Label>
      <List>
        <Row isRtl={isRtl} chevron icon={well(Languages)} title={t.language}
          right={isRtl ? "فارسی" : "English"} onClick={onToggleLanguage} />
        <ToggleRow icon={well(Moon)} label={t.nightMode} sub={t.nightModeSub}
          on={theme === "dark"} onChange={(on) => setTheme(on ? "dark" : "light")} />
        <Row isRtl={isRtl} chevron icon={well(Server, status === "online" ? "inv" : "sunk")} title={t.serverRow}
          subtitle={serverLine(store.server, t)} right={<StatusDot status={status} />}
          onClick={() => setSheet("server")} />
      </List>

      {/* Premium block */}
      <List>
        <Row isRtl={isRtl} chevron icon={well(Crown, "inv")} title={t.premiumTitle} onClick={() => setSheet("premium")} />
        <Row isRtl={isRtl} chevron icon={well(Star)} title={t.stars}
          right={<span className="font-semibold text-ink">{me.stars.toLocaleString(isRtl ? "fa-IR" : "en-US")}</span>} onClick={() => setSheet("premium")} />
        <Row isRtl={isRtl} chevron icon={well(Store)} title={t.business} onClick={() => onToast(t.uiOnlyNote)} />
        <Row isRtl={isRtl} chevron icon={well(Gift)} title={t.sendGift} onClick={() => setSheet("gift")} />
      </List>

      {/* Help */}
      <Label as="h2" className="m-0 mt-2 px-1">{t.help}</Label>
      <List>
        <Row isRtl={isRtl} chevron icon={well(MessagesSquare)} title={t.askQuestion} onClick={() => onToast(t.uiOnlyNote)} />
        <Row isRtl={isRtl} chevron icon={well(HelpCircle)} title={t.faq} onClick={() => onToast(t.uiOnlyNote)} />
      </List>

      <AnimatePresence>
        {detail && (
          <DetailSheet id={detail} me={me} store={store} theme={theme} isRtl={isRtl} t={t} onClose={() => setDetail(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sheet === "server" && (
          <ServerSheet store={store} name={name} isRtl={isRtl} t={t} onClose={() => setSheet(null)} onToast={onToast} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sheet === "premium" && <PremiumSheet isRtl={isRtl} t={t} onClose={() => setSheet(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {sheet === "gift" && !gift && (
          <GiftPicker me={me} isRtl={isRtl} t={t}
            onPick={(g) => setGift(g)}
            onClose={() => setSheet(null)} />
        )}
      </AnimatePresence>

      <AP>
        {gift && (
          <ForwardSheet
            chats={store.chats.filter((c) => c.id !== "saved" && c.type !== "channel")}
            count={1} isRtl={isRtl} t={{ ...t, forwardTo: t.giftFor }}
            onPick={(chatId) => {
              // The gift lands in the chat as a sticker, and the stars are spent.
              store.send(chatId, { kind: "sticker", media: { emoji: gift.emoji } });
              store.send(chatId, { kind: "system", text: `🎁 ${isRtl ? gift.nameFa : gift.nameEn} · ⭐ ${gift.stars}` });
              store.updateMe({ stars: Math.max(me.stars - gift.stars, 0) });
              setGift(null); setSheet(null);
              onToast(t.giftSent);
            }}
            onClose={() => { setGift(null); setSheet(null); }}
          />
        )}
      </AP>
    </Screen>
  );
}
