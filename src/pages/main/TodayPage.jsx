import React, { useMemo } from "react";
import { Bell, ChevronLeft, ChevronRight, Clock, Flame, Layers, Play } from "lucide-react";
import {
  Avatar, Badge, Card, Check, CtaButton, IconButton, IconWell, Label, Meter, Ring, Screen, Tag, cx, num,
} from "../../components/ui/kit";
import { FlameIcon, SparkIcon } from "../../components/ui/icons";
import { useTrainingStore } from "../../lib/training/trainingContext";
import { useNutritionStore } from "../../lib/nutrition/nutritionContext";
import { useChecklistStore } from "../../lib/checklistContext";
import { useCoachStore } from "../../lib/coach/coachContext";
import { exerciseName } from "../../lib/training/exercises";
import { estimateCalories } from "../../lib/training/programModel";
import { itemDone, localized, overallBest, overallStreak, progressOf, ymd } from "../../lib/checklistModel";
import { loadSession } from "../../lib/session";

// Today: one screen that answers "what do I do now?" — the session to
// train, fuel left, the streak to protect, the checklist, and a line from
// the coach. Every card opens the tab or screen that owns it.

const COPY = {
  en: {
    morning: "Morning", afternoon: "Afternoon", evening: "Evening",
    session: "Today's session", week: (w, n) => `Week ${w} of ${n}`, min: "min", exercises: "exercises", kcal: "kcal",
    start: "Start workout", resume: "Resume workout", doneToday: "Done today", nextUp: "Next up",
    rest: "Rest day", restBody: "Recovery is training too. Walk, stretch, sleep well.", noProgram: "Pick a program",
    noProgramBody: "Choose a split in Train and today's session shows up here.", openTrain: "Open Train",
    fuel: "Fuel", kcalLeft: "kcal left", over: "kcal over", protein: "Protein",
    streak: "Streak", days: "days", best: (b, gap, n) => (gap > 0 ? `Best run ${n(b)} · ${n(gap)} to go` : "Your best run yet"),
    checklist: "Checklist", of: (d, n) => `${d} of ${n}`, allDone: "All done for today", empty: "Nothing on your list yet.",
    coach: "Coach", ask: "Ask coach", notifications: (n) => (n ? `Notifications, ${n} new` : "Notifications"), profile: "Profile",
    thisWeek: "This week",
  },
  fa: {
    morning: "صبح بخیر", afternoon: "ظهر بخیر", evening: "عصر بخیر",
    session: "جلسه‌ی امروز", week: (w, n) => `هفته‌ی ${w} از ${n}`, min: "دقیقه", exercises: "حرکت", kcal: "کالری",
    start: "شروع تمرین", resume: "ادامه‌ی تمرین", doneToday: "امروز انجام شد", nextUp: "جلسه‌ی بعد",
    rest: "روز استراحت", restBody: "ریکاوری هم بخشی از تمرین است. پیاده‌روی، کشش، خواب کافی.", noProgram: "یک برنامه انتخاب کن",
    noProgramBody: "در بخش تمرین یک برنامه انتخاب کن تا جلسه‌ی امروز اینجا بیاید.", openTrain: "برو به تمرین",
    fuel: "تغذیه", kcalLeft: "کالری مانده", over: "کالری اضافه", protein: "پروتئین",
    streak: "استریک", days: "روز", best: (b, gap, n) => (gap > 0 ? `بهترین رکورد ${n(b)}، ${n(gap)} روز مانده` : "بهترین رکوردت تا امروز"),
    checklist: "چک‌لیست", of: (d, n) => `${d} از ${n}`, allDone: "همه‌ی کارهای امروز انجام شد", empty: "هنوز چیزی در لیستت نیست.",
    coach: "مربی", ask: "از مربی بپرس", notifications: (n) => (n ? `اعلان‌ها، ${n} جدید` : "اعلان‌ها"), profile: "پروفایل",
    thisWeek: "این هفته",
  },
};

const greeting = (c, hour) => (hour < 12 ? c.morning : hour < 18 ? c.afternoon : c.evening);

