import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle, ArrowUp, Check as CheckIcon, ChevronLeft, ChevronRight, Eye, EyeOff, KeyRound, ListChecks, ShieldCheck, SlidersHorizontal, Square, Trash2, Wand2, X,
} from "lucide-react";
import {
  Button, Card, IconButton, IconWell, Label, List, Row, Screen, Sheet, Toggle, Field, cx, num,
} from "../../components/ui/kit";
import { CoachIcon, FuelIcon, TrainIcon } from "../../components/ui/icons";
import { useCoachStore } from "../../lib/coach/coachContext";
import { useCoachT } from "../../lib/coach/coachI18n";
import { COACH_MODEL, looksLikeKey } from "../../lib/coach/claudeClient";
import useBackGesture from "../../hooks/useBackGesture";
import { parseActions, previewActions } from "../../lib/coach/actions";
import { useNutritionStore } from "../../lib/nutrition/nutritionContext";
import { useTrainingStore } from "../../lib/training/trainingContext";
import { dayKey } from "../../lib/nutrition/diaryStore";

// Coach: a lilac avatar header, the facts the coach is reading right now,
// the conversation (coach in lilac, the athlete in ink), and a composer
// that floats just above the tab bar with suggestion chips on top of it.

const timeOf = (iso, isRtl) =>
  new Date(iso).toLocaleTimeString(isRtl ? "fa-IR" : undefined, { hour: "2-digit", minute: "2-digit" });

// The coach opens full screen, without the tab bar: the composer sits on the
// bottom inset, and the pinned top bar starts right under the top one.
const DOCK_BOTTOM = "max(env(safe-area-inset-bottom), 12px)";
const BAR_TOP = "calc(env(safe-area-inset-top) + 6px)";
// A round glass button: the conversation shows through it, blurred, with the
// canvas tint keeping the icon legible over any bubble.
const GLASS = "pointer-events-auto w-11 h-11 rounded-full flex items-center justify-center border-0 p-0 cursor-pointer "
  + "bg-canvas/40 backdrop-blur-xl backdrop-saturate-150 ring-1 ring-inset ring-ink/10 shadow-lift text-ink transition-transform active:scale-95";

/* ──────────────────────────── tiny markdown ──────────────────────────── */

function Inline({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="font-bold">{p.slice(2, -2)}</strong> : <React.Fragment key={i}>{p}</React.Fragment>
  );
}

/** Enough markdown for a coach: bold, bullets, numbered steps, short headings. */
function Markdown({ text }) {
  const blocks = [];
  let list = null;
  const flush = () => { if (list) { blocks.push(list); list = null; } };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)$/);
    if (bullet) {
      const ordered = /^\s*\d/.test(line);
      if (!list || list.ordered !== ordered) { flush(); list = { type: "list", ordered, items: [] }; }
      list.items.push(bullet[1]);
      continue;
    }
    flush();
    if (!line.trim()) continue;
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    blocks.push(heading ? { type: "h", text: heading[1] } : { type: "p", text: line });
  }
  flush();
  return (
    // A Persian athlete may type English and vice versa; each bubble picks its own direction.
    <div className="flex flex-col gap-2" dir="auto">
      {blocks.map((b, i) => {
        if (b.type === "h") return <p key={i} className="m-0 font-bold pt-0.5"><Inline text={b.text} /></p>;
        if (b.type === "list") {
          const Tag = b.ordered ? "ol" : "ul";
          return (
            <Tag key={i} className={cx(b.ordered ? "list-decimal" : "list-disc", "m-0 ps-5 flex flex-col gap-1 marker:opacity-60")}>
              {b.items.map((it, k) => <li key={k}><Inline text={it} /></li>)}
            </Tag>
          );
        }
        return <p key={i} className="m-0"><Inline text={b.text} /></p>;
      })}
    </div>
  );
}

/* ──────────────────────────── pieces ──────────────────────────── */

/** Who wrote a live reply: the model the server reported, Claude when it didn't say. */
// Which model wrote a reply is known once it's finished: no label until then, rather than a guess.
const liveTag = (model, t) => (!model ? null : model.startsWith("claude") ? t.poweredBy : model.startsWith("you.com") ? "You.com" : model);

