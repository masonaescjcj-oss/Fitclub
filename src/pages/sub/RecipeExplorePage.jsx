import React from "react";
import { Clock, Egg, Fish, Flame, Salad } from "lucide-react";
import { Card, IconWell, Label, Screen, Tag, TopBar, num } from "../../components/ui/kit";

// Recipes: a short list of high-protein meals, each with its prep time,
// calories and protein at a glance.

const RECIPES = [
  {
    titleEn: "High-Protein Chicken Rice Bowl", titleFa: "کاسه مرغ و برنج پرپروتئین",
    prepMin: 20, kcal: 520, protein: 48, categoryEn: "High protein", categoryFa: "پرپروتئین", icon: Salad, tone: "sand",
  },
  {
    titleEn: "Avocado & Egg Fitness Toast", titleFa: "تست آووکادو و تخم‌مرغ ورزشی",
    prepMin: 10, kcal: 340, protein: 22, categoryEn: "Quick breakfast", categoryFa: "صبحانه سریع", icon: Egg, tone: "sage",
  },
  {
    titleEn: "Salmon & Quinoa Power Salad", titleFa: "سالاد سلمون و کینوا مقوی",
    prepMin: 15, kcal: 480, protein: 38, categoryEn: "Low carb", categoryFa: "کم‌کربوهیدرات", icon: Fish, tone: "mist",
  },
];

export default function RecipeExplorePage({ onBack, isRtl }) {
  const n = (v) => num(v, isRtl);
  return (
    <Screen isRtl={isRtl}>
      <TopBar title={isRtl ? "دستور پخت‌های رژیمی" : "Recipes"} onBack={onBack} isRtl={isRtl} />
      <p className="m-0 text-[15px] leading-[1.45] text-muted">
        {isRtl ? "وعده‌های ساده و پرپروتئین که با برنامه‌ی تغذیه‌ات جور درمی‌آیند." : "Simple, high-protein meals that fit your targets."}
      </p>

      <ul className="m-0 p-0 list-none flex flex-col gap-2.5">
        {RECIPES.map((r) => {
          const Icon = r.icon;
          return (
            <li key={r.titleEn}>
              <Card className="flex flex-col gap-3.5">
                <div className="flex items-start gap-3.5">
                  <IconWell tone={r.tone} square size={48}><Icon className="w-[22px] h-[22px]" strokeWidth={2} /></IconWell>
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <Label>{isRtl ? r.categoryFa : r.categoryEn}</Label>
                    <h2 className="m-0 text-[17px] font-bold leading-snug text-ink">{isRtl ? r.titleFa : r.titleEn}</h2>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Tag><Clock className="w-3.5 h-3.5" strokeWidth={2} />{n(r.prepMin)} {isRtl ? "دقیقه" : "min"}</Tag>
                  <Tag><Flame className="w-3.5 h-3.5" strokeWidth={2} />{n(r.kcal)} {isRtl ? "کالری" : "kcal"}</Tag>
                  <Tag tone="inv" className="font-semibold">{isRtl ? `پروتئین ${n(r.protein)} گرم` : `Protein ${r.protein} g`}</Tag>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </Screen>
  );
}
