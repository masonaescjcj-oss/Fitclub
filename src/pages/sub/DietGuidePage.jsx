import React from "react";
import { BookOpen, ArrowLeft, Check } from "lucide-react";

export default function DietGuidePage({ onBack, isRtl }) {
  const rules = [
    { titleEn: "Protein Target Strategy", titleFa: "راهبرد مصرف پروتئین", descEn: "Consume 1.8g to 2.2g of protein per kg of body weight daily for muscle repair.", descFa: "روزانه به ازای هر کیلوگرم وزن بدن ۱.۸ تا ۲.۲ گرم پروتئین با کیفیت مصرف کنید." },
    { titleEn: "Hydration Standard", titleFa: "استاندارد مصرف آب", descEn: "Drink at least 3 to 4 liters of clean water throughout the day.", descFa: "حداقل ۳ الی ۴ لیتر آب سالم در طول شبانه‌روز نوش جان کنید." },
    { titleEn: "Pre & Post Workout Timing", titleFa: "زمان‌بندی وعده قبل و بعد تمرین", descEn: "Eat your pre-workout meal 60-90 mins before training and post-workout meal within 45 mins after.", descFa: "وعده قبل تمرین را ۶۰ تا ۹۰ دقیقه قبل و وعده بعد تمرین را تا ۴۵ دقیقه پس از تمرین میل کنید." },
  ];

  return (
    <div className="w-full min-h-[100dvh] bg-black text-white px-4 pt-6 pb-28 space-y-6 select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-[#141416] border border-white/10 flex items-center justify-center text-gray-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          </button>
          <h1 className="text-xl font-black text-white">{isRtl ? "راهنمای رژیم و اصول تغذیه" : "Nutrition Rules & Guide"}</h1>
        </div>
        <BookOpen className="w-6 h-6 text-[#844783]" />
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {rules.map((rule, idx) => (
          <div key={idx} className="p-5 rounded-3xl bg-[#141416] border border-white/10 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#844783]/20 border border-[#844783]/40 flex items-center justify-center text-[#844783] shrink-0">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <h3 className="text-sm font-black text-white">{isRtl ? rule.titleFa : rule.titleEn}</h3>
            </div>
            <p className="text-xs text-neutral-300 font-medium leading-relaxed pl-8 rtl:pl-0 rtl:pr-8">
              {isRtl ? rule.descFa : rule.descEn}
            </p>
          </div>
        ))}
      </div>

    </div>
  );
}
