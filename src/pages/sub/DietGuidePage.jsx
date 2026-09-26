import React from "react";
import { Beef, Droplets, Timer } from "lucide-react";
import { Card, IconWell, Label, Screen, TopBar, num } from "../../components/ui/kit";
import { useNutritionStore } from "../../lib/nutrition/nutritionContext";
import { proteinPerKg } from "../../lib/nutrition/profile";

// The nutrition guide: three rules worth keeping, one card each, in the
// athlete's own numbers (the same targets the Fuel tab tracks).

export default function DietGuidePage({ onBack, isRtl }) {
  const { targets, profile } = useNutritionStore();
  const n = (v) => num(v, isRtl);
  const protein = Math.round(targets?.protein || 0);
  const perKg = proteinPerKg(protein, profile?.weight).toFixed(1);
  const liters = ((targets?.water || 0) / 1000).toFixed(1);

  const rules = [
    {
      icon: Beef,
      title: isRtl ? "پروتئین کافی" : "Enough protein",
      body: isRtl
        ? `هدف تو روزانه ${n(protein)} گرم پروتئین است (${n(perKg)} گرم به ازای هر کیلو وزن). ۱.۶ تا ۲.۲ گرم به ازای هر کیلو، بازه‌ای است که پژوهش‌ها برای ساختن و حفظ عضله پیشنهاد می‌کنند. آن را بین ۳ تا ۵ وعده پخش کن.`
        : `Your target is ${protein} g of protein a day (${perKg} g per kg of bodyweight). 1.6 to 2.2 g per kg is the range research supports for building and keeping muscle. Spread it over 3 to 5 meals.`,
    },
    {
      icon: Droplets,
      title: isRtl ? "آب" : "Water",
      body: isRtl
        ? `هدف تو ${n(liters)} لیتر در روز است: حدود ۳۵ میلی‌لیتر به ازای هر کیلو وزن. روزهای گرم و روزهای تمرین بیشتر بنوش.`
        : `Your target is ${liters} L a day: about 35 ml per kg of bodyweight. Drink more on hot days and training days.`,
    },
    {
      icon: Timer,
      title: isRtl ? "قبل و بعد از تمرین" : "Around training",
      body: isRtl
        ? "یک تا سه ساعت قبل از تمرین یک وعده با کربوهیدرات و کمی پروتئین بخور و تا دو ساعت بعد از تمرین یک وعده‌ی پروتئین‌دار. مجموع روز از زمان دقیق مهم‌تر است."
        : "Eat a meal with carbs and some protein one to three hours before training, and a protein meal within two hours after. The day's total matters more than exact timing.",
    },
  ];

  return (
    <Screen isRtl={isRtl}>
      <TopBar title={isRtl ? "راهنمای تغذیه" : "Nutrition guide"} onBack={onBack} isRtl={isRtl} />
      <p className="m-0 text-[15px] leading-[1.45] text-muted">
        {isRtl ? "اصول پایه‌ای که بیشترین اثر را روی ریکاوری و عملکرد دارند، با عددهای خودت." : "The basics that do the most for recovery and performance, in your own numbers."}
      </p>

      <ol className="m-0 p-0 list-none flex flex-col gap-2.5">
        {rules.map((rule, idx) => {
          const Icon = rule.icon;
          return (
            <li key={idx}>
              <Card className="flex items-start gap-3.5">
                <IconWell tone="inv" size={40}><Icon className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <Label>{isRtl ? `اصل ${num(idx + 1, true)}` : `Rule ${idx + 1}`}</Label>
                  <h2 className="m-0 text-[17px] font-bold leading-snug text-ink">{rule.title}</h2>
                  <p className="m-0 text-[15px] leading-[1.45] text-muted">{rule.body}</p>
                </div>
              </Card>
            </li>
          );
        })}
      </ol>
      <p className="m-0 px-1 text-[13px] text-muted">
        {isRtl ? "راهنمای عمومی است، نه توصیه‌ی پزشکی. اگر بیماری یا شرایط خاصی داری با پزشک یا متخصص تغذیه مشورت کن." : "General guidance, not medical advice. If you have a medical condition, check with a doctor or dietitian."}
      </p>
    </Screen>
  );
}
