import React, { useState } from "react";
import Header from "../components/Header";

export default function LoginPage({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const language = localStorage.getItem("language") || "en";
  const isRtl = language === "fa";

  const loginTranslations = {
    en: {
      title: "Welcome Back to FITCLUB",
      desc: "Log in to continue your journey toward a healthier and better you.",
      emailLabel: "YOUR EMAIL ADDRESS",
      emailPlaceholder: "Enter email address",
      passwordLabel: "PASSWORD",
      passwordPlaceholder: "Enter your password",
      forgotPassword: "Forgot Password?",
      loginBtn: "Login",
      orDivider: "OR",
      googleBtn: "Google",
      appleBtn: "Apple",
      noAccount: "Don't have an account?",
      signUp: "Sign Up",
      validationErr: "Please fill in all fields",
    },
    fa: {
      title: "خوش آمدید به فیت‌کلاب",
      desc: "برای ادامه مسیر خود به سمت بدنی سالم‌تر و بهتر، وارد شوید.",
      emailLabel: "آدرس ایمیل شما",
      emailPlaceholder: "ایمیل خود را وارد کنید",
      passwordLabel: "رمز عبور",
      passwordPlaceholder: "رمز عبور خود را وارد کنید",
      forgotPassword: "رمز عبور خود را فراموش کرده‌اید؟",
      loginBtn: "ورود",
      orDivider: "یا",
      googleBtn: "گوگل",
      appleBtn: "اپل",
      noAccount: "حساب کاربری ندارید؟",
      signUp: "ثبت‌نام کنید",
      validationErr: "لطفاً تمام فیلدها را پر کنید",
    }
  };

  const t = loginTranslations[language];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t.validationErr);
      return;
    }

    setIsLoading(true);
    setError("");

    setTimeout(() => {
      setIsLoading(false);
      onNavigate("home");
    }, 1000);
  };

  return (
    <div className="w-full md:max-w-lg mx-auto min-h-[100dvh] bg-black text-white flex flex-col justify-between overflow-x-hidden relative font-sans select-none">
      
      {/* Unified Top Sticky Header */}
      <Header onBack={() => onNavigate("welcome")} isRtl={isRtl} />

      {/* Main Content Form */}
      <div className="flex-grow flex flex-col justify-center px-6 pb-8 relative z-10 my-auto">
        
        {/* Header Title & Description */}
        <div className={`mb-8 ${isRtl ? "text-right" : "text-left"}`}>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
            {t.title}
          </h1>
          <p className="text-neutral-400 text-xs font-medium leading-relaxed">
            {t.desc}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-semibold">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Email Input */}
          <div className="group">
            <label className={`block text-xs font-black tracking-wider uppercase text-neutral-300 mb-2 transition-colors group-focus-within:text-white ${isRtl ? "text-right" : "text-left"}`}>
              {t.emailLabel}
            </label>
            <div className="relative flex items-center">
              <span className={`absolute inset-y-0 ${isRtl ? "right-0 pr-4" : "left-0 pl-4"} flex items-center z-10 pointer-events-none text-neutral-400 group-focus-within:text-white transition-colors`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </span>
              <input
                type="email"
                placeholder={t.emailPlaceholder}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                className={`w-full h-14 ${isRtl ? "pr-12 pl-4 text-right" : "pl-12 pr-4 text-left"} text-base rounded-2xl bg-neutral-900/90 border border-white/10 text-white placeholder-neutral-500 font-semibold focus:outline-none focus:border-white focus:bg-black focus:shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-300`}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="group">
            <label className={`block text-xs font-black tracking-wider uppercase text-neutral-300 mb-2 transition-colors group-focus-within:text-white ${isRtl ? "text-right" : "text-left"}`}>
              {t.passwordLabel}
            </label>
            <div className="relative flex items-center">
              <span className={`absolute inset-y-0 ${isRtl ? "right-0 pr-4" : "left-0 pl-4"} flex items-center z-10 pointer-events-none text-neutral-400 group-focus-within:text-white transition-colors`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t.passwordPlaceholder}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                className={`w-full h-14 ${isRtl ? "pr-12 pl-12 text-right" : "pl-12 pr-12 text-left"} text-base rounded-2xl bg-neutral-900/90 border border-white/10 text-white placeholder-neutral-500 font-semibold focus:outline-none focus:border-white focus:bg-black focus:shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-300`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute inset-y-0 ${isRtl ? "left-0 pl-4" : "right-0 pr-4"} flex items-center z-10 text-neutral-400 hover:text-white transition-colors`}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className={`flex ${isRtl ? "justify-start" : "justify-end"} pt-1 px-1`}>
            <button
              type="button"
              onClick={() => onNavigate("forgot-password")}
              className="text-xs font-bold text-gray-400 hover:text-white transition-colors"
            >
              {t.forgotPassword}
            </button>
          </div>

          {/* Pill Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-14 mt-4 bg-[#844783] text-white font-black rounded-full hover:bg-[#965595] active:scale-[0.98] transition-all duration-300 text-sm flex items-center justify-center shadow-lg shadow-[#844783]/15 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <span>{t.loginBtn}</span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-8">
          <div className="flex-grow h-px bg-white/[0.06]" />
          <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{t.orDivider}</span>
          <div className="flex-grow h-px bg-white/[0.06]" />
        </div>

        {/* OAuth Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            className="flex-1 py-4 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white font-extrabold text-xs rounded-full flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{t.googleBtn}</span>
          </button>
          <button
            type="button"
            className="flex-1 py-4 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white font-extrabold text-xs rounded-full flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.34.13-9.14-1.9-14.4-6.09-3.41-2.75-7.3-7.4-11.67-13.96-5.83-8.73-10.45-18.49-13.87-29.28-3.41-10.79-5.12-21.13-5.12-31.02 0-14.82 3.84-27.1 11.52-36.85 7.68-9.74 17.38-14.75 29.1-15.02 4.47 0 9.58 1.18 15.34 3.54 5.76 2.36 9.87 3.54 12.33 3.54 2.12 0 6.13-1.12 12.03-3.35 5.9-2.24 10.86-3.26 14.88-3.07 10.97.54 19.98 4.47 27.02 11.8 7.04 7.32 11.45 16.4 13.23 27.24-9.62 5.79-14.33 13.91-14.13 24.36.2 10.45 4.3 18.9 12.31 25.35 4.54 3.65 9.77 6.27 15.69 7.86-2.24 6.64-5.13 13.25-8.68 19.82zM119.22 31.75c0-7.07 2.54-13.98 7.62-20.73 5.08-6.75 11.66-11.01 19.74-12.78.13 1.1.2 2.05.2 2.85 0 7.3-2.65 14.39-7.95 21.28-5.3 6.89-11.87 11.23-19.71 13.02-.13-1.09-.2-2.14-.2-3.14z" />
            </svg>
            <span>{t.appleBtn}</span>
          </button>
        </div>

        {/* Bottom Switch Link */}
        <div className="mt-10 text-center">
          <p className="text-gray-400 text-xs font-semibold">
            {t.noAccount}{" "}
            <button
              onClick={() => onNavigate("signup")}
              className="text-[#844783] font-black hover:brightness-110 ml-1 transition-all"
            >
              {t.signUp}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}
