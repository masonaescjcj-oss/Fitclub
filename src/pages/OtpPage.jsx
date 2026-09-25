import React, { useState, useEffect, useRef } from "react";
import { Clock } from "lucide-react";
import { CtaButton, Label, cx, num } from "../components/ui/kit";
import Header, { FlowFooter, FlowScreen, FlowTitle, FormError, Spinner, TextAction } from "../components/Header";

// Persian and Arabic keyboards type their own digits; the code is compared in Latin ones.
const latinDigits = (s) => s
  .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
  .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

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

  const handleInputChange = (index, raw) => {
    const value = latinDigits(raw);
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
    const pastedData = latinDigits(e.clipboardData.getData("text").trim());
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
    return num(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`, isRtl);
  };

  const continueLabel = isRtl ? "ادامه" : "Continue";

  return (
    <FlowScreen isRtl={isRtl}>
      <Header onBack={() => onNavigate("signup")} isRtl={isRtl} stepIndex={1} totalSteps={3} />

      <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }} className="flex-1 flex flex-col gap-3.5">
        <FlowTitle
          title={isRtl ? "کد تایید را وارد کنید" : "Enter the code"}
          lede={
            <>
              {isRtl ? "یک رمز عبور یک‌بار مصرف (OTP) به ایمیل " : "A one-time password (OTP) has been sent to your registered email "}
              <bdi className="font-semibold text-ink break-all">{email}</bdi>
              {isRtl ? " ارسال شده است. " : ". "}
              <button type="button" onClick={() => onNavigate("signup")}
                className="inline px-0 py-2 -my-2 bg-transparent border-0 cursor-pointer font-semibold text-ink underline underline-offset-[3px] decoration-1">
                {isRtl ? "تغییر ایمیل" : "Change email"}
              </button>
            </>
          }
        />

        <fieldset className="m-0 mt-5 p-0 border-0 min-w-0 flex gap-2.5" dir="ltr">
          <legend className="sr-only">{isRtl ? "کد چهار رقمی" : "4-digit code"}</legend>
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={inputRefs[idx]}
              type="text"
              inputMode="numeric"
              autoComplete={idx === 0 ? "one-time-code" : "off"}
              maxLength={1}
              value={digit}
              aria-label={isRtl ? `رقم ${num(idx + 1, true)}` : `Digit ${idx + 1}`}
              aria-invalid={!!error}
              onChange={(e) => handleInputChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              className={cx(
                "flex-1 min-w-0 h-[72px] rounded-2xl bg-card border-0 p-0 text-center font-display font-bold text-[32px] text-ink caret-ink !outline-none transition-shadow duration-150",
                error
                  ? "shadow-[inset_0_0_0_2px_rgb(var(--ui-alert))]"
                  : "focus:shadow-[inset_0_0_0_2px_rgb(var(--ui-fg)),0_0_0_4px_rgb(var(--ui-accent))]"
              )}
            />
          ))}
        </fieldset>

        <div className="min-h-[44px] flex items-center justify-between gap-3">
          {timer > 0 ? (
            <span className="inline-flex items-center gap-2 font-mono text-[13px] text-muted">
              <Clock className="w-4 h-4" strokeWidth={2} />
              {isRtl ? `ارسال مجدد کد در ${formatTimer(timer)}` : `Resend code in ${formatTimer(timer)}`}
            </span>
          ) : (
            <TextAction onClick={() => setTimer(30)}>
              {isRtl ? "ارسال مجدد کد تایید" : "Resend Verification Code"}
            </TextAction>
          )}
          {isVerifying && <Spinner className="text-muted" />}
        </div>

        <FormError>{error}</FormError>

        {/* Dev-only helper so the flow can be walked without a real inbox. */}
        <div className="h-12 px-4 rounded-2xl border border-dashed border-line flex items-center justify-between gap-3" dir="ltr">
          <Label>Dev mock code</Label>
          <span className="font-mono text-base font-semibold tracking-[0.3em] text-ink">{devMockCode}</span>
        </div>

        <FlowFooter>
          <CtaButton type="submit" isRtl={isRtl} disabled={otp.join("").length !== 4 || isVerifying} aria-busy={isVerifying}>
            {isVerifying ? <span className="inline-flex items-center gap-2.5"><Spinner />{continueLabel}</span> : continueLabel}
          </CtaButton>
        </FlowFooter>
      </form>
    </FlowScreen>
  );
}
