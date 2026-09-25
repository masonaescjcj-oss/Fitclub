import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, BadgeCheck, Check, Copy, Link2, Plus, Salad, Search, Trash2, X } from "lucide-react";
import {
  Button, Card, Chip, CtaButton, Field, IconButton, IconWell, Label, List, Row, Segmented, Tag, Toggle, cx, initials, num,
} from "../ui/kit";
import { MUSCLES, exerciseName, findExercise, searchExercises } from "../../lib/training/exercises";
import {
  PROGRAM_COLORS, createDay, createProgramExercise, decodeShare, encodeShare, expandMealPlan, shareLink,
} from "../../lib/training/programModel";

// Train's sheets, drawn in "Ink & Volt": the bottom-sheet chrome (also used by
// Fuel and Coach), the program builder, share by link and import.

/**
 * A bottom sheet. Callers render it inside <AnimatePresence> so it can slide
 * out; Escape and the scrim close it, and `footer` stays pinned under the body.
 */
export function Sheet({ title, isRtl, t, onClose, children, footer, tall = false }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="ui fixed inset-0 z-[90] flex items-end justify-center !bg-transparent">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-hero/45 backdrop-blur-[2px]" />
      <motion.div role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 36 }}
        className={cx("relative w-full md:max-w-lg bg-canvas rounded-t-4xl shadow-sheet flex flex-col overflow-hidden",
          tall ? "h-[92dvh]" : "max-h-[90dvh]")}>
        <span aria-hidden="true" className="mx-auto mt-2.5 w-10 h-1 rounded-full bg-line shrink-0" />
        <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-2 shrink-0">
          <h2 className="m-0 min-w-0 truncate font-display font-extrabold text-[22px] tracking-[-0.02em] text-ink">{title}</h2>
          <IconButton label={t?.close || (isRtl ? "بستن" : "Close")} tone="card" size={40} onClick={onClose}>
            <X className="w-[18px] h-[18px]" strokeWidth={2} />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5 pt-2 flex flex-col gap-4 scrollbar-hide">{children}</div>
        {footer && <div className="px-5 pt-3 pb-[max(env(safe-area-inset-bottom),20px)] flex gap-2.5 shrink-0">{footer}</div>}
      </motion.div>
    </div>
  );
}

/** Who made a plan, with a verified Coach badge beside the name. */
export function AuthorChip({ author, t }) {
  if (!author?.name) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
      <span>{t.byAuthor} <span className="font-semibold text-ink">{author.name}</span></span>
      {author.role === "coach" && (
        <span className="h-6 px-2 rounded-full inline-flex items-center gap-1 text-[11px] font-semibold bg-jet text-accent dark:ring-1 dark:ring-inset dark:ring-line">
          <BadgeCheck className="w-3.5 h-3.5" strokeWidth={2.2} /> {t.coach}
        </span>
      )}
    </span>
  );
}

/** A program's initials on an ink well; stands in for the old emoji. */
export function ProgramMark({ name, active = true, size = 48 }) {
  return (
    <IconWell tone={active ? "inv" : "sunk"} square size={size}>
      <span className="font-display font-extrabold tracking-[-0.02em]" style={{ fontSize: Math.round(size * 0.36) }}>
        {initials(name || "?")}
      </span>
    </IconWell>
  );
}

/* ──────────────────────────── exercise picker ──────────────────────────── */

function ExercisePicker({ isRtl, t, onPick, onClose }) {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState(null);
  const list = useMemo(() => searchExercises(q, muscle), [q, muscle]);
  return (
    <Sheet title={t.addExercise} isRtl={isRtl} t={t} onClose={onClose} tall>
      <Field autoFocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchExercises}
        aria-label={t.searchExercises} prefix={<Search className="w-[18px] h-[18px] text-muted" strokeWidth={2} />} />
      <div className="-mx-5 px-5 flex gap-2 overflow-x-auto scrollbar-hide">
        <Chip active={muscle === null} onClick={() => setMuscle(null)}>{t.allMuscles}</Chip>
        {MUSCLES.map((m) => (
          <Chip key={m.id} active={muscle === m.id} onClick={() => setMuscle(muscle === m.id ? null : m.id)}>
            {isRtl ? m.fa : m.en}
          </Chip>
        ))}
      </div>
      <List>
        {list.map((e) => (
          <Row key={e.id} onClick={() => onPick(e)} title={isRtl ? e.nameFa : e.nameEn} subtitle={e.equipment}
            right={<Plus className="w-5 h-5 text-ink" strokeWidth={2} />} />
        ))}
      </List>
    </Sheet>
  );
}