function Bubble({ msg, isRtl, t, streaming }) {
  const isAi = msg.role === "assistant";
  const empty = !msg.text.trim();
  // The action block is for the app, not the athlete: the card below the bubble shows it.
  const shown = isAi ? parseActions(msg.text).text : msg.text;
  const body = msg.refused ? t.refused : shown + (msg.truncated ? `\n${t.truncated}` : "");
  const tag = isAi && msg.source === "demo" ? t.demoTag : isAi && msg.source === "live" ? liveTag(msg.model, t) : null;
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: "easeOut" }}
      className={cx("px-3.5 py-3 text-[15px] leading-[1.45] break-words",
        isAi
          ? "self-start max-w-[88%] bg-coach text-on-accent rounded-[22px] rounded-es-lg"
          : "self-end max-w-[80%] bg-inv text-on-inv rounded-[22px] rounded-ee-lg")}>
      {isAi && empty && streaming ? (
        <span className="inline-flex items-center gap-2 text-[13px] font-medium text-on-accent/70">
          <span className="flex gap-1" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-on-accent/70 block"
                animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }} />
            ))}
          </span>
          {t.thinking}
        </span>
      ) : (
        <Markdown text={body} />
      )}
      <div className={cx("mt-1.5 flex items-center gap-1.5 font-mono text-[11px]",
        isAi ? "text-on-accent/60" : "text-on-inv/60 justify-end")}>
        {tag && <span className="h-[18px] px-1.5 rounded-full bg-on-accent/10 text-on-accent/80 inline-flex items-center">{tag}</span>}
        <span dir="ltr">{timeOf(msg.at, isRtl)}</span>
      </div>
    </motion.div>
  );
}

/**
 * The changes a reply proposes, checked against the planners: what is now and
 * what it becomes, and one tap to apply them all. Once answered, the card
 * keeps what was changed.
 */
function ActionCards({ msg, isRtl, t, onApply, onDismiss }) {
  const nutrition = useNutritionStore();
  const training = useTrainingStore();
  const { actions } = useMemo(() => parseActions(msg.text), [msg.text]);
  const answered = !!msg.actionState;
  const cards = useMemo(() => (answered || !actions.length ? [] : previewActions(actions, {
    profile: nutrition.profile, plan: nutrition.mealPlan, program: training.activeProgram,
    generator: training.activeProgram?.generator, today: dayKey(), isRtl,
  })), [answered, actions, nutrition.profile, nutrition.mealPlan, training.activeProgram, isRtl]);
  if (!actions.length) return null;
  const list = answered ? msg.actionCards || [] : cards;
  const usable = cards.filter((c) => c.ok);
  if (!answered && !list.length) return null;
  return (
    <section aria-label={t.changesTitle} className="self-start w-full max-w-[88%] rounded-[22px] bg-card text-ink p-3.5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <IconWell tone="coach" size={28}><Wand2 className="w-3.5 h-3.5" strokeWidth={2.2} /></IconWell>
        <span className="text-[13px] font-semibold">{t.changesTitle}</span>
        {answered && (
          <span className={cx("ms-auto h-6 px-2.5 rounded-full inline-flex items-center gap-1 text-[12px] font-semibold",
            msg.actionState === "applied" ? "bg-accent text-on-accent" : "bg-sunk text-muted")}>
            {msg.actionState === "applied" && <CheckIcon className="w-3.5 h-3.5" strokeWidth={2.4} />}
            {msg.actionState === "applied" ? t.applied : t.dismissed}
          </span>
        )}
      </div>
      <ul className="m-0 p-0 list-none flex flex-col gap-2.5">
        {list.map((c, i) => (
          <li key={i} className="rounded-2xl bg-sunk px-3 py-2.5 flex flex-col gap-1">
            {c.ok === false ? (
              <span className="text-[13px] text-muted">{t.cantDo}</span>
            ) : (
              <>
                <span className="text-[12px] font-semibold text-muted">{c.title}</span>
                <span className="text-[13px] leading-snug text-muted"><span className="font-semibold">{t.now}:</span> {c.before}</span>
                <span className="text-[13px] leading-snug text-ink font-medium"><span className="font-semibold">{t.then}:</span> {c.after}</span>
                {c.note && <span className="text-[12px] text-muted">{c.note}</span>}
              </>
            )}
          </li>
        ))}
      </ul>
      {!answered && usable.length > 0 && (
        <div className="flex items-center gap-2">
          <Button tone="ink" size="sm" onClick={() => onApply(msg.id, cards)}>{t.applyChanges}</Button>
          <Button tone="soft" size="sm" onClick={() => onDismiss(msg.id)}>{t.notNow}</Button>
        </div>
      )}
    </section>
  );
}

