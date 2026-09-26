import React, { useState } from "react";
import { Button, Card, Chip, Field, Label, Segmented, Sheet as KitSheet, Toggle as KitToggle, cx, num } from "../ui/kit";
import { GOALS, PACES, PACE_KG, targetsFor } from "../../lib/nutrition/profile";
import { MacroDot, TrendSpark, fmtNum, round } from "./DietBits";

/** Shared bottom-sheet chrome: the kit sheet, so the diet sheets match every other one. */
export function Sheet({ title, isRtl, t, onClose, children, footer }) {
  return (
    <KitSheet title={title} isRtl={isRtl} onClose={onClose} footer={footer} closeLabel={t?.close}>
      {children}
    </KitSheet>
  );
}

// The .ui focus outline would draw a box inside the field's own focus ring,
// and number spinners crowd the narrow macro fields.
const INPUT = "!outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

/** Cancel on the start side, the main action on the end, both pills. */
function Footer({ cancel, onCancel, action, onAction, disabled }) {
  return (
    <>
      <Button tone="card" size="lg" className="flex-1" onClick={onCancel}>{cancel}</Button>
      <Button tone="ink" size="lg" className="flex-1" onClick={onAction} disabled={disabled}>{action}</Button>
    </>
  );
}

/** A macro name keyed by its data colour. */
function MacroLabel({ macro, children }) {
  return <span className="inline-flex items-center gap-1.5"><MacroDot macro={macro} />{children}</span>;
}

/* ──────────────────────────── quick add ──────────────────────────── */

