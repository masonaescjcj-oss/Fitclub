import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Check, Flame, MapPin, Radar, SlidersHorizontal, Target, Users, VenetianMask, X,
} from "lucide-react";
import { CHALLENGE_KINDS, CHALLENGE_PRESETS, GENDERS, HABIT_LABEL, LOOKING_FOR, TIMES, WANT_LABEL, aliasOf } from "../../lib/buddy/buddyModel";
import { ME } from "../../lib/chat/chatModel";
import { findUser } from "../../lib/chat/chatStore";
import {
  Button, Card, Check as RoundCheck, Chip, Empty, Field, IconButton, Label, List, Segmented, Sheet, Tag, cx, num,
} from "../ui/kit";
import { Avatar } from "./ChatBits";
import { RadioMark } from "./CreateScreens";

// Persian reads a middle dot beside its digits as a zero, so it gets its own comma.
const sepOf = (isRtl) => (isRtl ? "، " : " · ");

/** The light avatar tones, picked per candidate so a card keeps its colour. */
const BANDS = ["bg-sand", "bg-sage", "bg-mist"];
const bandOf = (id) => BANDS[[...String(id)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % BANDS.length];

const timeLabel = (time, t) => t[time === "any" ? "anyTime" : time];

/** Why two athletes fit, as short lines. Shared habits fold into one line, the way the card reads best. */
function reasonLines(reasons, t, isRtl) {
  const lines = [];
  const habits = reasons.filter((r) => r.startsWith("habit:")).map((r) => HABIT_LABEL[r.slice(6)]?.[isRtl ? 1 : 0] || r.slice(6));
  for (const key of reasons) {
    if (key.startsWith("habit:")) continue;
    if (key.startsWith("want:")) lines.push(WANT_LABEL[key.slice(5)]?.[isRtl ? 1 : 0] || key);
    else lines.push(t[key] || key);
  }
  if (habits.length) lines.push(`${t.habits}: ${habits.join(isRtl ? "، " : ", ")}`);
  return lines.slice(0, 6);
}

/** Where the two of you differ on the hour you train, if you both have one. */
function mismatchLine(me, c, t, isRtl) {
  if (!me || !me.time || me.time === "any" || c.time === "any" || me.time === c.time) return null;
  return isRtl
    ? `${timeLabel(c.time, t)} تمرین می‌کند، تو ${timeLabel(me.time, t)}`
    : `Trains ${timeLabel(c.time, t).toLowerCase()}, you train ${timeLabel(me.time, t).toLowerCase()}`;
}

function CandidateCard({ entry, me, isRtl, t }) {
  const { candidate: c, score, reasons } = entry;
  const n = (v) => num(v, isRtl);
  const sep = sepOf(isRtl);
  const alias = aliasOf(c, isRtl);
  const lines = reasonLines(reasons, t, isRtl);
  const miss = mismatchLine(me, c, t, isRtl);
  return (
    <motion.div key={c.id} initial={{ opacity: 0, x: isRtl ? -40 : 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isRtl ? 40 : -40 }}
      transition={{ duration: 0.18 }} className="relative pt-5">
      {/* The next cards in the pile, peeking over the top. */}
      <span aria-hidden="true" className="absolute inset-x-6 top-0 h-[60px] rounded-[28px] bg-line" />
      <span aria-hidden="true" className="absolute inset-x-3 top-2.5 h-[60px] rounded-[30px] bg-hair" />
      <article aria-label={`${alias}, ${n(score)}%`}
        className="relative rounded-[32px] bg-card overflow-hidden shadow-[0_10px_30px_rgba(18,19,16,0.08)]">
        <div className={cx("h-[150px] p-5 flex items-end justify-between text-on-accent", bandOf(c.id))}>
          <span className="w-[84px] h-[84px] rounded-full bg-jet text-accent flex items-center justify-center ring-[5px] ring-card">
            <VenetianMask className="w-10 h-10" strokeWidth={1.8} />
          </span>
          <span className="flex flex-col items-end">
            <span className="font-display font-extrabold text-[56px] leading-[0.85] tracking-[-0.05em]">{n(score)}%</span>
            <span className="text-[13px] font-semibold">{t.compatible}</span>
          </span>
        </div>
        <div className="px-5 pt-[18px] pb-5 flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <h2 className="m-0 font-display font-extrabold text-[28px] leading-tight tracking-[-0.03em] text-ink">{alias}</h2>
            <span className="text-sm text-muted">{[t[c.level], timeLabel(c.time, t), `${n(c.days)} ${t.daysWeek}`].join(sep)}</span>
            <span className="flex items-center gap-1 text-[13px] text-muted">
              <MapPin className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />{isRtl ? c.cityFa : c.city}{sep}{n(c.age)}
            </span>
          </div>
          <p className="m-0 text-[15px] leading-[1.45] text-ink">{isRtl ? c.bioFa : c.bio}</p>
          {(lines.length > 0 || miss) && (
            <section className="flex flex-col gap-2.5" aria-label={t.whyMatch}>
              <Label as="h3" className="m-0">{t.whyMatch}</Label>
              <ul className="m-0 p-0 list-none flex flex-col gap-2.5">
                {lines.map((line) => (
                  <li key={line} className="flex items-center gap-2.5 text-[15px] text-ink">
                    <span className="w-[26px] h-[26px] shrink-0 rounded-full bg-jet text-accent flex items-center justify-center dark:ring-1 dark:ring-inset dark:ring-line">
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    </span>
                    {line}
                  </li>
                ))}
                {miss && (
                  <li className="flex items-center gap-2.5 text-[15px] text-muted">
                    <span aria-hidden="true" className="w-[26px] h-[26px] shrink-0 rounded-full ring-[1.5px] ring-inset ring-faint" />
                    {miss}
                  </li>
                )}
              </ul>
            </section>
          )}
          <div className="flex flex-wrap gap-1.5">
            <Tag><Target className="w-3.5 h-3.5" strokeWidth={2} />{t.goalFa(c.goal)}</Tag>
            <Tag><Flame className="w-3.5 h-3.5" strokeWidth={2} />{n(c.streak)} {t.streakDays}</Tag>
          </div>
          <section className="flex flex-col gap-2" aria-label={t.habits}>
            <Label as="h3" className="m-0">{t.habits}</Label>
            <div className="flex flex-wrap gap-1.5">
              {c.habits.map((h) => <Tag key={h}>{HABIT_LABEL[h][isRtl ? 1 : 0]}</Tag>)}
            </div>
          </section>
          <section className="flex flex-col gap-2" aria-label={t.lookingFor}>
            <Label as="h3" className="m-0">{t.lookingFor}</Label>
            <div className="flex flex-wrap gap-1.5">
              {c.lookingFor.map((w) => <Tag key={w}>{WANT_LABEL[w][isRtl ? 1 : 0]}</Tag>)}
            </div>
          </section>
        </div>
      </article>
    </motion.div>
  );
}

/**
 * One candidate at a time: who they are (alias only), how well they fit and
 * why, then Pass or Team up. A match turns the card into a celebration.
 */
export default function BuddyDiscoverScreen({ ranked, me, isRtl, t, onLike, onPass, onOpenPrefs, onOpenChat, onClose }) {
  const [result, setResult] = useState(null); // { candidate, chatId } after a match
  const top = ranked[0];
  const n = (v) => num(v, isRtl);
  const Back = isRtl ? ArrowRight : ArrowLeft;

  const like = () => {
    const outcome = onLike(top.candidate, top.score);
    if (outcome?.chatId) setResult({ candidate: top.candidate, chatId: outcome.chatId, score: top.score });
  };

  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 380, damping: 40 }}
      className="ui fixed inset-0 z-[70] flex flex-col md:max-w-lg md:mx-auto" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pt-[max(env(safe-area-inset-top),20px)] pb-4 flex flex-col gap-3.5">
        <div className="flex items-center justify-between gap-3 pt-3">
          <IconButton label={t.close} tone="card" onClick={onClose}><Back className="w-5 h-5" strokeWidth={2} /></IconButton>
          <Label>{isRtl ? `${n(ranked.length)} نفر در صف` : `${ranked.length} left to see`}</Label>
          <IconButton label={t.prefsTitle} tone="card" onClick={onOpenPrefs}><SlidersHorizontal className="w-5 h-5" strokeWidth={2} /></IconButton>
        </div>

        <h1 className="m-0 mt-1 font-display font-extrabold text-[36px] leading-none tracking-[-0.04em] text-ink">{t.discoverTitle}</h1>
        <p className="m-0 -mt-1 text-[15px] leading-[1.45] text-muted">
          {isRtl ? "بر اساس هدف، برنامه و عادت‌هایت. اسم‌ها تا وقتی هر دو نخواهید پنهان می‌مانند." : "Matched on your goal, schedule and habits. Names stay hidden until you both reveal."}
        </p>

        <AnimatePresence mode="wait">
          {result ? (
            <motion.div key="match" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col gap-3 pt-2">
              <Card tone="hero" className="flex flex-col items-center text-center gap-3 !py-8">
                <div aria-hidden="true" className="flex">
                  <span className="rounded-full ring-4 ring-hero"><Avatar user={findUser(ME)} size={72} showStatus={false} /></span>
                  <span className="-ms-3 w-[72px] h-[72px] rounded-full bg-accent text-on-accent flex items-center justify-center ring-4 ring-hero">
                    <VenetianMask className="w-9 h-9" strokeWidth={1.8} />
                  </span>
                </div>
                <Label className="!text-hero-muted">{n(result.score)}% {t.compatible}</Label>
                <h2 className="m-0 font-display font-extrabold text-[40px] leading-[0.95] tracking-[-0.04em]">{t.itsMatch}</h2>
                <p className="m-0 text-sm leading-relaxed text-hero-muted max-w-[280px]">{t.matchSub(aliasOf(result.candidate, isRtl))}</p>
              </Card>
              <div className="flex gap-2">
                <Button tone="card" className="flex-1" onClick={() => setResult(null)}>{t.keepBrowsing}</Button>
                <Button tone="ink" className="flex-1" onClick={() => onOpenChat(result.chatId)}>{t.openChat}</Button>
              </div>
            </motion.div>
          ) : !top ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card>
                <Empty icon={<Radar className="w-6 h-6" strokeWidth={2} />} title={t.noOne}
                  action={<Button tone="ink" onClick={onOpenPrefs}>{t.widen}</Button>} />
              </Card>
            </motion.div>
          ) : (
            <CandidateCard key={top.candidate.id} entry={top} me={me} isRtl={isRtl} t={t} />
          )}
        </AnimatePresence>
        <p className="m-0 text-center text-xs leading-relaxed text-muted px-4">{t.safety}</p>
      </div>

      {top && !result && (
        <div className="shrink-0 flex items-center gap-3 px-5 pt-2 pb-[max(env(safe-area-inset-bottom),20px)]">
          <IconButton label={t.pass} tone="card" size={64} onClick={() => onPass(top.candidate)}>
            <X className="w-6 h-6" strokeWidth={2.2} />
          </IconButton>
          <Button tone="accent" size="lg" className="flex-1 !h-16 text-[17px] font-bold" onClick={like} aria-label={t.like}
            icon={<Users className="w-[22px] h-[22px]" strokeWidth={2} />}>
            {t.like}
          </Button>
        </div>
      )}
    </motion.div>
  );
}