/** What the coach is looking at right now, as tappable facts. */
function ContextTiles({ snapshot, isRtl, t, onAsk }) {
  const nu = snapshot.nutrition;
  const tr = snapshot.training;
  const h = snapshot.habits;
  const n = (v) => num(typeof v === "number" ? v.toLocaleString("en-US") : v, isRtl);
  const sign = (v) => `${v >= 0 ? "+" : "−"}${n(Math.abs(v))}`;

  const tiles = [
    nu
      ? {
          id: "today", label: t.today, value: `${n(nu.today.kcal)} ${t.kcal}`,
          sub: nu.today.remaining.kcal >= 0 ? `${n(nu.today.remaining.kcal)} ${t.left}` : `${n(-nu.today.remaining.kcal)} ${t.over}`,
          ask: isRtl ? `با ${nu.today.remaining.kcal} کالری باقی‌مانده چه بخورم؟` : `What should I eat with ${nu.today.remaining.kcal} kcal left?`,
        }
      : { id: "today", label: t.today, hidden: true, sub: t.nutrition },
    tr
      ? {
          id: "next", label: t.next, value: tr.next ? tr.next.title : "—",
          sub: tr.daysSinceLast === null ? t.noWorkouts : t.trained(num(t.daysAgo(tr.daysSinceLast), isRtl)),
          ask: tr.next ? (isRtl ? `برای جلسه‌ی «${tr.next.title}» چه وزنه‌هایی بزنم؟` : `What weights should I use for ${tr.next.title}?`) : null,
        }
      : { id: "next", label: t.next, hidden: true, sub: t.training },
    nu && nu.weight
      ? {
          id: "weight", label: t.weight, value: `${n(nu.weight.trendKg)} ${t.kg}`,
          sub: t.weightChange(sign(nu.weight.changeKg), n(nu.weight.overDays)),
          ask: isRtl ? "روند وزنم را تحلیل کن" : "Analyse my weight trend",
        }
      : nu
        ? {
            id: "weight", label: t.weight, value: `${n(nu.profile.weightKg)} ${t.kg}`, sub: t.noWeights,
            ask: isRtl ? "چطور وزنم را درست پیگیری کنم؟" : "How should I track my weight?",
          }
        : null,
    h
      ? {
          id: "streak", label: t.streak, value: n(h.streak),
          sub: `${n(h.lists.reduce((a, l) => a + l.open.length, 0))} ${t.open}`,
          ask: isRtl ? "کدام کار چک‌لیست را اول انجام بدهم؟" : "Which checklist item should I do first?",
        }
      : { id: "streak", label: t.streak, hidden: true, sub: t.habits },
  ].filter(Boolean);

  return (
    <div role="group" aria-label={t.dataTitle} className="-mx-5 px-5 flex gap-2 overflow-x-auto scrollbar-hide">
      {tiles.map((c) => (
        <button key={c.id} type="button" disabled={!c.ask} onClick={() => c.ask && onAsk(c.ask)}
          className={cx("flex-[1_0_auto] min-w-[104px] max-w-[180px] rounded-2xl bg-card px-3 py-2.5 flex flex-col gap-1 text-start border-0",
            "cursor-pointer transition-transform active:scale-[0.98] disabled:cursor-default disabled:active:scale-100")}>
          <Label>{c.label}</Label>
          {c.hidden ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-muted">
              <EyeOff className="w-3.5 h-3.5" strokeWidth={2} />{t.hidden}
            </span>
          ) : (
            <span className="text-sm font-bold text-ink truncate" dir="auto">{c.value}</span>
          )}
          <span className="text-xs text-muted truncate">{c.sub}</span>
        </button>
      ))}
    </div>
  );
}

const AREAS = [
  { id: "nutrition", icon: FuelIcon },
  { id: "training", icon: TrainIcon },
  { id: "habits", icon: ListChecks },
];

