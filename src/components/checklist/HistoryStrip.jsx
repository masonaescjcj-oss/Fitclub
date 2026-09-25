import React from "react";
import { dateOfPeriodKey, historyCells, ymd } from "../../lib/checklistModel";
import { cx, num } from "../ui/kit";

/**
 * Consistency heatmap, built from the periods already filed in history.
 * A daily list lays out as twelve weeks of days (weekdays down the side, as
 * on the board); weekly, monthly and cycle lists as one row of periods.
 * Darker ink means more of the list was cleared.
 */
const WEEKS = 12;

// Level 0 is a tracked period with nothing ticked; untracked days stay paper.
const LEVELS = ["bg-line", "bg-ink/25", "bg-ink/55", "bg-ink"];

const levelOf = (cell) => {
  if (!cell || cell.total === 0) return -1;
  if (cell.done >= cell.total) return 3;
  if (cell.ratio >= 0.5) return 2;
  if (cell.ratio > 0) return 1;
  return 0;
};

const fmt = (d, isRtl, opts) => new Intl.DateTimeFormat(isRtl ? "fa-IR-u-ca-persian" : "en-GB", opts).format(d);

function Cell({ cell, future, isRtl, t }) {
  const level = levelOf(cell);
  const d = cell ? dateOfPeriodKey(cell.key) : null;
  const title = cell && d
    ? `${fmt(d, isRtl, { day: "numeric", month: "short" })}${t.sep}${num(cell.done, isRtl)}/${num(cell.total, isRtl)}`
    : undefined;
  return (
    <span title={title}
      className={cx("block w-full aspect-square rounded-[4px]",
        future ? "ring-1 ring-inset ring-line" : level < 0 ? "bg-sunk" : LEVELS[level],
        cell?.current && "outline outline-[1.5px] outline-offset-1 outline-ink")} />
  );
}

export default function HistoryStrip({ list, t, isRtl = t?.rtl, max = 24 }) {
  const n = (v) => num(v, isRtl);
  const mode = list.reset?.mode;
  const cells = historyCells(list, mode === "daily" ? Math.max(max, 30) : Math.min(max, WEEKS));
  if (cells.length <= 1) return null;

  const tracked = cells.filter((c) => c.total > 0);
  const cleared = tracked.filter((c) => c.done >= c.total).length;

  let body;
  let title;
  if (mode === "daily") {
    // Twelve week columns ending with the one that holds today.
    const byKey = new Map(cells.map((c) => [c.key, c]));
    const today = dateOfPeriodKey(list.periodKey) || new Date();
    today.setHours(0, 0, 0, 0);
    const firstDay = isRtl ? 6 : 1; // Saturday : Monday, as on Today
    const start = new Date(today);
    start.setDate(today.getDate() - ((today.getDay() - firstDay + 7) % 7) - (WEEKS - 1) * 7);
    const days = Array.from({ length: WEEKS * 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
    const rowLabels = days.slice(0, 7).map((d, i) => (i % 2 === 0 ? fmt(d, isRtl, { weekday: "narrow" }) : ""));
    title = t.lastWeeks(WEEKS, n);
    body = (
      <div className="flex gap-2">
        <div aria-hidden="true" className="grid grid-rows-7 gap-1 text-[10px] leading-none text-muted w-3 shrink-0">
          {rowLabels.map((l, i) => <span key={i} className="flex items-center justify-center">{l}</span>)}
        </div>
        <div role="img" aria-label={t.heatmapLabel}
          className="flex-1 grid grid-rows-7 grid-flow-col gap-1"
          style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))` }}>
          {days.map((d) => {
            const future = d > today;
            return <Cell key={ymd(d)} cell={future ? null : byKey.get(`daily:${ymd(d)}`)} future={future} isRtl={isRtl} t={t} />;
          })}
        </div>
      </div>
    );
  } else {
    title = t.lastPeriods(cells.length, mode, n);
    body = (
      <div role="img" aria-label={t.heatmapLabel} className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))` }}>
        {cells.map((c, i) => <Cell key={`${c.key}-${i}`} cell={c} isRtl={isRtl} t={t} />)}
      </div>
    );
  }

  return (
    <section aria-label={t.lastDays} className="rounded-3xl bg-card p-4 flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="m-0 text-base font-bold text-ink">{title}</h2>
        <span className="text-[13px] text-muted">{t.cleared(cleared, tracked.length, mode, n)}</span>
      </div>
      {body}
      <div className="flex items-center gap-1.5 text-[11px] text-muted">
        <span>{t.less}</span>
        {LEVELS.map((c) => <span key={c} className={cx("w-3 h-3 rounded-[3px]", c)} />)}
        <span>{t.more}</span>
      </div>
    </section>
  );
}
