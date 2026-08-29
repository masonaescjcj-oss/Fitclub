import React, { useState } from "react";
import { Crown, ArrowLeft, Check, Sparkles } from "lucide-react";

export default function SubscriptionPage({ onBack, isRtl }) {
  const [selectedPlan, setSelectedPlan] = useState("plan2");

  const plans = [
    { id: "plan1", nameEn: "1 Month VIP", nameFa: "اشتراک ۱ ماهه VIP", priceEn: "$9.99 / mo", priceFa: "۱۴۹,۰۰۰ تومان", popular: false },
    { id: "plan2", nameEn: "3 Months PRO (Recommended)", nameFa: "اشتراک ۳ ماهه PRO (توصیه‌شده)", priceEn: "$19.99 / 3 mos", priceFa: "۳۹۰,۰۰۰ تومان", popular: true },
    { id: "plan3", nameEn: "1 Year ELITE", nameFa: "اشتراک ۱ ساله ELITE", priceEn: "$49.99 / yr", priceFa: "۹۹۰,۰۰۰ تومان", popular: false },
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
          <h1 className="text-xl font-black text-white">{isRtl ? "ارتقا به عضویت ویژه‌ VIP" : "VIP Membership Upgrade"}</h1>
        </div>
        <Crown className="w-6 h-6 text-amber-300 fill-amber-300" />
      </div>

      {/* Hero Badge */}
      <div className="text-center space-y-2 py-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-black text-xs font-black uppercase">
          <Sparkles className="w-3.5 h-3.5 fill-black" />
          <span>UNLOCK ALL AI FEATURES</span>
        </div>
        <h2 className="text-2xl font-black text-white">{isRtl ? "دسترسی نامحدود به مربی و رژیم AI" : "Unlimited AI Workout & Nutrition"}</h2>
      </div>

      {/* Plans List */}
      <div className="space-y-3">
        {plans.map((p) => {
          const isSelected = selectedPlan === p.id;
          return (
            <div
              key={p.id}
              onClick={() => setSelectedPlan(p.id)}
              className={`p-5 rounded-3xl border transition-all duration-200 cursor-pointer relative ${
                isSelected
                  ? "bg-gradient-to-br from-[#844783] to-[#9b4f9a] border-white text-white shadow-xl scale-[1.01]"
                  : "bg-[#141416] border-white/10 text-neutral-300 hover:border-[#844783]/40"
              }`}
            >
              {p.popular && (
                <span className="absolute top-3 right-3 bg-amber-400 text-black text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                  MOST POPULAR
                </span>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-white">{isRtl ? p.nameFa : p.nameEn}</h3>
                  <span className="text-sm font-black text-amber-300 mt-1 block">{isRtl ? p.priceFa : p.priceEn}</span>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                    isSelected ? "bg-white border-white text-[#844783]" : "border-neutral-500"
                  }`}
                >
                  {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => alert(isRtl ? "ورود به درگاه پرداخت ثبت شد!" : "Proceeding to checkout!")}
        className="w-full h-15 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-black font-black rounded-full text-base flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-98"
      >
        <span>{isRtl ? "فعال‌سازی اشتراک VIP" : "Activate VIP Membership"}</span>
      </button>

    </div>
  );
}
