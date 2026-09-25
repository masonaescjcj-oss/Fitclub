import React, { useState } from "react";
import { Lock } from "lucide-react";
import { CtaButton, Field } from "../components/ui/kit";
import Header, { FlowFooter, FlowScreen, FlowTitle, FormError, PasswordToggle, Spinner } from "../components/Header";
import { updatePassword } from "../lib/backend/account";

// Where a password-reset email lands: Supabase has already signed the
// athlete in through the link, so all that's left is the new password.

const COPY = {
  en: {
    title: "Choose a new password",
    lede: "You're signed in through the link we emailed. Pick a password you'll use from now on.",
    label: "New password", placeholder: "At least 8 characters", repeat: "Repeat it",
    save: "Save and continue",
    short: "Password must be at least 8 characters", mismatch: "The two passwords don't match",
    weak: "Pick a stronger password", failed: "Couldn't save it. Try the reset link again.",
  },
  fa: {
    title: "رمز عبور تازه",
    lede: "با لینکی که ایمیل کردیم وارد شده‌اید. رمزی انتخاب کنید که از این به بعد استفاده می‌کنید.",
    label: "رمز عبور تازه", placeholder: "حداقل ۸ کاراکتر", repeat: "تکرار رمز",
    save: "ذخیره و ادامه",
    short: "رمز عبور باید حداقل ۸ کاراکتر باشد", mismatch: "دو رمز یکی نیستند",
    weak: "رمز قوی‌تری انتخاب کنید", failed: "ذخیره نشد. دوباره از لینک بازنشانی استفاده کنید.",
  },
};

export default function ResetPasswordPage({ onNavigate }) {
  const isRtl = (localStorage.getItem("language") || "en") === "fa";
  const t = COPY[isRtl ? "fa" : "en"];
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return setError(t.short);
    if (password !== repeat) return setError(t.mismatch);
    setBusy(true);
    setError("");
    const { error: code } = await updatePassword(password);
    setBusy(false);
    if (code) return setError(code === "weak" ? t.weak : t.failed);
    onNavigate("main-app");
    return undefined;
  };

  return (
    <FlowScreen isRtl={isRtl}>
      <Header showBack={false} isRtl={isRtl} />
      <form onSubmit={submit} className="flex-1 flex flex-col gap-3.5">
        <FlowTitle title={t.title} lede={t.lede} />
        <Field label={t.label} type={shown ? "text" : "password"} autoComplete="new-password" className="mt-4"
          placeholder={t.placeholder} value={password} inputClass="!outline-none"
          prefix={<Lock className="w-5 h-5 text-muted" strokeWidth={2} />}
          suffix={<PasswordToggle shown={shown} onToggle={() => setShown((v) => !v)} isRtl={isRtl} />}
          onChange={(e) => { setPassword(e.target.value); setError(""); }} />
        <Field label={t.repeat} type={shown ? "text" : "password"} autoComplete="new-password"
          value={repeat} inputClass="!outline-none"
          prefix={<Lock className="w-5 h-5 text-muted" strokeWidth={2} />}
          onChange={(e) => { setRepeat(e.target.value); setError(""); }} />
        <FormError>{error}</FormError>
        <FlowFooter>
          <CtaButton type="submit" isRtl={isRtl} disabled={busy} aria-busy={busy}>
            {busy ? <span className="inline-flex items-center gap-2.5"><Spinner />{t.save}</span> : t.save}
          </CtaButton>
        </FlowFooter>
      </form>
    </FlowScreen>
  );
}
