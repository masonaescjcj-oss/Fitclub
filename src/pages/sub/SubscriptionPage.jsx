import React, { useState } from "react";
import { BadgeCheck, EyeOff, Sparkles, X } from "lucide-react";
import { CtaButton, IconButton, IconWell, Ring, Screen, cx } from "../../components/ui/kit";
import { backendOn } from "../../lib/backend/supabase";

// FitClub Pro: an ink hero that bleeds to the screen edges, what Pro adds,
// the plans as radio cards, and one call to action.

const COPY = {
  en: {
    close: "Close", tag: "FITCLUB PRO", title: ["Your coach,", "uncapped."],
    lead: "Unlock all AI features. Everything in FitClub, with no limit on what you can ask.",
    features: ["Unlimited AI workout & nutrition", "A Pro badge everywhere you appear", "No sponsored posts in channels"],
    plan: "Plan", popular: "Most popular", cta: "Activate VIP Membership", checkout: "Proceeding to checkout!",
    soonTitle: "Coming soon",
    soonBody: "Pro isn't on sale yet. Until it is, everything in FitClub is free, and nothing you use today will be taken away.",
    realFeatures: ["More coach questions every day", "A Pro badge on your profile and in chats"],
  },
  fa: {
    close: "بستن", tag: "FITCLUB PRO", title: ["مربی‌ات،", "بدون سقف."],
    lead: "همه‌ی قابلیت‌های هوش مصنوعی را باز کن. همه‌چیزِ فیت‌کلاب، بدون محدودیت در پرسیدن.",
    features: ["دسترسی نامحدود به مربی و رژیم AI", "نشان پرو هر جا که دیده می‌شوی", "بدون پست‌های تبلیغاتی در کانال‌ها"],
    plan: "پلن", popular: "محبوب‌ترین", cta: "فعال‌سازی اشتراک VIP", checkout: "ورود به درگاه پرداخت ثبت شد!",
    soonTitle: "به‌زودی",
    soonBody: "پرو هنوز فروخته نمی‌شود. تا آن موقع همه‌ی فیت‌کلاب رایگان است و چیزی که امروز استفاده می‌کنی از تو گرفته نمی‌شود.",
    realFeatures: ["سؤال‌های بیشتر از مربی در هر روز", "نشان پرو روی پروفایل و در چت‌ها"],
  },
};

const FEATURE_ICONS = [
  { Icon: Sparkles, tone: "coach" },
  { Icon: BadgeCheck, tone: "inv" },
  { Icon: EyeOff, tone: "sunk" },
];

