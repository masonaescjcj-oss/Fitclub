import React from "react";
import { Trophy } from "lucide-react";
import { Card, IconWell, Label, List, Metric, Row, Screen, TopBar, cx, num } from "../../components/ui/kit";
import { useTrainingStore } from "../../lib/training/trainingContext";
import { useTrainingT } from "../../lib/training/trainingI18n";
import { exerciseName } from "../../lib/training/exercises";

/** Totals and weekly volume, computed from logged sessions. */
export default function WorkoutReportPage({ onBack, isRtl }) {
  const t = useTrainingT(isRtl);
  const { stats, weekly, sessions } = useTrainingStore();
  const n = (v) => num(v, isRtl);
  const maxVol = Math.max(...weekly.map((w) => w.volume), 1);
  const [cur, prev] = [weekly[weekly.length - 1]?.volume || 0, weekly[weekly.length - 2]?.volume || 0];
  const delta = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;
  const prs = [...sessions].sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1)).flatMap((s) => s.prs || []).slice(0, 6);
  const kcal = isRtl ? "کالری" : "kcal";

  return (
    <Screen isRtl={isRtl}>
      <TopBar isRtl={isRtl} onBack={onBack} title={isRtl ? "گزارش پیشرفت" : "Workout Analytics"} />

      <Card tone="hero" className="flex flex-col gap-4">
        <Label className="!text-hero-muted">{t.totalVolume}</Label>
        <span className="flex items-baseline gap-2">
          <span className="font-display font-extrabold text-[56px] leading-[0.85] tracking-[-0.05em]">{n(Math.round(stats.volume).toLocaleString("en-US"))}</span>
          <span className="text-base font-semibold text-hero-muted">{t.kg}</span>
        </span>
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-hero-2">
          <Metric size={24} value={n(stats.count)} label={t.workouts} labelClass="text-hero-muted" />
          <Metric size={24} value={<>{n(stats.calories.toLocaleString("en-US"))} <span className="text-sm font-semibold text-hero-muted">{kcal}</span></>}
            label={t.totalBurn} labelClass="text-hero-muted" />
        </div>
      </Card>

      <Card className="flex flex-col gap-4" aria-labelledby="report-weekly">
        <div className="flex justify-between items-center gap-2">
          <h2 id="report-weekly" className="m-0 text-base font-bold">{t.weeklyVolume}</h2>
          {delta !== null && (
            <span dir="ltr" className={cx("h-[26px] px-2.5 rounded-full inline-flex items-center text-xs font-bold",
              delta >= 0 ? "bg-jet text-accent dark:ring-1 dark:ring-inset dark:ring-line" : "bg-alert/15 text-alert")}>
              {delta >= 0 ? "+" : "−"}{n(Math.abs(delta))}%
            </span>
          )}
        </div>
        <div className="flex items-end justify-around gap-3 h-36" dir="ltr">
          {weekly.map((w, i) => {
            const last = i === weekly.length - 1;
            return (
              <div key={i} className="flex-1 max-w-[56px] h-full flex flex-col items-center justify-end gap-2">
                <span className="text-[11px] font-semibold text-muted">{w.volume ? n((Math.round(w.volume / 100) / 10).toLocaleString("en-US")) : ""}</span>
                <div className="w-full flex-1 flex items-end rounded-xl bg-sunk overflow-hidden">
                  <div className={cx("w-full rounded-xl transition-all duration-500", last ? "bg-inv" : "bg-inv/30")}
                    style={{ height: `${Math.max((w.volume / maxVol) * 100, w.volume ? 6 : 0)}%` }} />
                </div>
                <span className={cx("text-[11px]", last ? "font-bold text-ink" : "text-muted")}>
                  {w.from.toLocaleDateString(isRtl ? "fa-IR" : "en-GB", { month: "numeric", day: "numeric" })}
                </span>
              </div>
            );
          })}
        </div>
        <span className="text-xs text-muted">{isRtl ? "تن در هفته" : "tonnes per week"}</span>
      </Card>

      {prs.length > 0 && (
        <>
          <Label as="h2" className="m-0 mt-2 px-1">{t.personalRecords}</Label>
          <List>
            {prs.map((pr, i) => (
              <Row key={i} isRtl={isRtl}
                icon={<IconWell tone="inv" size={36}><Trophy className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>}
                title={exerciseName(pr.exerciseId, isRtl)}
                right={<span className="font-semibold text-ink" dir="ltr">{pr.kind === "first" ? t.prFirst : `${n(pr.prev)} → ${n(pr.value)} ${t.kg}`}</span>} />
            ))}
          </List>
        </>
      )}
    </Screen>
  );
}
