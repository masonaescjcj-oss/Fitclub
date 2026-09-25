import React, { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { Avatar, Card, Label, Screen, Segmented, Toggle, TopBar, cx, num } from "../../components/ui/kit";
import { loadSession } from "../../lib/session";
import { backendOn } from "../../lib/backend/supabase";
import { boards, weekStart } from "../../lib/activity";

// The leaderboard: a podium for the top three, then every athlete in order,
// with your own row on the accent fill. Signed in, it is real: your friends
// (people you share a chat or a list with) or everyone who chose the global
// board, this week or all time, scored on the server from each account's log.

const COPY = {
  en: {
    title: "Athletes Leaderboard", global: "Global", friends: "Friends", you: "You", xp: "XP", days: "days", streak: "streak", board: "Ranking",
    week: "This week", all: "All time", workouts: (k) => (k === 1 ? "1 workout" : `${k} workouts`),
    onBoard: "Show me on the global board", onBoardHint: "Your name, photo and XP; nothing else.",
    loading: "Loading…", failed: "Couldn't load the board. Try again in a moment.",
    lonely: "Chat with people or share a list with them, and they show up here.",
    nobody: "Nobody has joined the global board this week yet.",
  },
  fa: {
    title: "جدول رتبه‌بندی ورزشکاران", global: "جهانی", friends: "دوستان", you: "شما", xp: "امتیاز", days: "روز", streak: "استریک", board: "رتبه‌بندی",
    week: "این هفته", all: "همه‌ی زمان‌ها", workouts: (k) => `${k.toLocaleString("fa-IR")} تمرین`,
    onBoard: "من را در جدول جهانی نشان بده", onBoardHint: "فقط نام، عکس و امتیازت؛ نه چیز دیگر.",
    loading: "در حال بارگذاری…", failed: "جدول بارگذاری نشد. کمی بعد دوباره سر بزن.",
    lonely: "با دیگران چت کن یا چک‌لیستی را با آن‌ها به اشتراک بگذار تا اینجا دیده شوند.",
    nobody: "هنوز کسی این هفته به جدول جهانی نپیوسته است.",
  },
};

/** The stand-in board of the demo build. */
function demoRows(me) {
  return [
    { rank: 1, name: "David Kim", xp: 3850, streak: 42 },
    { rank: 2, name: "Sarah Jenkins", xp: 3420, streak: 35 },
    { rank: 3, name: "Reza Ahmadi", xp: 3100, streak: 29 },
    { rank: 4, name: me, xp: 2850, streak: 14, me: true },
    { rank: 5, name: "Emma Watson", xp: 2600, streak: 21 },
  ];
}

const fromServer = (r) => ({ rank: r.rank, name: r.user?.name || "FitClub", photo: r.user?.photo || null, xp: r.xp, streak: r.streak, workouts: r.workouts, me: !!r.me, id: r.user?.id });

export default function MyRankPage({ onBack, isRtl }) {
  const real = backendOn && !!loadSession().userId;
  const [scope, setScope] = useState(real ? "friends" : "global");
  const [period, setPeriod] = useState("week");
  const [state, setState] = useState({ rows: real ? null : demoRows(loadSession().name || "Isaac"), onBoard: false, error: false });
  const c = COPY[isRtl ? "fa" : "en"];
  const n = (v) => num(v, isRtl);
  const myPhoto = loadSession().avatarUrl || null;

  useEffect(() => {
    if (!real) return undefined;
    let live = true;
    setState((s) => ({ ...s, rows: null, error: false }));
    boards.leaderboard(scope, period === "week" ? weekStart(isRtl) : null)
      .then((r) => { if (live) setState({ rows: (r.rows || []).map(fromServer), onBoard: !!r.onBoard, error: false }); })
      .catch(() => { if (live) setState((s) => ({ ...s, rows: [], error: true })); });
    return () => { live = false; };
  }, [real, scope, period, isRtl]);

  const toggleBoard = (on) => {
    setState((s) => ({ ...s, onBoard: on }));
    boards.setOnBoard(on).then(() => boards.leaderboard("global", period === "week" ? weekStart(isRtl) : null))
      .then((r) => setState({ rows: (r.rows || []).map(fromServer), onBoard: !!r.onBoard, error: false }))
      .catch(() => setState((s) => ({ ...s, onBoard: !on })));
  };

  const rows = state.rows || [];
  const pts = (p) => `${n(p.xp.toLocaleString("en-US"))} ${c.xp}`;
  const podium = rows.length >= 3 ? [rows[1], rows[0], rows[2]] : [];
  const others = rows.filter((r) => !r.me);

  return (
    <Screen isRtl={isRtl}>
      <TopBar isRtl={isRtl} onBack={onBack} title={c.title} />

      <Segmented value={scope} onChange={setScope} options={[{ id: "friends", label: c.friends }, { id: "global", label: c.global }]} />
      {real && (
        <Segmented line value={period} onChange={setPeriod} options={[{ id: "week", label: c.week }, { id: "all", label: c.all }]} />
      )}

      {real && scope === "global" && (
        <Card className="flex items-center justify-between gap-3 !py-3">
          <span className="flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold">{c.onBoard}</span>
            <span className="text-[13px] text-muted">{c.onBoardHint}</span>
          </span>
          <Toggle checked={state.onBoard} onChange={toggleBoard} label={c.onBoard} />
        </Card>
      )}

      {state.rows === null ? (
        <p className="m-0 px-1 text-sm text-muted" role="status">{c.loading}</p>
      ) : state.error ? (
        <p className="m-0 px-1 text-sm text-muted" role="alert">{c.failed}</p>
      ) : (
        <>
          {podium.length > 0 && (
            <Card className="flex justify-center items-end gap-3 pt-6 pb-0 overflow-hidden" aria-label={c.board}>
              {podium.map((p) => {
                const top = p.rank === 1 && p === rows[0];
                return (
                  <div key={`${p.rank}-${p.name}`} className="flex-1 max-w-[104px] flex flex-col items-center">
                    {top && <Crown className="w-6 h-6 mb-1 text-ink" strokeWidth={2} />}
                    <Avatar name={p.name} src={p.me ? p.photo || myPhoto : p.photo} size={top ? 64 : 52} />
                    <span className="mt-1.5 text-[13px] font-bold truncate max-w-full">{p.me ? c.you : p.name.split(" ")[0]}</span>
                    <span className="text-[11px] text-muted">{pts(p)}</span>
                    <span className={cx("mt-2 w-full rounded-t-2xl flex items-start justify-center pt-2.5 font-display font-extrabold tracking-[-0.03em]",
                      top ? "h-28 text-[28px] bg-jet text-accent dark:ring-1 dark:ring-inset dark:ring-line" : p === rows[1] ? "h-20 text-[22px] bg-sunk" : "h-16 text-[22px] bg-sunk")}>
                      {n(p.rank)}
                    </span>
                  </div>
                );
              })}
            </Card>
          )}

          <Label as="h2" className="m-0 mt-2 px-1">{scope === "global" ? c.global : c.friends}</Label>
          <Card pad={false} className="p-2">
            <ol className="m-0 p-0 list-none flex flex-col gap-1">
              {rows.map((item) => (
                <li key={item.id || `${item.rank}-${item.name}`}
                  className={cx("h-[60px] flex items-center gap-3 px-2.5 rounded-2xl", item.me && "bg-accent text-on-accent")}>
                  <span className="w-5 font-mono text-[13px] font-semibold text-center">{n(item.rank)}</span>
                  <Avatar name={item.name} src={item.me ? item.photo || myPhoto : item.photo} size={40} tone={item.me ? "bg-jet" : undefined} />
                  <span className="flex-1 min-w-0 flex flex-col">
                    <span className="text-[15px] font-semibold truncate">{item.me ? `${item.name} (${c.you})` : item.name}</span>
                    <span className={cx("text-xs", item.me ? "text-on-accent/75" : "text-muted")}>
                      {n(item.streak)} {c.days} {c.streak}{real && item.workouts !== undefined ? ` · ${c.workouts(item.workouts)}` : ""}
                    </span>
                  </span>
                  <span className="text-sm font-bold whitespace-nowrap">{pts(item)}</span>
                </li>
              ))}
            </ol>
          </Card>
          {real && others.length === 0 && (
            <p className="m-0 px-1 text-sm text-muted">{scope === "global" ? c.nobody : c.lonely}</p>
          )}
        </>
      )}
    </Screen>
  );
}
