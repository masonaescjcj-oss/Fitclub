import React, { useState } from "react";
import { User, Watch, Wallet, LogOut, ChevronRight, Globe, Crown, Award } from "lucide-react";

export default function ProfilePage({ onNavigate, onBack, isRtl }) {
  const [language, setLanguage] = useState(localStorage.getItem("language") || "en");

  const toggleLanguage = () => {
    const newLang = language === "fa" ? "en" : "fa";
    localStorage.setItem("language", newLang);
    setLanguage(newLang);
    window.location.reload();
  };

  return (
    <div className="w-full min-h-[100dvh] bg-black text-white px-4 pt-6 pb-28 space-y-6 select-none">
      
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h1 className="text-xl font-black text-white">{isRtl ? "پروفایل کاربری" : "Profile & Settings"}</h1>
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-[#844783] hover:underline"
        >
          {isRtl ? "بازگشت" : "Back"}
        </button>
      </div>

      {/* User Info Hero Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#844783]/80 via-[#703b6f] to-[#4a2449] border border-white/20 shadow-xl flex items-center gap-4 relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-black border-2 border-white/40 flex items-center justify-center text-white shrink-0 shadow-lg">
          <User className="w-8 h-8 text-[#844783]" />
        </div>
        <div className="flex-grow">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white">Isaac</h2>
            <Crown className="w-5 h-5 text-amber-300 fill-amber-300" />
          </div>
          <p className="text-xs text-neutral-200 font-medium">user@email.com</p>
          <span className="inline-block mt-2 px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-black uppercase">
            VIP ELITE MEMBER
          </span>
        </div>
      </div>

      {/* Physical Stats Summary */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-3.5 rounded-2xl bg-[#141416] border border-white/10">
          <span className="text-[10px] text-neutral-400 font-bold uppercase">{isRtl ? "قد" : "Height"}</span>
          <p className="text-base font-black text-white mt-0.5">174 cm</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#141416] border border-white/10">
          <span className="text-[10px] text-neutral-400 font-bold uppercase">{isRtl ? "وزن" : "Weight"}</span>
          <p className="text-base font-black text-white mt-0.5">76 kg</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#141416] border border-white/10">
          <span className="text-[10px] text-neutral-400 font-bold uppercase">{isRtl ? "شاخص BMI" : "BMI"}</span>
          <p className="text-base font-black text-emerald-400 mt-0.5">25.1</p>
        </div>
      </div>

      {/* Menu Options Group */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider px-1">
          {isRtl ? "تنظیمات اپلیکیشن" : "App Preferences"}
        </h3>

        {[
          { labelEn: "Connected Wearables & Devices", labelFa: "دستگاه‌ها و ساعت‌های هوشمند", icon: <Watch className="w-5 h-5 text-purple-400" />, action: () => onNavigate("devices") },
          { labelEn: "Wallet & Rewards Balance", labelFa: "کیف پول و امتیازها", icon: <Wallet className="w-5 h-5 text-amber-400" />, action: () => onNavigate("wallet") },
          { labelEn: "VIP Membership Subscription", labelFa: "اشتراک و عضویت ویژه‌", icon: <Crown className="w-5 h-5 text-emerald-400" />, action: () => onNavigate("subscription") },
          { labelEn: "Workout History & Logs", labelFa: "تاریخچه تمرینات و فعالیت‌ها", icon: <Award className="w-5 h-5 text-cyan-400" />, action: () => onNavigate("history") },
        ].map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={item.action}
            className="w-full p-4 rounded-2xl bg-[#141416] border border-white/10 flex items-center justify-between hover:border-[#844783]/40 transition-all text-left rtl:text-right"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-white/10 shrink-0">
                {item.icon}
              </div>
              <span className="text-sm font-black text-white">{isRtl ? item.labelFa : item.labelEn}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500 rtl:rotate-180" />
          </button>
        ))}

        {/* Language Switcher */}
        <button
          type="button"
          onClick={toggleLanguage}
          className="w-full p-4 rounded-2xl bg-[#141416] border border-white/10 flex items-center justify-between hover:border-[#844783]/40 transition-all text-left rtl:text-right"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-neutral-900 border border-white/10 shrink-0 text-cyan-400">
              <Globe className="w-5 h-5" />
            </div>
            <span className="text-sm font-black text-white">{isRtl ? "زبان برنامه (فارسی / English)" : "App Language (English / Persian)"}</span>
          </div>
          <span className="text-xs font-black text-[#844783] bg-[#844783]/10 border border-[#844783]/30 px-3 py-1 rounded-full uppercase">
            {language.toUpperCase()}
          </span>
        </button>

        {/* Logout */}
        <button
          type="button"
          onClick={() => onNavigate("welcome")}
          className="w-full p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-between hover:bg-red-500/20 transition-all text-left rtl:text-right mt-4"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-red-500/20 shrink-0">
              <LogOut className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-sm font-black">{isRtl ? "خروج از حساب کاربری" : "Log Out"}</span>
          </div>
        </button>
      </div>

    </div>
  );
}
