import React from "react";
import { BookOpen, Dumbbell, ExternalLink, Target } from "lucide-react";
import { Card, IconWell, Label, List, Screen, SectionHead, TopBar, cx } from "../../components/ui/kit";

// Tutorials: a curated shelf of Lift Manual (liftmanual.com) pages, the
// owner's exercise library. Every row opens the page on the site in a new tab.

const SITE = "https://liftmanual.com";
const url = (path) => `${SITE}/${path}/`;

const COPY = {
  en: {
    title: "Tutorials", from: "From liftmanual.com", site: "Lift Manual",
    intro: "Step-by-step visual guides to form, muscles and routines. Everything opens on liftmanual.com.",
    sections: "Browse the site", newTab: "(opens in a new tab)",
  },
  fa: {
    title: "آموزش‌ها", from: "از liftmanual.com", site: "Lift Manual",
    intro: "راهنمای تصویری گام‌به‌گام برای فرم حرکت، عضلات و برنامه‌ها. همه در سایت liftmanual.com باز می‌شوند.",
    sections: "بخش‌های سایت", newTab: "(در برگه‌ی تازه باز می‌شود)",
  },
};

/** The site's own top-level sections. */
const SECTIONS = [
  { path: "strength", en: "Strength workouts", fa: "تمرین‌های قدرتی" },
  { path: "cardio", en: "Cardio exercises", fa: "تمرین‌های هوازی" },
  { path: "stretching", en: "Stretches", fa: "حرکات کششی" },
  { path: "routines", en: "Workout routines", fa: "برنامه‌های تمرینی" },
  { path: "guides", en: "Guides", fa: "راهنماها" },
];

const GROUPS = [
  {
    id: "form", en: "Form basics", fa: "اصول فرم حرکت", icon: Dumbbell,
    links: [
      { path: "barbell-squat", en: "Barbell Squat", fa: "اسکات پشت با هالتر", subEn: "The king of lower-body lifts", subFa: "پادشاه حرکات پایین‌تنه" },
      { path: "barbell-deadlift", en: "Barbell Deadlift", fa: "ددلیفت با هالتر", subEn: "Form, setup and common mistakes", subFa: "فرم، آماده‌سازی و اشتباهات رایج" },
      { path: "barbell-bench-press", en: "Barbell Bench Press", fa: "پرس سینه با هالتر", subEn: "Setup, form and lifting more safely", subFa: "آماده‌سازی، فرم و اجرای ایمن‌تر" },
      { path: "barbell-standing-military-press", en: "Standing Military Press", fa: "پرس سرشانه ایستاده با هالتر", subEn: "The strict overhead press", subFa: "پرس بالای سر بدون کمک پا" },
      { path: "pull-up", en: "Pull-Up", fa: "بارفیکس", subEn: "Build your first rep, then train beyond it", subFa: "اولین تکرار را بساز و از آن فراتر برو" },
      { path: "barbell-bent-over-row", en: "Barbell Bent Over Row", fa: "زیربغل هالتر خم", subEn: "Form, cues and setup", subFa: "فرم، نکته‌های اجرا و آماده‌سازی" },
      { path: "barbell-romanian-deadlift", en: "Barbell Romanian Deadlift", fa: "ددلیفت رومانیایی با هالتر", subEn: "How to hinge with good form", subFa: "لولای لگن با فرم درست" },
      { path: "barbell-hip-thrust", en: "Barbell Hip Thrust", fa: "هیپ تراست با هالتر", subEn: "The glute builder, done right", subFa: "حرکت اصلی باسن، به شکل درست" },
    ],
  },
  {
    id: "muscles", en: "By muscle", fa: "بر اساس عضله", icon: Target,
    links: [
      { path: "muscle/chest", en: "Chest", fa: "سینه" },
      { path: "muscle/back", en: "Back", fa: "پشت" },
      { path: "muscle/glutes", en: "Glutes", fa: "باسن" },
      { path: "muscle/shoulders", en: "Shoulders", fa: "سرشانه" },
      { path: "muscle/abs", en: "Abs", fa: "شکم" },
      { path: "muscle/quadriceps", en: "Quadriceps", fa: "جلوی ران" },
      { path: "muscle/hamstrings", en: "Hamstrings", fa: "پشت ران" },
    ].map((l) => ({ ...l, subEn: "Exercise library", subFa: "کتابخانه‌ی حرکات" })),
  },
  {
    id: "guides", en: "Routines and guides", fa: "برنامه‌ها و راهنماها", icon: BookOpen,
    links: [
      { path: "best-compound-exercises-for-strength", en: "Best compound exercises for strength", fa: "بهترین حرکات چندمفصلی برای قدرت", subEn: "Eight foundational lifts", subFa: "هشت حرکت پایه" },
      { path: "how-to-build-a-stronger-bench-press", en: "How to build a stronger bench press", fa: "چطور پرس سینه را قوی‌تر کنیم", subEn: "Ten exercises with visual guides", subFa: "ده حرکت با راهنمای تصویری" },
      { path: "how-to-do-a-pull-up", en: "How to do a pull-up", fa: "آموزش بارفیکس", subEn: "For beginners and beyond", subFa: "از مبتدی تا پیشرفته" },
      { path: "how-to-grow-your-glutes", en: "How to grow your glutes", fa: "چطور باسن را رشد دهیم", subEn: "A complete hypertrophy guide", subFa: "راهنمای کامل عضله‌سازی" },
      { path: "how-to-get-a-stronger-core", en: "How to get a stronger core", fa: "چطور مرکز بدن را قوی کنیم", subEn: "Exercises with visual guides", subFa: "حرکات با راهنمای تصویری" },
      { path: "best-workouts-for-flexibility", en: "Best workouts for flexibility", fa: "بهترین تمرین‌ها برای انعطاف‌پذیری", subEn: "Ten moves with visual guides", subFa: "ده حرکت با راهنمای تصویری" },
    ],
  },
];

