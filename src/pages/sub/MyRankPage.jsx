import React, { useState } from "react";
import { Crown } from "lucide-react";
import { Avatar, Card, Label, Screen, Segmented, TopBar, cx, num } from "../../components/ui/kit";
import { loadSession } from "../../lib/session";

// The leaderboard: a podium for the top three, then every athlete in order,
// with your own row on the accent fill.

const COPY = {
  en: { title: "Athletes Leaderboard", global: "Global", friends: "Friends", you: "You", xp: "XP", days: "days", streak: "streak", board: "Ranking" },
  fa: { title: "جدول رتبه‌بندی ورزشکاران", global: "جهانی", friends: "دوستان", you: "شما", xp: "امتیاز", days: "روز", streak: "استریک", board: "رتبه‌بندی" },
};

export default function MyRankPage({ onBack, isRtl }) {
  const [tab, setTab] = useState("global");
  const c = COPY[isRtl ? "fa" : "en"];
  const n = (v) => num(v, isRtl);
  const me = loadSession().name || "Isaac";

  const leaderboard = [
    { rank: 1, name: "David Kim", points: 3850, streak: 42, isUser: false },
    { rank: 2, name: "Sarah Jenkins", points: 3420, streak: 35, isUser: false },
    { rank: 3, name: "Reza Ahmadi", points: 3100, streak: 29, isUser: false },
    { rank: 4, name: me, points: 2850, streak: 14, isUser: true },
    { rank: 5, name: "Emma Watson", points: 2600, streak: 21, isUser: false },
  ];
  const pts = (p) => `${n(p.toLocaleString("en-US"))} ${c.xp}`;
  const [first, second, third] = leaderboard;

  return (
    <Screen isRtl={isRtl}>
      <TopBar isRtl={isRtl} onBack={onBack} title={c.title} />

      <Segmented value={tab} onChange={setTab} options={[{ id: "global", label: c.global }, { id: "friends", label: c.friends }]} />

      <Card className="flex justify-center items-end gap-3 pt-6 pb-0 overflow-hidden" aria-label={c.board}>
        {[second, first, third].map((p) => {
          const top = p.rank === 1;
          return (
            <div key={p.rank} className="flex-1 max-w-[104px] flex flex-col items-center">
              {top && <Crown className="w-6 h-6 mb-1 text-ink" strokeWidth={2} />}
              <Avatar name={p.name} size={top ? 64 : 52} />
              <span className="mt-1.5 text-[13px] font-bold truncate max-w-full">{p.name.split(" ")[0]}</span>
              <span className="text-[11px] text-muted">{pts(p.points)}</span>
              <span className={cx("mt-2 w-full rounded-t-2xl flex items-start justify-center pt-2.5 font-display font-extrabold tracking-[-0.03em]",
                top ? "h-28 text-[28px] bg-jet text-accent dark:ring-1 dark:ring-inset dark:ring-line" : p.rank === 2 ? "h-20 text-[22px] bg-sunk" : "h-16 text-[22px] bg-sunk")}>
                {n(p.rank)}
              </span>
            </div>
          );
        })}
      </Card>

      <Label as="h2" className="m-0 mt-2 px-1">{tab === "global" ? c.global : c.friends}</Label>
      <Card pad={false} className="p-2">
        <ol className="m-0 p-0 list-none flex flex-col gap-1">
          {leaderboard.map((item) => (
            <li key={item.rank}
              className={cx("h-[60px] flex items-center gap-3 px-2.5 rounded-2xl", item.isUser && "bg-accent text-on-accent")}>
              <span className="w-5 font-mono text-[13px] font-semibold text-center">{n(item.rank)}</span>
              <Avatar name={item.name} size={40} tone={item.isUser ? "bg-jet" : undefined} />
              <span className="flex-1 min-w-0 flex flex-col">
                <span className="text-[15px] font-semibold truncate">{item.isUser ? `${item.name} (${c.you})` : item.name}</span>
                <span className={cx("text-xs", item.isUser ? "text-on-accent/75" : "text-muted")}>{n(item.streak)} {c.days} {c.streak}</span>
              </span>
              <span className="text-sm font-bold whitespace-nowrap">{pts(item.points)}</span>
            </li>
          ))}
        </ol>
      </Card>
    </Screen>
  );
}
