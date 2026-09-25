import React, { useState } from "react";
import { Mail, MailCheck } from "lucide-react";
import { CtaButton, Field, IconWell } from "../components/ui/kit";
import Header, { FlowFooter, FlowScreen, FlowTitle, FormError, Spinner, TextAction } from "../components/Header";

export default function ForgotPasswordPage({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const language = localStorage.getItem("language") || "en";
  const isRtl = language === "fa";

  const forgotTranslations = {
    en: {
      title: "Reset your password",
      desc: "Enter your registered email address and we'll send you instructions to reset your password.",
      emailLabel: "Your email address",
      emailPlaceholder: "Enter email address",
      sendBtn: "Send reset link",
      backToLogin: "Remember your password?",
      logIn: "Log in",
      validationErr: "Please enter your email address",
      successTitle: "Check your email",
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
      successTitle: "ایمیل خود را بررسی کنید",
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

  if (isSubmitted) {
    return (
      <FlowScreen isRtl={isRtl}>
        <Header onBack={() => onNavigate("login")} isRtl={isRtl} />
        <div className="mt-10 flex flex-col items-start gap-5">
          <IconWell tone="inv" size={64}><MailCheck className="w-7 h-7" strokeWidth={2} /></IconWell>
          <FlowTitle title={t.successTitle} lede={t.successDesc} className="!mt-0" />
          <span dir="ltr" className="max-w-full h-12 px-4 rounded-2xl bg-card text-ink text-base font-semibold inline-flex items-center gap-2.5">
            <Mail className="w-[18px] h-[18px] text-muted shrink-0" strokeWidth={2} />
            <span className="truncate">{email}</span>
          </span>
          <TextAction onClick={() => setIsSubmitted(false)} className="-mt-1">{t.resendBtn}</TextAction>
        </div>
        <FlowFooter>
          <CtaButton isRtl={isRtl} onClick={() => onNavigate("login")}>{t.logIn}</CtaButton>
        </FlowFooter>
      </FlowScreen>
    );
  }

  return (
    <FlowScreen isRtl={isRtl}>
      <Header onBack={() => onNavigate("login")} isRtl={isRtl} />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-3.5">
        <FlowTitle title={t.title} lede={t.desc} />

        <Field label={t.emailLabel} type="email" autoComplete="email" inputMode="email" className="mt-4"
          placeholder={t.emailPlaceholder} value={email} inputClass="!outline-none"
          prefix={<Mail className="w-5 h-5 text-muted" strokeWidth={2} />}
          onChange={(e) => { setEmail(e.target.value); setError(""); }} />

        <FormError>{error}</FormError>

        <FlowFooter>
          <CtaButton type="submit" isRtl={isRtl} disabled={isLoading} aria-busy={isLoading}>
            {isLoading ? <span className="inline-flex items-center gap-2.5"><Spinner />{t.sendBtn}</span> : t.sendBtn}
          </CtaButton>
          <p className="m-0 text-center text-[15px] text-muted">
            {t.backToLogin} <TextAction onClick={() => onNavigate("login")}>{t.logIn}</TextAction>
          </p>
        </FlowFooter>
      </form>
    </FlowScreen>
  );
}
