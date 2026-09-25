import React from "react";
import { Beef, Droplets, Timer } from "lucide-react";
import { Card, IconWell, Label, Screen, TopBar, num } from "../../components/ui/kit";

// The nutrition guide: three rules worth keeping, one card each.

const RULES = [
  {
    icon: Beef,
    titleEn: "Protein Target Strategy", titleFa: "راهبرد مصرف پروتئین",
    descEn: "Consume 1.8g to 2.2g of protein per kg of body weight daily for muscle repair.",
    descFa: "روزانه به ازای هر کیلوگرم وزن بدن ۱.۸ تا ۲.۲ گرم پروتئین با کیفیت مصرف کنید.",
  },
  {
    icon: Droplets,
    titleEn: "Hydration Standard", titleFa: "استاندارد مصرف آب",
    descEn: "Drink at least 3 to 4 liters of clean water throughout the day.",
    descFa: "حداقل ۳ الی ۴ لیتر آب سالم در طول شبانه‌روز نوش جان کنید.",
  },
  {
    icon: Timer,
    titleEn: "Pre & Post Workout Timing", titleFa: "زمان‌بندی وعده قبل و بعد تمرین",
    descEn: "Eat your pre-workout meal 60-90 mins before training and post-workout meal within 45 mins after.",
    descFa: "وعده قبل تمرین را ۶۰ تا ۹۰ دقیقه قبل و وعده بعد تمرین را تا ۴۵ دقیقه پس از تمرین میل کنید.",
  },
];

export default function DietGuidePage({ onBack, isRtl }) {
  return (
    <Screen isRtl={isRtl}>
      <TopBar title={isRtl ? "راهنمای تغذیه" : "Nutrition guide"} onBack={onBack} isRtl={isRtl} />
      <p className="m-0 text-[15px] leading-[1.45] text-muted">
        {isRtl ? "اصول پایه‌ای که بیشترین اثر را روی ریکاوری و عملکرد دارند." : "The basics that do the most for recovery and performance."}
      </p>

      <ol className="m-0 p-0 list-none flex flex-col gap-2.5">
        {RULES.map((rule, idx) => {
          const Icon = rule.icon;
          return (
            <li key={rule.titleEn}>
              <Card className="flex items-start gap-3.5">
                <IconWell tone="inv" size={40}><Icon className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <Label>{isRtl ? `اصل ${num(idx + 1, true)}` : `Rule ${idx + 1}`}</Label>
                  <h2 className="m-0 text-[17px] font-bold leading-snug text-ink">{isRtl ? rule.titleFa : rule.titleEn}</h2>
                  <p className="m-0 text-[15px] leading-[1.45] text-muted">{isRtl ? rule.descFa : rule.descEn}</p>
                </div>
              </Card>
            </li>
          );
        })}
      </ol>
    </Screen>
  );
}