/** What the athlete is after, when they train, and who they want to see. */
export function BuddyPrefsSheet({ prefs, isRtl, t, onSave, onClose }) {
  const [p, setP] = useState(prefs);
  const toggleWant = (id) => setP((s) => ({ ...s, lookingFor: s.lookingFor.includes(id) ? s.lookingFor.filter((x) => x !== id) : [...s.lookingFor, id] }));
  const genderLabel = (id) => t[id === "any" ? "genderAny" : id === "male" ? "genderMale" : "genderFemale"];
  return (
    <Sheet title={t.prefsTitle} isRtl={isRtl} onClose={onClose} closeLabel={t.close}
      footer={
        <>
          <Button tone="card" className="flex-1" onClick={onClose}>{t.cancel}</Button>
          <Button tone="ink" className="flex-1" onClick={() => onSave(p)} disabled={!p.lookingFor.length}>{t.save}</Button>
        </>
      }>
      <section className="flex flex-col gap-2.5">
        <Label as="h3" className="m-0">{t.prefLooking}</Label>
        <div className="flex flex-wrap gap-1.5">
          {LOOKING_FOR.map((id) => {
            const on = p.lookingFor.includes(id);
            return (
              <Chip key={id} active={on} onClick={() => toggleWant(id)}>
                {on && <Check className="w-3.5 h-3.5" strokeWidth={2.6} />}{WANT_LABEL[id][isRtl ? 1 : 0]}
              </Chip>
            );
          })}
        </div>
      </section>
      <section className="flex flex-col gap-2.5">
        <Label as="h3" className="m-0">{t.prefTime}</Label>
        <Segmented value={p.time} onChange={(time) => setP((s) => ({ ...s, time }))}
          options={TIMES.map((id) => ({ id, label: timeLabel(id, t) }))} />
      </section>
      <section className="flex flex-col gap-2.5">
        <Label as="h3" className="m-0">{t.prefGender}</Label>
        <Segmented value={p.showGender} onChange={(showGender) => setP((s) => ({ ...s, showGender }))}
          options={GENDERS.map((id) => ({ id, label: genderLabel(id) }))} />
      </section>
      <p className="m-0 text-xs leading-relaxed text-muted">{t.safety}</p>
    </Sheet>
  );
}

