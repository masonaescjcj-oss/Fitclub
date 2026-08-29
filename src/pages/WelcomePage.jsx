import React, { useState } from "react";

export default function WelcomePage({ onNavigate }) {
  const [language, setLanguage] = useState(() => localStorage.getItem("language") || "en");

  const toggleLanguage = () => {
    const nextLang = language === "en" ? "fa" : "en";
    setLanguage(nextLang);
    localStorage.setItem("language", nextLang);
  };

  const isFa = language === "fa";

  const welcomeTranslations = {
    en: {
      beHealthy: "BE HEALTHY",
      beStronger: "BE STRONGER",
      beYourself: "BE YOURSELF",
      joinNow: "Join Now",
      logInBtn: "Log In",
      terms: "By joining Fitclub, you agree to the Terms and Privacy Policy.",
    },
    fa: {
      beHealthy: "تندرست باشید",
      beStronger: "قوی‌تر شوید",
      beYourself: "خودتان باشید",
      joinNow: "عضویت",
      logInBtn: "ورود",
      terms: "با عضویت در فیت‌کلاب، شرایط و قوانین حریم خصوصی را می‌پذیرید.",
    }
  };

  const t = welcomeTranslations[language];

  return (
    <div className="w-full md:max-w-lg mx-auto min-h-[100dvh] bg-black text-white flex flex-col justify-between overflow-x-hidden relative font-sans select-none">
      
      {/* Main Content Container */}
      <div className="flex flex-col justify-between flex-grow min-h-[100dvh] relative z-10 px-4 pt-8 pb-10">
        
        {/* Top Navigation/Status Area */}
        <div className="relative z-10 flex justify-between items-center w-full">
          {/* Double Overlapping Circles Logo */}
          <div className="flex -space-x-2 items-center">
            <div className="rounded-full bg-white shadow-sm" style={{ width: '26px', height: '26px' }} />
            <div className="rounded-full bg-white/75 backdrop-blur-[1px] shadow-sm" style={{ width: '26px', height: '26px' }} />
          </div>

          {/* Language Toggle Button */}
          <button
            onClick={toggleLanguage}
            className="px-3.5 py-1.5 rounded-full bg-transparent hover:bg-white/5 border border-white/20 text-white text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
            <span>{isFa ? "English" : "فارسی"}</span>
          </button>
        </div>

        {/* Bottom Info & Actions Container */}
        <div className={`relative z-10 mt-auto w-full flex flex-col ${isFa ? "text-right" : "text-left"}`}>
          
          {/* Slogan Headlines Stacked */}
          <div className={`mb-10 flex flex-col ${isFa ? "items-end text-right" : "items-start text-left"}`}>
            <h1 className="text-4xl sm:text-5xl font-black text-white leading-[1.1] tracking-tight uppercase drop-shadow-lg">
              {t.beHealthy}
            </h1>
            <h1 className="text-4xl sm:text-5xl font-black text-white leading-[1.1] tracking-tight uppercase mt-1.5 drop-shadow-lg">
              {t.beStronger}
            </h1>
            <h1 className="text-4xl sm:text-5xl font-black text-white leading-[1.1] tracking-tight uppercase mt-1.5 drop-shadow-lg">
              {t.beYourself}
            </h1>
          </div>

          {/* Action Buttons Side-by-side */}
          <div className="w-full mt-2">
            <div className="flex gap-4 w-full">
              {/* Join Now Button */}
              <button
                onClick={() => onNavigate("signup")}
                className="flex-1 h-14 bg-[#844783] text-white font-black rounded-full hover:brightness-110 active:scale-[0.97] transition-all duration-300 text-sm flex items-center justify-center shadow-lg shadow-[#844783]/15"
              >
                {t.joinNow}
              </button>

              {/* Log In Button */}
              <button
                onClick={() => onNavigate("login")}
                className="flex-1 h-14 bg-white/[0.07] backdrop-blur-md border border-white/[0.1] text-white font-black rounded-full hover:bg-white/10 active:scale-[0.97] transition-all duration-300 text-sm flex items-center justify-center"
              >
                {t.logInBtn}
              </button>
            </div>

            {/* Disclaimer Text */}
            <p className="text-[9px] text-center text-gray-500/85 mt-5 tracking-wide">
              {t.terms}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
