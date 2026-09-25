import React from "react";
import { Calendar, Check as CheckIcon, Trophy } from "lucide-react";
import { Card, IconWell, Label, List, Row, Screen, TopBar, cx, initials, num } from "../../components/ui/kit";
import { FlameIcon } from "../../components/ui/icons";
import { useChecklistStore } from "../../lib/checklistContext";
import { historyByDate, localized, overallBest, overallStreak, topStreakList, ymd } from "../../lib/checklistModel";
import { useChecklistT } from "../../lib/checklistI18n";

// Streak: the number, this week's days, the milestones on the way, the
// 30-day grid from the checklist history, and every list's own run.

const COPY = {
  en: {
    title: "Streak & Habits", current: "Current streak", dayStreak: "Day streak",
    bestLine: (b, gap, n) => (gap > 0 ? `Your longest run is ${n(b)} days. ${n(gap)} more to beat it.` : b > 0 ? "This is your longest run yet." : ""),
    thisWeek: "This week", today: "Today", milestones: "Milestones",
    last30: "Last 30 days", allDone: "All done", partial: "Partial", none: "No activity",
    bestStreak: "Best streak", perfectDays: "Perfect days", days: "days",
    rank: "My Rank", rankSub: "Where you stand on the leaderboard", history: "History", historySub: "Every workout you've logged",
  },
  fa: {
    title: "جزئیات استریک روزانه", current: "استریک فعلی", dayStreak: "روز متوالی",
    bestLine: (b, gap, n) => (gap > 0 ? `طولانی‌ترین زنجیره‌ات ${n(b)} روز است. ${n(gap)} روز دیگر تا شکستنش.` : b > 0 ? "این طولانی‌ترین زنجیره‌ی تو تا امروز است." : ""),
    thisWeek: "این هفته", today: "امروز", milestones: "نقطه‌های عطف",
    last30: "تقویم فعالیت ۳۰ روز", allDone: "کامل", partial: "ناقص", none: "بدون فعالیت",
    bestStreak: "طولانی‌ترین زنجیره", perfectDays: "روزهای کامل", days: "روز",
    rank: "رتبه‌بندی من", rankSub: "جایگاهت در جدول رتبه‌بندی", history: "تاریخچه کامل", historySub: "همه‌ی تمرین‌هایی که ثبت کردی",
  },
};

const MILESTONES = [7, 14, 30, 60, 100];

