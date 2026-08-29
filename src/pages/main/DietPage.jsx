import React from "react";
import { Utensils, Flame, Plus, Apple, Drumstick, Coffee } from "lucide-react";

export default function DietPage({ isRtl }) {
  return (
    <div className="w-full min-h-[100dvh] bg-black text-white px-4 pt-6 pb-28 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-black text-[#844783] uppercase tracking-wider">
            {isRtl ? "برنامه رژیم غذایی" : "MEAL PLAN & NUTRITION"}
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
            {isRtl ? "تغذیه امروز" : "Today's Meals"}
          </h1>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-[#844783]/20 border border-[#844783]/40 flex items-center justify-center text-[#844783]">
          <Utensils className="w-5 h-5" />
        </div>
      </div>

      {/* Daily Calorie Summary Banner */}
      <div className="p-5 rounded-3xl bg-[#141416] border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-neutral-400 font-bold uppercase">{isRtl ? "کالری مصرفی امروز" : "Calories Consumed"}</span>
            <div className="flex items-baseline gap-1 mt-0.5" dir="ltr">
              <span className="text-3xl font-black text-white">1,420</span>
              <span className="text-sm font-bold text-gray-400">/ 2,350 kcal</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Flame className="w-6 h-6" />
          </div>
        </div>

        {/* Macro Progress Bars */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-[#844783]">Protein: 110g / 165g</span>
            <span className="text-amber-400">Carbs: 180g / 265g</span>
            <span className="text-cyan-400">Fat: 42g / 65g</span>
          </div>
          <div className="w-full bg-neutral-900 h-2.5 rounded-full overflow-hidden flex">
            <div className="bg-[#844783] h-full w-[65%]" />
            <div className="bg-amber-400 h-full w-[45%]" />
            <div className="bg-cyan-400 h-full w-[30%]" />
          </div>
        </div>
      </div>

      {/* Meals List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white uppercase tracking-wider">
            {isRtl ? "عده‌های امروز" : "Today's Meals"}
          </h3>
          <button type="button" className="text-xs font-black text-[#844783] flex items-center gap-1">
            <Plus className="w-4 h-4" />
            <span>{isRtl ? "افزودن غذا" : "Add Meal"}</span>
          </button>
        </div>

        {[
          { titleEn: "Breakfast", titleFa: "صبحانه", time: "08:30 AM", items: "Oats with protein powder & berries", kcal: "450 kcal", icon: <Coffee className="w-5 h-5 text-amber-400" /> },
          { titleEn: "Lunch", titleFa: "ناهار", time: "01:30 PM", items: "Grilled chicken breast with brown rice", kcal: "650 kcal", icon: <Drumstick className="w-5 h-5 text-purple-400" /> },
          { titleEn: "Evening Snack", titleFa: "میان‌وعده عصر", time: "05:00 PM", items: "Greek yogurt with almonds & apple", kcal: "320 kcal", icon: <Apple className="w-5 h-5 text-emerald-400" /> },
        ].map((meal, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-[#141416] border border-white/10 flex items-center justify-between hover:border-[#844783]/40 transition-all"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-neutral-900 border border-white/10 shrink-0">
                {meal.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-white">{isRtl ? meal.titleFa : meal.titleEn}</h4>
                  <span className="text-[10px] text-gray-500 font-mono">{meal.time}</span>
                </div>
                <p className="text-xs text-neutral-400 font-medium mt-0.5">{meal.items}</p>
              </div>
            </div>
            <div className="text-right rtl:text-left shrink-0">
              <span className="text-xs font-black text-white">{meal.kcal}</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
