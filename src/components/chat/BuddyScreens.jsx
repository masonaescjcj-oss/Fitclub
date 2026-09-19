import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Heart, MapPin, Settings2, X } from "lucide-react";
import { TG } from "../../lib/chat/extras";
import { GENDERS, HABIT_LABEL, LOOKING_FOR, TIMES, WANT_LABEL, aliasOf } from "../../lib/buddy/buddyModel";
import { Sheet } from "./ChatSheets";

/** Compatibility as a ring with the number inside, the way match apps show it. */
function ScoreRing({ score, size = 72 }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const tone = score >= 70 ? "#34c759" : score >= 45 ? "#f59e0b" : "#8e8e93";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={6} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[18px] font-bold text-white tabular-nums">{score}%</span>
    </div>
  );
}

const Chip = ({ children, tone }) => (
  <span className="px-2.5 py-1 rounded-full text-[12px] font-medium" style={{ background: tone ? `${tone}22` : TG.card, color: tone || "inherit" }}>
    {children}
  </span>
);

const reasonLabel = (key, t) => {
  if (key.startsWith("habit:")) return `${t.habits}: ${t[key.slice(6)] || key.slice(6)}`;
  if (key.startsWith("want:")) return WANT_LABEL[key.slice(5)]?.[t.botName === "Teammate Bot" ? 0 : 1] || key;
  return t[key] || key;
};

/**
 * One candidate at a time: who they are (alias only), how well they fit and
 * why, then Pass or Team up. A match flips the card into a celebration.
 */