const external = { target: "_blank", rel: "noopener noreferrer" };

/** A list row that is a link to the site. */
function LinkRow({ href, icon, title, subtitle, newTab }) {
  return (
    <li className="list-none">
      <a href={href} {...external}
        className="w-full min-h-[56px] flex items-center gap-3.5 px-4 py-2.5 text-start no-underline text-ink active:bg-sunk transition-colors">
        {icon}
        <span className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="text-[15px] font-semibold leading-snug text-ink">{title}</span>
          {subtitle && <span className="text-[13px] leading-snug text-muted">{subtitle}</span>}
        </span>
        <span className="sr-only">{newTab}</span>
        <ExternalLink aria-hidden="true" className="w-[18px] h-[18px] shrink-0 text-muted" strokeWidth={2} />
      </a>
    </li>
  );
}

export default function TutorialsPage({ onBack, isRtl }) {
  const c = COPY[isRtl ? "fa" : "en"];
  const pick = (o) => (isRtl ? o.fa : o.en);
  const sub = (o) => (isRtl ? o.subFa : o.subEn);

  return (
    <Screen isRtl={isRtl}>
      <TopBar isRtl={isRtl} onBack={onBack} title={c.title} />

      <Card tone="hero" className="flex flex-col gap-3">
        <Label className="!text-hero-muted">{c.from}</Label>
        <a href={`${SITE}/`} {...external} className="self-start no-underline text-hero-fg">
          <h2 className="m-0 font-display font-extrabold text-[34px] leading-[0.95] tracking-[-0.04em]" dir="ltr">{c.site}</h2>
          <span className="sr-only">{c.newTab}</span>
        </a>
        <p className="m-0 text-sm leading-[1.45] text-hero-muted">{c.intro}</p>
        <nav aria-label={c.sections} className="flex flex-wrap gap-1.5 pt-1">
          {SECTIONS.map((s) => (
            <a key={s.path} href={url(s.path)} {...external}
              className={cx("h-9 px-3.5 rounded-full inline-flex items-center gap-1.5 text-[13px] font-semibold no-underline",
                "bg-hero-2 text-hero-fg active:scale-[0.98] transition-transform")}>
              {pick(s)}
              <ExternalLink aria-hidden="true" className="w-3.5 h-3.5 text-hero-muted" strokeWidth={2} />
              <span className="sr-only">{c.newTab}</span>
            </a>
          ))}
        </nav>
      </Card>

      {GROUPS.map(({ icon: Icon, ...g }) => (
        <section key={g.id} className="flex flex-col gap-3" aria-labelledby={`tut-${g.id}`}>
          <SectionHead title={<span id={`tut-${g.id}`}>{pick(g)}</span>} />
          <List>
            {g.links.map((l) => (
              <LinkRow key={l.path} href={url(l.path)} newTab={c.newTab}
                icon={<IconWell tone="sunk" size={40} square><Icon className="w-5 h-5" strokeWidth={2} /></IconWell>}
                title={pick(l)} subtitle={sub(l)} />
            ))}
          </List>
        </section>
      ))}
    </Screen>
  );
}
