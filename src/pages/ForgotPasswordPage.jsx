import React, { useState } from "react";
import Header from "../components/Header";

export default function ForgotPasswordPage({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const language = localStorage.getItem("language") || "en";
  const isRtl = language === "fa";

  const forgotTranslations = {
    en: {
      title: "Reset Your Password",
      desc: "Enter your registered email address and we'll send you instructions to reset your password.",
      emailLabel: "YOUR EMAIL ADDRESS",
      emailPlaceholder: "Enter email address",
      sendBtn: "Send Reset Link",
      backToLogin: "Remember your password?",
      logIn: "Log In",
      validationErr: "Please enter your email address",
      successTitle: "Check Your Email 📩",
      successDesc: "We have sent password reset instructions to:",
      resendBtn: "Didn't receive email? Resend",
    },
    fa: {
      title: "بازنشانی رمز عبور",
      desc: "آدرس ایمیل ثبت‌شده خود را وارد کنید تا دستورالعمل بازنشانی رمز عبور برای شما ارسال شود.",
      emailLabel: "آدرس ایمیل شما",
      emailPlaceholder: "ایمیل خود را وارد کنید",
      sendBtn: "ارسال لینک بازنشانی",
      backToLogin: "رمز عبور خود را به یاد دارید؟",
      logIn: "ورود",
      validationErr: "لطفاً آدرس ایمیل خود را وارد کنید",
      successTitle: "ایمیل خود را بررسی کنید 📩",
      successDesc: "دستورالعمل بازنشانی رمز عبور به ایمیل زیر ارسال شد:",
      resendBtn: "ایمیلی دریافت نکردید؟ ارسال مجدد",
    }
  };

  const t = forgotTranslations[language];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      setError(t.validationErr);
      return;
    }

    setIsLoading(true);
    setError("");

    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 1000);
  };

  return (
    <div className="w-full md:max-w-lg mx-auto min-h-[100dvh] bg-black text-white flex flex-col justify-between overflow-x-hidden relative font-sans select-none">
      
      {/* Unified Top Sticky Header */}
      <Header onBack={() => onNavigate("login")} isRtl={isRtl} />

      {/* Main Content Form */}
      <div className="flex-grow flex flex-col justify-center px-6 pb-8 relative z-10 my-auto">
        
        {!isSubmitted ? (
          <>
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

              {/* Pill Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 mt-4 bg-[#844783] text-white font-black rounded-full hover:bg-[#965595] active:scale-[0.98] transition-all duration-300 text-sm flex items-center justify-center shadow-lg shadow-[#844783]/15 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>{t.sendBtn}</span>
                )}
              </button>
            </form>
          </>
        ) : (
          /* Success Screen */
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-6 rounded-3xl bg-[#844783]/20 border border-[#844783]/40 flex items-center justify-center text-[#844783]">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h2 className="text-2xl font-black text-white mb-2">{t.successTitle}</h2>
            <p className="text-neutral-400 text-xs font-medium mb-4 max-w-xs mx-auto">
              {t.successDesc}
            </p>
            <p className="text-sm font-bold text-white bg-neutral-900 border border-white/10 px-4 py-2.5 rounded-xl inline-block mb-8 dir-ltr" dir="ltr">
              {email}
            </p>

            <button
              onClick={() => setIsSubmitted(false)}
              className="block text-xs font-bold text-gray-400 hover:text-white mx-auto transition-colors"
            >
              {t.resendBtn}
            </button>
          </div>
        )}

        {/* Bottom Switch Link */}
        <div className="mt-10 text-center">
          <p className="text-gray-400 text-xs font-semibold">
            {t.backToLogin}{" "}
            <button
              onClick={() => onNavigate("login")}
              className="text-[#844783] font-black hover:brightness-110 ml-1 transition-all"
            >
              {t.logIn}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}
