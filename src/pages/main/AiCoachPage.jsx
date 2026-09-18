import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle, Bot, Brain, CheckSquare, Dumbbell, Eye, EyeOff, Flame, KeyRound, Scale, Send, Settings2, Sparkles, Square, Trash2, User, WifiOff,
} from "lucide-react";
import { useCoachStore } from "../../lib/coach/coachContext";
import { useCoachT } from "../../lib/coach/coachI18n";
import { COACH_MODEL, looksLikeKey } from "../../lib/coach/claudeClient";
import { Sheet } from "../../components/training/TrainingSheets";
import { Toggle } from "../../components/diet/SmallSheets";

const timeOf = (iso) => new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

/* ──────────────────────────── tiny markdown ──────────────────────────── */

function Inline({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="font-black text-white">{p.slice(2, -2)}</strong> : <React.Fragment key={i}>{p}</React.Fragment>
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
    <div className="space-y-1.5" dir="auto">
      {blocks.map((b, i) => {
        if (b.type === "h") return <p key={i} className="font-black text-white pt-0.5"><Inline text={b.text} /></p>;
        if (b.type === "list") {
          const Tag = b.ordered ? "ol" : "ul";
          return (
            <Tag key={i} className={`${b.ordered ? "list-decimal" : "list-disc"} ps-4 space-y-1 marker:text-neutral-500`}>
              {b.items.map((it, k) => <li key={k}><Inline text={it} /></li>)}
            </Tag>
          );
        }
        return <p key={i}><Inline text={b.text} /></p>;
      })}
    </div>
  );
}

/* ──────────────────────────── pieces ──────────────────────────── */

