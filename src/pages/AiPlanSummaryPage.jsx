import React, { useState, useEffect } from "react";
import { Sparkles, Flame, Dumbbell, Calendar, Activity, TrendingDown, Target, PieChart, ChevronRight, Rocket } from "lucide-react";

export default function AiPlanSummaryPage({ onNavigate }) {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const language = localStorage.getItem("language") || "en";
  const isRtl = language === "fa";

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsReady(true);
          return 100;
        }
        return prev + 25;
      });
    }, 280);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="w-full md:max-w-lg mx-auto min-h-[100dvh] bg-black text-white flex flex-col justify-between overflow-x-hidden relative font-sans select-none px-4 pt-5 pb-24"
    >
      {/* Main Content Container */}
      <div className="flex-grow flex flex-col justify-start px-0 relative z-10 w-full">
        
        {!isReady ? (
          /* Processing Phase */
          <div className="py-20 flex flex-col items-center text-center my-auto">
            <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#844783]/30 blur-xl animate-pulse" />
              <div className="w-20 h-20 rounded-full bg-[#18121c] border-2 border-[#844783] flex items-center justify-center text-[#844783] shadow-[0_0_35px_rgba(132,71,131,0.5)]">
                <Sparkles className="w-10 h-10 animate-spin text-amber-300" style={{ animationDuration: "3s" }} />
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
              {isRtl ? "در حال آماده‌سازی برنامه کامل شما... 🧠" : "Processing Your Complete Plan... 🧠"}
            </h2>
            <p className="text-xs text-neutral-400 font-medium mb-8 max-w-xs leading-relaxed">
              {isRtl
                ? "محاسبه دقیق متابولیسم بدنی، تفکیک ماکروها و پیش‌بینی روند موفقیت شما..."
                : "Calculating your metabolic rate, macro split, and predicted progress curve..."}
            </p>

            {/* Progress Bar */}
            <div className="w-full max-w-xs bg-[#141416] border border-white/10 rounded-full h-3.5 overflow-hidden p-0.5 mb-3 shadow-inner">
              <div
                className="bg-gradient-to-r from-[#844783] via-[#965595] to-[#a356a2] h-full rounded-full transition-all duration-300 shadow-md"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-gray-400">
              {loadingProgress}%
            </span>
          </div>
        ) : (
          /* Creative & Modern Plan Dashboard */
          <div className="space-y-4 py-1 animate-in fade-in zoom-in-95 duration-300 w-full">
            
            {/* Clean Header Title */}
            <div className={`mb-1 ${isRtl ? "text-right" : "text-left"}`}>
              <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                {isRtl ? "برنامه کامل شما آماده است!" : "YOUR COMPLETE PLAN IS READY!"}
              </h2>
            </div>

            {/* Key Metrics 4-Grid Cards */}
            <div className="grid grid-cols-2 gap-3 text-left rtl:text-right w-full">
              
              <div className="p-3.5 rounded-2xl bg-[#141416]/90 border border-white/10 flex flex-col gap-1 relative overflow-hidden group hover:border-[#844783]/50 hover:bg-[#1b151e] transition-all">
                <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-black uppercase tracking-wider">
                  <Flame className="w-3.5 h-3.5 shrink-0" />
                  <span>{isRtl ? "کالری روزانه" : "DAILY CALORIES"}</span>
                </div>
                <span className="text-xl font-black text-white tracking-tight" dir="ltr">
                  2,350 <span className="text-xs font-bold text-gray-400">kcal</span>
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#141416]/90 border border-white/10 flex flex-col gap-1 relative overflow-hidden group hover:border-[#844783]/50 hover:bg-[#1b151e] transition-all">
                <div className="flex items-center gap-1.5 text-purple-400 text-[10px] font-black uppercase tracking-wider">
                  <Activity className="w-3.5 h-3.5 shrink-0" />
                  <span>{isRtl ? "پروتئین هدف" : "PROTEIN TARGET"}</span>
                </div>
                <span className="text-xl font-black text-white tracking-tight" dir="ltr">
                  165 <span className="text-xs font-bold text-gray-400">g/day</span>
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#141416]/90 border border-white/10 flex flex-col gap-1 relative overflow-hidden group hover:border-[#844783]/50 hover:bg-[#1b151e] transition-all">
                <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>{isRtl ? "روزهای تمرین" : "WORKOUT DAYS"}</span>
                </div>
                <span className="text-lg font-black text-white tracking-tight">
                  4 {isRtl ? "روز در هفته" : "Days / Wk"}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#141416]/90 border border-white/10 flex flex-col gap-1 relative overflow-hidden group hover:border-[#844783]/50 hover:bg-[#1b151e] transition-all">
                <div className="flex items-center gap-1.5 text-cyan-400 text-[10px] font-black uppercase tracking-wider">
                  <Dumbbell className="w-3.5 h-3.5 shrink-0" />
                  <span>{isRtl ? "سیستم تمرین" : "SPLIT TYPE"}</span>
                </div>
                <span className="text-lg font-black text-white tracking-tight">Full Body Plus</span>
              </div>

            </div>

            {/* CHART 1: MACRO SPLIT NUTRITION BREAKDOWN */}
            <div className="p-4 rounded-2xl bg-[#141416]/90 border border-white/10 shadow-sm relative overflow-hidden w-full">
              
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#844783]/20 text-[#844783]">
                    <PieChart className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    {isRtl ? "تفکیک ارزش غذایی (Macronutrients)" : "MACRO SPLIT RATIO"}
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  2,350 kcal
                </span>
              </div>

              <div className="flex items-center justify-around py-1">
                
                {/* Visual SVG Donut Chart */}
                <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    {/* Background Circle Track */}
                    <path
                      className="text-neutral-800"
                      strokeWidth="4"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    {/* Protein 30% Arc (Purple) */}
                    <path
                      className="text-[#844783]"
                      strokeDasharray="30, 100"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    {/* Carbs 45% Arc (Amber) */}
                    <path
                      className="text-amber-400"
                      strokeDasharray="45, 100"
                      strokeDashoffset="-30"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    {/* Fat 25% Arc (Cyan) */}
                    <path
                      className="text-cyan-400"
                      strokeDasharray="25, 100"
                      strokeDashoffset="-75"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>

                  {/* Center Text */}
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-black text-white leading-none">100%</span>
                    <span className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">Macros</span>
                  </div>
                </div>

                {/* Macro Legend List */}
                <div className="space-y-1.5 text-left rtl:text-right">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#844783] shrink-0" />
                    <div>
                      <span className="text-xs font-black text-white">Protein (30%)</span>
                      <span className="text-[10px] text-gray-400 block font-semibold">165g / day</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                    <div>
                      <span className="text-xs font-black text-white">Carbs (45%)</span>
                      <span className="text-[10px] text-gray-400 block font-semibold">265g / day</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0" />
                    <div>
                      <span className="text-xs font-black text-white">Fat (25%)</span>
                      <span className="text-[10px] text-gray-400 block font-semibold">65g / day</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* CHART 2: PREDICTED 30-DAY PROGRESS AREA CURVE */}
            <div className="p-4 rounded-2xl bg-[#141416]/90 border border-white/10 shadow-sm relative overflow-hidden w-full">
              
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    {isRtl ? "نمودار پیش‌بینی روند موفقیت ۳۰ روزه" : "30-DAY PREDICTED PROGRESS"}
                  </h3>
                </div>
                <div className="flex items-center gap-1 text-emerald-400 text-xs font-black">
                  <Target className="w-3.5 h-3.5" />
                  <span>Target: -3.5 kg</span>
                </div>
              </div>

              {/* Area Progress Curve SVG */}
              <div className="relative pt-3 pb-1">
                <div className="h-24 w-full relative">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                    
                    <defs>
                      <linearGradient id="progressGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#844783" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#844783" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Area under curve */}
                    <path
                      d="M 0 20 Q 75 35, 150 55 T 300 85 L 300 100 L 0 100 Z"
                      fill="url(#progressGrad)"
                    />

                    {/* Curve Line */}
                    <path
                      d="M 0 20 Q 75 35, 150 55 T 300 85"
                      fill="none"
                      stroke="#844783"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />

                    {/* Points on Curve */}
                    <circle cx="0" cy="20" r="4" fill="#ffffff" stroke="#844783" strokeWidth="2" />
                    <circle cx="100" cy="40" r="4" fill="#844783" />
                    <circle cx="200" cy="65" r="4" fill="#844783" />
                    <circle cx="300" cy="85" r="5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                  </svg>

                  {/* Point Badges */}
                  <div className="absolute top-0 left-0 text-[10px] font-bold text-gray-400 bg-neutral-900/90 px-2 py-0.5 rounded-full border border-white/10">
                    Week 1: 76.0 kg
                  </div>
                  <div className="absolute bottom-1 right-0 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Target: 72.5 kg 🎯
                  </div>
                </div>

                {/* X Axis Timeline */}
                <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-1.5 px-1" dir="ltr">
                  <span>Wk 1 (Start)</span>
                  <span>Wk 2</span>
                  <span>Wk 3</span>
                  <span className="text-emerald-400 font-black">Wk 4 (Goal)</span>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* FIXED STICKY ENTER THE APP BOTTOM BAR */}
      {isReady && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black via-black/95 to-transparent backdrop-blur-md">
          <div className="w-full md:max-w-lg mx-auto">
            <button
              type="button"
              onClick={() => onNavigate("main-app")}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#844783] to-[#965595] hover:brightness-110 text-white font-black text-base tracking-wide transition-all duration-200 flex items-center justify-center gap-3 border border-white/20 shadow-[0_0_25px_rgba(132,71,131,0.5)] active:scale-[0.98]"
            >
              <Rocket className="w-5 h-5 text-amber-300" />
              <span>{isRtl ? "ورود به برنامه (ENTER THE APP)" : "ENTER THE APP"}</span>
              <ChevronRight className="w-5 h-5 rtl:rotate-180" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
