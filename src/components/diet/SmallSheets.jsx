import React, { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { GOALS, targetsFor } from "../../lib/nutrition/profile";
import { MACRO_COLORS, TrendSpark, round } from "./DietBits";

/** Shared bottom-sheet chrome so the diet sheets stay consistent. */
export function Sheet({ title, isRtl, t, onClose, children, footer }) {
  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="relative w-full sm:max-w-lg bg-[#0d0d0f] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl max-h-[90dvh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <h2 className="text-base font-black text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label={t.close}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-hide">{children}</div>
        {footer && <div className="p-4 border-t border-white/10 flex gap-2 shrink-0">{footer}</div>}
      </motion.div>
    </div>
  );
}

const field =
  "w-full h-11 px-3 rounded-2xl bg-[#141416] border border-white/10 text-sm font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-white/30";

function Label({ children }) {
  return <span className="block text-[10px] font-black text-neutral-500 uppercase tracking-wider mb-1.5">{children}</span>;
}

/* ──────────────────────────── quick add ──────────────────────────── */

export function QuickAddSheet({ isRtl, t, onSave, onClose }) {
  const [v, setV] = useState({ name: "", kcal: "", protein: "", carbs: "", fat: "" });
  const num = (x) => Math.max(+x || 0, 0);
  const valid = num(v.kcal) > 0 || num(v.protein) + num(v.carbs) + num(v.fat) > 0;

  const submit = () =>
    onSave({
      name: v.name.trim() || t.quickAdd,
      // If only macros were typed, derive the calories from them.
      kcal: num(v.kcal) || num(v.protein) * 4 + num(v.carbs) * 4 + num(v.fat) * 9,
      protein: num(v.protein), carbs: num(v.carbs), fat: num(v.fat), fiber: 0, sodium: 0,
    });

  return (
    <Sheet title={t.quickAdd} isRtl={isRtl} t={t} onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/10 text-neutral-300 font-black text-sm">{t.cancel}</button>
          <button type="button" onClick={submit} disabled={!valid}
            className="flex-1 h-12 rounded-2xl bg-[#844783] text-white font-black text-sm disabled:opacity-40">{t.logIt}</button>
        </>
      }>
      <p className="text-[10px] font-medium text-neutral-500">{t.quickAddHint}</p>
      <div>
        <Label>{t.mealName}</Label>
        <input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={field} placeholder={t.quickAdd} />
      </div>
      <div>
        <Label>{t.calories}</Label>
        <input type="number" min="0" inputMode="numeric" value={v.kcal}
          onChange={(e) => setV({ ...v, kcal: e.target.value })} className={field} placeholder="0" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[["protein", t.protein], ["carbs", t.carbs], ["fat", t.fat]].map(([k, label]) => (
          <div key={k}>
            <Label>{label}</Label>
            <input type="number" min="0" inputMode="numeric" value={v[k]}
              onChange={(e) => setV({ ...v, [k]: e.target.value })}
              className={field} placeholder="0" style={{ borderColor: `${MACRO_COLORS[k]}44` }} />
          </div>
        ))}
      </div>
    </Sheet>
  );
}

/* ──────────────────────────── weigh-in ──────────────────────────── */

export function WeightSheet({ current, trend, isRtl, t, onSave, onClose }) {
  const [kg, setKg] = useState(current ?? "");
  const value = +kg;
  const valid = value > 20 && value < 400;

  return (
    <Sheet title={t.logWeight} isRtl={isRtl} t={t} onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/10 text-neutral-300 font-black text-sm">{t.cancel}</button>
          <button type="button" onClick={() => onSave(value)} disabled={!valid}
            className="flex-1 h-12 rounded-2xl bg-[#844783] text-white font-black text-sm disabled:opacity-40">{t.save}</button>
        </>
      }>
      <p className="text-[10px] font-medium text-neutral-500">{t.weightHint}</p>
      <div>
        <Label>{t.weight} (kg)</Label>
        <input type="number" min="20" max="400" step="0.1" inputMode="decimal" autoFocus
          value={kg} onChange={(e) => setKg(e.target.value)} className={field} placeholder="76.0" />
      </div>

      {trend.length >= 2 ? (
        <div className="p-4 rounded-2xl bg-[#141416] border border-white/10 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">{t.trend}</span>
            <span className="text-sm font-black text-white tabular-nums" dir="ltr">
              {trend[trend.length - 1].trend.toFixed(1)} kg
            </span>
          </div>
          <TrendSpark points={trend} />
        </div>
      ) : (
        <p className="text-xs font-bold text-neutral-600">{t.noWeightYet}</p>
      )}
    </Sheet>
  );
}