export default function BuddyDiscoverScreen({ ranked, me, isRtl, t, onLike, onPass, onOpenPrefs, onOpenChat, onClose }) {
  const [result, setResult] = useState(null); // { candidate, chatId } after a match
  const top = ranked[0];
  const fa = isRtl;

  const like = () => {
    const outcome = onLike(top.candidate, top.score);
    if (outcome?.chatId) setResult({ candidate: top.candidate, chatId: outcome.chatId, score: top.score });
  };

  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 380, damping: 40 }}
      className="fixed inset-0 z-[70] flex flex-col text-white md:max-w-lg md:mx-auto" style={{ background: TG.bg }} dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between px-3 h-12 shrink-0" style={{ background: TG.surface }}>
        <button type="button" onClick={onClose} aria-label={t.close} className="w-10 h-10 rounded-full flex items-center justify-center text-white"><X className="w-5 h-5" /></button>
        <span className="text-[17px] font-semibold">{t.discoverTitle}</span>
        <button type="button" onClick={onOpenPrefs} aria-label={t.prefsTitle} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ color: TG.accent }}><Settings2 className="w-5 h-5" /></button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4">
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div key="match" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center pt-10 space-y-4">
              <div className="mx-auto w-40 h-40 rounded-full flex items-center justify-center text-7xl" style={{ background: `linear-gradient(135deg, ${result.candidate.color}, #3390ec)` }}>🎉</div>
              <h2 className="text-3xl font-bold text-white">{t.itsMatch}</h2>
              <p className="text-[15px]" style={{ color: TG.muted }}>{t.matchSub(aliasOf(result.candidate, fa))}</p>
              <p className="text-[13px]" style={{ color: TG.muted }}>{result.score}% {t.compatible}</p>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setResult(null)} className="flex-1 h-12 rounded-full text-[15px] font-semibold text-white" style={{ background: TG.card }}>{t.keepBrowsing}</button>
                <button type="button" onClick={() => onOpenChat(result.chatId)} className="flex-1 h-12 rounded-full text-[15px] font-semibold text-white on-accent" style={{ background: TG.accentDeep }}>{t.openChat}</button>
              </div>
            </motion.div>
          ) : !top ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center pt-16 space-y-4">
              <span className="text-6xl block">🔭</span>
              <p className="text-[15px]" style={{ color: TG.muted }}>{t.noOne}</p>
              <button type="button" onClick={onOpenPrefs} className="h-11 px-5 rounded-full text-[15px] font-semibold text-white on-accent" style={{ background: TG.accentDeep }}>{t.widen}</button>
            </motion.div>
          ) : (
            <motion.div key={top.candidate.id} initial={{ opacity: 0, x: isRtl ? -40 : 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isRtl ? 40 : -40 }} transition={{ duration: 0.18 }}
              className="rounded-3xl overflow-hidden" style={{ background: TG.card, boxShadow: "0 10px 30px rgba(0,0,0,.08)" }}>
              <div className="relative h-52 flex items-center justify-center on-accent" style={{ background: `linear-gradient(160deg, ${top.candidate.color}cc, ${top.candidate.color}66)` }}>
                <span className="text-[96px] leading-none drop-shadow-xl">🎭</span>
                <div className="absolute top-3 end-3"><ScoreRing score={top.score} /></div>
                <div className="absolute bottom-3 start-4">
                  <span className="block text-[24px] font-bold text-white">{aliasOf(top.candidate, fa)}</span>
                  <span className="flex items-center gap-1 text-[13px] text-white/85"><MapPin className="w-3.5 h-3.5" /> {fa ? top.candidate.cityFa : top.candidate.city} · {top.candidate.age}</span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-[15px] leading-snug text-white">{fa ? top.candidate.bioFa : top.candidate.bio}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Chip tone={TG.accent}>🎯 {t.goalFa(top.candidate.goal)}</Chip>
                  <Chip>🏋️ {t[top.candidate.level]}</Chip>
                  <Chip>📅 {top.candidate.days} {t.daysWeek}</Chip>
                  <Chip>🕒 {t[top.candidate.time === "any" ? "anyTime" : top.candidate.time]}</Chip>
                  <Chip>🔥 {top.candidate.streak} {t.streakDays}</Chip>
                </div>
                <div>
                  <span className="block text-[12px] font-medium mb-1.5" style={{ color: TG.muted }}>{t.habits}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {top.candidate.habits.map((h) => <Chip key={h}>{HABIT_LABEL[h][fa ? 1 : 0]}</Chip>)}
                  </div>
                </div>
                <div>
                  <span className="block text-[12px] font-medium mb-1.5" style={{ color: TG.muted }}>{t.lookingFor}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {top.candidate.lookingFor.map((w) => <Chip key={w}>{WANT_LABEL[w][fa ? 1 : 0]}</Chip>)}
                  </div>
                </div>
                {top.reasons.length > 0 && (
                  <div className="rounded-2xl p-3" style={{ background: "rgba(52,199,89,.1)" }}>
                    <span className="block text-[12px] font-semibold mb-1.5" style={{ color: "#1f9d4d" }}>{t.whyMatch}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {top.reasons.slice(0, 6).map((r) => (
                        <span key={r} className="flex items-center gap-1 text-[12px] font-medium" style={{ color: "#1f9d4d" }}><Check className="w-3.5 h-3.5" /> {reasonLabel(r, t)}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <p className="text-center text-[11px] mt-4" style={{ color: TG.muted }}>{t.safety}</p>
      </div>

      {top && !result && (
        <div className="shrink-0 flex items-center justify-center gap-5 pb-8 pt-2">
          <button type="button" onClick={() => onPass(top.candidate)} aria-label={t.pass}
            className="w-16 h-16 rounded-full flex items-center justify-center active:scale-95 transition-transform" style={{ background: TG.card, color: TG.muted, boxShadow: "0 4px 14px rgba(0,0,0,.08)" }}>
            <X className="w-7 h-7" />
          </button>
          <button type="button" onClick={like} aria-label={t.like}
            className="h-16 px-7 rounded-full flex items-center gap-2 text-white text-[16px] font-semibold active:scale-95 transition-transform on-accent"
            style={{ background: "linear-gradient(135deg,#34c759,#2fa6ff)", boxShadow: "0 6px 18px rgba(47,166,255,.35)" }}>
            <Heart className="w-6 h-6" fill="currentColor" /> {t.like}
          </button>
        </div>
      )}
    </motion.div>
  );
}

const Seg = ({ options, value, onChange, label }) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map((o) => {
      const active = Array.isArray(value) ? value.includes(o.id) : value === o.id;
      return (
        <button key={o.id} type="button" onClick={() => onChange(o.id)} aria-pressed={active}
          className="px-3 h-9 rounded-full text-[13px] font-medium transition-colors"
          style={{ background: active ? TG.accentDeep : TG.card, color: active ? "#fff" : "inherit" }}>
          {label(o)}
        </button>
      );
    })}
  </div>
);

/** What the athlete is after, when they train, and who they want to see. */
export function BuddyPrefsSheet({ prefs, isRtl, t, onSave, onClose }) {
  const [p, setP] = useState(prefs);
  const fa = isRtl;
  const toggleWant = (id) => setP((s) => ({ ...s, lookingFor: s.lookingFor.includes(id) ? s.lookingFor.filter((x) => x !== id) : [...s.lookingFor, id] }));
  return (
    <Sheet title={t.prefsTitle} isRtl={isRtl} t={t} onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/10 text-neutral-300 font-black text-sm">{t.cancel}</button>
          <button type="button" onClick={() => onSave(p)} disabled={!p.lookingFor.length}
            className="flex-1 h-12 rounded-2xl text-white font-black text-sm disabled:opacity-40 on-accent" style={{ background: TG.accentDeep }}>{t.save}</button>
        </>
      }>
      <div className="p-4 space-y-5">
        <div>
          <span className="block text-[12px] font-semibold mb-2" style={{ color: TG.muted }}>{t.prefLooking}</span>
          <Seg options={LOOKING_FOR.map((id) => ({ id }))} value={p.lookingFor} onChange={toggleWant} label={(o) => WANT_LABEL[o.id][fa ? 1 : 0]} />
        </div>
        <div>
          <span className="block text-[12px] font-semibold mb-2" style={{ color: TG.muted }}>{t.prefTime}</span>
          <Seg options={TIMES.map((id) => ({ id }))} value={p.time} onChange={(time) => setP((s) => ({ ...s, time }))} label={(o) => t[o.id === "any" ? "anyTime" : o.id]} />
        </div>
        <div>
          <span className="block text-[12px] font-semibold mb-2" style={{ color: TG.muted }}>{t.prefGender}</span>
          <Seg options={GENDERS.map((id) => ({ id }))} value={p.showGender} onChange={(showGender) => setP((s) => ({ ...s, showGender }))}
            label={(o) => t[o.id === "any" ? "genderAny" : o.id === "male" ? "genderMale" : "genderFemale"]} />
        </div>
        <p className="text-[11px]" style={{ color: TG.muted }}>{t.safety}</p>
      </div>
    </Sheet>
  );
}
