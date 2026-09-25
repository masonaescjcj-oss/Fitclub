import React from "react";
import { motion } from "framer-motion";
import { Clock, SlidersHorizontal } from "lucide-react";
import { CtaButton, Label } from "../components/ui/kit";
import Header, { FlowFooter, FlowScreen } from "../components/Header";

// The breath between the account and the questions: an ink hero with the
// runner, one headline, and the way into the questionnaire.

export default function IntroHeroPage({ onNavigate }) {
  const language = localStorage.getItem("language") || "en";
  const isRtl = language === "fa";

  const c = isRtl
    ? {
      eyebrow: "مرحله‌ی بعد",
      lede: "چند سؤال کوتاه درباره‌ی هدف، بدن و امکاناتت. جواب‌هایت برنامه‌ی تمرین و کالری روزانه‌ات را می‌سازد.",
      time: "حدود ۲ دقیقه",
      change: "بعداً قابل تغییر",
      start: "شروع کنید",
    }
    : {
      eyebrow: "Up next",
      lede: "A few quick questions about your goal, your body and your kit. Your answers set your training split and daily calories.",
      time: "About 2 min",
      change: "Change it any time",
      start: "Start",
    };

  return (
    <FlowScreen isRtl={isRtl} className="relative !bg-jet !text-hero-fg">
      {/* The runner, fading into the ink so the copy below sits on solid ground. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[64%] min-h-[420px] overflow-hidden">
        <motion.img
          src="/athlete_run_neon.jpg"
          alt=""
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          className="w-full h-full object-cover object-[center_28%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-jet via-jet/30 to-jet/0" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-jet/70 to-jet/0" />
      </div>

      <Header onBack={() => onNavigate("profile-setup")} isRtl={isRtl} tone="ink" />

      <div className="flex-1 min-h-[300px]" />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}
        className="relative z-10 flex flex-col gap-3.5 shrink-0">
        <Label className="!text-hero-muted">{c.eyebrow}</Label>
        <h1 className="m-0 font-display font-extrabold text-[46px] leading-[0.95] tracking-[-0.045em] rtl:text-[40px] rtl:leading-[1.25] rtl:tracking-normal">
          {isRtl ? (
            <>کشف یک نسخه‌ی<br /><span className="text-accent">سالم‌تر و قوی‌تر.</span></>
          ) : (
            <>Discover a<br />healthier,<br /><span className="text-accent">stronger you.</span></>
          )}
        </h1>
        <p className="m-0 text-base leading-[1.45] text-hero-muted">{c.lede}</p>
        <div className="flex flex-wrap gap-1.5">
          <span className="h-8 px-3 rounded-full bg-hero-2 text-hero-fg/85 text-[13px] font-medium inline-flex items-center gap-1.5">
            <Clock className="w-4 h-4" strokeWidth={2} />{c.time}
          </span>
          <span className="h-8 px-3 rounded-full bg-hero-2 text-hero-fg/85 text-[13px] font-medium inline-flex items-center gap-1.5">
            <SlidersHorizontal className="w-4 h-4" strokeWidth={2} />{c.change}
          </span>
        </div>
      </motion.div>

      <FlowFooter tone="ink" className="!pt-5">
        <CtaButton tone="accent" isRtl={isRtl} onClick={() => onNavigate("onboarding-questions")}>{c.start}</CtaButton>
      </FlowFooter>
    </FlowScreen>
  );
}
