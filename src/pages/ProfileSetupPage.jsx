import React, { useRef, useState } from "react";
import { backendOn } from "../lib/backend/supabase";
import { saveProfile, usernameAvailable } from "../lib/backend/account";
import { authMessage } from "../lib/backend/authMessages";
import { AtSign, User, Check, X } from "lucide-react";
import { Avatar, Card, CtaButton, Field, IconWell } from "../components/ui/kit";
import Header, { FlowFooter, FlowScreen, FlowTitle, FormError, Spinner } from "../components/Header";
import { validateUsername } from "../lib/chat/chatModel";
import { loadChat, takenUsernames } from "../lib/chat/chatStore";

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
      title: "Complete your profile",
      desc: "Enter your name and choose a unique username for your account.",
      nameLabel: "Name",
      namePlaceholder: "Enter your name",
      usernameLabel: "Username",
      usernamePlaceholder: "Enter your username",
      saveBtn: "Save & continue",
      validationErr: "Please fill in all required fields",
      usernameValid: "Username is available",
      usernameInvalid: "Username is taken or invalid",
      checking: "Checking availability...",
      preview: "How the club sees you",
      reasons: {
        short: "At least 5 characters.",
        long: "At most 32 characters.",
        chars: "Only a–z, 0–9 and underscores.",
        start: "Can't start with a number or an underscore.",
        taken: "This username is already taken.",
      },
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
      preview: "باشگاه شما را این‌طور می‌بیند",
      reasons: {
        short: "حداقل ۵ کاراکتر.",
        long: "حداکثر ۳۲ کاراکتر.",
        chars: "فقط a–z، 0–9 و زیرخط.",
        start: "نمی‌تواند با عدد یا زیرخط شروع شود.",
        taken: "این نام کاربری قبلاً گرفته شده.",
      },
    }
  };

  const t = profileTranslations[language];

  const [reason, setReason] = useState(null);
  const [saving, setSaving] = useState(false);
  const checkTicket = useRef(0);

  // The same rules and the same taken list the messenger uses, so the ID picked
  // here is the one people find you by later.
  const handleUsernameChange = (val) => {
    const cleanVal = val.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(cleanVal);
    setError("");

    if (!cleanVal) {
      setUsernameStatus(null);
      setReason(null);
      setIsValidating(false);
      return;
    }

    setIsValidating(true);
    // Only the latest keystroke's answer counts; an older, slower check is dropped.
    const ticket = ++checkTicket.current;
    setTimeout(async () => {
      let problem = validateUsername(cleanVal, [], null)
        || (takenUsernames(loadChat()).some((u) => u.toLowerCase() === cleanVal) ? "taken" : null);
      // With real accounts the whole directory decides, not just this device.
      if (!problem && backendOn && !(await usernameAvailable(cleanVal))) problem = "taken";
      if (ticket !== checkTicket.current) return;
      setIsValidating(false);
      setReason(problem);
      setUsernameStatus(problem ? "invalid" : "valid");
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

    if (backendOn) {
      setSaving(true);
      saveProfile({ name: name.trim(), username: username.trim() }).then(({ error: code }) => {
        setSaving(false);
        if (code === "taken") { setReason("taken"); setUsernameStatus("invalid"); setError(t.usernameInvalid); }
        else if (code) setError(authMessage(code, isRtl));
        else onNavigate("questionnaire", { name: name.trim(), username: username.trim() });
      });
      return;
    }
    onNavigate("questionnaire", { name: name.trim(), username: username.trim() });
  };

  const usernameError = username && !isValidating && usernameStatus === "invalid"
    ? (t.reasons[reason] || t.usernameInvalid) : undefined;
  const usernameHint = username
    ? (isValidating ? t.checking : usernameStatus === "valid" ? t.usernameValid : undefined) : undefined;

  const status = isValidating ? (
    <Spinner className="!w-[18px] !h-[18px] text-muted" />
  ) : usernameStatus === "valid" ? (
    <span className="w-6 h-6 rounded-full bg-accent text-on-accent flex items-center justify-center" aria-hidden="true">
      <Check className="w-3.5 h-3.5" strokeWidth={3} />
    </span>
  ) : usernameStatus === "invalid" ? (
    <span className="w-6 h-6 rounded-full bg-alert/15 text-alert flex items-center justify-center" aria-hidden="true">
      <X className="w-3.5 h-3.5" strokeWidth={3} />
    </span>
  ) : null;

  return (
    <FlowScreen isRtl={isRtl}>
      <Header onBack={() => onNavigate("otp")} isRtl={isRtl} stepIndex={2} totalSteps={3} />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-3.5">
        <FlowTitle title={t.title} lede={t.desc} />

        {/* A live preview of the name and ID other members will see. */}
        <Card className="mt-3 flex items-center gap-3.5" aria-label={t.preview}>
          {name.trim() ? (
            <Avatar name={name} size={52} tone="bg-sand" />
          ) : (
            <IconWell tone="sand" size={52}><User className="w-6 h-6" strokeWidth={2} /></IconWell>
          )}
          <span className="flex-1 min-w-0 flex flex-col gap-0.5">
            <span className={name.trim() ? "text-[17px] font-bold text-ink truncate" : "text-[17px] font-bold text-faint truncate"}>
              {name.trim() || t.namePlaceholder}
            </span>
            <span className="text-sm text-muted truncate">
              <bdi dir="ltr">@{username || "username"}</bdi>
            </span>
          </span>
        </Card>

        <div className="mt-2 flex flex-col gap-4">
          <Field label={t.nameLabel} type="text" autoComplete="name" placeholder={t.namePlaceholder}
            value={name} inputClass="!outline-none"
            prefix={<User className="w-5 h-5 text-muted" strokeWidth={2} />}
            onChange={(e) => { setName(e.target.value); setError(""); }} />
          <Field label={t.usernameLabel} type="text" autoComplete="username" autoCapitalize="none" spellCheck={false}
            placeholder={t.usernamePlaceholder} value={username} inputClass="!outline-none"
            prefix={<AtSign className="w-5 h-5 text-muted" strokeWidth={2} />}
            suffix={status}
            error={usernameError} hint={usernameHint}
            onChange={(e) => handleUsernameChange(e.target.value)} />
        </div>

        <FormError>{error}</FormError>

        <FlowFooter>
          <CtaButton type="submit" isRtl={isRtl} disabled={!name || !username || usernameStatus !== "valid" || saving} aria-busy={saving}>
            {t.saveBtn}
          </CtaButton>
        </FlowFooter>
      </form>
    </FlowScreen>
  );
}
