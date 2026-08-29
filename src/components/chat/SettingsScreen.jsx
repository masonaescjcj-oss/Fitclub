import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, ChevronRight, Gift, Star } from "lucide-react";
import { AnimatePresence as AP } from "framer-motion";
import { GIFTS, PREF_TOGGLES, SETTINGS_ROWS, TG } from "../../lib/chat/extras";

import { Sheet, ForwardSheet } from "./ChatSheets";

function Row({ icon, tint, label, sub, value, isRtl, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-white/[0.04] transition-colors text-start">
      <span className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
        style={{ background: tint }}>
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-white truncate">{label}</span>
        {sub && <span className="block text-xs font-medium text-neutral-500 truncate">{sub}</span>}
      </span>
      {value && <span className="text-sm font-bold shrink-0" style={{ color: TG.accent }}>{value}</span>}
      <ChevronRight className={`w-4 h-4 text-neutral-600 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
    </button>
  );
}

function Toggle({ label, on, isRtl, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
      className="w-full flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-sm font-bold text-white text-start">{label}</span>
      <span className={`w-11 h-6 rounded-full p-0.5 shrink-0 transition-colors ${on ? "" : "bg-white/10"}`}
        style={on ? { background: TG.accentDeep } : undefined}>
        <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${
          on ? (isRtl ? "-translate-x-5" : "translate-x-5") : ""
        }`} />
      </span>
    </button>
  );
}

/** Detail sheet for one settings row: prefs where they exist, facts otherwise. */
function DetailSheet({ id, me, store, isRtl, t, onClose }) {
  const toggles = PREF_TOGGLES[id === "notifications" ? "notifications" : id === "data" ? "data" : id === "power" ? "power" : ""] || [];
  const title = t[SETTINGS_ROWS.find((r) => r.id === id)?.label] || "";

  const FACTS = {
    account: [[t.mobile, me.phone], [t.usernameLabel, `@${me.username}`], [t.bio, me.bio]],
    privacy: [["Last Seen", "Everybody"], ["Profile Photo", "Everybody"], ["Calls", "My Contacts"], ["Two-Step Verification", "On"]],
    chatSettings: [["Wallpaper", "FitClub pattern"], ["Night Mode", "Always on"], ["Message Size", "14"]],
    folders: [["All", ""], ["Unread", ""], ["Personal", ""], ["Groups", ""], ["Channels", ""]],
    devices: [[t.thisDevice, t.webSession]],
  };
  const facts = FACTS[id] || [];

  return (
    <Sheet title={title} isRtl={isRtl} t={t} onClose={onClose}>
      <div className="py-1">
        {facts.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.04]">
            <span className="text-sm font-bold text-white">{label}</span>
            <span className="text-xs font-bold text-neutral-500 text-end">{value}</span>
          </div>
        ))}
        {toggles.map((tg) => (
          <Toggle key={tg.key} label={t[tg.label]} isRtl={isRtl}
            on={me.prefs?.[tg.key] ?? tg.def}
            onChange={(v) => store.setPref(tg.key, v)} />
        ))}
        <p className="px-4 py-3 text-[10px] font-bold text-neutral-600">{t.uiOnlyNote}</p>
      </div>
    </Sheet>
  );
}

const FEATURES = [
  ["⚡", "featLimits", "featLimitsSub"],
  ["🎤", "featVoice", "featVoiceSub"],
  ["🌐", "featTranslate", "featTranslateSub"],
  ["❤️", "featReactions", "featReactionsSub"],
  ["😀", "featStatus", "featStatusSub"],
  ["⭐", "featBadge", "featBadgeSub"],
  ["🚫", "featNoAds", "featNoAdsSub"],
];

