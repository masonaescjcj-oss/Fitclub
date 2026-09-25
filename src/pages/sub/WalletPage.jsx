import React, { useEffect, useMemo, useState } from "react";
import { Check, ClipboardList, Copy, Dumbbell, Flame, Gift, Trophy, Utensils } from "lucide-react";
import { Button, Card, IconWell, Label, List, Row, Screen, SectionHead, TopBar, cx, num } from "../../components/ui/kit";
import { useTrainingStore } from "../../lib/training/trainingContext";
import { useChecklistStore } from "../../lib/checklistContext";
import { useNutritionStore } from "../../lib/nutrition/nutritionContext";
import { STREAK_BONUSES, XP, computeRewards, referralCode } from "../../lib/rewards";
import { loadSession } from "../../lib/session";

// Wallet: the XP balance on the ink hero, where it came from, the rules,
// then the referral code. XP is worked out from the athlete's own log.

const COPY = {
  en: {
    title: "Wallet & Rewards", balance: "Your Reward Balance", xp: "XP",
    soon: "Rewards unlock with FitClub Pro soon. Until then, XP tracks what you have put in.",
    earned: "How you earned it", rules: "How XP works",
    line: {
      workouts: "Workouts finished", records: "Personal records", checklist: "Perfect checklist days",
      food: "Days with food logged", streak: "Streak bonuses",
    },
    times: (count, per) => `${count} × ${per} XP`,
    streakSub: (best, got, all) => `Best run ${best} days, ${got} of ${all} bonuses`,
    rule: {
      workouts: "Each finished workout",
      records: "Each personal record: a heavier top set or a better estimated 1RM",
      checklist: "Each day every daily checklist item was done",
      food: "Each day with food in your diary",
      streak: (list) => `Once each, for a ${list} day checklist streak`,
    },
    and: (items) => `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`,
    referral: "Your Referral Code", referralBody: "Share it with friends. Referral rewards arrive with FitClub Pro.",
    noCode: "Pick a username in Club settings to get your code.",
    copy: "Copy", copied: "Copied",
  },
  fa: {
    title: "کیف پول و امتیازها", balance: "موجودی امتیازهای شما", xp: "امتیاز",
    soon: "به‌زودی با فیت‌کلاب پرو می‌توانی امتیازها را خرج کنی. تا آن موقع، امتیاز نشان می‌دهد چقدر تلاش کرده‌ای.",
    earned: "از کجا به دست آمد", rules: "قوانین امتیاز",
    line: {
      workouts: "تمرین‌های کامل‌شده", records: "رکوردهای شخصی", checklist: "روزهای کامل چک‌لیست",
      food: "روزهای ثبت غذا", streak: "پاداش استریک",
    },
    times: (count, per) => `${count} × ${per} امتیاز`,
    streakSub: (best, got, all) => `بهترین رکورد ${best} روز، ${got} از ${all} پاداش`,
    rule: {
      workouts: "هر تمرین کامل‌شده",
      records: "هر رکورد شخصی: وزنه‌ی سنگین‌تر یا تخمین 1RM بهتر",
      checklist: "هر روزی که همه‌ی موارد چک‌لیست روزانه انجام شد",
      food: "هر روزی که غذا در دفترت ثبت شد",
      streak: (list) => `یک بار برای هر کدام: استریک ${list} روزه‌ی چک‌لیست`,
    },
    and: (items) => `${items.slice(0, -1).join("، ")} و ${items[items.length - 1]}`,
    referral: "کد دعوت اختصاصی شما", referralBody: "آن را با دوستانت به اشتراک بگذار. پاداش دعوت با فیت‌کلاب پرو فعال می‌شود.",
    noCode: "برای گرفتن کد دعوت، در تنظیمات باشگاه یک نام کاربری انتخاب کن.",
    copy: "کپی", copied: "کپی شد",
  },
};

const ICONS = { workouts: Dumbbell, records: Trophy, checklist: ClipboardList, food: Utensils, streak: Flame };
const PER = { workouts: XP.workout, records: XP.record, checklist: XP.checklistDay, food: XP.foodDay };

