import React, { useEffect, useState } from "react";
import { Dumbbell, Footprints, Shield, Users } from "lucide-react";
import { CtaButton, Card, IconWell, Label, List, Row, Screen, Tag, TopBar, num } from "../../components/ui/kit";
import { backendOn } from "../../lib/backend/supabase";
import { loadSession } from "../../lib/session";
import { boards, weekStart } from "../../lib/activity";

// Teams: an invitation on the ink hero, then the clubs by this week's XP.
// Signed in, a team is a group chat: your own groups, then the busiest
// public ones, each scored as its members' XP added up on the server.

const COPY = {
  en: {
    title: "Teams & clubs", join: "Join a Fitness Club!", joinBody: "Compete together with your friends in weekly team challenges.",
    cta: "Join or Create Team", top: "Top Ranked Clubs", athletes: (k) => `${k} Athletes`, club: (k) => `#${k} Club`,
    realBody: "A team is a group chat. Its members' XP this week adds up to the team's.",
    realCta: "Create or find a group", mine: "Your teams this week", topPublic: "Top public groups this week",
    xp: (k) => `${k} XP`, noTeams: "You're not in a group yet. Make one in Club and invite your friends.",
    noTop: "No public group has scored this week yet.", loading: "Loading…", failed: "Couldn't load the teams. Try again in a moment.",
  },
  fa: {
    title: "تیم‌ها و کلوب‌ها", join: "به یک کلوب ورزشی بپیوندید!", joinBody: "با دوستان خود تیم تشکیل دهید و در چالش‌های هفتگی رتبه اول را کسب کنید.",
    cta: "ایجاد یا ورود به کلوب", top: "کلوب‌های برتر این هفته", athletes: (k) => `${k} ورزشکار`, club: (k) => `کلوب #${k}`,
    realBody: "هر گروه چت یک تیم است. امتیاز این هفته‌ی اعضا با هم جمع می‌شود.",
    realCta: "ساختن یا پیدا کردن گروه", mine: "تیم‌های تو در این هفته", topPublic: "گروه‌های عمومی برتر این هفته",
    xp: (k) => `${k} امتیاز`, noTeams: "هنوز عضو هیچ گروهی نیستی. در باشگاه یکی بساز و دوستانت را دعوت کن.",
    noTop: "هنوز هیچ گروه عمومی این هفته امتیازی نگرفته است.", loading: "در حال بارگذاری…", failed: "تیم‌ها بارگذاری نشدند. کمی بعد دوباره سر بزن.",
  },
};

const DEMO_TEAMS = [
  { nameEn: "FitClub Spartans", nameFa: "اسپارتان‌های فیت‌کلاب", members: 128, rank: 1, Icon: Shield },
  { nameEn: "Iron Lifters", nameFa: "وزنه‌برداران آهنین", members: 95, rank: 2, Icon: Dumbbell },
  { nameEn: "Pro Runners Club", nameFa: "باشگاه دونده‌های حرفه‌ای", members: 74, rank: 3, Icon: Footprints },
];

function TeamRow({ team, rank, isRtl, c, n, onOpen }) {
  return (
    <Row isRtl={isRtl} onClick={onOpen} chevron={!!onOpen}
      icon={<IconWell tone={rank === 1 ? "inv" : "sunk"} size={44} square>
        {team.emoji ? <span className="text-xl leading-none">{team.emoji}</span> : <Users className="w-5 h-5" strokeWidth={2} />}
      </IconWell>}
      title={team.title || "—"}
      subtitle={c.athletes(n(team.members))}
      right={<Tag tone={rank === 1 ? "accent" : "sunk"} className="font-semibold">{c.xp(n(team.xp.toLocaleString("en-US")))}</Tag>} />
  );
}

export default function TeamPage({ onBack, isRtl, onOpenClub }) {
  const c = COPY[isRtl ? "fa" : "en"];
  const n = (v) => num(v, isRtl);
  const real = backendOn && !!loadSession().userId;
  const [data, setData] = useState(null); // { mine, top } | "error"

  useEffect(() => {
    if (!real) return undefined;
    let live = true;
    boards.teams(weekStart(isRtl)).then((d) => { if (live) setData(d); }).catch(() => { if (live) setData("error"); });
    return () => { live = false; };
  }, [real, isRtl]);

  if (!real) {
    return (
      <Screen isRtl={isRtl}>
        <TopBar isRtl={isRtl} onBack={onBack} title={c.title} />
        <Card tone="hero" className="flex flex-col gap-3">
          <h2 className="m-0 font-display font-extrabold text-[30px] leading-[0.95] tracking-[-0.035em]">{c.join}</h2>
          <p className="m-0 text-sm leading-[1.45] text-hero-muted">{c.joinBody}</p>
          <CtaButton tone="accent" isRtl={isRtl} className="mt-1" onClick={onOpenClub}>{c.cta}</CtaButton>
        </Card>
        <Label as="h2" className="m-0 mt-2 px-1">{c.top}</Label>
        <List>
          {DEMO_TEAMS.map(({ Icon, ...team }) => (
            <Row key={team.rank} isRtl={isRtl}
              icon={<IconWell tone={team.rank === 1 ? "inv" : "sunk"} size={44} square><Icon className="w-5 h-5" strokeWidth={2} /></IconWell>}
              title={isRtl ? team.nameFa : team.nameEn}
              subtitle={c.athletes(n(team.members))}
              right={<Tag tone={team.rank === 1 ? "accent" : "sunk"} className="font-semibold">{c.club(n(team.rank))}</Tag>} />
          ))}
        </List>
      </Screen>
    );
  }

  return (
    <Screen isRtl={isRtl}>
      <TopBar isRtl={isRtl} onBack={onBack} title={c.title} />

      <Card tone="hero" className="flex flex-col gap-3">
        <h2 className="m-0 font-display font-extrabold text-[30px] leading-[0.95] tracking-[-0.035em]">{c.join}</h2>
        <p className="m-0 text-sm leading-[1.45] text-hero-muted">{c.realBody}</p>
        <CtaButton tone="accent" isRtl={isRtl} className="mt-1" onClick={onOpenClub}>{c.realCta}</CtaButton>
      </Card>

      {data === null ? (
        <p className="m-0 px-1 text-sm text-muted" role="status">{c.loading}</p>
      ) : data === "error" ? (
        <p className="m-0 px-1 text-sm text-muted" role="alert">{c.failed}</p>
      ) : (
        <>
          <Label as="h2" className="m-0 mt-2 px-1">{c.mine}</Label>
          {data.mine.length ? (
            <List>{data.mine.map((team, i) => <TeamRow key={team.id} team={team} rank={i + 1} isRtl={isRtl} c={c} n={n} />)}</List>
          ) : (
            <p className="m-0 px-1 text-sm text-muted">{c.noTeams}</p>
          )}
          <Label as="h2" className="m-0 mt-2 px-1">{c.topPublic}</Label>
          {data.top.length ? (
            <List>{data.top.map((team, i) => <TeamRow key={team.id} team={team} rank={i + 1} isRtl={isRtl} c={c} n={n} />)}</List>
          ) : (
            <p className="m-0 px-1 text-sm text-muted">{c.noTop}</p>
          )}
        </>
      )}
    </Screen>
  );
}
