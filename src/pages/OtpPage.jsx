import React, { useState, useEffect, useRef } from "react";
import Header from "../components/Header";

export default function OtpPage({ onNavigate, email = "dddddddd@dd.com" }) {
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const devMockCode = "3255";

  const language = localStorage.getItem("language") || "en";
  const isRtl = language === "fa";

  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Countdown timer
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Auto-submit when all 4 digits are filled
  useEffect(() => {
    const fullOtp = otp.join("");
    if (fullOtp.length === 4) {
      handleVerify(fullOtp);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const handleInputChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (/^\d{4}$/.test(pastedData)) {
      const digits = pastedData.split("");
      setOtp(digits);
      inputRefs[3].current?.focus();
    }
  };

  const handleVerify = (codeToVerify) => {
    const finalCode = codeToVerify || otp.join("");
    if (finalCode.length !== 4) return;

    setIsVerifying(true);
    setError("");

    setTimeout(() => {
      setIsVerifying(false);
      if (finalCode === devMockCode || finalCode === "1234") {
        onNavigate("onboarding");
      } else {
        setError(isRtl ? "کد وارد شده اشتباه است." : "Invalid OTP code. Please try again.");
      }
    }, 800);
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}.${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full md:max-w-lg mx-auto min-h-[100dvh] bg-black text-white flex flex-col justify-between overflow-x-hidden relative font-sans select-none">
      
      {/* Unified Top Sticky Header */}
      <Header onBack={() => onNavigate("signup")} isRtl={isRtl} />

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col justify-center px-6 pb-8 relative z-10 my-auto">
        
        {/* Headline & Subtitle */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight mb-2.5">
            {isRtl ? (
              <>کد تایید را برای <span className="text-[#844783]">تایید هویت</span> وارد کنید 🔒</>
            ) : (
              <>Enter OTP to <span className="text-[#844783]">Verify</span> Your Identity 🔒</>
            )}
          </h1>
          <p className="text-[13px] text-gray-400 leading-relaxed font-medium px-4">
            {isRtl
              ? `یک رمز عبور یک‌بار مصرف (OTP) به ایمیل ${email} ارسال شده است.`
              : `A one-time password (OTP) has been sent to your registered email ${email}.`}
          </p>
        </div>

        {/* Form Inputs */}
        <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }} className="space-y-6 max-w-xs mx-auto w-full">
          
          <div className="flex justify-center gap-3 dir-ltr" dir="ltr">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={inputRefs[idx]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-3xl bg-[#141416] border border-white/10 text-center font-black text-2xl text-white outline-none focus:border-[#844783] focus:ring-2 focus:ring-[#844783]/30 transition-all duration-200"
              />
            ))}
          </div>

          {/* Resend Timer */}
          <div className="text-center py-1">
            {timer > 0 ? (
              <span className="text-[#844783] text-xs font-bold tracking-wide">
                {isRtl ? `ارسال مجدد کد در ${formatTimer(timer)}` : `Resend code in ${formatTimer(timer)}`}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setTimer(30)}
                className="text-[#844783] hover:underline text-xs font-bold transition-all"
              >
                {isRtl ? "ارسال مجدد کد تایید" : "Resend Verification Code"}
              </button>
            )}
          </div>

          {/* DEV MOCK CODE Banner */}
          <div className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 py-3.5 px-4 rounded-2xl text-center flex items-center justify-center gap-2">
            <span className="text-amber-400">DEV MOCK CODE:</span>
            <span className="text-base text-white tracking-widest font-black">{devMockCode}</span>
          </div>

          {/* Continue Button */}
          <button
            type="submit"
            disabled={otp.join("").length !== 4 || isVerifying}
            className="w-full h-14 bg-[#844783] hover:bg-[#965595] text-white font-black rounded-full active:scale-[0.98] transition-all duration-300 text-sm flex items-center justify-center shadow-lg shadow-[#844783]/15 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isVerifying ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <span>{isRtl ? "ادامه" : "Continue"}</span>
            )}
          </button>

          {error && (
            <p className="text-rose-400 text-xs font-semibold text-center bg-rose-500/10 border border-rose-500/20 py-3.5 px-4 rounded-2xl">
              {error}
            </p>
          )}
        </form>

        {/* Change Email Link */}
        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={() => onNavigate("signup")}
            className="text-gray-400 hover:text-white text-xs font-bold tracking-wider uppercase transition-colors"
          >
            ← {isRtl ? "تغییر ایمیل" : "CHANGE EMAIL"}
          </button>
        </div>

      </div>
    </div>
  );
}
