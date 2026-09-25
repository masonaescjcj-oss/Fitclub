import React, { useState } from "react";
import { Lock, Mail } from "lucide-react";
import { CtaButton, Field } from "../components/ui/kit";
import Header, {
  FlowFooter, FlowScreen, FlowTitle, FormError, OrDivider, PasswordToggle, SocialButtons, Spinner, TextAction,
} from "../components/Header";

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
      title: "Welcome back to FitClub",
      desc: "Log in to continue your journey toward a healthier and better you.",
      emailLabel: "Your email address",
      emailPlaceholder: "Enter email address",
      passwordLabel: "Password",
      passwordPlaceholder: "Enter your password",
      forgotPassword: "Forgot password?",
      loginBtn: "Log in",
      orDivider: "or continue with",
      googleBtn: "Continue with Google",
      appleBtn: "Continue with Apple",
      noAccount: "Don't have an account?",
      signUp: "Sign up",
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
      orDivider: "یا ادامه با",
      googleBtn: "ادامه با گوگل",
      appleBtn: "ادامه با اپل",
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
      // A returning athlete goes straight to the app, not back through signup.
      onNavigate("main-app", email);
    }, 1000);
  };

  return (
    <FlowScreen isRtl={isRtl}>
      <Header onBack={() => onNavigate("welcome")} isRtl={isRtl} />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-3.5">
        <FlowTitle title={t.title} lede={t.desc} />

        <div className="mt-4 flex flex-col gap-4">
          <Field label={t.emailLabel} type="email" autoComplete="email" inputMode="email"
            placeholder={t.emailPlaceholder} value={email} inputClass="!outline-none"
            prefix={<Mail className="w-5 h-5 text-muted" strokeWidth={2} />}
            onChange={(e) => { setEmail(e.target.value); setError(""); }} />
          <div className="flex flex-col">
            <Field label={t.passwordLabel} type={showPassword ? "text" : "password"} autoComplete="current-password"
              placeholder={t.passwordPlaceholder} value={password} inputClass="!outline-none"
              prefix={<Lock className="w-5 h-5 text-muted" strokeWidth={2} />}
              suffix={<PasswordToggle shown={showPassword} onToggle={() => setShowPassword(!showPassword)} isRtl={isRtl} />}
              onChange={(e) => { setPassword(e.target.value); setError(""); }} />
            <TextAction onClick={() => onNavigate("forgot-password")} className="self-end mt-1 !text-sm">
              {t.forgotPassword}
            </TextAction>
          </div>
        </div>

        <FormError>{error}</FormError>

        <OrDivider label={t.orDivider} />
        <SocialButtons appleLabel={t.appleBtn} googleLabel={t.googleBtn} />

        <p className="m-0 text-center text-[15px] text-muted">
          {t.noAccount} <TextAction onClick={() => onNavigate("signup")}>{t.signUp}</TextAction>
        </p>

        <FlowFooter>
          <CtaButton type="submit" isRtl={isRtl} disabled={isLoading} aria-busy={isLoading}>
            {isLoading ? <span className="inline-flex items-center gap-2.5"><Spinner />{t.loginBtn}</span> : t.loginBtn}
          </CtaButton>
        </FlowFooter>
      </form>
    </FlowScreen>
  );
}