function Bubble({ msg, isRtl, t, streaming }) {
  const isAi = msg.role === "assistant";
  const empty = !msg.text.trim();
  const body = msg.refused ? t.refused : msg.text + (msg.truncated ? `\n${t.truncated}` : "");
  return (
    <div className={`flex items-end gap-2 ${isAi ? "" : "flex-row-reverse"}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isAi ? "bg-[#844783] text-white" : "bg-neutral-800 text-neutral-300"}`}>
        {isAi ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
      </div>
      <div
        className={`max-w-[82%] px-3.5 py-2.5 text-[13px] leading-relaxed font-medium ${
          isAi
            ? `bg-[#141416] border border-white/10 text-neutral-100 rounded-2xl ${isRtl ? "rounded-br-md" : "rounded-bl-md"}`
            : `bg-gradient-to-br from-[#844783] to-[#9b4f9a] text-white rounded-2xl shadow-md ${isRtl ? "rounded-bl-md" : "rounded-br-md"}`
        }`}
      >
        {isAi && empty && streaming ? (
          <span className="inline-flex items-center gap-1.5 text-neutral-400 text-xs font-bold">
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-[#a356a2] block"
                  animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }} />
              ))}
            </span>
            {t.thinking}
          </span>
        ) : (
          <Markdown text={body} />
        )}
        <div className={`flex items-center gap-1.5 mt-1 text-[9px] font-bold ${isAi ? "text-neutral-500" : "text-white/60"} ${isRtl ? "justify-start" : "justify-end"}`}>
          {isAi && msg.source === "demo" && <span className="px-1 rounded bg-amber-500/15 text-amber-300">{t.demoTag}</span>}
          {isAi && msg.source === "live" && <span className="px-1 rounded bg-emerald-500/15 text-emerald-300">{t.poweredBy}</span>}
          <span dir="ltr">{timeOf(msg.at)}</span>
        </div>
      </div>
    </div>
  );
}

/** What the coach is looking at right now, as tappable facts. */
function ContextStrip({ snapshot, isRtl, t, onAsk }) {
  const n = snapshot.nutrition;
  const tr = snapshot.training;
  const h = snapshot.habits;
  const sign = (v) => `${v >= 0 ? "+" : "−"}${Math.abs(v)}`;

  const cards = [
    n
      ? { icon: Flame, color: "#f59e0b", label: t.today, value: `${n.today.kcal} / ${n.targets.kcal}`, sub: `${n.today.remaining.kcal} kcal ${t.left} · P ${n.today.remaining.protein} g`,
          ask: isRtl ? `با ${n.today.remaining.kcal} کالری باقی‌مانده چه بخورم؟` : `What should I eat with ${n.today.remaining.kcal} kcal left?` }
      : { icon: EyeOff, color: "#71717a", label: t.today, value: t.hidden, sub: t.nutrition, ask: null },
    tr
      ? { icon: Dumbbell, color: "#38bdf8", label: t.next, value: tr.next ? tr.next.title : "—", sub: `${t.lastTrained}: ${tr.daysSinceLast === null ? t.noWorkouts : t.daysAgo(tr.daysSinceLast)}`,
          ask: tr.next ? (isRtl ? `برای جلسه‌ی «${tr.next.title}» چه وزنه‌هایی بزنم؟` : `What weights should I use for ${tr.next.title}?`) : null }
      : { icon: EyeOff, color: "#71717a", label: t.next, value: t.hidden, sub: t.training, ask: null },
    n && n.weight
      ? { icon: Scale, color: "#a356a2", label: t.weight, value: `${n.weight.trendKg} kg`, sub: `${sign(n.weight.changeKg)} kg · ${n.weight.overDays}d`,
          ask: isRtl ? "روند وزنم را تحلیل کن" : "Analyse my weight trend" }
      : n ? { icon: Scale, color: "#a356a2", label: t.weight, value: `${n.profile.weightKg} kg`, sub: t.noWeights, ask: isRtl ? "چطور وزنم را درست پیگیری کنم؟" : "How should I track my weight?" } : null,
    h
      ? { icon: CheckSquare, color: "#10b981", label: t.streak, value: `${h.streak}`, sub: `${t.periods} · ${h.lists.reduce((a, l) => a + l.open.length, 0)} ${isRtl ? "کار باز" : "open"}`,
          ask: isRtl ? "کدام کار چک‌لیست را اول انجام بدهم؟" : "Which checklist item should I do first?" }
      : { icon: EyeOff, color: "#71717a", label: t.streak, value: t.hidden, sub: t.habits, ask: null },
  ].filter(Boolean);

  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] font-black text-neutral-500 uppercase tracking-wider mb-1.5">
        <Eye className="w-3 h-3" /> {t.seesTitle}
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
        {cards.map((c) => (
          <button key={c.label} type="button" disabled={!c.ask} onClick={() => c.ask && onAsk(c.ask)}
            className="shrink-0 min-w-[132px] p-2.5 rounded-2xl bg-[#141416] border border-white/10 text-start disabled:opacity-60 hover:border-white/25 transition-colors">
            <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider" style={{ color: c.color }}>
              <c.icon className="w-3 h-3" /> {c.label}
            </span>
            <span className="block text-sm font-black text-white tabular-nums truncate mt-0.5" dir="auto">{c.value}</span>
            <span className="block text-[9px] font-bold text-neutral-500 truncate">{c.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingsSheet({ coach, isRtl, t, onClose }) {
  const [key, setKey] = useState(coach.apiKey);
  const [show, setShow] = useState(false);
  const bad = key.trim() && !looksLikeKey(key);
  const save = () => { coach.setApiKey(key); onClose(); };
  return (
    <Sheet title={t.settings} isRtl={isRtl} t={t} onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="flex-1 h-11 rounded-2xl bg-white/5 border border-white/10 text-sm font-black text-neutral-300">{t.close}</button>
          <button type="button" onClick={save} disabled={!!bad} className="flex-1 h-11 rounded-2xl bg-[#844783] text-sm font-black text-white disabled:opacity-40">{t.save}</button>
        </>
      }>
      <div>
        <span className="block text-[10px] font-black text-neutral-500 uppercase tracking-wider mb-1.5">{t.apiKey}</span>
        <div className="relative">
          <KeyRound className={`w-4 h-4 text-neutral-500 absolute top-1/2 -translate-y-1/2 ${isRtl ? "right-3" : "left-3"}`} />
          <input value={key} onChange={(e) => setKey(e.target.value)} type={show ? "text" : "password"} dir="ltr" autoComplete="off" spellCheck={false}
            placeholder={t.apiKeyPh} aria-label={t.apiKey}
            className={`w-full h-11 rounded-2xl bg-[#141416] border text-sm font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-white/30 ${bad ? "border-rose-500/60" : "border-white/10"} ${isRtl ? "pr-10 pl-10" : "pl-10 pr-10"}`} />
          <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "hide" : "show"}
            className={`absolute top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white ${isRtl ? "left-3" : "right-3"}`}>
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className={`text-[10px] font-bold mt-1.5 leading-relaxed ${bad ? "text-rose-300" : "text-neutral-500"}`}>{bad ? t.apiKeyBad : t.apiKeyHint}</p>
      </div>

      <div className="p-3 rounded-2xl bg-[#141416] border border-white/10 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">{t.model}</span>
          <span className="text-xs font-black text-white" dir="ltr">{COACH_MODEL}</span>
        </div>
        <p className="text-[10px] font-bold text-neutral-500 leading-relaxed">{t.fallbackNote}</p>
      </div>

      <div className="p-3 rounded-2xl bg-[#141416] border border-white/10">
        <span className="block text-[10px] font-black text-neutral-500 uppercase tracking-wider">{t.dataTitle}</span>
        <p className="text-[10px] font-bold text-neutral-500 mb-2 leading-relaxed">{t.dataHint}</p>
        <Toggle label={t.nutrition} on={coach.include.nutrition} isRtl={isRtl} onChange={(nutrition) => coach.setInclude({ nutrition })} />
        <Toggle label={t.training} on={coach.include.training} isRtl={isRtl} onChange={(training) => coach.setInclude({ training })} />
        <Toggle label={t.habits} on={coach.include.habits} isRtl={isRtl} onChange={(habits) => coach.setInclude({ habits })} />
      </div>

      <button type="button" onClick={() => { if (window.confirm(t.clearConfirm)) { coach.clear(); onClose(); } }}
        className="w-full h-11 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-black flex items-center justify-center gap-2">
        <Trash2 className="w-4 h-4" /> {t.clear}
      </button>
    </Sheet>
  );
}

/* ──────────────────────────── page ──────────────────────────── */

export default function AiCoachPage({ isRtl }) {
  const t = useCoachT(isRtl);
  const coach = useCoachStore();
  const [input, setInput] = useState("");
  const [settings, setSettings] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const lastText = coach.messages[coach.messages.length - 1]?.text;
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [coach.messages.length, lastText, coach.streaming]);

  const submit = (e) => {
    e?.preventDefault();
    if (coach.streaming) return;
    const q = input.trim();
    if (!q) return;
    setInput("");
    coach.send(q);
  };

  const ask = (q) => { if (!coach.streaming) coach.send(q); };

  const errorText = coach.error ? t.errors[coach.error] || t.errors.unknown : null;
  const status = useMemo(() => (coach.live
    ? { text: `${t.connected} · ${t.poweredBy}`, cls: "text-emerald-400", dot: "bg-emerald-500" }
    : { text: t.demo, cls: "text-amber-300", dot: "bg-amber-400" }), [coach.live, t]);

  return (
    <div className="w-full bg-black text-white flex flex-col px-4 pt-4" style={{ height: "calc(100dvh - 65px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#844783] to-[#a356a2] flex items-center justify-center text-white shadow-lg shadow-[#844783]/30 shrink-0">
            <Brain className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-black text-white leading-tight truncate">{t.title}</h1>
            <button type="button" onClick={() => setSettings(true)} className={`text-[11px] font-bold flex items-center gap-1.5 ${status.cls}`}>
              <span className={`w-2 h-2 rounded-full ${status.dot} ${coach.live ? "animate-pulse" : ""}`} />
              {status.text}
            </button>
          </div>
        </div>
        <button type="button" onClick={() => setSettings(true)} aria-label={t.settings}
          className="w-10 h-10 rounded-2xl bg-[#141416] border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white hover:border-white/25">
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {/* Conversation */}
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-hide py-3 space-y-3">
        <ContextStrip snapshot={coach.snapshot} isRtl={isRtl} t={t} onAsk={ask} />

        {!coach.live && (
          <button type="button" onClick={() => setSettings(true)}
            className="w-full p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-start">
            <WifiOff className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <span className="text-[11px] font-bold text-amber-100/90 leading-relaxed">{t.demoHint}</span>
          </button>
        )}

        <Bubble isRtl={isRtl} t={t} msg={{ id: "welcome", role: "assistant", source: "system", text: t.welcome(coach.name), at: coach.messages[0]?.at || new Date().toISOString() }} />

        {coach.messages.map((m, i) => (
          <Bubble key={m.id} msg={m} isRtl={isRtl} t={t} streaming={coach.streaming && i === coach.messages.length - 1} />
        ))}

        {errorText && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
            <span className="flex-1 text-[11px] font-bold text-rose-100/90">{errorText}</span>
            {coach.error === "auth" && (
              <button type="button" onClick={() => { coach.dismissError(); setSettings(true); }} className="text-[11px] font-black text-rose-200 underline">{t.openSettings}</button>
            )}
          </div>
        )}
      </div>

      {/* Suggestions */}
      {!coach.streaming && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2 shrink-0">
          {coach.chips.map((c) => (
            <button key={c} type="button" onClick={() => ask(c)} data-chip
              className="shrink-0 max-w-[240px] px-3 py-1.5 rounded-2xl bg-[#844783]/15 border border-[#844783]/40 text-[11px] font-bold text-[#d8a7d6] hover:bg-[#844783]/25 text-start leading-tight flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 shrink-0" />
              <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c}</span>
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <form onSubmit={submit} className="relative shrink-0 pb-[68px]">
        <textarea
          ref={inputRef}
          value={input}
          rows={1}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) submit(e); }}
          placeholder={t.placeholder}
          aria-label={t.placeholder}
          className={`w-full min-h-[52px] max-h-32 py-3.5 bg-[#141416] border border-white/15 rounded-3xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#844783] transition-colors resize-none ${isRtl ? "pr-4 pl-14" : "pl-4 pr-14"}`}
        />
        {coach.streaming ? (
          <button type="button" onClick={coach.stop} aria-label={t.stop}
            className={`absolute top-1.5 w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-md active:scale-95 ${isRtl ? "left-1.5" : "right-1.5"}`}>
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        ) : (
          <button type="submit" disabled={!input.trim()} aria-label={t.send}
            className={`absolute top-1.5 w-10 h-10 bg-[#844783] hover:bg-[#965595] disabled:opacity-40 text-white rounded-full flex items-center justify-center shadow-md active:scale-95 ${isRtl ? "left-1.5" : "right-1.5"}`}>
            <Send className={`w-4 h-4 ${isRtl ? "-scale-x-100" : ""}`} />
          </button>
        )}
      </form>

      <AnimatePresence>
        {settings && <SettingsSheet coach={coach} isRtl={isRtl} t={t} onClose={() => setSettings(false)} />}
      </AnimatePresence>
    </div>
  );
}
