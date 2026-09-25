import React from "react";
import { Dumbbell, Footprints, Shield } from "lucide-react";
import { CtaButton, Card, IconWell, Label, List, Row, Screen, Tag, TopBar, num } from "../../components/ui/kit";

// Teams: an invitation on the ink hero, then this week's top clubs.

const COPY = {
  en: {
    title: "Teams & clubs", join: "Join a Fitness Club!", joinBody: "Compete together with your friends in weekly team challenges.",
    cta: "Join or Create Team", top: "Top Ranked Clubs", athletes: (k) => `${k} Athletes`, club: (k) => `#${k} Club`,
  },
  fa: {
    title: "تیم‌ها و کلوب‌ها", join: "به یک کلوب ورزشی بپیوندید!", joinBody: "با دوستان خود تیم تشکیل دهید و در چالش‌های هفتگی رتبه اول را کسب کنید.",
    cta: "ایجاد یا ورود به کلوب", top: "کلوب‌های برتر این هفته", athletes: (k) => `${k} ورزشکار`, club: (k) => `کلوب #${k}`,
  },
};

export default function TeamPage({ onBack, isRtl }) {
  const c = COPY[isRtl ? "fa" : "en"];
  const n = (v) => num(v, isRtl);
  const teams = [
    { nameEn: "FitClub Spartans", nameFa: "اسپارتان‌های فیت‌کلاب", members: 128, rank: 1, Icon: Shield },
    { nameEn: "Iron Lifters", nameFa: "وزنه‌برداران آهنین", members: 95, rank: 2, Icon: Dumbbell },
    { nameEn: "Pro Runners Club", nameFa: "باشگاه دونده‌های حرفه‌ای", members: 74, rank: 3, Icon: Footprints },
  ];

  return (
    <Screen isRtl={isRtl}>
      <TopBar isRtl={isRtl} onBack={onBack} title={c.title} />

      <Card tone="hero" className="flex flex-col gap-3">
        <h2 className="m-0 font-display font-extrabold text-[30px] leading-[0.95] tracking-[-0.035em]">{c.join}</h2>
        <p className="m-0 text-sm leading-[1.45] text-hero-muted">{c.joinBody}</p>
        <CtaButton tone="accent" isRtl={isRtl} className="mt-1">{c.cta}</CtaButton>
      </Card>

      <Label as="h2" className="m-0 mt-2 px-1">{c.top}</Label>
      <List>
        {teams.map(({ Icon, ...team }) => (
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