export default function SubscriptionPage({ onBack, isRtl }) {
  const [selectedPlan, setSelectedPlan] = useState("plan2");
  const c = COPY[isRtl ? "fa" : "en"];

  const plans = [
    { id: "plan1", nameEn: "1 Month VIP", nameFa: "اشتراک ۱ ماهه VIP", priceEn: "$9.99", periodEn: "per month", priceFa: "۱۴۹,۰۰۰ تومان", periodFa: "ماهانه", popular: false },
    { id: "plan2", nameEn: "3 Months PRO (Recommended)", nameFa: "اشتراک ۳ ماهه PRO (توصیه‌شده)", priceEn: "$19.99", periodEn: "per 3 months", priceFa: "۳۹۰,۰۰۰ تومان", periodFa: "هر ۳ ماه", popular: true },
    { id: "plan3", nameEn: "1 Year ELITE", nameFa: "اشتراک ۱ ساله ELITE", priceEn: "$49.99", periodEn: "per year", priceFa: "۹۹۰,۰۰۰ تومان", periodFa: "سالانه", popular: false },
  ];

  return (
    <Screen isRtl={isRtl} className="!pt-0">
      <section aria-labelledby="pro-title"
        className="ui-hero relative -mx-5 px-5 pt-[calc(env(safe-area-inset-top)+6px)] pb-7 rounded-b-[36px] bg-hero text-hero-fg overflow-hidden">
        <span aria-hidden="true" className="absolute -top-6 -end-[60px] pointer-events-none">
          <Ring value={0.75} size={220} stroke={20} color="rgb(var(--ui-accent))" track="rgb(var(--ui-hero-2))">
            <Ring value={0.5} size={140} stroke={20} color="rgb(var(--ui-coach))" track="rgb(var(--ui-hero-2))" />
          </Ring>
        </span>
        <div className="relative flex justify-between items-center">
          <span className="h-[30px] px-3 rounded-full bg-accent text-on-accent inline-flex items-center font-mono text-xs font-semibold tracking-label">{c.tag}</span>
          <IconButton label={c.close} tone="hero" onClick={onBack}>
            <X className="w-5 h-5" strokeWidth={2} />
          </IconButton>
        </div>
        <h1 id="pro-title" className="relative m-0 mt-24 font-display font-extrabold text-[50px] leading-[0.92] tracking-[-0.05em]">
          {c.title[0]}<br /><span className="text-accent">{c.title[1]}</span>
        </h1>
        <p className="relative m-0 mt-3.5 text-base leading-[1.45] text-hero-muted max-w-[300px]">{c.lead}</p>
      </section>

      <ul className="m-0 mt-1 p-0 py-1 list-none rounded-3xl bg-card divide-y divide-hair">
        {(backendOn ? c.realFeatures : c.features).map((f, i) => {
          const { Icon, tone } = FEATURE_ICONS[i];
          return (
            <li key={f} className="min-h-[56px] flex items-center gap-3.5 px-4 py-2">
              <IconWell tone={tone} size={32}><Icon className="w-[17px] h-[17px]" strokeWidth={2} /></IconWell>
              <span className="text-[15px] font-semibold leading-snug">{f}</span>
            </li>
          );
        })}
      </ul>

      {backendOn ? (
        <div className="rounded-3xl bg-card px-5 py-4 flex flex-col gap-1.5">
          <span className="font-display font-extrabold text-[22px] leading-none tracking-[-0.02em] text-ink">{c.soonTitle}</span>
          <p className="m-0 text-[15px] leading-[1.45] text-muted">{c.soonBody}</p>
        </div>
      ) : (<>
      <div role="radiogroup" aria-label={c.plan} className="flex flex-col gap-2.5">
        {plans.map((p) => {
          const isSelected = selectedPlan === p.id;
          const [name, note] = (isRtl ? p.nameFa : p.nameEn).split(/\s*\((.+)\)\s*$/);
          return (
            <button key={p.id} type="button" role="radio" aria-checked={isSelected} onClick={() => setSelectedPlan(p.id)}
              className={cx("relative w-full min-h-[84px] rounded-[22px] bg-card px-4 py-3.5 flex items-center gap-3 text-start border-0 cursor-pointer transition-shadow",
                isSelected ? "ring-[2.5px] ring-inset ring-ink" : "")}>
              <span className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-muted">{name}</span>
                  {p.popular && (
                    <span className="h-[22px] px-2 rounded-full bg-accent text-on-accent inline-flex items-center text-[11px] font-bold">{note || c.popular}</span>
                  )}
                </span>
                <span className="font-display font-extrabold text-[22px] leading-none tracking-[-0.02em] text-ink">{isRtl ? p.priceFa : p.priceEn}</span>
                <span className="text-xs text-muted">{isRtl ? p.periodFa : p.periodEn}</span>
              </span>
              <span aria-hidden="true" className={cx("w-[26px] h-[26px] shrink-0 rounded-full flex items-center justify-center",
                isSelected ? "bg-jet dark:bg-accent" : "ring-2 ring-inset ring-faint")}>
                {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-accent dark:bg-jet" />}
              </span>
            </button>
          );
        })}
      </div>

      <CtaButton isRtl={isRtl} className="mt-2" onClick={() => alert(c.checkout)}>{c.cta}</CtaButton>
      </>)}
    </Screen>
  );
}
