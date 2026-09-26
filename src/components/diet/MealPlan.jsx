import React, { useMemo, useState } from "react";
import { ArrowLeftRight, CalendarDays, ChevronLeft, ChevronRight, LayoutGrid, RefreshCw, ShoppingBasket, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { Button, Check, Chip, Field, IconButton, Label, Segmented, cx, num } from "../ui/kit";
import { Sheet } from "./SmallSheets";
import { fmtNum } from "./DietBits";
import { findFood, FOODS } from "../../lib/nutrition/foods";
import { ALLERGENS, foodMeta } from "../../lib/nutrition/foodMeta";
import { PRICES_AS_OF } from "../../lib/nutrition/prices";
import { allowedFoods, dayTotals, itemsTotals, shoppingList, swapOptions } from "../../lib/nutrition/planEngine";

// The meal plan in Fuel: today's planned meals (tick what you ate, tap a
// food to swap it), the whole week, the shopping list and the planner's
// settings. The engine is planEngine.js; the state lives in useNutrition.

const COPY = {
  en: {
    library: "Ready meal plans",
    title: "Your meal plan", today: "Today's plan", week: "Whole week", shop: "Shopping list", settings: "Plan settings",
    emptyTitle: "A meal plan made for you",
    emptyBody: "Seven days of real meals that hit your calories and protein, at the budget you pick. Swap any food; the rest adjusts.",
    build: "Make my plan", rebuild: "New plan", saving: "Making your plan…",
    kcal: "kcal", protein: "protein", g: "g", perDay: "a day", aboutCost: (v) => `about ${v}`,
    ate: "Ate it", skip: "Didn't eat", skipped: "Skipped", undo: "Undo", tapToSwap: "Tap a food to swap it",
    stale: "Your targets changed since this plan was made.", update: "Update the plan",
    swapTitle: "Swap", closest: "Closest matches", scope: "Change", once: "This meal", weekScope: "This week", always: "Always",
    alwaysHint: (a) => `From now on, every plan uses the food you pick instead of ${a}.`, prevDay: "Previous day", nextDay: "Next day",
    same: "same", more: "more", less: "less", cheaper: "cheaper", dearer: "dearer",
    budget: "Budget", economy: "Economy", medium: "Medium", free: "No limit",
    budgetHint: { economy: "Eggs, legumes, dairy and chicken first.", medium: "A balance of price and variety.", free: "Price hardly counts; the most variety." },
    cap: "Weekly cap (optional)", capHint: "In toman. The plan says if it can't fit.", toman: "toman",
    meals: "Meals a day", dislikes: "Foods to leave out", allergies: "Allergies", search: "Search foods",
    rules: "Always swapped", noRules: "None yet. Choose “Always” when you swap a food.",
    weekCost: "This week", overCap: "Over your cap: this is the cheapest plan that still meets your targets.",
    prices: `Approximate Tehran prices, ${PRICES_AS_OF}.`, total: "Total", buy: "What to buy for the days ahead",
    egg: "eggs", loaf: "loaves", sheet: "sheets", kg: "kg",
    mealNames: { b: "Breakfast", l: "Lunch", d: "Dinner", s: "Snack", s1: "Morning snack", s2: "Afternoon snack" },
    days: "Days", close: "Close", cancel: "Cancel", apply: "Make the plan",
  },
  fa: {
    library: "برنامه‌های غذایی آماده",
    title: "برنامه‌ی غذایی تو", today: "برنامه‌ی امروز", week: "کل هفته", shop: "لیست خرید", settings: "تنظیمات برنامه",
    emptyTitle: "برنامه‌ی غذایی مخصوص خودت",
    emptyBody: "هفت روز غذای واقعی که به کالری و پروتئینت می‌رسد، با بودجه‌ای که خودت انتخاب می‌کنی. هر غذا را می‌توانی عوض کنی؛ بقیه خودش تنظیم می‌شود.",
    build: "برنامه‌ام را بساز", rebuild: "برنامه‌ی تازه", saving: "در حال ساختن برنامه…",
    kcal: "کالری", protein: "پروتئین", g: "گرم", perDay: "در روز", aboutCost: (v) => `حدود ${v}`,
    ate: "خوردم", skip: "نخوردم", skipped: "نخوردی", undo: "برگردان", tapToSwap: "برای عوض کردن، روی غذا بزن",
    stale: "عددهای روزانه‌ات بعد از ساختن این برنامه عوض شده.", update: "به‌روز کردن برنامه",
    swapTitle: "جایگزین", closest: "نزدیک‌ترین گزینه‌ها", scope: "تغییر برای", once: "همین وعده", weekScope: "کل این هفته", always: "همیشه",
    alwaysHint: (a) => `از این به بعد، همه‌ی برنامه‌ها به جای ${a} غذایی را می‌گذارند که انتخاب می‌کنی.`, prevDay: "روز قبل", nextDay: "روز بعد",
    same: "همان", more: "بیشتر", less: "کمتر", cheaper: "ارزان‌تر", dearer: "گران‌تر",
    budget: "بودجه", economy: "اقتصادی", medium: "میانه", free: "آزاد",
    budgetHint: { economy: "اول تخم‌مرغ، حبوبات، لبنیات و مرغ.", medium: "تعادل قیمت و تنوع.", free: "قیمت کم‌اهمیت است؛ بیشترین تنوع." },
    cap: "سقف هفتگی (اختیاری)", capHint: "به تومان. اگر جا نشود، برنامه می‌گوید.", toman: "تومان",
    meals: "تعداد وعده در روز", dislikes: "غذاهایی که نمی‌خواهی", allergies: "حساسیت", search: "جست‌وجوی غذا",
    rules: "جایگزینی‌های همیشگی", noRules: "هنوز هیچ. موقع عوض کردن غذا «همیشه» را بزن.",
    weekCost: "این هفته", overCap: "از سقفت بیشتر شد: این ارزان‌ترین برنامه‌ای است که هنوز به عددهایت می‌رسد.",
    prices: `قیمت‌ها تقریبی و مربوط به تهران، ${PRICES_AS_OF}.`, total: "جمع", buy: "خرید برای روزهای پیش رو",
    egg: "عدد", loaf: "عدد نان", sheet: "برگ", kg: "کیلو",
    mealNames: { b: "صبحانه", l: "ناهار", d: "شام", s: "میان‌وعده", s1: "میان‌وعده‌ی صبح", s2: "میان‌وعده‌ی عصر" },
    days: "روزها", close: "بستن", cancel: "انصراف", apply: "ساختن برنامه",
  },
};
export const usePlanCopy = (isRtl) => (isRtl ? COPY.fa : COPY.en);

const foodName = (id, isRtl) => { const f = findFood(id); return f ? (isRtl ? f.nameFa : f.nameEn) : id; };

/** What a food is called in a shop: "Chicken thigh", not "Chicken thigh, cooked". */
const shopName = (id, isRtl) => foodName(id, isRtl)
  .replace(/[،,]?\s*(cooked|boiled|baked|raw|dry|canned)\b/gi, "")
  .replace(/\s*(پخته|آب‌پز|خام)(?=\s|$)/g, "")
  .trim();

/** A number with Persian digits and the Persian decimal separator (۱٫۵). */
const dec = (v, isRtl) => (isRtl ? num(v, true).replace(".", "٫") : String(v));

/** Toman, short: 320 هزار تومان, 3.6 میلیون تومان. */
export function money(v, isRtl) {
  const x = Math.round(v || 0);
  if (isRtl) {
    if (x >= 1e6) return `${dec(+(x / 1e6).toFixed(1), true)} میلیون تومان`;
    return `${num(Math.round(x / 1000), true)} هزار تومان`;
  }
  if (x >= 1e6) return `${+(x / 1e6).toFixed(1)}M toman`;
  return `${Math.round(x / 1000)}k toman`;
}

/** "1½ cups · 235 g", "3 eggs", "2 tbsp · 25 g": a kitchen measure first, then grams. */
export function amountLabel(foodId, grams, isRtl) {
  const n = (v) => num(v, isRtl);
  const food = findFood(foodId);
  const meta = foodMeta(foodId);
  // A quarter of a barbari or sangak isn't a measure anyone counts in: grams.
  const unit = meta?.unit || (meta?.sub === "bread" && foodId !== "bread_lavash" ? null : food?.servings?.find((s) => s.g !== 100));
  const g = `${n(Math.round(grams))} ${isRtl ? "گرم" : "g"}`;
  if (!unit || !unit.g) return g;
  const count = Math.round((grams / unit.g) * 2) / 2;
  if (count < 0.5 || count > 12) return g;
  const shown = dec(count, isRtl);
  if (foodId === "egg") return isRtl ? `${shown} عدد` : `${shown} ${count === 1 ? "egg" : "eggs"}`;
  return `${shown} ${isRtl ? unit.fa : unit.en} · ${g}`;
}

/* ─────────────────────────────── today ─────────────────────────────── */

/** Today's planned meals, or the invitation to make a plan. */
export function PlanTodayCard({ isRtl, plan, day, stale, onBuild, onOpenSettings, onOpenWeek, onOpenShop, onOpenLibrary, onMark, onSwap, onUpdate }) {
  const c = usePlanCopy(isRtl);
  const n = (v) => num(v, isRtl);
  if (!plan.week) {
    return (
      <section aria-label={c.title} className="rounded-4xl bg-hero text-hero-fg p-5 flex flex-col gap-3">
        <span className="w-10 h-10 rounded-2xl bg-accent text-on-accent flex items-center justify-center"><Sparkles className="w-5 h-5" strokeWidth={2} /></span>
        <h2 className="m-0 font-display font-extrabold text-[24px] leading-tight tracking-[-0.02em]">{c.emptyTitle}</h2>
        <p className="m-0 text-sm leading-[1.5] text-hero-fg/80">{c.emptyBody}</p>
        <Button tone="accent" size="lg" block onClick={onOpenSettings}>{c.build}</Button>
        {onOpenLibrary && <Button tone="hero" block onClick={onOpenLibrary}>{c.library}</Button>}
      </section>
    );
  }
  if (!day) return null;
  const t = dayTotals(day);
  return (
    <section aria-label={c.today} className="rounded-4xl bg-card text-ink p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex flex-col gap-1">
          <Label>{c.today}</Label>
          <span className="text-[13px] text-muted">
            {fmtNum(t.kcal, isRtl)} {c.kcal} · {n(Math.round(t.protein))} {c.g} {c.protein} · {c.aboutCost(money(t.cost, isRtl))}
          </span>
        </div>
        <IconButton label={c.settings} tone="soft" size={40} onClick={onOpenSettings}><SlidersHorizontal className="w-[18px] h-[18px]" strokeWidth={2} /></IconButton>
      </div>
      {stale && (
        <div className="rounded-2xl bg-sunk px-3.5 py-3 flex items-center justify-between gap-3">
          <span className="text-[13px] leading-snug text-ink">{c.stale}</span>
          <Button tone="ink" size="sm" onClick={onUpdate}>{c.update}</Button>
        </div>
      )}
      <ul className="m-0 p-0 list-none flex flex-col divide-y divide-hair">
        {day.meals.map((meal, mi) => (
          <PlannedMeal key={meal.id} meal={meal} isRtl={isRtl} c={c}
            onMark={(status) => onMark(day.date, mi, status)}
            onSwap={(ii) => onSwap(day.date, mi, ii)} />
        ))}
      </ul>
      <p className="m-0 text-[12px] text-muted text-center">{c.tapToSwap}</p>
      <div className="grid grid-cols-2 gap-2">
        <Button tone="soft" icon={<CalendarDays className="w-4 h-4" strokeWidth={2} />} onClick={onOpenWeek}>{c.week}</Button>
        <Button tone="soft" icon={<ShoppingBasket className="w-4 h-4" strokeWidth={2} />} onClick={onOpenShop}>{c.shop}</Button>
      </div>
      {onOpenLibrary && (
        <Button tone="ghost" size="sm" icon={<LayoutGrid className="w-4 h-4" strokeWidth={2} />} onClick={onOpenLibrary}>{c.library}</Button>
      )}
    </section>
  );
}

function PlannedMeal({ meal, isRtl, c, onMark, onSwap, readOnly = false }) {
  const t = itemsTotals(meal.items);
  const done = meal.status === "ate";
  const skipped = meal.status === "skipped";
  return (
    <li className="py-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {!readOnly && <Check checked={done} label={`${c.mealNames[meal.id]}: ${c.ate}`} onToggle={() => onMark(done ? null : "ate")} />}
        <span className={cx("flex-1 min-w-0 text-[15px] font-semibold", skipped ? "text-muted line-through" : "text-ink")}>{c.mealNames[meal.id]}</span>
        <span className="text-[13px] text-muted tabular-nums">{fmtNum(t.kcal, isRtl)} {c.kcal}</span>
        {!readOnly && !done && (
          <button type="button" onClick={() => onMark(skipped ? null : "skipped")}
            className="h-9 px-2 -me-2 text-[13px] font-medium text-muted bg-transparent border-0 cursor-pointer underline underline-offset-2">
            {skipped ? c.undo : c.skip}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 ps-9">
        {meal.items.map((it, ii) => (
          <button key={`${it.foodId}-${ii}`} type="button" disabled={readOnly || done}
            onClick={() => onSwap(ii)}
            aria-label={`${c.swapTitle}: ${foodName(it.foodId, isRtl)}`}
            className={cx("min-h-9 px-3 py-1.5 rounded-2xl text-start text-[13px] leading-snug border-0 inline-flex flex-col",
              readOnly || done ? "bg-sunk cursor-default" : "bg-sunk cursor-pointer active:scale-[0.98] transition-transform",
              it.swapped && "ring-1 ring-inset ring-ink/30")}>
            <span className="font-semibold text-ink">{foodName(it.foodId, isRtl)}</span>
            <span className="text-muted">{amountLabel(it.foodId, it.grams, isRtl)}</span>
          </button>
        ))}
      </div>
    </li>
  );
}

/* ─────────────────────────────── swap ─────────────────────────────── */

export function SwapSheet({ isRtl, item, slot, profile, settings, onPick, onClose }) {
  const c = usePlanCopy(isRtl);
  const n = (v) => num(v, isRtl);
  const [scope, setScope] = useState("once");
  const pool = useMemo(() => allowedFoods({ dietType: profile.dietType, dislikes: settings.dislikes, allergies: settings.allergies }), [profile.dietType, settings]);
  const options = useMemo(() => swapOptions(item, { pool, slot }), [item, pool, slot]);
  const diff = (v, unit, kind) => {
    if (Math.abs(v) < (kind === "cost" ? 1000 : 3)) return c.same;
    const word = kind === "cost" ? (v < 0 ? c.cheaper : c.dearer) : v < 0 ? c.less : c.more;
    return kind === "cost" ? `${money(Math.abs(v), isRtl)} ${word}` : `${n(Math.abs(v))} ${unit} ${word}`;
  };
  return (
    <Sheet title={`${c.swapTitle}: ${foodName(item.foodId, isRtl)}`} isRtl={isRtl} t={c} onClose={onClose}>
      <p className="m-0 -mt-2 text-sm text-muted">{amountLabel(item.foodId, item.grams, isRtl)}</p>
      <div className="flex flex-col gap-2">
        <Label>{c.scope}</Label>
        <Segmented value={scope} onChange={setScope}
          options={[{ id: "once", label: c.once }, { id: "week", label: c.weekScope }, { id: "always", label: c.always }]} />
        {scope === "always" && <p className="m-0 text-[13px] text-muted">{c.alwaysHint(foodName(item.foodId, isRtl))}</p>}
      </div>
      <Label>{c.closest}</Label>
      <ul className="m-0 p-0 list-none rounded-3xl bg-card divide-y divide-hair">
        {options.map((o) => (
          <li key={o.foodId}>
            <button type="button" onClick={() => onPick(o, scope)}
              className="w-full min-h-[60px] px-4 py-2.5 flex items-center gap-3 text-start bg-transparent border-0 cursor-pointer active:bg-sunk">
              <ArrowLeftRight className="w-4 h-4 text-muted shrink-0" strokeWidth={2} />
              <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold text-ink">{foodName(o.foodId, isRtl)}</span>
                <span className="text-[13px] text-muted">{amountLabel(o.foodId, o.grams, isRtl)}</span>
              </span>
              <span className="shrink-0 flex flex-col items-end gap-0.5 text-[12px] text-muted">
                <span>{diff(o.delta.kcal, c.kcal)}</span>
                {o.delta.cost !== 0 && <span>{diff(o.delta.cost, "", "cost")}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

/* ─────────────────────────────── week ─────────────────────────────── */

const weekday = (iso, isRtl) => new Intl.DateTimeFormat(isRtl ? "fa-IR-u-ca-persian" : "en-GB", { weekday: "short", day: "numeric" })
  .format(new Date(`${iso}T12:00:00`));

export function WeekSheet({ isRtl, plan, today, onSwap, onRebuild, onOpenSettings, onRemoveRule, onClose }) {
  const c = usePlanCopy(isRtl);
  const n = (v) => num(v, isRtl);
  const days = plan.week?.days || [];
  const [index, setIndex] = useState(() => Math.max(0, days.findIndex((d) => d.date === today)));
  const day = days[index];
  const t = day ? dayTotals(day) : null;
  const Prev = isRtl ? ChevronRight : ChevronLeft;
  const Next = isRtl ? ChevronLeft : ChevronRight;
  return (
    <Sheet title={c.week} isRtl={isRtl} t={c} onClose={onClose}
      footer={(
        <>
          <Button tone="card" size="lg" className="flex-1" icon={<SlidersHorizontal className="w-4 h-4" strokeWidth={2} />} onClick={onOpenSettings}>{c.settings}</Button>
          <Button tone="ink" size="lg" className="flex-1" icon={<RefreshCw className="w-4 h-4" strokeWidth={2} />} onClick={onRebuild}>{c.rebuild}</Button>
        </>
      )}>
      <div className="flex items-center justify-between gap-2 -mt-1">
        <span className="text-sm text-muted">{c.weekCost}: <span className="font-semibold text-ink">{money(plan.week?.cost, isRtl)}</span></span>
      </div>
      {plan.week && plan.week.withinCap === false && <p className="m-0 text-[13px] text-alert">{c.overCap}</p>}
      <div role="tablist" aria-label={c.days} className="-mx-5 px-5 flex gap-1.5 overflow-x-auto scrollbar-hide">
        {days.map((d, i) => (
          <Chip key={d.date} active={i === index} onClick={() => setIndex(i)}>{weekday(d.date, isRtl)}</Chip>
        ))}
      </div>
      {day && (
        <div className="rounded-3xl bg-card px-4 py-1 flex flex-col">
          <div className="flex items-center justify-between py-3 border-b border-hair">
            <IconButton label={c.prevDay} tone="soft" size={36} onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}><Prev className="w-4 h-4" /></IconButton>
            <span className="text-[13px] text-muted text-center">
              {fmtNum(t.kcal, isRtl)} {c.kcal} · {n(Math.round(t.protein))} {c.g} {c.protein} · {money(t.cost, isRtl)}
            </span>
            <IconButton label={c.nextDay} tone="soft" size={36} onClick={() => setIndex((i) => Math.min(days.length - 1, i + 1))} disabled={index === days.length - 1}><Next className="w-4 h-4" /></IconButton>
          </div>
          <ul className="m-0 p-0 list-none flex flex-col divide-y divide-hair">
            {day.meals.map((meal, mi) => (
              <PlannedMeal key={meal.id} meal={meal} isRtl={isRtl} c={c} readOnly={day.date < today}
                onMark={() => {}} onSwap={(ii) => onSwap(day.date, mi, ii)} />
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label>{c.rules}</Label>
        {plan.rules.length ? (
          <div className="flex flex-wrap gap-1.5">
            {plan.rules.map((r) => (
              <span key={r.from} className="h-9 ps-3 pe-1 rounded-full bg-card inline-flex items-center gap-1.5 text-[13px] text-ink">
                {foodName(r.from, isRtl)} ← {foodName(r.to, isRtl)}
                <IconButton label={c.undo} tone="ghost" size={32} onClick={() => onRemoveRule(r.from)}><X className="w-3.5 h-3.5" /></IconButton>
              </span>
            ))}
          </div>
        ) : <p className="m-0 text-[13px] text-muted">{c.noRules}</p>}
      </div>
    </Sheet>
  );
}

/* ─────────────────────────────── shopping ─────────────────────────────── */

export function ShoppingSheet({ isRtl, plan, today, onClose }) {
  const c = usePlanCopy(isRtl);
  const n = (v) => num(v, isRtl);
  const ahead = (plan.week?.days || []).filter((d) => d.date >= today);
  const list = useMemo(() => shoppingList(ahead), [ahead]);
  const [have, setHave] = useState(() => new Set());
  const amount = (r) => {
    if (r.unit === "egg") return `${n(r.amount)} ${c.egg}`;
    if (r.unit === "loaf") return `${n(r.amount)} ${c.loaf}`;
    if (r.unit === "sheet") return `${n(r.amount)} ${c.sheet}`;
    return r.grams >= 1000 ? `${dec(+(r.grams / 1000).toFixed(1), isRtl)} ${c.kg}` : `${n(r.grams)} ${c.g}`;
  };
  return (
    <Sheet title={c.shop} isRtl={isRtl} t={c} onClose={onClose}>
      <p className="m-0 -mt-2 text-sm text-muted">{c.buy}</p>
      <ul className="m-0 p-0 list-none rounded-3xl bg-card divide-y divide-hair">
        {list.rows.map((r) => {
          const on = have.has(r.foodId);
          return (
            <li key={r.foodId} className="min-h-[56px] ps-3 pe-4 py-1.5 flex items-center gap-2">
              <Check checked={on} label={foodName(r.foodId, isRtl)} className="ms-0"
                onToggle={() => setHave((s) => { const x = new Set(s); if (x.has(r.foodId)) x.delete(r.foodId); else x.add(r.foodId); return x; })} />
              <span className={cx("flex-1 min-w-0 text-[15px]", on ? "text-muted line-through" : "text-ink font-medium")}>{shopName(r.foodId, isRtl)}</span>
              <span className="shrink-0 flex flex-col items-end text-[13px]">
                <span className="text-ink font-semibold">{amount(r)}</span>
                {r.cost != null && <span className="text-muted">{money(r.cost, isRtl)}</span>}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between px-1">
        <span className="text-[15px] font-bold text-ink">{c.total}</span>
        <span className="text-[15px] font-bold text-ink">{money(list.total, isRtl)}</span>
      </div>
      <p className="m-0 text-[12px] text-muted">{c.prices}</p>
    </Sheet>
  );
}

/* ─────────────────────────────── settings ─────────────────────────────── */

export function PlanSettingsSheet({ isRtl, settings, onApply, onClose }) {
  const c = usePlanCopy(isRtl);
  const [s, setS] = useState(() => ({ ...settings }));
  const [q, setQ] = useState("");
  const toggle = (key, id) => setS((x) => ({ ...x, [key]: x[key].includes(id) ? x[key].filter((v) => v !== id) : [...x[key], id] }));
  const plannable = useMemo(() => FOODS.filter((f) => foodMeta(f.id)?.slots), []);
  const matches = q.trim()
    ? plannable.filter((f) => f.nameFa.includes(q.trim()) || f.nameEn.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 12)
    : [];
  const capText = s.weeklyCap ? String(s.weeklyCap) : "";
  return (
    <Sheet title={c.settings} isRtl={isRtl} t={c} onClose={onClose}
      footer={(
        <>
          <Button tone="card" size="lg" className="flex-1" onClick={onClose}>{c.cancel}</Button>
          <Button tone="ink" size="lg" className="flex-1" onClick={() => onApply(s)}>{c.apply}</Button>
        </>
      )}>
      <div className="flex flex-col gap-2">
        <Label>{c.budget}</Label>
        <Segmented value={s.budget} onChange={(budget) => setS((x) => ({ ...x, budget }))}
          options={[{ id: "economy", label: c.economy }, { id: "medium", label: c.medium }, { id: "free", label: c.free }]} />
        <p className="m-0 text-[13px] text-muted">{c.budgetHint[s.budget]}</p>
      </div>
      <Field label={c.cap} hint={c.capHint} type="number" inputMode="numeric" min="0" value={capText} suffix={c.toman}
        onChange={(e) => setS((x) => ({ ...x, weeklyCap: e.target.value ? Math.max(0, Math.round(+e.target.value)) : null }))} />
      <div className="flex flex-col gap-2">
        <Label>{c.meals}</Label>
        <Segmented value={String(s.meals)} onChange={(v) => setS((x) => ({ ...x, meals: +v }))}
          options={[3, 4, 5].map((m) => ({ id: String(m), label: num(m, isRtl) }))} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>{c.allergies}</Label>
        <div className="flex flex-wrap gap-1.5">
          {ALLERGENS.map((a) => (
            <Chip key={a.id} active={s.allergies.includes(a.id)} onClick={() => toggle("allergies", a.id)}>{isRtl ? a.fa : a.en}</Chip>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label>{c.dislikes}</Label>
        {s.dislikes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {s.dislikes.map((id) => (
              <Chip key={id} active onClick={() => toggle("dislikes", id)}>{foodName(id, isRtl)} <X className="w-3.5 h-3.5" /></Chip>
            ))}
          </div>
        )}
        <Field type="search" placeholder={c.search} aria-label={c.search} value={q} onChange={(e) => setQ(e.target.value)} />
        {matches.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {matches.map((f) => (
              <Chip key={f.id} active={s.dislikes.includes(f.id)} onClick={() => toggle("dislikes", f.id)}>{isRtl ? f.nameFa : f.nameEn}</Chip>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}