/** Who joins the crew. Teammates only: the people you already matched with. */
export function CrewSheet({ matches, isRtl, t, onCreate, onClose }) {
  const [name, setName] = useState("");
  const [picked, setPicked] = useState(matches.slice(0, 3).map((m) => m.buddyId));
  const toggle = (id) => setPicked((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const label = (m) => (m.revealed ? (isRtl ? m.nameFa : m.name) : (isRtl ? m.aliasFa : m.alias));
  const n = (v) => num(v, isRtl);
  const faces = [ME, ...picked].slice(0, 6);
  return (
    <Sheet title={t.crewTitle} isRtl={isRtl} onClose={onClose} closeLabel={t.close}
      footer={
        <>
          <Button tone="card" className="flex-1" onClick={onClose}>{t.cancel}</Button>
          <Button tone="ink" className="flex-1" disabled={!picked.length} onClick={() => onCreate({ name: name.trim() || t.crewLabel, memberIds: picked })}>{t.create}</Button>
        </>
      }>
      {/* A preview of the crew: its faces, its name, how many of you. */}
      <div className="flex flex-col gap-2">
        <div aria-hidden="true" className="flex">
          {faces.map((id, i) => (
            <span key={id} className={cx("rounded-full ring-[3px] ring-canvas", i > 0 && "-ms-2")}>
              <Avatar user={findUser(id)} size={38} showStatus={false} />
            </span>
          ))}
        </div>
        <span className="font-display font-extrabold text-[26px] leading-tight tracking-[-0.03em] text-ink truncate">{name.trim() || t.crewNamePh}</span>
        <span className="text-sm text-muted">{t.crewLabel}{sepOf(isRtl)}{isRtl ? n(t.membersPicked(picked.length + 1)) : t.membersPicked(picked.length + 1)}</span>
      </div>
      <Field label={t.crewName} aria-label={t.crewName} placeholder={t.crewNamePh} value={name} onChange={(e) => setName(e.target.value)}
        prefix={<Users className="w-[18px] h-[18px] text-muted" strokeWidth={2} />} />
      <Label as="h3" className="m-0 mt-1">{t.crewPick}</Label>
      <List>
        {matches.map((m) => {
          const on = picked.includes(m.buddyId);
          return (
            // The whole row toggles; the round check is the control for keyboards and screen readers.
            <li key={m.buddyId} onClick={() => toggle(m.buddyId)}
              className="list-none min-h-[60px] flex items-center gap-3 ps-4 pe-4 py-2 cursor-pointer active:bg-sunk transition-colors">
              <RoundCheck checked={on} label={label(m)} onToggle={(e) => { e.stopPropagation(); toggle(m.buddyId); }} />
              <Avatar user={findUser(m.buddyId)} size={40} showStatus={false} />
              <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold text-ink truncate">{label(m)}</span>
                <span className="text-[13px] text-muted">{n(m.score)}% {t.compatible}</span>
              </span>
            </li>
          );
        })}
      </List>
    </Sheet>
  );
}

/** One shared goal for the week: what to count, and how much. */
export function ChallengeSheet({ isRtl, t, onStart, onClose }) {
  const [kind, setKind] = useState("volume");
  const [target, setTarget] = useState(CHALLENGE_PRESETS.volume[1]);
  const [custom, setCustom] = useState("");
  const presets = CHALLENGE_PRESETS[kind] || [];
  const value = custom ? Number(custom) : target;
  const valid = kind === "streak" || (Number.isFinite(value) && value > 0);
  const label = { volume: t.kindVolume, sessions: t.kindSessions, streak: t.kindStreak };
  const sub = { volume: t.kindVolumeSub, sessions: t.kindSessionsSub, streak: t.kindStreakSub };
  const unit = { volume: t.volumeKg, sessions: t.sessionsLabel, streak: isRtl ? "روز" : "days" };
  const figure = (v) => num(Number(v).toLocaleString("en-US"), isRtl);
  const shown = kind === "streak" ? figure(7) : valid ? figure(value) : "—";
  return (
    <Sheet title={t.challengeTitle} isRtl={isRtl} onClose={onClose} closeLabel={t.close}
      footer={
        <>
          <Button tone="card" className="flex-1" onClick={onClose}>{t.cancel}</Button>
          <Button tone="ink" className="flex-1" disabled={!valid} onClick={() => onStart({ kind, target: kind === "streak" ? null : value })}>{t.startChallenge}</Button>
        </>
      }>
      {/* What the crew will see: the goal, and the number to beat. */}
      <Card tone="hero" className="flex flex-col gap-2.5" aria-live="polite">
        <Label className="!text-hero-muted">{t.challengeTitle}</Label>
        <h3 className="m-0 font-display font-extrabold text-[24px] leading-[1.05] tracking-[-0.03em]">{label[kind]}</h3>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display font-extrabold text-[34px] leading-none tracking-[-0.04em] text-accent">{shown}</span>
          <span className="text-sm text-hero-muted">{unit[kind]}</span>
        </div>
        <span className="text-[13px] text-hero-muted">{sub[kind]}</span>
      </Card>

      <Label as="h3" className="m-0 mt-1">{t.challengeKind}</Label>
      <List role="radiogroup" aria-label={t.challengeKind}>
        {CHALLENGE_KINDS.map((k) => (
          <li key={k} className="list-none">
            <button type="button" role="radio" aria-checked={kind === k}
              onClick={() => { setKind(k); setCustom(""); setTarget((CHALLENGE_PRESETS[k] || [null])[1] ?? null); }}
              className="w-full min-h-[60px] flex items-center gap-3 px-4 py-2.5 text-start bg-transparent border-0 cursor-pointer active:bg-sunk transition-colors">
              <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold text-ink">{label[k]}</span>
                <span className="text-[13px] leading-snug text-muted">{sub[k]}</span>
              </span>
              <RadioMark on={kind === k} />
            </button>
          </li>
        ))}
      </List>

      {kind !== "streak" && (
        <>
          <Label as="h3" className="m-0 mt-1">{t.challengeTarget}</Label>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <Chip key={p} active={!custom && target === p} onClick={() => { setTarget(p); setCustom(""); }} className="tabular-nums">
                {figure(p)}
              </Chip>
            ))}
            <input value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric"
              placeholder={t.customTarget} aria-label={t.customTarget} dir="ltr"
              className={cx("w-28 h-9 px-4 rounded-full text-sm font-medium tabular-nums border-0 outline-none focus-visible:outline-none placeholder:text-muted/70",
                "focus:ring-2 focus:ring-inset focus:ring-ink transition-shadow",
                custom ? "bg-inv text-on-inv placeholder:text-on-inv/60" : "bg-card text-ink")} />
          </div>
        </>
      )}
    </Sheet>
  );
}