function PremiumSheet({ isRtl, t, onClose }) {
  return (
    <Sheet title={t.premiumTitle} isRtl={isRtl} t={t} onClose={onClose}>
      <div className="p-4 space-y-4">
        <div className="p-4 rounded-2xl text-center space-y-1"
          style={{ background: "linear-gradient(135deg,#8b5cf6,#3390ec)" }}>
          <span className="text-3xl block">⭐</span>
          <span className="block text-sm font-black text-white">{t.premiumActive}</span>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: TG.card }}>
          {FEATURES.map(([emoji, label, sub]) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0">
              <span className="text-xl shrink-0">{emoji}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-white">{t[label]}</span>
                <span className="block text-xs font-medium text-neutral-500">{t[sub]}</span>
              </span>
              <Check className="w-4 h-4 shrink-0" style={{ color: TG.accent }} />
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

function GiftPicker({ me, isRtl, t, onPick, onClose }) {
  return (
    <Sheet title={t.chooseGift} isRtl={isRtl} t={t} onClose={onClose}>
      <div className="p-4 grid grid-cols-3 gap-2">
        {GIFTS.map((g) => (
          <button key={g.id} type="button" onClick={() => onPick(g)}
            disabled={g.stars > me.stars}
            className="rounded-2xl p-3 flex flex-col items-center gap-1.5 disabled:opacity-40 active:scale-95 transition-transform"
            style={{ background: g.bg }}>
            <span className="text-3xl">{g.emoji}</span>
            <span className="text-[10px] font-black text-white text-center leading-tight">
              {isRtl ? g.nameFa : g.nameEn}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-black/30 text-[10px] font-black text-amber-300">
              ⭐ {g.stars}
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

export default function SettingsScreen({ store, name, isRtl, t, onBack, onGoProfile, onToast, onToggleLanguage }) {
  const me = store.me;
  const [detail, setDetail] = useState(null); // settings row id
  const [sheet, setSheet] = useState(null);   // "premium" | "gift"
  const [gift, setGift] = useState(null);     // chosen gift, awaiting a recipient

  return (
    <div className="w-full min-h-[100dvh] text-white pb-8" style={{ background: TG.bg }}>
      <div className="sticky top-0 z-20 flex items-center gap-2 px-3 h-14 border-b border-white/[0.07]"
        style={{ background: TG.surface }}>
        <button type="button" onClick={onBack} aria-label={t.close}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-300 hover:text-white shrink-0">
          <ArrowLeft className={`w-5 h-5 ${isRtl ? "rotate-180" : ""}`} />
        </button>
        <h1 className="text-lg font-black text-white flex-1">{t.settingsTitle}</h1>
      </div>

      {/* Profile strip */}
      <button type="button" onClick={onGoProfile}
        className="w-full flex items-center gap-3.5 px-4 py-4 hover:bg-white/[0.03] transition-colors text-start"
        style={{ background: TG.surface }}>
        <span className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0"
          style={{ background: "linear-gradient(135deg,#3390ec55,#3390ec22)", border: "1.5px solid #3390ec77" }}>
          {me.avatar}
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="text-base font-black text-white truncate">{name}</span>
            <span className="text-base leading-none">{me.emojiStatus}</span>
          </span>
          <span className="block text-xs font-bold text-neutral-500" dir="ltr">{me.phone} · @{me.username}</span>
        </span>
        <ChevronRight className={`w-4 h-4 text-neutral-600 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
      </button>

      {/* Main rows */}
      <div className="mx-3 mt-3 rounded-2xl overflow-hidden divide-y divide-white/[0.04]" style={{ background: TG.surface }}>
        {SETTINGS_ROWS.map((row) => (
          <Row isRtl={isRtl} key={row.id} icon={row.icon} tint={row.tint}
            label={t[row.id === "notifications" ? "notificationsRow" : row.label] || t[row.label]}
            sub={t[row.sub]}
            onClick={() => setDetail(row.id)} />
        ))}
        <Row isRtl={isRtl} icon="🌐" tint="#8b5cf6" label={t.language}
          sub={isRtl ? "فارسی" : "English"}
          onClick={onToggleLanguage} />
      </div>

      {/* Premium block */}
      <div className="mx-3 mt-3 rounded-2xl overflow-hidden divide-y divide-white/[0.04]" style={{ background: TG.surface }}>
        <Row isRtl={isRtl} icon="⭐" tint="linear-gradient(135deg,#8b5cf6,#3390ec)" label={t.premiumTitle}
          onClick={() => setSheet("premium")} />
        <Row isRtl={isRtl} icon={<Star className="w-4 h-4 text-white fill-white" />} tint="#f59e0b" label={t.stars}
          value={me.stars.toLocaleString()} onClick={() => setSheet("premium")} />
        <Row isRtl={isRtl} icon="🏪" tint="#ef4444" label={t.business} onClick={() => onToast(t.uiOnlyNote)} />
        <Row isRtl={isRtl} icon={<Gift className="w-4 h-4 text-white" />} tint="#e0567d" label={t.sendGift}
          onClick={() => setSheet("gift")} />
      </div>

      {/* Help */}
      <div className="mx-3 mt-3 rounded-2xl overflow-hidden divide-y divide-white/[0.04]" style={{ background: TG.surface }}>
        <span className="block px-4 pt-3 pb-1 text-xs font-bold" style={{ color: TG.accent }}>{t.help}</span>
        <Row isRtl={isRtl} icon="💬" tint="#f59e0b" label={t.askQuestion} onClick={() => onToast(t.uiOnlyNote)} />
        <Row isRtl={isRtl} icon="❓" tint="#3390ec" label={t.faq} onClick={() => onToast(t.uiOnlyNote)} />
      </div>

      <AnimatePresence>
        {detail && (
          <DetailSheet id={detail} me={me} store={store} isRtl={isRtl} t={t} onClose={() => setDetail(null)} />
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
    </div>
  );
}