function SettingsSheet({ open, coach, isRtl, t, onClose }) {
  const [key, setKey] = useState(coach.apiKey);
  const [show, setShow] = useState(false);
  const bad = key.trim() && !looksLikeKey(key);
  const save = () => { coach.setApiKey(key); onClose(); };
  // With FitClub's server behind the coach a key of your own is optional. A
  // build that forces the server would ignore one, so the field goes away.
  const keyField = !coach.proxyForced;
  const keyLabel = coach.proxyAvailable ? t.ownKey : t.apiKey;
  // Through the proxy the server picks the provider: show what last answered.
  const shownModel = coach.viaProxy ? coach.servedModel : COACH_MODEL;
  return (
    <Sheet open={open} title={t.settings} isRtl={isRtl} onClose={onClose} closeLabel={t.close}
      footer={
        <>
          <Button tone="card" className="flex-1" onClick={onClose}>{t.close}</Button>
          <Button tone="ink" className="flex-1" onClick={save} disabled={!!bad}>{t.save}</Button>
        </>
      }>
      {coach.proxyAvailable && (
        <Card className="flex items-center gap-3.5">
          {coach.viaProxy ? (
            <IconWell tone="coach" size={36}><ShieldCheck className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>
          ) : (
            <IconWell tone="sunk" size={36}><KeyRound className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>
          )}
          <span className="flex-1 min-w-0 flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold leading-snug">{coach.viaProxy ? t.proxyOn : t.ownKeyOn}</span>
            <span className="text-[13px] leading-snug text-muted">{coach.viaProxy ? t.proxyHint : t.ownKeyOnHint}</span>
          </span>
        </Card>
      )}

      {keyField && (
        <Field label={keyLabel} aria-label={keyLabel} value={key} onChange={(e) => setKey(e.target.value)}
          type={show ? "text" : "password"} dir="ltr" autoComplete="off" spellCheck={false} placeholder={t.apiKeyPh}
          inputClass="font-mono text-[15px] focus-visible:outline-none"
          error={bad ? t.apiKeyBad : undefined} hint={coach.proxyAvailable ? t.ownKeyHint : t.apiKeyHint}
          prefix={<KeyRound className="w-[18px] h-[18px] text-muted" strokeWidth={2} />}
          suffix={
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? t.hideKey : t.showKey}
              className="w-10 h-10 -me-2 rounded-full flex items-center justify-center bg-transparent border-0 text-muted cursor-pointer active:bg-sunk">
              {show ? <EyeOff className="w-[18px] h-[18px]" strokeWidth={2} /> : <Eye className="w-[18px] h-[18px]" strokeWidth={2} />}
            </button>
          } />
      )}

      <Card className="flex flex-col gap-2.5">
        <div className="flex items-center gap-3.5">
          <IconWell tone="coach" size={36}><CoachIcon size={18} /></IconWell>
          <span className="flex-1 min-w-0 flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold leading-snug">{t.model}</span>
            {shownModel ? (
              <span dir="ltr" className="self-start font-mono text-[13px] text-muted">{shownModel}</span>
            ) : (
              <span className="text-[13px] leading-snug text-muted">{t.proxyModel}</span>
            )}
          </span>
        </div>
        {shownModel?.startsWith("claude") && <p className="m-0 text-[13px] leading-snug text-muted">{t.fallbackNote}</p>}
      </Card>

      <section className="flex flex-col gap-2">
        <Label as="h3" className="m-0 px-1">{t.dataTitle}</Label>
        <p className="m-0 px-1 text-[13px] leading-snug text-muted">{t.dataHint}</p>
        <List>
          {AREAS.map((a) => (
            <Row key={a.id} isRtl={isRtl} title={t[a.id]}
              icon={<IconWell tone="sunk" size={36}><a.icon size={18} strokeWidth={2} /></IconWell>}
              right={<Toggle checked={coach.include[a.id]} label={t[a.id]} onChange={(v) => coach.setInclude({ [a.id]: v })} />} />
          ))}
        </List>
      </section>

      <List>
        <Row isRtl={isRtl} danger title={t.clear}
          icon={<IconWell tone="alert" size={36}><Trash2 className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>}
          onClick={() => { if (window.confirm(t.clearConfirm)) { coach.clear(); onClose(); } }} />
      </List>
    </Sheet>
  );
}

/* ──────────────────────────── page ──────────────────────────── */