/** The seven days of this week, Monday-first in English and Saturday-first in Persian (as on Today). */
function weekDays(isRtl, now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const firstDay = isRtl ? 6 : 1;
  start.setDate(start.getDate() - ((start.getDay() - firstDay + 7) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/** Share of the milestone track to fill: milestones are evenly spaced, the streak sits between two. */
function trackFill(streak) {
  if (streak <= MILESTONES[0]) return 0;
  for (let i = 0; i < MILESTONES.length - 1; i += 1) {
    const [a, b] = [MILESTONES[i], MILESTONES[i + 1]];
    if (streak < b) return (i + (streak - a) / (b - a)) / (MILESTONES.length - 1);
  }
  return 1;
}

export default function StreakDetailPage({ onBack, onGoToRank, onGoToHistory, isRtl }) {
  const t = useChecklistT(isRtl);
  const c = COPY[isRtl ? "fa" : "en"];
  const n = (v) => num(v, isRtl);
  const { lists } = useChecklistStore();

  const currentStreak = overallStreak(lists);
  const longestStreak = overallBest(lists);
  const leader = topStreakList(lists);

  // Only daily lists land on a day grid; weekly and monthly ones sit this out.
  const days = historyByDate(lists, 30);
  const tracked = days.filter((d) => d.tracked);
  const perfectDays = tracked.filter((d) => d.done === d.total).length;
  const byKey = Object.fromEntries(days.map((d) => [ymd(d.date), d]));
  const todayKey = ymd(new Date());
  const week = weekDays(isRtl);
  const fmt = (d, opts) => new Intl.DateTimeFormat(isRtl ? "fa-IR-u-ca-persian" : "en-GB", opts).format(d);

  const best = Math.max(longestStreak, currentStreak);
  const bestLine = c.bestLine(best, best - currentStreak, n);
  const nextMilestone = MILESTONES.find((m) => m > currentStreak);
  const go = (fn) => () => { fn?.(); window.scrollTo(0, 0); };

  return (
    <Screen isRtl={isRtl}>
      <TopBar isRtl={isRtl} onBack={onBack} title={<span className="sr-only">{c.title}</span>} />

      <section aria-label={c.current} className="flex flex-col items-center text-center pt-1.5 pb-1">
        <span className="w-16 h-16 rounded-full bg-accent text-on-accent flex items-center justify-center ring-8 ring-card">
          <FlameIcon size={30} />
        </span>
        <h1 className="m-0 mt-5 font-display font-extrabold text-[140px] leading-[0.82] tracking-[-0.06em] text-ink">{n(currentStreak)}</h1>
        <Label className="mt-3 text-xs">{c.dayStreak}</Label>
        <p className="m-0 mt-2 text-[15px] leading-[1.45] text-muted max-w-[290px]">
          {currentStreak > 0 && leader
            ? <>{bestLine} {t.streakFrom}: <span className="font-semibold text-ink">{localized(leader, isRtl)}</span></>
            : t.noStreakYet}
        </p>
      </section>

      <Card aria-label={c.thisWeek} className="flex justify-between">
        {week.map((d) => {
          const key = ymd(d);
          const day = byKey[key];
          const isToday = key === todayKey;
          const full = day?.tracked && day.done === day.total;
          const past = key < todayKey;
          return (
            <span key={key} className="flex flex-col items-center gap-1.5">
              <span className={cx("w-[38px] h-[38px] rounded-full flex items-center justify-center text-[13px] font-bold",
                isToday ? "bg-accent text-on-accent ring-2 ring-inset ring-jet"
                  : full ? "bg-jet text-accent dark:ring-1 dark:ring-inset dark:ring-line"
                    : past && day?.tracked && day.done > 0 ? "bg-sunk text-ink text-xs"
                      : "ring-[1.5px] ring-inset ring-line")}>
                {isToday
                  ? (day?.tracked ? `${n(day.done)}/${n(day.total)}` : "")
                  : full ? <CheckIcon className="w-4 h-4" strokeWidth={3} />
                    : past && day?.tracked && day.done > 0 ? `${n(day.done)}/${n(day.total)}` : ""}
              </span>
              <span className={cx("text-xs", isToday ? "font-bold text-ink" : "text-muted")}>
                {isToday ? c.today : fmt(d, { weekday: "narrow" })}
              </span>
            </span>
          );
        })}
      </Card>

      <Card className="flex flex-col gap-4 px-[18px] pb-[18px]" aria-labelledby="streak-miles">
        <h2 id="streak-miles" className="m-0 text-base font-bold">{c.milestones}</h2>
        <div className="relative h-14">
          <span aria-hidden="true" className="absolute inset-x-3.5 top-[13px] h-1 rounded-full bg-line" />
          <span aria-hidden="true" className="absolute start-3.5 top-[13px] h-1 rounded-full bg-inv"
            style={{ width: `calc((100% - 28px) * ${trackFill(currentStreak)})` }} />
          <ol className="absolute inset-0 m-0 p-0 list-none flex justify-between">
            {MILESTONES.map((m) => {
              const reached = currentStreak >= m;
              const next = m === nextMilestone;
              return (
                <li key={m} className="flex flex-col items-center gap-2 w-[30px]">
                  <span className={cx("w-[30px] h-[30px] rounded-full flex items-center justify-center",
                    reached ? "bg-jet text-accent dark:ring-1 dark:ring-inset dark:ring-line"
                      : next ? "bg-accent ring-2 ring-inset ring-jet" : "bg-card ring-2 ring-inset ring-line")}>
                    {reached && <CheckIcon className="w-3.5 h-3.5" strokeWidth={3} />}
                  </span>
                  <span className={cx("text-xs", reached || next ? "font-bold text-ink" : "text-muted")}>{n(m)}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </Card>

      <Card className="flex flex-col gap-3" aria-labelledby="streak-30">
        <div className="flex items-center justify-between gap-2">
          <h2 id="streak-30" className="m-0 text-base font-bold">{c.last30}</h2>
          <span className="text-xs text-muted">{t.fromChecklists}</span>
        </div>

        {tracked.length === 0 ? (
          <p className="m-0 py-6 text-center text-sm text-muted">{t.noStreakYet}</p>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {days.map((d) => {
                const full = d.tracked && d.done === d.total;
                const partial = d.tracked && d.done > 0 && !full;
                return (
                  <span key={d.key} title={`${d.date.toLocaleDateString()} ${d.done}/${d.total}`}
                    className={cx("h-9 rounded-xl flex items-center justify-center text-[11px] font-semibold",
                      full ? "bg-jet text-accent dark:ring-1 dark:ring-inset dark:ring-line"
                        : partial ? "bg-accent/40 text-ink" : "bg-sunk text-muted")}>
                    {n(d.date.getDate())}
                  </span>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-jet dark:ring-1 dark:ring-inset dark:ring-line" />{c.allDone}</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-accent/40" />{c.partial}</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-sunk ring-1 ring-inset ring-line" />{c.none}</span>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-hair">
          <span className="flex flex-col gap-1">
            <Label>{c.bestStreak}</Label>
            <span className="font-display font-extrabold text-[22px] leading-none tracking-[-0.02em]">{n(longestStreak)} <span className="text-sm font-semibold text-muted">{c.days}</span></span>
          </span>
          <span className="flex flex-col gap-1">
            <Label>{c.perfectDays}</Label>
            <span className="font-display font-extrabold text-[22px] leading-none tracking-[-0.02em]">{n(perfectDays)} <span className="text-sm font-semibold text-muted">/ {n(tracked.length)}</span></span>
          </span>
        </div>
      </Card>

      {lists.some((l) => l.reset?.mode !== "none") && (
        <>
          <Label as="h2" className="m-0 mt-2 px-1">{t.myLists}</Label>
          <List>
            {lists.filter((l) => l.reset?.mode !== "none").map((l) => {
              const name = localized(l, isRtl);
              return (
                <Row key={l.id} isRtl={isRtl}
                  icon={<IconWell tone="sunk" square size={40} className="text-[13px] font-bold">{initials(name)}</IconWell>}
                  title={name} subtitle={`${t.best} ${n(l.bestStreak || 0)}`}
                  right={(
                    <span className="inline-flex items-center gap-1 text-[15px] font-bold text-ink">
                      <FlameIcon size={16} />{n(l.streak || 0)}
                    </span>
                  )} />
              );
            })}
          </List>
        </>
      )}

      <List>
        <Row isRtl={isRtl} chevron onClick={go(onGoToRank)} title={c.rank} subtitle={c.rankSub}
          icon={<IconWell tone="inv" size={36}><Trophy className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>} />
        <Row isRtl={isRtl} chevron onClick={go(onGoToHistory)} title={c.history} subtitle={c.historySub}
          icon={<IconWell tone="sunk" size={36}><Calendar className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>} />
      </List>
    </Screen>
  );
}
