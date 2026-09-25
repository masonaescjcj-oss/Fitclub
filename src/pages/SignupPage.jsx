import React, { useState } from "react";
import { backendOn } from "../lib/backend/supabase";
import { landingFor, providers, signInWithProvider, signUp } from "../lib/backend/account";
import { authMessage } from "../lib/backend/authMessages";
import { Lock, Mail } from "lucide-react";
import { CtaButton, Field } from "../components/ui/kit";
import Header, {
  FlowFooter, FlowScreen, FlowTitle, FormError, OrDivider, PasswordToggle, SocialButtons, Spinner, TextAction,
} from "../components/Header";
import LegalLinks from "../components/LegalLinks";

export default function SignupPage({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const language = localStorage.getItem("language") || "en";
  const isRtl = language === "fa";

  const signupTranslations = {
    en: {
      title: "Create your account",
      desc: "Join FitClub to get your personalized AI workouts and track your fitness goals.",
      emailLabel: "Email",
      emailPlaceholder: "example@email.com",
      passwordLabel: "Password",
      passwordPlaceholder: "At least 8 characters",
      continueBtn: "Continue & verify email",
      orDivider: "or continue with",
      googleBtn: "Continue with Google",
      appleBtn: "Continue with Apple",
      hasAccount: "Already have an account?",
      logIn: "Log in",
      validationErr: "Please fill in all fields",
      passwordErr: "Password must be at least 8 characters",
      terms: "By continuing you agree to the {terms} and the {privacy}.", termsLink: "Terms of use", privacyLink: "Privacy policy",
    },
    fa: {
      title: "ایجاد حساب کاربری",
      desc: "به فیت‌کلاب بپیوندید تا برنامه تمرینی اختصاصی هوش مصنوعی خود را دریافت کنید.",
      emailLabel: "آدرس ایمیل",
      emailPlaceholder: "example@email.com",
      passwordLabel: "رمز عبور",
      passwordPlaceholder: "حداقل ۸ کاراکتر",
      continueBtn: "ادامه و تایید ایمیل",
      orDivider: "یا ادامه با",
      googleBtn: "ادامه با گوگل",
      appleBtn: "ادامه با اپل",
      hasAccount: "قبلاً حساب کاربری ساخته‌اید؟",
      logIn: "ورود",
      validationErr: "لطفاً تمام فیلدها را پر کنید",
      passwordErr: "رمز عبور باید حداقل ۸ کاراکتر باشد",
      terms: "با ادامه، {terms} و {privacy} را می‌پذیرید.", termsLink: "شرایط استفاده", privacyLink: "حریم خصوصی",
    }
  };

  const t = signupTranslations[language];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t.validationErr);
      return;
    }
    if (password.length < 8) {
      setError(t.passwordErr);
      return;
    }

    setIsLoading(true);
    setError("");

    if (backendOn) {
      signUp(email.trim(), password).then(({ error: code, needsCode, profile }) => {
        setIsLoading(false);
        if (code) setError(authMessage(code, isRtl));
        else if (needsCode) onNavigate("otp", email.trim());
        else onNavigate(landingFor(profile), email.trim());
      });
      return;
    }
    setTimeout(() => {
      setIsLoading(false);
      onNavigate("otp", email);
    }, 1000);
  };

  const social = async (provider) => {
    if (!backendOn) return;
    const { error: code } = await signInWithProvider(provider);
    if (code) setError(authMessage(code, isRtl));
  };

  return (
    <FlowScreen isRtl={isRtl}>
      <Header onBack={() => onNavigate("welcome")} isRtl={isRtl} stepIndex={0} totalSteps={3} />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-3.5">
        <FlowTitle title={t.title} lede={t.desc} />

        <div className="mt-4 flex flex-col gap-4">
          <Field label={t.emailLabel} type="email" autoComplete="email" inputMode="email"
            placeholder={t.emailPlaceholder} value={email} inputClass="!outline-none"
            prefix={<Mail className="w-5 h-5 text-muted" strokeWidth={2} />}
            onChange={(e) => { setEmail(e.target.value); setError(""); }} />
          <Field label={t.passwordLabel} type={showPassword ? "text" : "password"} autoComplete="new-password"
            placeholder={t.passwordPlaceholder} value={password} inputClass="!outline-none"
            prefix={<Lock className="w-5 h-5 text-muted" strokeWidth={2} />}
            suffix={<PasswordToggle shown={showPassword} onToggle={() => setShowPassword(!showPassword)} isRtl={isRtl} />}
            onChange={(e) => { setPassword(e.target.value); setError(""); }} />
        </div>

        <FormError>{error}</FormError>

        {(!backendOn || providers.length > 0) && (
          <>
            <OrDivider label={t.orDivider} />
            <SocialButtons appleLabel={t.appleBtn} googleLabel={t.googleBtn}
              providers={backendOn ? providers : undefined} onProvider={social} />
          </>
        )}

        <p className="m-0 text-center text-[15px] text-muted">
          {t.hasAccount} <TextAction onClick={() => onNavigate("login")}>{t.logIn}</TextAction>
        </p>

        <FlowFooter>
          <CtaButton type="submit" isRtl={isRtl} disabled={isLoading} aria-busy={isLoading}>
            {isLoading ? <span className="inline-flex items-center gap-2.5"><Spinner />{t.continueBtn}</span> : t.continueBtn}
          </CtaButton>
          <LegalLinks text={t.terms} termsLabel={t.termsLink} privacyLabel={t.privacyLink} onOpen={onNavigate}
            className="m-0 pt-1 text-center text-xs leading-normal text-muted" linkClassName="text-ink" />
        </FlowFooter>
      </form>
    </FlowScreen>
  );
}
