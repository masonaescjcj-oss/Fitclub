import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Info, Minus, Plus, Search, X, Zap } from "lucide-react";
import { CATEGORIES, findFood, macrosFor, searchFoods, servingsOf } from "../../lib/nutrition/foods";
import { MACRO_COLORS, round } from "./DietBits";

/** Step 2 of the sheet: choose how much, see the macros update live. */
function PortionPane({ food, isRtl, t, onCancel, onConfirm, initialGrams }) {
  const servings = servingsOf(food);
  const [servingIdx, setServingIdx] = useState(0);
  const [count, setCount] = useState(() =>
    initialGrams ? +(initialGrams / servings[0].g).toFixed(2) : 1
  );

  const grams = Math.max(Math.round(count * servings[servingIdx].g), 0);
  const m = macrosFor(food, grams);

  const nudge = (delta) => setCount((c) => Math.max(+(c + delta).toFixed(2), 0.25));

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-hide">
        <div>
          <h3 className="text-base font-black text-white">{isRtl ? food.nameFa : food.nameEn}</h3>
          {food.estimate && (
            <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold text-amber-400/90">
              <Info className="w-3 h-3" /> {t.entryFrom}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <span className="block text-[10px] font-black text-neutral-500 uppercase tracking-wider">{t.serving}</span>
          <div className="flex flex-wrap gap-1.5">
            {servings.map((s, i) => (
              <button key={`${s.en}-${i}`} type="button" onClick={() => setServingIdx(i)}
                className={`px-3 h-9 rounded-xl text-[11px] font-black border transition-all ${
                  servingIdx === i
                    ? "bg-[#844783] border-[#844783] text-white"
                    : "bg-[#141416] border-white/10 text-neutral-400 hover:border-white/25"
                }`}>
                {isRtl ? s.fa : s.en}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="block text-[10px] font-black text-neutral-500 uppercase tracking-wider">{t.amount}</span>
          <div className="flex items-center gap-2" dir="ltr">
            <button type="button" onClick={() => nudge(-0.5)} aria-label="-"
              className="w-11 h-11 rounded-xl bg-[#141416] border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white">
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="number" min="0.25" step="0.25" value={count}
              onChange={(e) => setCount(Math.max(+e.target.value || 0, 0))}
              className="flex-1 h-11 px-3 rounded-xl bg-[#141416] border border-white/10 text-center text-sm font-black text-white focus:outline-none focus:border-white/30"
            />
            <button type="button" onClick={() => nudge(0.5)} aria-label="+"
              className="w-11 h-11 rounded-xl bg-[#141416] border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white">
              <Plus className="w-4 h-4" />
            </button>
            <span className="text-xs font-black text-neutral-500 w-16 text-right tabular-nums">{grams} {t.grams}</span>
          </div>
        </div>

        {/* Live macro readout */}
        <div className="p-4 rounded-2xl bg-[#141416] border border-white/10 space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">{t.calories}</span>
            <span className="text-2xl font-black text-white tabular-nums">{round(m.kcal)}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/10" dir="ltr">
            {[
              ["protein", t.protein, m.protein],
              ["carbs", t.carbs, m.carbs],
              ["fat", t.fat, m.fat],
              ["fiber", t.fiber, m.fiber],
            ].map(([key, label, value]) => (
              <div key={key} className="text-center">
                <span className="block text-[9px] font-black uppercase" style={{ color: MACRO_COLORS[key] }}>{label}</span>
                <span className="block text-sm font-black text-white tabular-nums">{round(value)}g</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-white/10 flex gap-2 shrink-0">
        <button type="button" onClick={onCancel}
          className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/10 text-neutral-300 font-black text-sm hover:bg-white/10 transition-all">
          {t.cancel}
        </button>
        <button type="button" onClick={() => onConfirm(grams)} disabled={grams <= 0}
          className="flex-1 h-12 rounded-2xl bg-[#844783] text-white font-black text-sm disabled:opacity-40 hover:brightness-110 active:scale-[0.98] transition-all">
          {t.logIt}
        </button>
      </div>
    </div>
  );
}

/** Step 1: search or browse, plus a quick-add escape hatch. */
export default function FoodSearchSheet({ mealId, isRtl, t, recentIds, onPick, onQuickAdd, onClose }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(null);
  const [chosen, setChosen] = useState(null);

  const results = useMemo(() => searchFoods(query, category), [query, category]);
  const recents = useMemo(
    () => recentIds.map(findFood).filter(Boolean),
    [recentIds]
  );
  const showRecents = !query && !category && recents.length > 0;

  const meal = mealId ? (isRtl ? mealId.fa : mealId.en) : "";

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="relative w-full sm:max-w-lg bg-[#0d0d0f] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl h-[88dvh] sm:h-[80dvh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <h2 className="text-base font-black text-white">
            {chosen ? t.addTo + " " + meal : t.addFood}
          </h2>
          <button type="button" onClick={onClose} aria-label={t.close}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {chosen ? (
          <PortionPane food={chosen} isRtl={isRtl} t={t}
            onCancel={() => setChosen(null)}
            onConfirm={(grams) => onPick(chosen, grams)} />
        ) : (
          <>
            <div className="p-4 pb-2 space-y-3 shrink-0">
              <div className="relative">
                <Search className={`w-4 h-4 text-neutral-500 absolute top-1/2 -translate-y-1/2 ${isRtl ? "right-3" : "left-3"}`} />
                <input
                  autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.searchFood}
                  className={`w-full h-11 ${isRtl ? "pr-10 pl-3" : "pl-10 pr-3"} rounded-2xl bg-[#141416] border border-white/10 text-sm font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-white/30`}
                />
              </div>

              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                <button type="button" onClick={() => setCategory(null)}
                  className={`px-3 h-8 rounded-lg text-[10px] font-black whitespace-nowrap border transition-all ${
                    category === null ? "bg-white/10 border-white/30 text-white" : "bg-[#141416] border-white/10 text-neutral-400"
                  }`}>
                  {t.allFoods}
                </button>
                {CATEGORIES.map((c) => (
                  <button key={c.id} type="button" onClick={() => setCategory(category === c.id ? null : c.id)}
                    className={`px-3 h-8 rounded-lg text-[10px] font-black whitespace-nowrap border transition-all ${
                      category === c.id ? "bg-white/10 border-white/30 text-white" : "bg-[#141416] border-white/10 text-neutral-400"
                    }`}>
                    {c.emoji} {isRtl ? c.fa : c.en}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 scrollbar-hide">
              <button type="button" onClick={onQuickAdd}
                className="w-full p-3 rounded-2xl bg-[#141416] border border-dashed border-white/15 flex items-center gap-3 hover:border-white/30 transition-all">
                <span className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-amber-400" />
                </span>
                <span className="flex-1 text-start min-w-0">
                  <span className="block text-xs font-black text-white">{t.quickAdd}</span>
                  <span className="block text-[9px] font-medium text-neutral-500 truncate">{t.quickAddHint}</span>
                </span>
              </button>

              {showRecents && (
                <>
                  <h3 className="flex items-center gap-1.5 text-[10px] font-black text-neutral-500 uppercase tracking-wider px-1 pt-2">
                    <Clock className="w-3 h-3" /> {t.recent}
                  </h3>
                  {recents.map((food) => (
                    <FoodRow key={`r-${food.id}`} food={food} isRtl={isRtl} onClick={() => setChosen(food)} />
                  ))}
                  <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-wider px-1 pt-3">
                    {t.allFoods}
                  </h3>
                </>
              )}

              {results.length === 0 && (
                <p className="py-10 text-center text-xs font-bold text-neutral-600">{t.noMatches}</p>
              )}

              {results.map((food) => (
                <FoodRow key={food.id} food={food} isRtl={isRtl} onClick={() => setChosen(food)} />
              ))}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

function FoodRow({ food, isRtl, onClick }) {
  const s = food.servings[0];
  const per = macrosFor(food, s.g);
  return (
    <button type="button" onClick={onClick}
      className="w-full p-3 rounded-2xl bg-[#141416] border border-white/10 flex items-center gap-3 hover:border-white/25 transition-all text-start">
      <span className="flex-1 min-w-0">
        <span className="block text-xs font-black text-white truncate">{isRtl ? food.nameFa : food.nameEn}</span>
        <span className="block text-[9px] font-bold text-neutral-500 truncate" dir="ltr">
          {round(per.kcal)} kcal · {isRtl ? s.fa : s.en} ({s.g}g) · P{round(per.protein)} C{round(per.carbs)} F{round(per.fat)}
        </span>
      </span>
      <Plus className="w-4 h-4 text-neutral-600 shrink-0" />
    </button>
  );
}
