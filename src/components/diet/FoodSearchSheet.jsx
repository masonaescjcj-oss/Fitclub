import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check as CheckIcon, Info, Minus, Plus, Search, X, Zap } from "lucide-react";
import { CATEGORIES, findFood, macrosFor, searchFoods, servingsOf } from "../../lib/nutrition/foods";
import { Chip, IconButton, IconWell, Label, cx, num } from "../ui/kit";
import { fmtNum, round } from "./DietBits";
import { fill } from "../../lib/nutrition/nutritionI18n";

/** "P 31 · C 0 · F 4" (Persian: "پروتئین ۳۱، کربو ۰، چربی ۴"). */
export function macroLine(m, isRtl, t, unit = "") {
  const sep = isRtl ? "، " : " · ";
  const u = unit ? ` ${unit}` : "";
  return [[t.pShort, m.protein], [t.cShort, m.carbs], [t.fShort, m.fat]]
    .map(([k, v]) => `${k} ${num(round(v), isRtl)}${u}`).join(sep);
}

/** The ink portion card: pick a serving, nudge the amount, see the macros update live. */
function PortionPane({ food, meal, isRtl, t, onCancel, onConfirm, initialGrams }) {
  const servings = servingsOf(food);
  const [servingIdx, setServingIdx] = useState(0);
  const [count, setCount] = useState(() =>
    initialGrams ? +(initialGrams / servings[0].g).toFixed(2) : 1
  );

  const serving = servings[servingIdx];
  const grams = Math.max(Math.round(count * serving.g), 0);
  const m = macrosFor(food, grams);
  const sep = isRtl ? "، " : " · ";

  const nudge = (delta) => setCount((c) => Math.max(+(c + delta).toFixed(2), 0.25));

  return (
    <section aria-label={isRtl ? food.nameFa : food.nameEn}
      className="ui-hero rounded-4xl bg-hero text-hero-fg p-[18px] flex flex-col gap-3.5">
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 flex flex-col gap-1">
          <span className="text-[17px] font-bold leading-snug line-clamp-2">{isRtl ? food.nameFa : food.nameEn}</span>
          {food.estimate && (
            <span className="inline-flex items-center gap-1.5 text-xs text-hero-muted">
              <Info className="w-3.5 h-3.5 shrink-0" strokeWidth={2} /> {t.entryFrom}
            </span>
          )}
        </span>
        <span className="shrink-0 font-display font-extrabold text-[26px] leading-none tracking-[-0.03em]">
          {fmtNum(m.kcal, isRtl)} <span className="text-sm font-semibold text-hero-muted">{t.kcal}</span>
        </span>
      </div>

      <div role="radiogroup" aria-label={t.serving} className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-[18px] px-[18px]">
        {servings.map((s, i) => (
          <button key={`${s.en}-${i}`} type="button" role="radio" aria-checked={servingIdx === i} onClick={() => setServingIdx(i)}
            className={cx("h-9 px-4 rounded-full text-sm font-medium whitespace-nowrap border-0 cursor-pointer transition-colors",
              servingIdx === i ? "bg-accent text-on-accent font-semibold" : "bg-hero-2 text-hero-fg")}>
            {isRtl ? s.fa : s.en}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2.5">
        <IconButton label={t.less} tone="hero" onClick={() => nudge(-0.5)}>
          <Minus className="w-5 h-5" strokeWidth={2.2} />
        </IconButton>
        <label className="flex-1 min-w-0 h-11 rounded-[14px] bg-hero-fg/[0.07] flex items-center justify-center gap-2 px-3 focus-within:ring-2 focus-within:ring-inset focus-within:ring-accent">
          <span className="sr-only">{t.amount}</span>
          <input
            type="number" min="0.25" step="0.25" value={count} dir="ltr"
            onChange={(e) => setCount(Math.max(+e.target.value || 0, 0))}
            className="w-14 min-w-0 bg-transparent border-0 !outline-none text-center text-lg font-bold text-hero-fg [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="text-sm text-hero-muted truncate">× {isRtl ? serving.fa : serving.en}</span>
        </label>
        <IconButton label={t.more} tone="hero" onClick={() => nudge(0.5)}>
          <Plus className="w-5 h-5" strokeWidth={2.2} />
        </IconButton>
      </div>

      <span className="text-[13px] text-hero-fg/75">
        {num(grams, isRtl)} {t.grams}{sep}{macroLine(m, isRtl, t, t.grams)}{sep}{t.fiber} {num(round(m.fiber), isRtl)} {t.grams}
      </span>

      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="h-[54px] px-5 rounded-full bg-hero-2 text-hero-fg text-[15px] font-semibold border-0 cursor-pointer active:scale-[0.98] transition-transform">
          {t.cancel}
        </button>
        <button type="button" onClick={() => onConfirm(grams)} disabled={grams <= 0}
          className="flex-1 min-w-0 h-[54px] px-5 rounded-full bg-accent text-on-accent text-base font-bold border-0 cursor-pointer truncate active:scale-[0.98] transition-transform disabled:opacity-40">
          {meal ? `${t.addTo} ${meal}` : t.logIt}
        </button>
      </div>
    </section>
  );
}

/**
 * The food log: search or browse by category, recent foods first, and a
 * quick-add escape hatch. Picking a food opens the portion card at the foot.
 */
export default function FoodSearchSheet({ mealId, isRtl, t, recentIds, onPick, onQuickAdd, onClose, kcalLeft }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(null);
  const [chosen, setChosen] = useState(null);

  const results = useMemo(() => searchFoods(query, category), [query, category]);
  const recents = useMemo(
    () => recentIds.map(findFood).filter(Boolean),
    [recentIds]
  );
  const showRecents = !query && !category && recents.length > 0;

  const mealName = mealId ? (isRtl ? mealId.fa : mealId.en) : "";
  // "Add to dinner": the meal reads as a common noun inside the English sentence.
  const meal = isRtl ? mealName : mealName.toLowerCase();

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pick = (food) => setChosen((c) => (c?.id === food.id ? null : food));

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="ui fixed inset-0 z-[70] flex items-end justify-center !bg-transparent">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-hero/45 backdrop-blur-[2px]" />

      <motion.div role="dialog" aria-modal="true" aria-labelledby="food-log-title"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 36 }}
        className="relative w-full md:max-w-lg h-[94dvh] bg-canvas rounded-t-4xl shadow-sheet flex flex-col overflow-hidden"
      >
        <span aria-hidden="true" className="mx-auto mt-2.5 w-10 h-1 rounded-full bg-line shrink-0" />

        <div className="px-5 pt-3 flex flex-col gap-3.5 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1 min-w-0">
              {kcalLeft != null && (
                <Label>{fill(kcalLeft >= 0 ? t.kcalLeftN : t.kcalOverN, { n: fmtNum(Math.abs(kcalLeft), isRtl) })}</Label>
              )}
              <h2 id="food-log-title" className="m-0 font-display font-extrabold text-[30px] leading-none tracking-[-0.035em] text-ink truncate">
                {meal ? `${t.addTo} ${meal}` : t.addFood}
              </h2>
            </div>
            <IconButton label={t.close} tone="card" onClick={onClose}>
              <X className="w-5 h-5" strokeWidth={2} />
            </IconButton>
          </div>

          <label className="h-[52px] rounded-[18px] bg-card flex items-center gap-2.5 px-4 focus-within:ring-2 focus-within:ring-inset focus-within:ring-ink">
            <Search className="w-5 h-5 text-muted shrink-0" strokeWidth={2} />
            <span className="sr-only">{t.searchFood}</span>
            <input
              type="search" autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchFood}
              className="flex-1 min-w-0 h-full border-0 bg-transparent text-base text-ink !outline-none placeholder:text-muted/70"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label={t.cancel}
                className="w-8 h-8 -me-1.5 rounded-full bg-sunk text-muted flex items-center justify-center border-0 cursor-pointer">
                <X className="w-4 h-4" strokeWidth={2.2} />
              </button>
            )}
          </label>

          <div role="group" aria-label={t.categories} className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5">
            <Chip active={category === null} onClick={() => setCategory(null)}>{t.allFoods}</Chip>
            {CATEGORIES.map((c) => (
              <Chip key={c.id} active={category === c.id} onClick={() => setCategory(category === c.id ? null : c.id)}>
                {isRtl ? c.fa : c.en}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-3.5 pb-5 flex flex-col gap-3 scrollbar-hide">
          <button type="button" onClick={onQuickAdd}
            className="w-full min-h-[64px] rounded-3xl bg-card flex items-center gap-3 px-4 py-2.5 text-start border-0 cursor-pointer active:scale-[0.99] transition-transform">
            <IconWell tone="inv" size={40}><Zap className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>
            <span className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="text-[15px] font-semibold text-ink">{t.quickAdd}</span>
              <span className="text-[13px] text-muted truncate">{t.quickAddHint}</span>
            </span>
            <Plus className="w-5 h-5 text-muted shrink-0" strokeWidth={2} />
          </button>

          {showRecents && (
            <>
              <Label as="h3" className="m-0 mt-1 px-1">{t.recent}</Label>
              <FoodList foods={recents} chosen={chosen} isRtl={isRtl} t={t} onPick={pick} label={t.recent} />
              <Label as="h3" className="m-0 mt-1 px-1">{t.allFoods}</Label>
            </>
          )}

          {results.length === 0
            ? <p className="m-0 py-10 text-center text-sm text-muted">{t.noMatches}</p>
            : <FoodList foods={results} chosen={chosen} isRtl={isRtl} t={t} onPick={pick} label={t.foods} />}
        </div>

        <AnimatePresence initial={false}>
          {chosen && (
            <motion.div key={chosen.id}
              initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 36 }}
              className="shrink-0 px-5 pt-1 pb-[max(env(safe-area-inset-bottom),20px)]">
              <PortionPane food={chosen} meal={meal} isRtl={isRtl} t={t}
                onCancel={() => setChosen(null)}
                onConfirm={(grams) => onPick(chosen, grams)} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function FoodList({ foods, chosen, isRtl, t, onPick, label }) {
  return (
    <ul aria-label={label} className="m-0 p-0 py-1 list-none rounded-3xl bg-card divide-y divide-hair">
      {foods.map((food) => (
        <FoodRow key={food.id} food={food} isRtl={isRtl} t={t} selected={chosen?.id === food.id} onClick={() => onPick(food)} />
      ))}
    </ul>
  );
}

function FoodRow({ food, isRtl, t, selected, onClick }) {
  const s = food.servings[0];
  const per = macrosFor(food, s.g);
  const name = isRtl ? food.nameFa : food.nameEn;
  const sep = isRtl ? "، " : " · ";
  return (
    <li className={cx("list-none", selected && "bg-sunk/60")}>
      <button type="button" onClick={onClick} aria-pressed={selected}
        aria-label={selected ? `${name}, ${t.selected}` : `${t.add} ${name}`}
        className="w-full min-h-[64px] flex items-center gap-3 ps-4 pe-2.5 py-2.5 text-start bg-transparent border-0 cursor-pointer">
        <span className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className={cx("text-[15px] text-ink truncate", selected ? "font-bold" : "font-semibold")}>{name}</span>
          <span className="text-xs text-muted truncate">
            {isRtl ? s.fa : s.en} ({num(s.g, isRtl)} {t.grams}){sep}{macroLine(per, isRtl, t)}
          </span>
        </span>
        <span className="text-sm font-semibold text-ink shrink-0">{fmtNum(per.kcal, isRtl)}</span>
        <span aria-hidden="true"
          className={cx("w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors",
            selected ? "bg-jet text-accent dark:ring-1 dark:ring-inset dark:ring-line" : "bg-sunk text-ink")}>
          {selected ? <CheckIcon className="w-5 h-5" strokeWidth={2.4} /> : <Plus className="w-5 h-5" strokeWidth={2.2} />}
        </span>
      </button>
    </li>
  );
}
