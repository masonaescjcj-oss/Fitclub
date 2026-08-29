import React, { useState } from "react";
import { User, UserSquare, Check, X } from "lucide-react";
import Header from "../components/Header";

export default function ProfileSetupPage({ onNavigate }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'valid' | 'invalid'
  const [error, setError] = useState("");

  const language = localStorage.getItem("language") || "en";
  const isRtl = language === "fa";

  const profileTranslations = {
    en: {
      title: "Complete Your Profile",
      desc: "Enter your name and choose a unique username for your account.",
      nameLabel: "NAME",
      namePlaceholder: "Enter your name",
      usernameLabel: "USERNAME",
      usernamePlaceholder: "Enter your username",
      saveBtn: "Save & Continue",
      validationErr: "Please fill in all required fields",
      usernameValid: "Username is available",
      usernameInvalid: "Username is taken or invalid",
      checking: "Checking availability...",
    },
    fa: {
      title: "تکمیل پروفایل شما",
      desc: "نام و نام کاربری منحصر به فرد خود را برای ساخت حساب وارد کنید.",
      nameLabel: "نام و نام خانوادگی",
      namePlaceholder: "نام خود را وارد کنید",
      usernameLabel: "نام کاربری",
      usernamePlaceholder: "نام کاربری خود را وارد کنید",
      saveBtn: "ذخیره و ادامه",
      validationErr: "لطفاً تمامی فیلدها را پر کنید",
      usernameValid: "نام کاربری در دسترس است",
      usernameInvalid: "این نام کاربری قبلاً استفاده شده است",
      checking: "در حال بررسی...",
    }
  };

  const t = profileTranslations[language];

  const handleUsernameChange = (val) => {
    const cleanVal = val.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(cleanVal);
    setError("");

    if (!cleanVal) {
      setUsernameStatus(null);
      setIsValidating(false);
      return;
    }

    setIsValidating(true);
    setTimeout(() => {
      setIsValidating(false);
      if (cleanVal.length >= 3) {
        setUsernameStatus("valid");
      } else {
        setUsernameStatus("invalid");
      }
    }, 400);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !username) {
      setError(t.validationErr);
      return;
    }

    if (usernameStatus !== "valid") {
      setError(t.usernameInvalid);
      return;
    }

    onNavigate("questionnaire");
  };

  return (
    <div className="w-full md:max-w-lg mx-auto min-h-[100dvh] bg-black text-white flex flex-col justify-between overflow-x-hidden relative font-sans select-none">
      
      {/* Unified Top Sticky Header */}
      <Header onBack={() => onNavigate("otp")} isRtl={isRtl} />

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col justify-center px-6 pb-8 relative z-10 my-auto">
        
        {/* Header Title & Subtitle */}
        <div className={`mb-8 ${isRtl ? "text-right" : "text-left"}`}>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
            {t.title}
          </h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-semibold">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Name Field */}
          <div className="group">
            <label className={`block text-xs font-black tracking-wider uppercase text-neutral-300 mb-2 transition-colors group-focus-within:text-white ${isRtl ? "text-right" : "text-left"}`}>
              {t.nameLabel}
            </label>
            <div className="relative flex items-center">
              <span className={`absolute inset-y-0 ${isRtl ? "right-0 pr-4" : "left-0 pl-4"} flex items-center z-10 pointer-events-none text-neutral-400 group-focus-within:text-white transition-colors`}>
                <User className="w-5 h-5" />
              </span>
              <input
                type="text"
                placeholder={t.namePlaceholder}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                className={`w-full h-14 ${isRtl ? "pr-12 pl-4 text-right" : "pl-12 pr-4 text-left"} text-base rounded-2xl bg-neutral-900/90 border border-white/10 text-white placeholder-neutral-500 font-semibold focus:outline-none focus:border-white focus:bg-black focus:shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-300`}
              />
            </div>
          </div>

          {/* Username Field */}
          <div className="group">
            <label className={`block text-xs font-black tracking-wider uppercase text-neutral-300 mb-2 transition-colors group-focus-within:text-white ${isRtl ? "text-right" : "text-left"}`}>
              {t.usernameLabel}
            </label>
            <div className="relative flex items-center">
              <span className={`absolute inset-y-0 ${isRtl ? "right-0 pr-4" : "left-0 pl-4"} flex items-center z-10 pointer-events-none text-neutral-400 group-focus-within:text-white transition-colors`}>
                <UserSquare className="w-5 h-5" />
              </span>
              <input
                type="text"
                placeholder={t.usernamePlaceholder}
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className={`w-full h-14 ${isRtl ? "pr-12 pl-12 text-right" : "pl-12 pr-12 text-left"} text-base rounded-2xl bg-neutral-900/90 border border-white/10 text-white placeholder-neutral-500 font-semibold focus:outline-none focus:border-white focus:bg-black focus:shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-300`}
              />

              {/* Status indicator */}
              <div className={`absolute inset-y-0 ${isRtl ? "left-0 pl-4" : "right-0 pr-4"} flex items-center z-10 pointer-events-none`}>
                {isValidating ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : usernameStatus === "valid" ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                ) : usernameStatus === "invalid" ? (
                  <div className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center text-rose-400">
                    <X className="w-3.5 h-3.5" />
                  </div>
                ) : null}
              </div>
            </div>

            {/* Availability text */}
            {username && (
              <div className={`mt-2 text-xs flex items-center gap-1.5 font-bold ${
                usernameStatus === "valid" ? "text-emerald-400" : usernameStatus === "invalid" ? "text-rose-400" : "text-gray-400"
              } ${isRtl ? "text-right" : "text-left"}`}>
                <span>
                  {isValidating
                    ? t.checking
                    : usernameStatus === "valid"
                    ? t.usernameValid
                    : usernameStatus === "invalid"
                    ? t.usernameInvalid
                    : ""}
                </span>
              </div>
            )}
          </div>

          {/* Primary Save & Continue Button */}
          <button
            type="submit"
            disabled={!name || !username || usernameStatus !== "valid"}
            className="w-full h-14 mt-6 bg-[#844783] text-white font-black rounded-full hover:bg-[#965595] active:scale-[0.98] transition-all duration-300 text-sm flex items-center justify-center shadow-lg shadow-[#844783]/15 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>{t.saveBtn}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