/* ──────────────────────────── targets ──────────────────────────── */

const GOAL_LABEL = {
  "Weight Loss": "goalWeightLoss",
  "Muscle Gain": "goalMuscleGain",
  "Keep Fit": "goalKeepFit",
  "Max Strength": "goalMaxStrength",
};
const DIET_LABEL = {
  standard: "dietStandard", high_protein: "dietHighProtein",
  vegetarian: "dietVegetarian", keto: "dietKeto",
};
const FREQ = ["2_3", "3_4", "4_5", "5_6"];

/** Edit the stats the targets are computed from, or override the targets outright. */
export function TargetsSheet({ profile, targets, isRtl, t, onSave, onClose }) {
  const [p, setP] = useState(profile);
  const [manual, setManual] = useState(!!profile.customTargets);
  const [custom, setCustom] = useState(
    () => profile.customTargets || { ...targets }
  );

  const preview = manual ? custom : targetsFor({ ...p, customTargets: null });
  const set = (patch) => setP({ ...p, ...patch });

  const submit = () =>
    onSave({ ...p, customTargets: manual ? { ...custom, kcal: +custom.kcal || 0 } : null });

  return (
    <Sheet title={t.editTargets} isRtl={isRtl} t={t} onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/10 text-neutral-300 font-black text-sm">{t.cancel}</button>
          <button type="button" onClick={submit} className="flex-1 h-12 rounded-2xl bg-[#844783] text-white font-black text-sm">{t.save}</button>
        </>
      }>

      {/* Live preview of what these settings produce */}
      <div className="p-4 rounded-2xl bg-[#141416] border border-white/10">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">{t.target}</span>
          <span className="text-2xl font-black text-white tabular-nums">{round(preview.kcal)}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-3 mt-3 border-t border-white/10" dir="ltr">
          {[["protein", t.protein], ["carbs", t.carbs], ["fat", t.fat]].map(([k, label]) => (
            <div key={k} className="text-center">
              <span className="block text-[9px] font-black uppercase" style={{ color: MACRO_COLORS[k] }}>{label}</span>
              <span className="block text-sm font-black text-white tabular-nums">{round(preview[k])}g</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>{t.yourStats}</Label>
        <div className="grid grid-cols-3 gap-2">
          {[["age", t.age, 10, 100], ["height", t.height, 100, 250], ["weight", t.bodyWeight, 20, 400]].map(([k, label, min, max]) => (
            <label key={k} className="block">
              <span className="block text-[9px] font-bold text-neutral-500 mb-1">{label}</span>
              <input type="number" min={min} max={max} inputMode="numeric" value={p[k]}
                onChange={(e) => set({ [k]: Math.min(Math.max(+e.target.value || 0, min), max) })}
                className={field} />
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label>{t.gender}</Label>
        <div className="grid grid-cols-2 gap-2">
          {[["male", t.male], ["female", t.female]].map(([id, label]) => (
            <button key={id} type="button" onClick={() => set({ gender: id })}
              className={`h-11 rounded-2xl border text-xs font-black transition-all ${
                p.gender === id ? "bg-white/10 border-white/30 text-white" : "bg-[#141416] border-white/10 text-neutral-400"
              }`}>{label}</button>
          ))}
        </div>
      </div>

      <div>
        <Label>{t.goal}</Label>
        <div className="grid grid-cols-2 gap-2">
          {GOALS.map((g) => (
            <button key={g} type="button" onClick={() => set({ goal: g })}
              className={`h-11 rounded-2xl border text-[11px] font-black transition-all ${
                p.goal === g ? "bg-white/10 border-white/30 text-white" : "bg-[#141416] border-white/10 text-neutral-400"
              }`}>{t[GOAL_LABEL[g]]}</button>
          ))}
        </div>
      </div>

      <div>
        <Label>{t.trainingDays}</Label>
        <div className="grid grid-cols-4 gap-2">
          {FREQ.map((fq) => (
            <button key={fq} type="button" onClick={() => set({ frequency: fq })}
              className={`h-11 rounded-2xl border text-[11px] font-black transition-all ${
                p.frequency === fq ? "bg-white/10 border-white/30 text-white" : "bg-[#141416] border-white/10 text-neutral-400"
              }`} dir="ltr">{fq.replace("_", "-")}</button>
          ))}
        </div>
      </div>

      <div>
        <Label>{t.dietType}</Label>
        <div className="grid grid-cols-2 gap-2">
          {Object.keys(DIET_LABEL).map((d) => (
            <button key={d} type="button" onClick={() => set({ dietType: d })}
              className={`h-11 rounded-2xl border text-[11px] font-black transition-all ${
                p.dietType === d ? "bg-white/10 border-white/30 text-white" : "bg-[#141416] border-white/10 text-neutral-400"
              }`}>{t[DIET_LABEL[d]]}</button>
          ))}
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-white/10">
        <button type="button" onClick={() => setManual((v) => !v)}
          className="w-full h-11 rounded-2xl bg-white/5 border border-white/10 text-[11px] font-black text-neutral-300 hover:bg-white/10 transition-all">
          {manual ? t.useCalculated : t.setManually}
        </button>

        {manual && (
          <div className="grid grid-cols-2 gap-2">
            {[["kcal", t.calories], ["protein", t.protein], ["carbs", t.carbs], ["fat", t.fat]].map(([k, label]) => (
              <label key={k} className="block">
                <span className="block text-[9px] font-bold text-neutral-500 mb-1">{label}</span>
                <input type="number" min="0" inputMode="numeric" value={custom[k] ?? 0}
                  onChange={(e) => setCustom({ ...custom, [k]: Math.max(+e.target.value || 0, 0) })}
                  className={field} />
              </label>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}

/* ──────────────────────────── view options ──────────────────────────── */

/** A row of mutually exclusive choices. */
function Choice({ label, hint, value, options, onChange }) {
  return (
    <div className="space-y-2">
      <div>
        <span className="block text-xs font-black text-white">{label}</span>
        {hint && <span className="block text-[9px] font-medium text-neutral-600 mt-0.5">{hint}</span>}
      </div>
      <div className="flex gap-1.5">
        {options.map((o) => (
          <button key={String(o.id)} type="button" onClick={() => onChange(o.id)}
            className={`flex-1 h-9 rounded-xl border text-[10px] font-black transition-all ${
              value === o.id
                ? "bg-[#844783]/25 border-[#844783]/60 text-white"
                : "bg-[#141416] border-white/10 text-neutral-500 hover:border-white/25"
            }`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** An on/off row. */
function Toggle({ label, on, isRtl, onChange }) {
  // The travel direction comes from the prop: Tailwind's rtl: variant fires in
  // both modes here, because index.html hardcodes dir="rtl" on the document.
  const travel = on ? (isRtl ? "-translate-x-5" : "translate-x-5") : "";
  return (
    <button type="button" onClick={() => onChange(!on)} role="switch" aria-checked={on}
      className="w-full flex items-center justify-between gap-3 py-1">
      <span className="text-xs font-black text-white text-start">{label}</span>
      <span
        aria-hidden
        className={`w-11 h-6 rounded-full p-0.5 shrink-0 transition-colors ${on ? "bg-[#844783]" : "bg-white/10"}`}
      >
        <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${travel}`} />
      </span>
    </button>
  );
}

/** Lets the athlete strip the diary back to just the food log. */
export function ViewSheet({ view, isRtl, t, onChange, onReset, onClose }) {
  return (
    <Sheet title={t.customize} isRtl={isRtl} t={t} onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onReset}
            className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/10 text-neutral-300 font-black text-sm">
            {t.resetView}
          </button>
          <button type="button" onClick={onClose}
            className="flex-1 h-12 rounded-2xl bg-[#844783] text-white font-black text-sm">{t.done || t.close}</button>
        </>
      }>
      <p className="text-[10px] font-medium text-neutral-500">{t.customizeHint}</p>

      <Choice
        label={t.sectionSummary}
        value={view.summary}
        onChange={(summary) => onChange({ summary })}
        options={[
          { id: "full", label: t.viewFull },
          { id: "compact", label: t.viewCompact },
          { id: "hidden", label: t.viewHidden },
        ]}
      />

      <Choice
        label={t.sectionWorkoutMeals}
        hint={t.autoHint}
        value={view.workoutMeals}
        onChange={(workoutMeals) => onChange({ workoutMeals })}
        options={[
          { id: "auto", label: t.viewAuto },
          { id: "always", label: t.viewAlways },
          { id: "never", label: t.viewNever },
        ]}
      />

      <div className="space-y-3 pt-2 border-t border-white/10">
        <Toggle label={t.sectionCoach} on={view.coach} isRtl={isRtl} onChange={(coach) => onChange({ coach })} />
        <Toggle label={t.sectionWater} on={view.water} isRtl={isRtl} onChange={(water) => onChange({ water })} />
        <Toggle label={t.sectionSavedMeals} on={view.savedMeals} isRtl={isRtl} onChange={(savedMeals) => onChange({ savedMeals })} />
        <Toggle label={t.sectionShortcuts} on={view.shortcuts} isRtl={isRtl} onChange={(shortcuts) => onChange({ shortcuts })} />
      </div>
    </Sheet>
  );
}