export default function WalletPage({ onBack, isRtl }) {
  const [copied, setCopied] = useState(false);
  const c = COPY[isRtl ? "fa" : "en"];
  const n = (v) => num(v, isRtl);
  const training = useTrainingStore();
  const checklist = useChecklistStore();
  const nutrition = useNutritionStore();
  const rewards = useMemo(
    () => computeRewards({ sessions: training.sessions, lists: checklist.lists, diaryDays: nutrition.diary?.days }),
    [training.sessions, checklist.lists, nutrition.diary]
  );
  const code = referralCode(loadSession());

  useEffect(() => {
    if (!copied) return undefined;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  const handleCopy = () => {
    if (!code) return;
    try {
      const pending = navigator.clipboard?.writeText(code);
      if (pending) pending.catch(() => {});
    } catch {
      // No clipboard here; the code is on screen to copy by hand.
    }
    setCopied(true);
  };

  const streakDays = STREAK_BONUSES.map((b) => n(b.days));
  // Signed numbers keep the plus in front in both languages.
  const plus = (v) => <span dir="ltr">+{n(v)}</span>;

  return (
    <Screen isRtl={isRtl}>
      <TopBar isRtl={isRtl} onBack={onBack} title={c.title} />

      <Card tone="hero" className="flex flex-col gap-3">
        <Label className="!text-hero-muted">{c.balance}</Label>
        <span className="flex items-baseline gap-2">
          <span className="font-display font-extrabold text-[64px] leading-[0.85] tracking-[-0.05em]">{n(rewards.total.toLocaleString("en-US"))}</span>
          <span className="text-lg font-bold text-accent">{c.xp}</span>
        </span>
        <p className="m-0 text-sm text-hero-muted">{c.soon}</p>
      </Card>

      <SectionHead title={c.earned} />
      <List>
        {rewards.lines.map((l) => {
          const Icon = ICONS[l.id];
          const subtitle = l.id === "streak"
            ? c.streakSub(n(rewards.streak.best), n(l.count), n(STREAK_BONUSES.length))
            : c.times(n(l.count), n(l.per));
          return (
            <Row key={l.id} isRtl={isRtl}
              icon={<IconWell tone={l.xp > 0 ? "accent" : "sunk"} size={40}><Icon className="w-5 h-5" strokeWidth={2} /></IconWell>}
              title={c.line[l.id]} subtitle={subtitle}
              right={(
                <span className="font-display font-extrabold text-[17px] tracking-[-0.02em] text-ink">
                  {n(l.xp.toLocaleString("en-US"))} <span className="text-xs font-semibold text-muted">{c.xp}</span>
                </span>
              )} />
          );
        })}
      </List>

      <SectionHead title={c.rules} />
      <Card pad={false} as="ul" className="m-0 px-4 py-1 list-none divide-y divide-hair">
        {["workouts", "records", "checklist", "food"].map((id) => (
          <li key={id} className="flex items-start gap-3 py-3">
            <span className="w-14 shrink-0 font-display font-extrabold text-[17px] leading-snug tracking-[-0.02em]">{plus(PER[id])}</span>
            <span className="flex-1 min-w-0 text-[15px] leading-snug">{c.rule[id]}</span>
          </li>
        ))}
        <li className="flex items-start gap-3 py-3">
          <span className="w-14 shrink-0 pt-0.5"><Flame className="w-5 h-5" strokeWidth={2} /></span>
          <span className="flex-1 min-w-0 flex flex-col gap-1.5">
            <span className="text-[15px] leading-snug">{c.rule.streak(c.and(streakDays))}</span>
            <span className="flex flex-wrap gap-1.5">
              {STREAK_BONUSES.map((b) => (
                <span key={b.days} className={cx("h-7 px-3 rounded-full inline-flex items-center gap-1 text-xs font-semibold",
                  rewards.streak.reached.includes(b.days) ? "bg-accent text-on-accent" : "bg-sunk text-ink")}>
                  {isRtl ? `${n(b.days)} روز:` : `${b.days} days:`} {plus(b.xp)}
                </span>
              ))}
            </span>
          </span>
        </li>
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <IconWell tone="accent" size={40}><Gift className="w-5 h-5" strokeWidth={2} /></IconWell>
          <h2 className="m-0 text-[17px] font-bold">{c.referral}</h2>
        </div>
        <p className="m-0 text-sm text-muted">{code ? c.referralBody : c.noCode}</p>
        {code && (
          <div className="flex items-center gap-2 pt-1" dir="ltr">
            <span className="flex-1 min-w-0 h-12 px-3 rounded-2xl bg-sunk flex items-center justify-center">
              <span className="min-w-0 truncate font-mono font-semibold text-[15px] tracking-[0.06em] text-ink" title={code}>{code}</span>
            </span>
            <Button tone="ink" onClick={handleCopy} className="min-w-[104px]"
              icon={copied ? <Check className="w-4 h-4 text-accent dark:text-on-inv" strokeWidth={2.6} /> : <Copy className="w-4 h-4" strokeWidth={2} />}>
              <span dir={isRtl ? "rtl" : "ltr"}>{copied ? c.copied : c.copy}</span>
            </Button>
          </div>
        )}
      </Card>
    </Screen>
  );
}