/** The seven days of this week, Monday-first in English and Saturday-first in Persian. */
function weekDays(isRtl, now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const firstDay = isRtl ? 6 : 1; // Saturday : Monday
  start.setDate(start.getDate() - ((start.getDay() - firstDay + 7) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

const fmt = (d, isRtl, opts) =>
  new Intl.DateTimeFormat(isRtl ? "fa-IR-u-ca-persian" : "en-GB", opts).format(d);

/**
 * The session to train today: resume an open one, else the workout day after
 * the last one finished in the active program, wrapping round the split.
 */
function todaysSession(store) {
  const program = store.activeProgram;
  if (!program) return { kind: "none" };
  const workouts = program.days.filter((d) => d.type !== "rest" && d.exercises.length);
  if (!workouts.length) return { kind: "none" };
  const finished = store.sessions.filter((s) => s.finishedAt && s.programId === program.id)
    .sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));
  const last = finished[finished.length - 1];
  const lastIndex = last ? workouts.findIndex((d) => d.id === last.dayId) : -1;
  const next = workouts[(lastIndex + 1) % workouts.length];
  const doneToday = !!last && ymd(new Date(last.finishedAt)) === ymd(new Date());
  const weekNo = Math.min(Math.floor((Date.now() - new Date(program.createdAt).getTime()) / (7 * 86400000)) + 1, program.weeks || 1);
  return { kind: store.draft ? "draft" : doneToday ? "done" : "next", program, day: next, weekNo, last };
}

export default function TodayPage({ isRtl, alerts = 0, onOpen, onTab }) {
  const c = COPY[isRtl ? "fa" : "en"];
  const training = useTrainingStore();
  const nutrition = useNutritionStore();
  const checklist = useChecklistStore();
  const coach = useCoachStore();
  const session = loadSession();
  const name = session.name || (isRtl ? "ورزشکار" : "Athlete");
  const now = new Date();
  const n = (v) => num(v, isRtl);
  const Chevron = isRtl ? ChevronLeft : ChevronRight;

  const plan = useMemo(() => todaysSession(training), [training]);

  // A day counts as trained when a session was finished on it.
  const trainedDays = useMemo(
    () => new Set(training.sessions.filter((s) => s.finishedAt).map((s) => ymd(new Date(s.finishedAt)))),
    [training.sessions]
  );
  const week = weekDays(isRtl, now);
  const todayKey = ymd(now);

  const kcalTarget = nutrition.targets?.kcal || 0;
  const kcalLeft = Math.round(kcalTarget - (nutrition.totals?.kcal || 0));

  const lists = checklist.lists || [];
  const streak = overallStreak(lists);
  const best = Math.max(overallBest(lists), streak);
  // The checklist on Today is the athlete's own daily list, else the first one.
  const list = lists.find((l) => l.type === "personal" && l.reset?.mode === "daily") || lists[0] || null;
  const progress = list ? progressOf(list) : { done: 0, total: 0 };
  // Open items first, then the finished ones, three at most.
  const items = list
    ? [...list.items].sort((a, b) => Number(itemDone(a, list)) - Number(itemDone(b, list))).slice(0, 3)
    : [];

  const lastCoach = [...(coach.messages || [])].reverse().find((m) => m.role === "assistant" && m.text);
  const coachLine = lastCoach ? lastCoach.text.replace(/[#*_`>]/g, "").trim() : coachTip({ c, isRtl, plan, nutrition, streak, best });

  const startWorkout = () => {
    if (plan.kind === "next" || plan.kind === "done") training.startSession(plan.program.id, plan.day.id);
    onTab("train");
  };

  const day = plan.day;
  const exercises = day?.exercises || [];
  const minutes = exercises.length * 8;
  const sets = exercises.reduce((a, e) => a + (e.sets || 0), 0);
  const kcal = estimateCalories(minutes * 60, sets);
  const dayTitle = day ? (isRtl && day.titleFa ? day.titleFa : day.title) : "";

  return (
    <Screen isRtl={isRtl} tabbed>
      <header className="flex items-end justify-between gap-3 pt-3">
        <div className="flex flex-col gap-1.5 min-w-0">
          <Label>{isRtl ? fmt(now, true, { weekday: "long", day: "numeric", month: "long" })
            : `${fmt(now, false, { weekday: "short" })} · ${now.getDate()} ${now.toLocaleDateString("en-US", { month: "short" })}`}</Label>
          <h1 className="m-0 font-display font-extrabold text-[32px] leading-none tracking-[-0.035em] line-clamp-2 break-words">
            {isRtl ? `${greeting(c, now.getHours())}، ${name}` : `${greeting(c, now.getHours())}, ${name}`}
          </h1>
        </div>
        <div className="flex gap-2 shrink-0">
          <IconButton label={c.notifications(alerts)} onClick={() => onOpen("notifications")}
            badge={alerts > 0 ? <Badge /> : null}>
            <Bell className="w-5 h-5" strokeWidth={2} />
          </IconButton>
          <button type="button" aria-label={c.profile} onClick={() => onOpen("profile")} className="rounded-full border-0 p-0 bg-transparent cursor-pointer">
            <Avatar name={name} tone="bg-sand" />
          </button>
        </div>
      </header>

      <ol aria-label={c.thisWeek} className="m-0 mt-1 p-0 list-none flex justify-between">
        {week.map((d) => {
          const key = ymd(d);
          const isToday = key === todayKey;
          const past = key < todayKey;
          const trained = trainedDays.has(key);
          return (
            <li key={key} aria-current={isToday ? "date" : undefined}
              className={cx("w-11 h-[60px] rounded-[18px] flex flex-col items-center justify-center gap-1",
                isToday && "bg-inv text-on-inv")}>
              <span className={cx("text-xs", isToday ? "text-on-inv/70" : "text-muted")}>
                {fmt(d, isRtl, { weekday: "narrow" })}
              </span>
              <span className={cx("text-base", isToday ? "font-bold" : "font-semibold")}>{fmt(d, isRtl, { day: "numeric" })}</span>
              <span className={cx("w-[5px] h-[5px] rounded-full",
                isToday ? (trained ? "bg-accent dark:bg-jet" : "ring-[1.5px] ring-inset ring-accent dark:ring-jet") :
                  trained ? "bg-inv" : past ? "ring-[1.5px] ring-inset ring-faint" : "")} />
            </li>
          );
        })}
      </ol>

      <SessionCard c={c} n={n} isRtl={isRtl} plan={plan} dayTitle={dayTitle} exercises={exercises}
        minutes={minutes} kcal={kcal} onStart={startWorkout} onTrain={() => onTab("train")} />

      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" onClick={() => onTab("fuel")}
          className="h-[168px] rounded-3xl bg-card text-ink p-4 flex flex-col justify-between text-start border-0 cursor-pointer active:scale-[0.98] transition-transform">
          <span className="w-full flex justify-between items-center"><Label>{c.fuel}</Label><Chevron className="w-4 h-4 text-muted" /></span>
          <span className="flex items-center gap-3">
            <Ring value={kcalTarget ? (nutrition.totals?.kcal || 0) / kcalTarget : 0} size={44} stroke={7} />
            <span className="flex flex-col gap-0.5">
              <span className="font-display font-extrabold text-[28px] leading-none tracking-[-0.03em]">{n(Math.abs(kcalLeft).toLocaleString("en-US"))}</span>
              <span className="text-xs text-muted">{kcalLeft >= 0 ? c.kcalLeft : c.over}</span>
            </span>
          </span>
          <Meter label={c.protein} value={nutrition.totals?.protein || 0} target={nutrition.targets?.protein || 0} unit={isRtl ? "گرم" : "g"} isRtl={isRtl} />
        </button>

        <button type="button" onClick={() => onOpen("streakDetail")}
          className="h-[168px] rounded-3xl bg-accent text-on-accent p-4 flex flex-col justify-between text-start border-0 cursor-pointer active:scale-[0.98] transition-transform">
          <span className="w-full flex justify-between items-center">
            <Label className="!text-on-accent font-semibold">{c.streak}</Label><FlameIcon size={20} />
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="font-display font-extrabold text-[64px] leading-[0.85] tracking-[-0.05em]">{n(streak)}</span>
            <span className="text-[15px] font-semibold">{c.days}</span>
          </span>
          <span className="text-[13px] font-medium">{c.best(best, best - streak, n)}</span>
        </button>
      </div>

      <Card pad={false} className="px-4 pt-1 pb-2" aria-labelledby="today-check">
        <button type="button" onClick={() => onOpen("checklist")}
          className="w-full h-12 flex items-center justify-between bg-transparent border-0 p-0 cursor-pointer text-ink">
          <h2 id="today-check" className="m-0 text-[17px] font-bold">{c.checklist}</h2>
          <span className="inline-flex items-center gap-1.5 text-sm text-muted">
            {progress.total ? c.of(n(progress.done), n(progress.total)) : ""}<Chevron className="w-4 h-4" />
          </span>
        </button>
        {items.length === 0 && <p className="m-0 py-3 border-t border-hair text-sm text-muted">{c.empty}</p>}
        {items.map((item) => {
          const done = itemDone(item, list);
          const text = localized(item, isRtl, "text");
          return (
            <div key={item.id} className="flex items-center gap-3 h-[52px] border-t border-hair">
              <Check checked={done} label={text} onToggle={() => checklist.toggleItem(list.id, item.id)} />
              <span className={cx("flex-1 min-w-0 truncate text-[15px]", done ? "text-muted line-through" : "font-medium")}>{text}</span>
              {item.due && !done && <span className="text-xs text-muted shrink-0">{fmt(new Date(`${item.due}T00:00:00`), isRtl, { day: "numeric", month: "short" })}</span>}
            </div>
          );
        })}
        {progress.total > 0 && progress.done === progress.total && (
          <p className="m-0 py-2 text-[13px] font-semibold text-muted">{c.allDone}</p>
        )}
      </Card>

      <Card tone="coach" className="flex gap-3 items-start" aria-label={c.coach}>
        <IconWell tone="inv" size={36} className="!text-coach !ring-0"><SparkIcon size={18} /></IconWell>
        <div className="flex flex-col gap-1.5 min-w-0">
          <p className="m-0 text-sm leading-[1.45] line-clamp-4"><span className="font-bold">{c.coach}: </span>{coachLine}</p>
          <button type="button" onClick={() => onTab("coach")}
            className="self-start h-7 inline-flex items-center gap-1.5 text-sm font-bold text-on-accent bg-transparent border-0 p-0 cursor-pointer">
            {c.ask}<Chevron className="w-4 h-4" strokeWidth={2.2} />
          </button>
        </div>
      </Card>
    </Screen>
  );
}

function SessionCard({ c, n, isRtl, plan, dayTitle, exercises, minutes, kcal, onStart, onTrain }) {
  if (plan.kind === "none") {
    return (
      <Card tone="hero" className="flex flex-col gap-3" aria-label={c.session}>
        <Label className="!text-hero-muted">{c.session}</Label>
        <h2 className="m-0 font-display font-extrabold text-[34px] leading-[0.95] tracking-[-0.04em]">{c.noProgram}</h2>
        <p className="m-0 text-sm text-hero-muted">{c.noProgramBody}</p>
        <CtaButton tone="accent" isRtl={isRtl} onClick={onTrain} className="mt-1">{c.openTrain}</CtaButton>
      </Card>
    );
  }
  const shown = exercises.slice(0, 3);
  const more = exercises.length - shown.length;
  return (
    <Card tone="hero" className="flex flex-col" aria-label={c.session}>
      <div className="flex justify-between items-center gap-2">
        <Label className="!text-hero-muted">{plan.kind === "done" ? c.nextUp : c.session}</Label>
        <Tag tone="hero" className="font-semibold">
          {plan.kind === "done" ? c.doneToday : c.week(n(plan.weekNo), n(plan.program.weeks || 1))}
        </Tag>
      </div>
      <h2 className="m-0 mt-3.5 font-display font-extrabold text-[42px] leading-[0.95] tracking-[-0.04em] break-words">{dayTitle}</h2>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-hero-fg/85">
        <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4" />{n(minutes)} {c.min}</span>
        <span className="inline-flex items-center gap-1.5"><Layers className="w-4 h-4" />{n(exercises.length)} {c.exercises}</span>
        <span className="inline-flex items-center gap-1.5"><Flame className="w-4 h-4" />~{n(kcal)} {c.kcal}</span>
      </div>
      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {shown.map((e) => (
          <Tag key={e.id} tone="hero" className="font-normal">
            {exerciseName(e.exerciseId, isRtl)}{e.weight ? ` ${n(e.weight)} ${isRtl ? "کیلو" : "kg"}` : ""}
          </Tag>
        ))}
        {more > 0 && <Tag tone="hero" className="font-normal">+{n(more)}</Tag>}
      </div>
      <CtaButton tone="accent" isRtl={isRtl} onClick={onStart} className="mt-[18px]">
        {plan.kind === "draft" ? (<span className="inline-flex items-center gap-2"><Play className="w-4 h-4" />{c.resume}</span>) : c.start}
      </CtaButton>
    </Card>
  );
}

/** A line from the coach when there is no conversation yet, drawn from today's numbers. */
function coachTip({ isRtl, plan, nutrition, streak, best }) {
  const proteinLeft = Math.round((nutrition.targets?.protein || 0) - (nutrition.totals?.protein || 0));
  const n = (v) => num(v, isRtl);
  if (plan.kind === "draft") {
    return isRtl ? "تمرینت هنوز باز است. از همان‌جا که ماندی ادامه بده." : "Your workout is still open. Pick it up where you left off.";
  }
  if (proteinLeft > 40) {
    return isRtl
      ? `${n(proteinLeft)} گرم پروتئین تا هدف امروز مانده. یک وعده مرغ یا ماهی بیشترش را پوشش می‌دهد.`
      : `${proteinLeft} g of protein to go today. One chicken or fish meal covers most of it.`;
  }
  if (streak > 0 && best - streak > 0 && best - streak <= 7) {
    return isRtl
      ? `${n(best - streak)} روز تا شکستن بهترین رکوردت مانده. چک‌لیست امروز را کامل کن.`
      : `${best - streak} days from your best run. Finish today's checklist to keep it going.`;
  }
  return isRtl ? "هر سؤالی درباره‌ی تمرین یا تغذیه داری بپرس. دفتر غذا و تمرین‌هایت را می‌بینم." : "Ask me anything about training or food. I can see your diary and your log.";
}