export default function AiCoachPage({ isRtl, onClose }) {
  const t = useCoachT(isRtl);
  const coach = useCoachStore();
  const [input, setInput] = useState("");
  const [settings, setSettings] = useState(false);
  // Bumped on every open so the sheet starts from the saved key, yet can still animate out.
  const [settingsRev, setSettingsRev] = useState(0);
  const [dockH, setDockH] = useState(0);
  const inputRef = useRef(null);
  const dockRef = useRef(null);
  const Chevron = isRtl ? ChevronLeft : ChevronRight;

  const openSettings = () => { setSettingsRev((r) => r + 1); setSettings(true); };

  // The way out is always the same: the X in the pinned bar, the phone's back
  // gesture, or Escape. Back closes the settings sheet first when it is open.
  useBackGesture(Boolean(onClose), () => {
    if (settings) { setSettings(false); return "stay"; }
    onClose();
    return undefined;
  });
  useEffect(() => {
    if (!onClose || settings) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, settings]);

  // The dock changes height as the textarea grows and the chips come and go;
  // the conversation keeps that much room under its last bubble.
  useLayoutEffect(() => {
    const el = dockRef.current;
    if (!el) return undefined;
    const measure = () => setDockH(el.offsetHeight);
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The textarea grows with what is typed, up to five lines.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    // Empty, it keeps one line: a placeholder that wraps must not grow the pill.
    el.style.height = "";
    if (input) { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 128)}px`; }
  }, [input]);

  const lastText = coach.messages[coach.messages.length - 1]?.text;
  useEffect(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  }, [coach.messages.length, lastText, coach.streaming, dockH]);

  const submit = (e) => {
    e?.preventDefault();
    if (coach.streaming) return;
    const q = input.trim();
    if (!q) return;
    setInput("");
    coach.send(q);
  };

  const ask = (q) => { if (!coach.streaming) coach.send(q); };

  // Through FitClub's server an auth failure is the sign-in, not a key.
  const errorKey = coach.error === "auth" && coach.viaProxy ? "authProxy" : coach.error;
  const errorText = coach.error ? t.errors[errorKey] || t.errors.unknown : null;
  const welcome = { id: "welcome", role: "assistant", source: "system", text: t.welcome(coach.name), at: coach.messages[0]?.at || new Date().toISOString() };

  const dock = (
    <div dir={isRtl ? "rtl" : "ltr"} className="ui !bg-transparent fixed inset-x-0 bottom-0 z-40 pointer-events-none">
      <div ref={dockRef} style={{ paddingBottom: DOCK_BOTTOM }}
        className="pointer-events-auto relative w-full md:max-w-lg mx-auto px-5 pt-2 flex flex-col gap-2.5 bg-canvas">
        {/* The conversation fades out just above the chips instead of sliding under them. */}
        <span aria-hidden="true" className="absolute inset-x-0 bottom-full h-6 bg-gradient-to-t from-canvas to-canvas/0" />
        {!coach.streaming && coach.chips.length > 0 && (
          <div role="group" aria-label={t.suggestions} className="-mx-5 px-5 flex gap-2 overflow-x-auto scrollbar-hide">
            {coach.chips.map((c) => (
              <button key={c} type="button" onClick={() => ask(c)} data-chip title={c}
                className="shrink-0 max-w-[270px] h-[38px] px-3.5 rounded-full bg-card text-ink text-[13px] font-medium border-0 cursor-pointer transition-transform active:scale-[0.98]">
                <span className="block truncate" dir="auto">{c}</span>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={submit}
          className="min-h-14 rounded-[28px] bg-card shadow-lift flex items-end gap-1.5 ps-5 pe-1.5 py-1.5 focus-within:ring-2 focus-within:ring-inset focus-within:ring-ink/25 transition-shadow">
          <textarea
            ref={inputRef}
            value={input}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) submit(e); }}
            placeholder={t.placeholder}
            aria-label={t.composeLabel}
            // "auto" reads the typed text; empty, it would fall back to LTR and misplace a Persian placeholder.
            dir={input ? "auto" : isRtl ? "rtl" : "ltr"}
            className={cx("flex-1 min-w-0 h-11 max-h-32 py-[11px] resize-none border-0 bg-transparent text-[15px] leading-[22px] text-ink placeholder:text-muted outline-none focus-visible:outline-none scrollbar-hide",
              !input && "whitespace-nowrap overflow-hidden text-ellipsis")}
          />
          {coach.streaming ? (
            <IconButton label={t.stop} onClick={coach.stop} tone="inv">
              <Square className="w-4 h-4 fill-current" strokeWidth={2} />
            </IconButton>
          ) : (
            <button type="submit" disabled={!input.trim()} aria-label={t.send} title={t.send}
              className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center border-0 cursor-pointer bg-jet text-accent dark:bg-accent dark:text-on-accent transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
              <ArrowUp className="w-5 h-5" strokeWidth={2.4} />
            </button>
          )}
        </form>
      </div>
    </div>
  );

  return (
    <Screen isRtl={isRtl} tabbed style={{ paddingTop: 0, ...(dockH ? { paddingBottom: dockH + 24 } : {}) }}>
      {/* Full screen: only the two ways out float, as glass with nothing
          behind them. The coach's name sits at the top of the page between
          them and scrolls away with the conversation. */}
      <div dir={isRtl ? "rtl" : "ltr"} className="fixed inset-x-0 top-0 z-40 pointer-events-none" style={{ paddingTop: BAR_TOP }}>
        <div className="w-full md:max-w-lg mx-auto px-5 h-12 flex items-center justify-between">
          {onClose ? (
            <button type="button" onClick={onClose} aria-label={t.close} title={t.close} className={GLASS}>
              <X className="w-5 h-5" strokeWidth={2.2} />
            </button>
          ) : <span />}
          <button type="button" onClick={openSettings} aria-label={t.settings} title={t.settings} className={GLASS}>
            <SlidersHorizontal className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>
      </div>

      <header className="h-12 grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-3" style={{ marginTop: BAR_TOP }}>
        <span aria-hidden="true" />
        <div className="min-w-0 justify-self-center flex items-center gap-2.5">
          <span className="w-9 h-9 shrink-0 rounded-full bg-coach text-on-accent flex items-center justify-center ring-[3px] ring-coach/35">
            <CoachIcon size={18} />
          </span>
          <div className="min-w-0 flex flex-col gap-0.5">
            <h1 className="m-0 font-display font-extrabold text-[19px] leading-none tracking-[-0.03em] text-ink truncate">{t.title}</h1>
            <button type="button" onClick={openSettings}
              className="self-start max-w-full inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer text-[12px] leading-tight text-muted text-start">
              <span aria-hidden="true" className={cx("w-1.5 h-1.5 rounded-full shrink-0", coach.live ? "bg-coach ring-1 ring-inset ring-ink/15" : "bg-faint")} />
              <span className="truncate">{coach.live ? t.liveSub : t.demo}</span>
            </button>
          </div>
        </div>
        <span aria-hidden="true" />
      </header>

      <ContextTiles snapshot={coach.snapshot} isRtl={isRtl} t={t} onAsk={ask} />

      {!coach.live && (
        <button type="button" onClick={openSettings} aria-label={`${t.setupTitle}. ${t.addKey}`}
          className="w-full rounded-3xl bg-card p-4 flex items-start gap-3 text-start border-0 cursor-pointer transition-transform active:scale-[0.98]">
          <IconWell tone="sunk" size={40}><KeyRound className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>
          <span className="flex-1 min-w-0 flex flex-col gap-1">
            <span className="text-[15px] font-semibold text-ink">{t.setupTitle}</span>
            <span className="text-[13px] leading-snug text-muted">{t.demoHint}</span>
          </span>
          <Chevron className="w-[18px] h-[18px] mt-2.5 shrink-0 text-muted" strokeWidth={2} />
        </button>
      )}

      <div role="log" aria-label={t.conversation} aria-live="polite" className="mt-1 flex flex-col gap-2.5">
        <Bubble isRtl={isRtl} t={t} msg={welcome} />
        {coach.messages.map((m, i) => {
          const live = coach.streaming && i === coach.messages.length - 1;
          return (
            <React.Fragment key={m.id}>
              <Bubble msg={m} isRtl={isRtl} t={t} streaming={live} />
              {m.role === "assistant" && !live && (
                <ActionCards msg={m} isRtl={isRtl} t={t} onApply={coach.applyActions} onDismiss={coach.dismissActions} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {errorText && (
        <div role="alert" className="rounded-3xl bg-alert/10 px-4 py-3 flex items-start gap-3">
          <IconWell tone="alert" size={32}><AlertTriangle className="w-4 h-4" strokeWidth={2} /></IconWell>
          <div className="flex-1 min-w-0 flex flex-col items-start pt-1.5">
            <span className="text-sm font-medium leading-snug text-alert">{errorText}</span>
            {coach.error === "auth" && !coach.proxyForced && (
              <button type="button" onClick={() => { coach.dismissError(); openSettings(); }}
                className="h-10 -mb-1.5 p-0 bg-transparent border-0 cursor-pointer text-sm font-semibold text-alert underline underline-offset-[3px]">
                {t.openSettings}
              </button>
            )}
          </div>
        </div>
      )}

      {createPortal(dock, document.body)}

      <SettingsSheet key={settingsRev} open={settings} coach={coach} isRtl={isRtl} t={t} onClose={() => setSettings(false)} />
    </Screen>
  );
}
