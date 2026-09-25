import React, { useState } from "react";
import { motion } from "framer-motion";
import { CtaButton, Label, Ring, cx, num } from "../components/ui/kit";
import { FlowFooter, FlowScreen } from "../components/Header";

// Welcome: the one ink screen before sign-up. Three rings for the three
// things the app tracks, a big headline, and the way in.

const RING_TRACK = "rgb(var(--ui-hero-2))";

export default function WelcomePage({ onNavigate }) {
  const [language, setLanguage] = useState(() => localStorage.getItem("language") || "en");

  const toggleLanguage = () => {
    const nextLang = language === "en" ? "fa" : "en";
    setLanguage(nextLang);
    localStorage.setItem("language", nextLang);
    document.documentElement.lang = nextLang;
    document.documentElement.dir = nextLang === "fa" ? "rtl" : "ltr";
  };

  const isFa = language === "fa";

  const welcomeTranslations = {
    en: {
      beHealthy: "Be healthy.",
      beStronger: "Be stronger.",
      beYourself: "Be yourself.",
      joinNow: "Join now",
      logInBtn: "Log in",
      haveAccount: "Already a member?",
      terms: "By joining Fitclub, you agree to the Terms and Privacy Policy.",
      lede: "A coach that reads your training log, your food diary and your checklists, then tells you what to do today.",
      rings: "rings a day",
      train: "Train",
      fuel: "Fuel",
      showUp: "Show up",
      language: "Language",
    },
    fa: {
      beHealthy: "تندرست باشید.",
      beStronger: "قوی‌تر شوید.",
      beYourself: "خودتان باشید.",
      joinNow: "عضویت",
      logInBtn: "ورود",
      haveAccount: "عضو هستید؟",
      terms: "با عضویت در فیت‌کلاب، شرایط و قوانین حریم خصوصی را می‌پذیرید.",
      lede: "مربی‌ای که دفتر تمرین، دفتر غذا و چک‌لیست‌هایت را می‌خواند و می‌گوید امروز چه کنی.",
      rings: "حلقه در روز",
      train: "تمرین",
      fuel: "تغذیه",
      showUp: "حضور",
      language: "زبان",
    },
  };

  const t = welcomeTranslations[language];

  const legend = [
    { label: t.train, dot: "bg-accent" },
    { label: t.fuel, dot: "bg-coach" },
    { label: t.showUp, dot: "bg-hero-fg" },
  ];

  return (
    <FlowScreen isRtl={isFa} className="!bg-jet !text-hero-fg">
      <div className="flex items-center justify-between pt-3 shrink-0">
        <span className="flex items-center gap-2.5" dir="ltr">
          <span className="w-9 h-9 rounded-[11px] bg-accent text-on-accent flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 20V4.5h11" /><path d="M7 12h8" />
            </svg>
          </span>
          <span className="font-display font-bold text-[19px] tracking-[-0.02em]">FitClub</span>
        </span>

        {/* The language switch. Either half flips it; the lit half is the current one. */}
        <div role="group" aria-label={t.language} className="h-11 p-1 rounded-full bg-hero-2 flex items-center" dir="ltr">
          {[{ id: "en", label: "EN" }, { id: "fa", label: "فا" }].map((l) => {
            const on = language === l.id;
            return (
              <button key={l.id} type="button" lang={l.id} aria-pressed={on}
                onClick={() => { if (!on) toggleLanguage(); }}
                className={cx("h-9 min-w-[44px] px-3 rounded-full border-0 cursor-pointer text-[13px] font-semibold transition-colors",
                  on ? "bg-hero-fg text-jet" : "bg-transparent text-hero-muted")}>
                {l.label}
              </button>
            );
          })}
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
        className="flex flex-col items-center gap-4 mt-3 shrink-0" aria-hidden="true">
        <Ring size={244} stroke={15} value={0.75} color="rgb(var(--ui-accent))" track={RING_TRACK}>
          <Ring size={186} stroke={15} value={0.55} color="rgb(var(--ui-coach))" track={RING_TRACK}>
            <Ring size={128} stroke={15} value={0.7} color="rgb(var(--ui-hero-fg))" track={RING_TRACK}>
              <span className="font-display font-extrabold text-[36px] leading-none tracking-[-0.04em]">{num(3, isFa)}</span>
              <Label className="!text-[10px] !text-hero-muted mt-0.5">{t.rings}</Label>
            </Ring>
          </Ring>
        </Ring>
        <div className="flex justify-center gap-[18px]">
          {legend.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5 text-[13px] text-hero-fg/85">
              <span className={cx("w-2 h-2 rounded-full", l.dot)} />{l.label}
            </span>
          ))}
        </div>
      </motion.div>

      <div className="mt-5 flex flex-col gap-3.5 shrink-0">
        <h1 className="m-0 font-display font-extrabold text-[52px] leading-[0.94] tracking-[-0.045em] rtl:text-[44px] rtl:leading-[1.25] rtl:tracking-normal">
          {t.beHealthy}<br />{t.beStronger}<br /><span className="text-accent">{t.beYourself}</span>
        </h1>
        <p className="m-0 text-base leading-[1.45] text-hero-muted">{t.lede}</p>
      </div>

      <FlowFooter tone="ink" className="!pt-5">
        <CtaButton tone="accent" isRtl={isFa} onClick={() => onNavigate("signup")}>{t.joinNow}</CtaButton>
        <button type="button" onClick={() => onNavigate("login")}
          className="h-12 w-full rounded-full bg-transparent border-0 cursor-pointer text-[15px] text-hero-fg transition-transform active:scale-[0.98]">
          <span className="text-hero-muted">{t.haveAccount}</span> <span className="font-semibold">{t.logInBtn}</span>
        </button>
        <p className="m-0 text-center text-xs leading-normal text-hero-muted/80">{t.terms}</p>
      </FlowFooter>
    </FlowScreen>
  );
}