export function QuickAddSheet({ isRtl, t, onSave, onClose }) {
  const [v, setV] = useState({ name: "", kcal: "", protein: "", carbs: "", fat: "" });
  const num0 = (x) => Math.max(+x || 0, 0);
  const valid = num0(v.kcal) > 0 || num0(v.protein) + num0(v.carbs) + num0(v.fat) > 0;
  const derived = num0(v.protein) * 4 + num0(v.carbs) * 4 + num0(v.fat) * 9;

  const submit = () =>
    onSave({
      name: v.name.trim() || t.quickAdd,
      // If only macros were typed, derive the calories from them.
      kcal: num0(v.kcal) || derived,
      protein: num0(v.protein), carbs: num0(v.carbs), fat: num0(v.fat), fiber: 0, sodium: 0,
    });

  return (
    <Sheet title={t.quickAdd} isRtl={isRtl} t={t} onClose={onClose}
      footer={<Footer cancel={t.cancel} onCancel={onClose} action={t.logIt} onAction={submit} disabled={!valid} />}>
      <p className="m-0 text-sm text-muted">{t.quickAddHint}</p>
      <Field inputClass={INPUT} label={t.mealName} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder={t.quickAdd} />
      <Field inputClass={INPUT} label={t.calories} type="number" min="0" inputMode="numeric" value={v.kcal}
        onChange={(e) => setV({ ...v, kcal: e.target.value })}
        placeholder={derived ? String(round(derived)) : "0"} suffix={t.kcal} />
      <div className="grid grid-cols-3 gap-2.5">
        {[["protein", t.protein], ["carbs", t.carbs], ["fat", t.fat]].map(([k, label]) => (
          <Field inputClass={INPUT} key={k} label={<MacroLabel macro={k}>{label}</MacroLabel>} type="number" min="0" inputMode="numeric"
            value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} placeholder="0" />
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
  const last = trend[trend.length - 1];

  return (
    <Sheet title={t.logWeight} isRtl={isRtl} t={t} onClose={onClose}
      footer={<Footer cancel={t.cancel} onCancel={onClose} action={t.save} onAction={() => onSave(value)} disabled={!valid} />}>
      <p className="m-0 text-sm text-muted">{t.weightHint}</p>
      <Field inputClass={INPUT} label={t.weight} type="number" min="20" max="400" step="0.1" inputMode="decimal" autoFocus
        value={kg} onChange={(e) => setKg(e.target.value)} placeholder="76.0" suffix={t.kg} />

      {trend.length >= 2 ? (
        <Card className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <Label>{t.trend}</Label>
            <span className="font-display font-extrabold text-[22px] leading-none tracking-[-0.03em] text-ink">
              {num(last.trend.toFixed(1), isRtl)} <span className="text-sm font-semibold text-muted">{t.kg}</span>
            </span>
          </div>
          <TrendSpark points={trend} />
        </Card>
      ) : (
        <p className="m-0 text-sm text-muted">{t.noWeightYet}</p>
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

/** A titled group of options inside a sheet. */
function Group({ label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-muted">{label}</span>
      {children}
    </div>
  );
}

/** A grid of pill choices, for option sets too long for a segmented control. */
function ChoiceGrid({ options, value, onChange, cols = 2 }) {
  return (
    <div className={cx("grid gap-2", cols === 2 ? "grid-cols-2" : "grid-cols-4")}>
      {options.map((o) => (
        <Chip key={o.id} active={value === o.id} onClick={() => onChange(o.id)} className="!h-11 w-full justify-center">
          {o.label}
        </Chip>
      ))}
    </div>
  );
}

/** A weekly change in kilograms, to two decimals, with the Persian decimal sign. */
const kgText = (v, isRtl) => {
  const text = String(Math.round(v * 100) / 100);
  return isRtl ? num(text, true).replace(".", "٫") : text;
};

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
      footer={<Footer cancel={t.cancel} onCancel={onClose} action={t.save} onAction={submit} />}>

      {/* Live preview of what these settings produce */}
      <Card className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t.target}</Label>
            <span className="font-display font-extrabold text-[42px] leading-[0.9] tracking-[-0.04em] text-ink">{fmtNum(preview.kcal, isRtl)}</span>
          </div>
          <span className="text-sm text-muted pb-0.5">{t.kcal}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-hair">
          {[["protein", t.protein], ["carbs", t.carbs], ["fat", t.fat]].map(([k, label]) => (
            <div key={k} className="flex flex-col gap-1 min-w-0">
              <span className="text-xs text-muted truncate"><MacroLabel macro={k}>{label}</MacroLabel></span>
              <span className="text-[17px] font-bold text-ink">{fmtNum(preview[k], isRtl)} <span className="text-xs font-medium text-muted">{t.grams}</span></span>
            </div>
          ))}
        </div>
        {!manual && preview.pace && preview.pace.weeklyKg !== 0 && (
          <p className="m-0 -mt-1 text-[13px] leading-snug text-muted">
            {t.paceLine(kgText(Math.abs(preview.pace.weeklyKg), isRtl), preview.pace.weeklyKg < 0)}
            {preview.pace.capped && <span className="block mt-0.5 text-ink font-medium">{t.paceCapped}</span>}
          </p>
        )}
      </Card>

      <Group label={t.yourStats}>
        <div className="grid grid-cols-3 gap-2.5">
          {[["age", t.age, 10, 100], ["height", t.height, 100, 250], ["weight", t.bodyWeight, 20, 400]].map(([k, label, min, max]) => (
            <Field inputClass={INPUT} key={k} label={label} type="number" min={min} max={max} inputMode="numeric" value={p[k]}
              onChange={(e) => set({ [k]: Math.min(Math.max(+e.target.value || 0, min), max) })} />
          ))}
        </div>
      </Group>

      <Group label={t.gender}>
        <Segmented value={p.gender} onChange={(gender) => set({ gender })}
          options={[{ id: "male", label: t.male }, { id: "female", label: t.female }]} />
      </Group>

      <Group label={t.goal}>
        <ChoiceGrid value={p.goal} onChange={(goal) => set({ goal })}
          options={GOALS.map((g) => ({ id: g, label: t[GOAL_LABEL[g]] }))} />
      </Group>

      {PACE_KG[p.goal] && (
        <Group label={t.pace}>
          <Segmented value={p.pace || "normal"} onChange={(pace) => set({ pace })}
            options={PACES.map((id) => ({ id, label: t[`pace_${id}`] }))} />
        </Group>
      )}

      <Group label={t.trainingDays}>
        <Segmented value={p.frequency} onChange={(frequency) => set({ frequency })}
          options={FREQ.map((fq) => ({ id: fq, label: num(fq.replace("_", "–"), isRtl) }))} />
      </Group>

      <Group label={t.dietType}>
        <ChoiceGrid value={p.dietType} onChange={(dietType) => set({ dietType })}
          options={Object.keys(DIET_LABEL).map((d) => ({ id: d, label: t[DIET_LABEL[d]] }))} />
      </Group>

      <Card pad={false} className="px-4">
        <label className="min-h-[60px] flex items-center justify-between gap-3 cursor-pointer">
          <span className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[15px] font-semibold text-ink">{t.setManually}</span>
            {!manual && <span className="text-[13px] text-muted">{t.calculated}</span>}
          </span>
          <KitToggle checked={manual} onChange={setManual} label={manual ? t.useCalculated : t.setManually} />
        </label>
        {manual && (
          <div className="grid grid-cols-2 gap-2.5 pt-1 pb-4 border-t border-hair">
            {[["kcal", t.calories, t.kcal], ["protein", t.protein, t.grams], ["carbs", t.carbs, t.grams], ["fat", t.fat, t.grams]].map(([k, label, unit]) => (
              <Field inputClass={INPUT} key={k} onCard className="pt-3" label={k === "kcal" ? label : <MacroLabel macro={k}>{label}</MacroLabel>}
                type="number" min="0" inputMode="numeric" value={custom[k] ?? 0} suffix={unit}
                onChange={(e) => setCustom({ ...custom, [k]: Math.max(+e.target.value || 0, 0) })} />
            ))}
          </div>
        )}
      </Card>
    </Sheet>
  );
}

/* ──────────────────────────── view options ──────────────────────────── */

/** A row of mutually exclusive choices. */
function Choice({ label, hint, value, options, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <span className="text-[15px] font-semibold text-ink">{label}</span>
        {hint && <span className="text-[13px] text-muted">{hint}</span>}
      </div>
      <Segmented value={value} onChange={onChange} options={options} />
    </div>
  );
}

/**
 * An on/off row: the label on the start side, the kit switch on the end.
 * The whole row is a label, so tapping the text flips the switch too.
 * (Also used by the coach's privacy settings.)
 */
export function Toggle({ label, on, onChange }) {
  return (
    <label className="w-full min-h-[52px] flex items-center justify-between gap-3 cursor-pointer">
      <span className="text-[15px] font-semibold text-ink text-start">{label}</span>
      <KitToggle checked={!!on} onChange={onChange} label={label} />
    </label>
  );
}

/** Lets the athlete strip the diary back to just the food log. */
export function ViewSheet({ view, isRtl, t, onChange, onReset, onClose }) {
  return (
    <Sheet title={t.customize} isRtl={isRtl} t={t} onClose={onClose}
      footer={
        <>
          <Button tone="card" size="lg" className="shrink-0 whitespace-nowrap" onClick={onReset}>{t.resetView}</Button>
          <Button tone="ink" size="lg" className="flex-1" onClick={onClose}>{t.done || t.close}</Button>
        </>
      }>
      <p className="m-0 text-sm text-muted">{t.customizeHint}</p>

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

      <Card pad={false} className="px-4 py-1 divide-y divide-hair">
        <Toggle label={t.sectionCoach} on={view.coach} isRtl={isRtl} onChange={(coach) => onChange({ coach })} />
        <Toggle label={t.sectionWater} on={view.water} isRtl={isRtl} onChange={(water) => onChange({ water })} />
        <Toggle label={t.sectionSavedMeals} on={view.savedMeals} isRtl={isRtl} onChange={(savedMeals) => onChange({ savedMeals })} />
        <Toggle label={t.sectionShortcuts} on={view.shortcuts} isRtl={isRtl} onChange={(shortcuts) => onChange({ shortcuts })} />
      </Card>
    </Sheet>
  );
}
