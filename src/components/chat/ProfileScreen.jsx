import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, AtSign, Cake, ChevronRight, Pencil, Phone, Settings, Smile } from "lucide-react";
import { GIFTS, TG } from "../../lib/chat/extras";
import { Sheet } from "./ChatSheets";

const AVATARS = ["🏋️", "💪", "🧗", "🏃", "🚴", "🧘", "🥇", "🦾", "😎", "🐺"];
const STATUSES = ["⭐", "🏆", "🔥", "💪", "⚡", "🥇", "🧊", "🌙", "❤️", "🫡"];

/** The gifts floating around the avatar, the way Telegram scatters them. */
const FLOATING = [
  { emoji: "🎂", top: "6%", left: "16%" }, { emoji: "🧢", top: "4%", right: "18%" },
  { emoji: "🏆", top: "30%", left: "6%" }, { emoji: "🚀", top: "28%", right: "7%" },
  { emoji: "🧸", top: "52%", left: "14%" }, { emoji: "💍", top: "50%", right: "15%" },
];

function EmojiPickSheet({ title, options, isRtl, t, onPick, onClose }) {
  return (
    <Sheet title={title} isRtl={isRtl} t={t} onClose={onClose}>
      <div className="p-4 flex flex-wrap gap-2">
        {options.map((e) => (
          <button key={e} type="button" onClick={() => onPick(e)}
            className="w-12 h-12 rounded-2xl bg-white/[0.06] hover:bg-white/15 text-2xl flex items-center justify-center active:scale-90 transition-all">
            {e}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

function EditInfoSheet({ me, isRtl, t, onSave, onClose }) {
  const [bio, setBio] = useState(me.bio);
  const [username, setUsername] = useState(me.username);
  const field = "w-full h-11 px-3 rounded-2xl bg-[#1c2733] border border-white/10 text-sm font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-white/30";
  return (
    <Sheet title={t.editInfo} isRtl={isRtl} t={t} onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose}
            className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/10 text-neutral-300 font-black text-sm">{t.cancel}</button>
          <button type="button" onClick={() => onSave({ bio: bio.trim(), username: username.trim() || me.username })}
            className="flex-1 h-12 rounded-2xl text-white font-black text-sm" style={{ background: TG.accentDeep }}>{t.save}</button>
        </>
      }>
      <div className="p-4 space-y-4">
        <label className="block">
          <span className="block text-[10px] font-black text-neutral-500 uppercase tracking-wider mb-1.5">{t.bio}</span>
          <input value={bio} onChange={(e) => setBio(e.target.value)} className={field} />
        </label>
        <label className="block">
          <span className="block text-[10px] font-black text-neutral-500 uppercase tracking-wider mb-1.5">{t.usernameLabel}</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} className={field} dir="ltr" />
        </label>
      </div>
    </Sheet>
  );
}

function InfoRow({ icon: Icon, value, label, dir }) {
  return (
    <div className="flex items-start gap-3.5 px-4 py-3">
      <Icon className="w-4 h-4 text-neutral-500 shrink-0 mt-1" />
      <span className="min-w-0">
        <span className="block text-sm font-bold text-white break-words" dir={dir}>{value}</span>
        <span className="block text-xs font-medium text-neutral-500">{label}</span>
      </span>
    </div>
  );
}

export default function ProfileScreen({ store, name, isRtl, t, onBack, onGoSettings, onOpenChannel }) {
  const me = store.me;
  const [tab, setTab] = useState("gifts");
  const [sheet, setSheet] = useState(null); // "photo" | "status" | "edit"

  const age = Math.floor((Date.now() - new Date(`${me.birthday}T00:00:00`)) / (365.25 * 86400000));
  const birthdayLabel = new Date(`${me.birthday}T00:00:00`)
    .toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="w-full min-h-[100dvh] text-white pb-10" style={{ background: TG.bg }}>
      {/* Colored header with floating gifts */}
      <div className="relative overflow-hidden pb-5" style={{ background: "linear-gradient(180deg,#7c3f78,#5b2d58)" }}>
        <button type="button" onClick={onBack} aria-label={t.close}
          className="absolute top-3 z-10 w-9 h-9 rounded-xl flex items-center justify-center text-white/90 hover:text-white ltr:left-3 rtl:right-3">
          <ArrowLeft className={`w-5 h-5 ${isRtl ? "rotate-180" : ""}`} />
        </button>

        {FLOATING.map((f, i) => (
          <span key={i} className="absolute text-xl opacity-90"
            style={{ top: f.top, left: f.left, right: f.right, filter: "drop-shadow(0 0 10px rgba(255,255,255,0.35))" }}>
            {f.emoji}
          </span>
        ))}

        <div className="pt-10 flex flex-col items-center">
          <span className="w-24 h-24 rounded-full flex items-center justify-center text-5xl bg-black/30 border-2 border-white/25">
            {me.avatar}
          </span>
          <span className="flex items-center gap-1.5 mt-3">
            <span className="text-xl font-black text-white">{name}</span>
            <button type="button" onClick={() => setSheet("status")} aria-label={t.emojiStatus}
              className="text-xl leading-none hover:scale-110 transition-transform">{me.emojiStatus}</button>
          </span>
          <span className="text-xs font-bold text-white/70 mt-0.5">{t.online}</span>

          <div className="flex gap-2 mt-4 px-4 w-full max-w-sm">
            {[
              { icon: Smile, label: t.setPhoto, act: () => setSheet("photo") },
              { icon: Pencil, label: t.editInfo, act: () => setSheet("edit") },
              { icon: Settings, label: t.settingsTitle, act: onGoSettings },
            ].map(({ icon: Icon, label, act }) => (
              <button key={label} type="button" onClick={act}
                className="flex-1 h-16 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur flex flex-col items-center justify-center gap-1 transition-colors">
                <Icon className="w-4 h-4 text-white" />
                <span className="text-[10px] font-black text-white">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Personal channel */}
      <button type="button" onClick={onOpenChannel}
        className="mx-3 mt-3 w-[calc(100%-24px)] rounded-2xl flex items-center gap-3 px-4 py-3 text-start hover:bg-white/[0.03] transition-colors"
        style={{ background: TG.surface }}>
        <span className="text-xl">📣</span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2">
            <span className="text-sm font-black" style={{ color: TG.accent }}>{t.myChannel}</span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-[9px] font-black text-neutral-300">
              12,480 {t.subscribers}
            </span>
          </span>
          <span className="block text-xs font-bold text-neutral-500 truncate">FitClub Announcements</span>
        </span>
        <ChevronRight className={`w-4 h-4 text-neutral-600 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
      </button>

      {/* Info card */}
      <div className="mx-3 mt-3 rounded-2xl overflow-hidden divide-y divide-white/[0.04]" style={{ background: TG.surface }}>
        <InfoRow icon={Phone} value={me.phone} label={t.mobile} dir="ltr" />
        <InfoRow icon={Smile} value={me.bio} label={t.bio} />
        <InfoRow icon={AtSign} value={`@${me.username}`} label={t.usernameLabel} dir="ltr" />
        <InfoRow icon={Cake} value={`${birthdayLabel} (${age} ${t.yearsOld})`} label={t.birthday} />
      </div>

      {/* Gifts / Posts */}
      <div className="mx-3 mt-3 rounded-2xl overflow-hidden" style={{ background: TG.surface }}>
        <div className="flex border-b border-white/[0.06]">
          {[["gifts", `${t.giftsTab} 🎂🏆`], ["posts", t.postsTab]].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)}
              className={`flex-1 py-3 text-xs font-black transition-colors relative ${tab === id ? "text-white" : "text-neutral-500"}`}>
              {label}
              {tab === id && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-t-full" style={{ background: TG.accentDeep }} />
              )}
            </button>
          ))}
        </div>

        {tab === "gifts" ? (
          <div className="grid grid-cols-3 gap-2 p-3">
            {GIFTS.map((g) => (
              <div key={g.id} className="rounded-2xl p-3 flex flex-col items-center gap-1.5 relative" style={{ background: g.bg }}>
                <span className="absolute top-1.5 ltr:left-1.5 rtl:right-1.5 text-[10px]">📌</span>
                <span className="text-3xl">{g.emoji}</span>
                <span className="text-[9px] font-black text-white/90 text-center leading-tight">
                  {isRtl ? g.nameFa : g.nameEn}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-10 text-center text-xs font-bold text-neutral-600">{t.noPosts}</p>
        )}
      </div>

      <AnimatePresence>
        {sheet === "photo" && (
          <EmojiPickSheet title={t.pickEmoji} options={AVATARS} isRtl={isRtl} t={t}
            onPick={(e) => { store.updateMe({ avatar: e }); setSheet(null); }} onClose={() => setSheet(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sheet === "status" && (
          <EmojiPickSheet title={t.pickStatus} options={STATUSES} isRtl={isRtl} t={t}
            onPick={(e) => { store.updateMe({ emojiStatus: e }); setSheet(null); }} onClose={() => setSheet(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sheet === "edit" && (
          <EditInfoSheet me={me} isRtl={isRtl} t={t}
            onSave={(patch) => { store.updateMe(patch); setSheet(null); }} onClose={() => setSheet(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