/** Why someone is being reported. Nothing leaves the device yet; the flow is what matters. */
export function ReportSheet({ name, isRtl, t, onSend, onClose }) {
  const [reason, setReason] = useState(null);
  const reasons = [["spam", t.reportSpam], ["harass", t.reportHarass], ["fake", t.reportFake], ["other", t.reportOther]];
  return (
    <Sheet title={`${t.reportTitle} ${name}`} isRtl={isRtl} onClose={onClose} closeLabel={t.close}
      footer={
        <>
          <Button tone="card" className="flex-1" onClick={onClose}>{t.cancel}</Button>
          <Button tone="ink" className="flex-1 !bg-alert !text-hero-fg dark:!text-jet" disabled={!reason} onClick={() => onSend(reason)}>{t.report}</Button>
        </>
      }>
      <Label as="h3" className="m-0">{t.reportWhy}</Label>
      <List role="radiogroup" aria-label={t.reportWhy}>
        {reasons.map(([id, text]) => (
          <li key={id} className="list-none">
            <button type="button" onClick={() => setReason(id)} role="radio" aria-checked={reason === id}
              className="w-full min-h-[56px] flex items-center justify-between gap-3 px-4 py-2.5 text-start bg-transparent border-0 cursor-pointer active:bg-sunk transition-colors">
              <span className="text-[15px] font-medium text-ink">{text}</span>
              <RadioMark on={reason === id} alert />
            </button>
          </li>
        ))}
      </List>
    </Sheet>
  );
}