/* ──────────────────────────── program builder ──────────────────────────── */

export function ProgramBuilderSheet({ program, isRtl, t, author, onSave, onClose }) {
  const isNew = !program;
  // Emoji and colour are carried through untouched: the redesign draws a
  // program as its initials on an ink well, so there is nothing to pick.
  const [p, setP] = useState(() => ({
    name: program?.name || "", nameFa: program?.nameFa || "", emoji: program?.emoji || "🏋️",
    color: program?.color || PROGRAM_COLORS[0], weeks: program?.weeks || 6, description: program?.description || "",
    days: program?.days?.map((d) => ({ ...d, exercises: d.exercises.map((e) => ({ ...e })) })) || [],
  }));
  const [pickFor, setPickFor] = useState(null); // day index awaiting an exercise
  const n = (v) => num(v, isRtl);
  const set = (patch) => setP((s) => ({ ...s, ...patch }));
  const patchDay = (i, fn) => set({ days: p.days.map((d, k) => (k === i ? fn(d) : d)) });
  const patchEx = (di, ei, patch) => patchDay(di, (d) => ({ ...d, exercises: d.exercises.map((e, k) => (k === ei ? { ...e, ...patch } : e)) }));
  const move = (di, ei, dir) => patchDay(di, (d) => {
    const arr = [...d.exercises]; const j = ei + dir;
    if (j < 0 || j >= arr.length) return d;
    [arr[ei], arr[j]] = [arr[j], arr[ei]];
    return { ...d, exercises: arr };
  });
  const toggleRest = (di) => patchDay(di, (x) => ({
    ...x, type: x.type === "rest" ? "workout" : "rest", title: x.type === "rest" ? "" : "Rest", titleFa: x.type === "rest" ? "" : "استراحت",
  }));

  const valid = p.name.trim() && p.days.length > 0 && p.days.every((d) => d.type === "rest" || d.exercises.length > 0);

  return (
    <>
      <Sheet title={isNew ? t.newProgram : t.editProgram} isRtl={isRtl} t={t} onClose={onClose} tall
        footer={
          <>
            <Button tone="soft" className="flex-1" onClick={onClose}>{t.cancel}</Button>
            <Button tone="ink" className="flex-1" disabled={!valid} onClick={() => onSave({ ...p, name: p.name.trim(), author })}>
              {t.save}
            </Button>
          </>
        }>
        <div className="flex items-end gap-3">
          <ProgramMark name={p.name} size={52} />
          <Field className="flex-1 min-w-0" label={t.programName} autoFocus={isNew} value={p.name}
            onChange={(e) => set({ name: e.target.value })} placeholder={t.programNamePh} />
        </div>
        <div className="grid grid-cols-[1fr_104px] gap-2.5">
          <Field label={t.description} value={p.description} onChange={(e) => set({ description: e.target.value })} />
          <Field label={t.weeksLabel} type="number" inputMode="numeric" min="1" max="52" value={p.weeks} inputClass="text-center"
            onChange={(e) => set({ weeks: Math.max(1, Math.min(52, +e.target.value || 1)) })} />
        </div>

        <Label as="h3" className="m-0 mt-2">{t.days}</Label>
        {p.days.length === 0 && <p className="m-0 py-3 text-center text-sm text-muted">{t.noDays}</p>}
        {p.days.map((d, di) => {
          const isRest = d.type === "rest";
          return (
            <Card key={d.id} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="flex-1 min-w-0 text-[15px] font-bold text-ink">{t.day} {n(di + 1)}</span>
                <IconButton label={t.remove} tone="soft" size={40} onClick={() => set({ days: p.days.filter((_, k) => k !== di) })}>
                  <Trash2 className="w-[18px] h-[18px] text-alert" strokeWidth={2} />
                </IconButton>
              </div>
              <Segmented onCard value={isRest ? "rest" : "workout"}
                onChange={(id) => { if ((id === "rest") !== isRest) toggleRest(di); }}
                options={[{ id: "workout", label: t.workoutDay }, { id: "rest", label: t.restDayType }]} />
              {isRest ? (
                <p className="m-0 text-sm text-muted">{t.recoveryDay}</p>
              ) : (
                <>
                  <Field onCard label={t.dayTitle} value={d.title} placeholder={t.dayTitlePh}
                    onChange={(e) => patchDay(di, (x) => ({ ...x, title: e.target.value }))} />
                  {d.exercises.map((e, ei) => {
                    const ex = findExercise(e.exerciseId);
                    const fields = [
                      ["sets", t.sets, 1, 20],
                      ["reps", ex?.mode === "time" ? t.seconds : ex?.mode === "distance" ? t.meters : t.reps, 1, 5000],
                      ["weight", t.kg, 0, 1000],
                      ["restSec", t.restSeconds, 0, 900],
                    ];
                    return (
                      <div key={e.id} className="rounded-2xl bg-sunk p-3 flex flex-col gap-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="flex-1 min-w-0 text-[15px] font-semibold text-ink truncate">{exerciseName(e.exerciseId, isRtl)}</span>
                          <IconButton label={t.moveUp} tone="card" size={40} onClick={() => move(di, ei, -1)} disabled={ei === 0}
                            className="disabled:opacity-40"><ArrowUp className="w-4 h-4" strokeWidth={2} /></IconButton>
                          <IconButton label={t.moveDown} tone="card" size={40} onClick={() => move(di, ei, 1)} disabled={ei === d.exercises.length - 1}
                            className="disabled:opacity-40"><ArrowDown className="w-4 h-4" strokeWidth={2} /></IconButton>
                          <IconButton label={t.remove} tone="card" size={40}
                            onClick={() => patchDay(di, (x) => ({ ...x, exercises: x.exercises.filter((_, k) => k !== ei) }))}>
                            <X className="w-4 h-4 text-alert" strokeWidth={2} />
                          </IconButton>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {fields.map(([k, lbl, min, max]) => (
                            <label key={k} className="flex flex-col gap-1 min-w-0">
                              <span className="text-[11px] font-medium text-muted text-center truncate">{lbl}</span>
                              <input type="number" inputMode="decimal" min={min} max={max} value={e[k] ?? ""} placeholder="–"
                                onChange={(ev) => patchEx(di, ei, { [k]: ev.target.value === "" ? null : Math.min(max, Math.max(min, +ev.target.value)) })}
                                className="w-full h-11 rounded-xl bg-card border-0 text-center text-[15px] font-semibold text-ink tabular-nums outline-none focus:ring-2 focus:ring-inset focus:ring-ink placeholder:text-muted/70" />
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <Button tone="soft" size="sm" block icon={<Plus className="w-4 h-4" strokeWidth={2.2} />} onClick={() => setPickFor(di)} className="h-11">
                    {t.addExercise}
                  </Button>
                </>
              )}
            </Card>
          );
        })}
        <Button tone="card" block icon={<Plus className="w-[18px] h-[18px]" strokeWidth={2.2} />}
          onClick={() => set({ days: [...p.days, createDay({ title: "" })] })}>
          {t.addDay}
        </Button>
      </Sheet>

      {pickFor !== null && (
        <ExercisePicker isRtl={isRtl} t={t} onClose={() => setPickFor(null)}
          onPick={(ex) => {
            patchDay(pickFor, (d) => ({ ...d, exercises: [...d.exercises, createProgramExercise({ exerciseId: ex.id, reps: ex.mode === "time" ? 45 : ex.mode === "distance" ? 200 : 10 })] }));
            setPickFor(null);
          }} />
      )}
    </>
  );
}

/* ──────────────────────────── share ──────────────────────────── */

function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text).catch(() => {});
  return Promise.resolve();
}

const CopyIcon = ({ on }) => (on ? <Check className="w-4 h-4" strokeWidth={2.4} /> : <Copy className="w-4 h-4" strokeWidth={2} />);

export function ShareSheet({ payload, title, isRtl, t, coachMode, onToggleCoach, onClose }) {
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState("");
  const payloadKey = useMemo(() => JSON.stringify(payload), [payload]);
  useEffect(() => {
    let alive = true;
    setCode(""); // never show a code that belongs to the previous payload
    encodeShare(JSON.parse(payloadKey)).then((c) => { if (alive) setCode(c); });
    return () => { alive = false; };
  }, [payloadKey]);
  useEffect(() => { if (!copied) return undefined; const id = setTimeout(() => setCopied(""), 1500); return () => clearTimeout(id); }, [copied]);
  const link = code ? shareLink(code) : "";

  return (
    <Sheet title={title || t.shareTitle} isRtl={isRtl} t={t} onClose={onClose}>
      <p className="m-0 text-sm leading-relaxed text-muted">{t.shareHint}</p>

      <div className="rounded-3xl bg-card px-4 py-3 flex items-center gap-3">
        <span className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="text-[15px] font-semibold text-ink">{t.coachMode}</span>
          <span className="text-[13px] leading-snug text-muted">{t.coachModeHint}</span>
        </span>
        <Toggle checked={coachMode} onChange={(on) => onToggleCoach(on)} label={t.coachMode} />
      </div>

      <Card className="flex flex-col gap-3">
        <Label>{t.copyLink}</Label>
        <div className="flex items-center gap-2.5 h-12 rounded-2xl bg-sunk ps-3.5 pe-1.5" dir="ltr">
          <Link2 className="w-4 h-4 text-muted shrink-0" strokeWidth={2} />
          <input readOnly value={link || t.generating} onFocus={(e) => e.target.select()} aria-label={t.copyLink}
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[13px] font-mono text-muted truncate" />
          <Button tone="ink" size="sm" disabled={!code} onClick={() => copyText(link).then(() => setCopied("link"))}
            icon={<CopyIcon on={copied === "link"} />} className="shrink-0">
            {copied === "link" ? t.copied : t.copyLink}
          </Button>
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <Label>{t.copyCode}</Label>
        <textarea readOnly rows={3} value={code || t.generating} onFocus={(e) => e.target.select()} dir="ltr" aria-label={t.copyCode}
          className="w-full rounded-2xl bg-sunk border-0 p-3 text-[11px] leading-relaxed font-mono text-muted break-all resize-none outline-none" />
        <Button tone="soft" block disabled={!code} onClick={() => copyText(code).then(() => setCopied("code"))}
          icon={<CopyIcon on={copied === "code"} />}>
          {copied === "code" ? t.copied : t.copyCode}
        </Button>
      </Card>
    </Sheet>
  );
}

/* ──────────────────────────── import ──────────────────────────── */

export function ImportSheet({ initialCode, isRtl, t, onImportProgram, onApplyMeal, onClose }) {
  const [input, setInput] = useState(initialCode || "");
  const [state, setState] = useState({ status: "idle" });
  const n = (v) => num(v, isRtl);
  const sep = isRtl ? "، " : " · ";

  const check = async (value) => {
    if (!value.trim()) { setState({ status: "idle" }); return; }
    setState({ status: "checking" });
    try {
      const payload = await decodeShare(value);
      setState({ status: "ok", payload });
    } catch (e) {
      setState({ status: "error", code: e.message });
    }
  };
  useEffect(() => { if (initialCode) check(initialCode); }, [initialCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const payload = state.status === "ok" ? state.payload : null;
  const isProgram = payload?.t === "program";
  const exCount = isProgram ? payload.days.reduce((a, d) => a + (d.x?.length || 0), 0) : 0;
  const meal = payload && !isProgram ? expandMealPlan(payload) : null;
  const previewName = isProgram ? (isRtl && payload.nf ? payload.nf : payload.n) : meal?.name;

  return (
    <Sheet title={t.importTitle} isRtl={isRtl} t={t} onClose={onClose}
      footer={payload && (
        <CtaButton tone="ink" isRtl={isRtl} onClick={() => (isProgram ? onImportProgram(payload) : onApplyMeal(meal))}>
          {isProgram ? t.addToMine : t.applyPlan}
        </CtaButton>
      )}>
      {initialCode && (
        <Tag tone="accent" className="self-start font-semibold"><Link2 className="w-3.5 h-3.5" strokeWidth={2.2} />{t.importFromUrl}</Tag>
      )}
      <p className="m-0 text-sm leading-relaxed text-muted">{t.importHint}</p>
      <textarea rows={3} value={input} onChange={(e) => { setInput(e.target.value); check(e.target.value); }}
        placeholder={t.pastePh} dir="ltr" autoFocus={!initialCode} aria-label={t.pastePh}
        className={cx("w-full rounded-2xl bg-card border-0 p-4 text-[13px] font-mono text-ink resize-none outline-none placeholder:text-muted/70",
          state.status === "error" ? "ring-2 ring-inset ring-alert" : "focus:ring-2 focus:ring-inset focus:ring-ink")} />

      {state.status === "error" && (
        <p className="m-0 -mt-2 text-[13px] font-medium text-alert">{state.code === "too_large" ? t.tooLarge : t.invalidCode}</p>
      )}

      {payload && (
        <Card className="flex flex-col gap-3">
          <Label>{t.preview}</Label>
          <div className="flex items-center gap-3">
            {isProgram ? <ProgramMark name={payload.n} size={48} /> : (
              <IconWell tone="sage" square size={48}><Salad className="w-6 h-6" strokeWidth={2} /></IconWell>
            )}
            <span className="min-w-0 flex flex-col gap-0.5">
              <span className="text-[17px] font-bold text-ink truncate">{previewName}</span>
              <AuthorChip author={isProgram ? { name: payload.a?.n, role: payload.a?.r } : meal.author} t={t} />
            </span>
          </div>
          {isProgram ? (
            <>
              <p className="m-0 text-[13px] text-muted">
                {n(payload.days.length)} {t.day}{sep}{n(exCount)} {t.exercisesLc}{sep}{n(payload.w)} {t.weeks}
              </p>
              <ul className="m-0 p-0 list-none divide-y divide-hair border-t border-hair">
                {payload.days.map((d, i) => (
                  <li key={i} className="py-2.5 flex justify-between gap-3 text-[13px]">
                    <span className="font-semibold text-ink truncate">{t.day} {n(i + 1)}{sep}{d.r ? t.rest : (isRtl && d.tf ? d.tf : d.t)}</span>
                    {!d.r && (
                      <span className="text-muted truncate shrink min-w-0 text-end">
                        {d.x.map((x) => exerciseName(x[0], isRtl)).slice(0, 2).join(isRtl ? "، " : ", ")}{d.x.length > 2 ? " …" : ""}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {payload.d && <p className="m-0 text-[13px] text-muted">{payload.d}</p>}
            </>
          ) : (
            <>
              <p className="m-0 text-[13px] text-ink">
                {t.targets}: {n(meal.targets.kcal)} kcal{sep}P {n(meal.targets.protein)}{sep}C {n(meal.targets.carbs)}{sep}F {n(meal.targets.fat)}
              </p>
              <p className="m-0 text-[13px] text-muted">{n(meal.meals.length)} {t.savedMeals}{meal.notes ? `${sep}${meal.notes}` : ""}</p>
            </>
          )}
        </Card>
      )}
    </Sheet>
  );
}
