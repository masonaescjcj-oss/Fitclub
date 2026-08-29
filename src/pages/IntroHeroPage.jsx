import React from "react";
import Header from "../components/Header";

export default function IntroHeroPage({ onNavigate }) {
  const language = localStorage.getItem("language") || "en";
  const isRtl = language === "fa";

  return (
    <div className="w-full md:max-w-lg mx-auto min-h-[100dvh] bg-black text-white flex flex-col justify-between overflow-hidden relative font-sans select-none">
      
      {/* Full-Screen Premium Athlete Hero Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src="/athlete_run_neon.jpg"
          alt="Athlete Runner"
          className="w-full h-full object-cover object-center opacity-70 scale-105"
        />
        {/* Immersive Dark Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
      </div>

      {/* Unified Top Sticky Header */}
      <Header onBack={() => onNavigate("profile-setup")} isRtl={isRtl} />

      {/* Spacer to push content to bottom */}
      <div className="flex-grow z-10" />

      {/* Bottom Info & Action Area */}
      <div className="relative z-20 mt-auto flex justify-between items-end w-full px-6 pb-10 flex-row rtl:flex-row-reverse">
        
        {/* Headline + Pagination Dots */}
        <div className={`flex flex-col ${isRtl ? "items-end text-right" : "items-start text-left"}`}>
          <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight uppercase tracking-tight max-w-[280px]">
            {isRtl ? (
              <>کشف یک نسخه‌ی<br />سالم‌تر و قوی‌تر.</>
            ) : (
              <>Discover A<br />Healthier,<br />Stronger You.</>
            )}
          </h1>
          
          {/* Pagination Indicators */}
          <div className="flex gap-1.5 items-center mt-5">
            <div className="h-1.5 w-6 rounded-full bg-[#844783]" />
            <div className="h-1.5 w-1.5 rounded-full bg-white/30" />
            <div className="h-1.5 w-1.5 rounded-full bg-white/30" />
          </div>
        </div>

        {/* Pill-shaped Action Button */}
        <button
          onClick={() => onNavigate("onboarding-questions")}
          className="px-6 py-3.5 rounded-full bg-[#844783] hover:bg-[#965595] active:scale-95 transition-all flex items-center justify-center gap-2 text-white font-black text-sm shadow-lg shadow-[#844783]/20 shrink-0"
        >
          <span>{isRtl ? "شروع کنید" : "Start"}</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            {isRtl ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            )}
          </svg>
        </button>

      </div>
    </div>
  );
}
