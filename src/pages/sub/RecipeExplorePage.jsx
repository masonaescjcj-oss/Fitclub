import React from "react";
import { Utensils, ArrowLeft } from "lucide-react";

export default function RecipeExplorePage({ onBack, isRtl }) {
  const recipes = [
    { titleEn: "High-Protein Chicken Rice Bowl", titleFa: "کاسه مرغ و برنج پرپروتئین", prepTime: "20 mins", kcal: "520 kcal", protein: "48g", category: "High Protein" },
    { titleEn: "Avocado & Egg Fitness Toast", titleFa: "تست آووکادو و تخم‌مرغ ورزشی", prepTime: "10 mins", kcal: "340 kcal", protein: "22g", category: "Quick Breakfast" },
    { titleEn: "Salmon & Quinoa Power Salad", titleFa: "سالاد سلمون و کینوا مقوی", prepTime: "15 mins", kcal: "480 kcal", protein: "38g", category: "Low Carb" },
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
          <h1 className="text-xl font-black text-white">{isRtl ? "دستور پخت‌های رژیمی" : "Healthy Recipe Explorer"}</h1>
        </div>
        <Utensils className="w-6 h-6 text-amber-400" />
      </div>

      {/* Recipes List */}
      <div className="space-y-3">
        {recipes.map((r, idx) => (
          <div key={idx} className="p-4 rounded-2xl bg-[#141416] border border-white/10 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-[#844783] uppercase px-2.5 py-0.5 rounded-full bg-[#844783]/20 border border-[#844783]/40">
                {r.category}
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">{r.kcal}</span>
            </div>

            <h3 className="text-sm font-black text-white">{isRtl ? r.titleFa : r.titleEn}</h3>

            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs font-bold text-gray-400">
              <span>{isRtl ? `آماده‌سازی: ${r.prepTime}` : `Prep: ${r.prepTime}`}</span>
              <span className="text-purple-300 font-black">Protein: {r.protein}</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
