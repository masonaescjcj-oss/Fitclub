import React from "react";
import { Check as CheckIcon, Dumbbell, Trophy } from "lucide-react";
import { Card, Empty, IconWell, List, Metric, Row, Screen, TopBar, num } from "../../components/ui/kit";
import { useTrainingStore } from "../../lib/training/trainingContext";
import { useTrainingT } from "../../lib/training/trainingI18n";
import { sessionSetsDone, sessionVolume } from "../../lib/training/programModel";

/** Every logged workout, newest first — read straight from the training store. */
export default function HistoryPage({ onBack, isRtl }) {
  const t = useTrainingT(isRtl);
  const { sessions, stats } = useTrainingStore();
  const list = [...sessions].filter((s) => s.finishedAt).sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
  const n = (v) => num(v, isRtl);
  const locale = isRtl ? "fa-IR" : "en-GB";
  const sep = isRtl ? "، " : " · ";

  const when = (iso) => {
    const d = new Date(iso);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((today - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
    const time = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    if (diff === 0) return `${t.today}${isRtl ? "، " : ", "}${time}`;
    if (diff === 1) return `${t.yesterday}${isRtl ? "، " : ", "}${time}`;
    return d.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <Screen isRtl={isRtl}>
      <TopBar isRtl={isRtl} onBack={onBack} title={isRtl ? "تاریخچه تمرین‌ها" : "Workout History"} />

      {list.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <Card className="!p-3.5"><Metric size={26} value={n(stats.count)} label={t.workouts} /></Card>
          <Card className="!p-3.5"><Metric size={26} value={n(stats.minutes)} label={t.min} /></Card>
          <Card className="!p-3.5">
            <Metric size={26} value={n((Math.round(stats.volume / 100) / 10).toLocaleString("en-US"))} label={isRtl ? "تن حجم" : "t volume"} />
          </Card>
        </div>
      )}

      {list.length === 0 && (
        <Card><Empty icon={<Dumbbell className="w-6 h-6" strokeWidth={2} />} title={t.history} body={t.noSessions} /></Card>
      )}

      {list.length > 0 && (
        <List>
          {list.map((s) => (
            <Row key={s.id} isRtl={isRtl}
              icon={<IconWell tone="sunk" size={40}><Dumbbell className="w-5 h-5" strokeWidth={2} /></IconWell>}
              title={(isRtl && s.dayTitleFa) || s.dayTitle}
              subtitle={(
                <>
                  <span className="block truncate">{s.programName}</span>
                  <span className="block">
                    {[
                      when(s.startedAt),
                      `${n(Math.round(s.durationSec / 60))} ${t.min}`,
                      `${n(Math.round(sessionVolume(s)).toLocaleString("en-US"))} ${t.kg}`,
                      `${n(sessionSetsDone(s))} ${t.sets}`,
                    ].join(sep)}
                  </span>
                </>
              )}
              right={s.prs?.length > 0 ? (
                <span className="h-7 px-2.5 rounded-full bg-jet text-accent inline-flex items-center gap-1 text-xs font-bold dark:ring-1 dark:ring-inset dark:ring-line">
                  <Trophy className="w-3.5 h-3.5" strokeWidth={2.2} />{n(s.prs.length)}
                </span>
              ) : (
                <span className="w-7 h-7 rounded-full bg-sunk text-ink inline-flex items-center justify-center" aria-hidden="true">
                  <CheckIcon className="w-4 h-4" strokeWidth={2.6} />
                </span>
              )} />
          ))}
        </List>
      )}
    </Screen>
  );
}
