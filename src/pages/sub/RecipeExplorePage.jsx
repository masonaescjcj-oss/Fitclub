import React, { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Clock, Flame, Plus } from "lucide-react";
import { Button, Card, Label, Screen, Sheet, Tag, Toast, TopBar, cx, num } from "../../components/ui/kit";
import { RECIPES, RECIPE_TAGS, recipeMacros } from "../../lib/nutrition/recipes";
import { findFood } from "../../lib/nutrition/foods";
import { MEALS, dayKey } from "../../lib/nutrition/diaryStore";
import { useNutritionStore } from "../../lib/nutrition/nutritionContext";

// Recipes from the food bank: each card shows the calories and protein
// worked out from its ingredients; opening one shows the ingredients and
// steps, and adds them to today's diary as they are.

function RecipeSheet({ recipe, isRtl, onAdd, onClose }) {
  const n = (v) => num(v, isRtl);
  const [meal, setMeal] = useState(recipe.meal);
  const m = recipeMacros(recipe);
  const steps = isRtl ? recipe.stepsFa : recipe.stepsEn;
  return (
    <Sheet title={isRtl ? recipe.titleFa : recipe.titleEn} isRtl={isRtl} onClose={onClose} closeLabel={isRtl ? "بستن" : "Close"} tall
      footer={<Button tone="ink" size="lg" block onClick={() => onAdd(meal)} icon={<Plus className="w-[18px] h-[18px] text-accent dark:text-on-inv" strokeWidth={2.4} />}>
        {isRtl ? "افزودن به امروز" : "Add to today"}
      </Button>}>
      <div className="flex flex-wrap gap-1.5">
        <Tag><Flame className="w-3.5 h-3.5" strokeWidth={2} />{n(m.kcal)} {isRtl ? "کالری" : "kcal"}</Tag>
        <Tag tone="inv" className="font-semibold">{isRtl ? `پروتئین ${n(m.protein)} گرم` : `Protein ${m.protein} g`}</Tag>
        <Tag>{isRtl ? `کربوهیدرات ${n(m.carbs)} گرم` : `Carbs ${m.carbs} g`}</Tag>
        <Tag>{isRtl ? `چربی ${n(m.fat)} گرم` : `Fat ${m.fat} g`}</Tag>
      </div>

      <Label as="h3" className="m-0 mt-2 px-1">{isRtl ? "مواد لازم" : "Ingredients"}</Label>
      <ul className="m-0 p-0 list-none rounded-3xl bg-card divide-y divide-hair">
        {recipe.ingredients.map(({ foodId, grams }) => {
          const food = findFood(foodId);
          return (
            <li key={foodId} className="min-h-[48px] flex items-center justify-between gap-3 px-4 text-[15px]">
              <span className="font-semibold">{food ? (isRtl ? food.nameFa : food.nameEn) : foodId}</span>
              <span className="text-muted tabular-nums">{n(grams)} {isRtl ? "گرم" : "g"}</span>
            </li>
          );
        })}
      </ul>

      <Label as="h3" className="m-0 mt-2 px-1">{isRtl ? "طرز تهیه" : "Method"}</Label>
      <ol className="m-0 p-0 list-none flex flex-col gap-2">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-[1.45]">
            <span className="w-6 h-6 shrink-0 rounded-full bg-sunk flex items-center justify-center text-[12px] font-bold">{n(i + 1)}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>

      <Label as="h3" className="m-0 mt-2 px-1">{isRtl ? "کدام وعده" : "Which meal"}</Label>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={isRtl ? "کدام وعده" : "Which meal"}>
        {MEALS.map((x) => (
          <button key={x.id} type="button" role="radio" aria-checked={meal === x.id} onClick={() => setMeal(x.id)}
            className={cx("h-10 px-4 rounded-full border-0 text-[14px] font-semibold cursor-pointer", meal === x.id ? "bg-inv text-on-inv" : "bg-card text-ink")}>
            {isRtl ? x.fa : x.en}
          </button>
        ))}
      </div>
      <p className="m-0 px-1 text-[13px] text-muted">
        {isRtl ? "هر ماده جدا در دفترچه ثبت می‌شود و بعد می‌توانی مقدارش را تغییر دهی." : "Each ingredient goes into your diary on its own, so you can change amounts after."}
      </p>
    </Sheet>
  );
}

export default function RecipeExplorePage({ onBack, isRtl }) {
  const n = (v) => num(v, isRtl);
  const store = useNutritionStore();
  const [open, setOpen] = useState(null);
  const [flash, setFlash] = useState(null);
  useEffect(() => {
    if (!flash) return undefined;
    const id = setTimeout(() => setFlash(null), 2200);
    return () => clearTimeout(id);
  }, [flash]);

  const add = (recipe, meal) => {
    const today = dayKey();
    for (const { foodId, grams } of recipe.ingredients) if (findFood(foodId)) store.addEntry({ foodId, grams, meal }, today);
    const mealName = MEALS.find((x) => x.id === meal);
    setFlash(isRtl ? `به ${mealName?.fa || ""} امروز اضافه شد` : `Added to today's ${(mealName?.en || "").toLowerCase()}`);
    setOpen(null);
  };

  return (
    <Screen isRtl={isRtl}>
      <TopBar title={isRtl ? "دستور پخت‌ها" : "Recipes"} onBack={onBack} isRtl={isRtl} />
      <p className="m-0 text-[15px] leading-[1.45] text-muted">
        {isRtl ? "وعده‌های ساده و پرپروتئین؛ کالری و درشت‌مغذی‌ها از روی مواد لازم حساب شده‌اند." : "Simple, high-protein meals; calories and macros are worked out from the ingredients."}
      </p>

      <ul className="m-0 p-0 list-none flex flex-col gap-2.5">
        {RECIPES.map((r) => {
          const m = recipeMacros(r);
          return (
            <li key={r.id}>
              <button type="button" onClick={() => setOpen(r)} className="w-full p-0 border-0 bg-transparent text-start cursor-pointer">
                <Card className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>{isRtl ? RECIPE_TAGS[r.tag].fa : RECIPE_TAGS[r.tag].en}</Label>
                    <h2 className="m-0 text-[17px] font-bold leading-snug text-ink">{isRtl ? r.titleFa : r.titleEn}</h2>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Tag><Clock className="w-3.5 h-3.5" strokeWidth={2} />{n(r.minutes)} {isRtl ? "دقیقه" : "min"}</Tag>
                    <Tag><Flame className="w-3.5 h-3.5" strokeWidth={2} />{n(m.kcal)} {isRtl ? "کالری" : "kcal"}</Tag>
                    <Tag tone="inv" className="font-semibold">{isRtl ? `پروتئین ${n(m.protein)} گرم` : `Protein ${m.protein} g`}</Tag>
                  </div>
                </Card>
              </button>
            </li>
          );
        })}
      </ul>

      <AnimatePresence>
        {open && <RecipeSheet key={open.id} recipe={open} isRtl={isRtl} onAdd={(meal) => add(open, meal)} onClose={() => setOpen(null)} />}
      </AnimatePresence>
      {flash && <Toast>{flash}</Toast>}
    </Screen>
  );
}
