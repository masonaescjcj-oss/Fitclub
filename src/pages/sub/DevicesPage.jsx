import React from "react";
import { Activity, HeartPulse, Smartphone, Watch, Zap } from "lucide-react";
import { Card, IconWell, Label, List, Row, Screen, Tag, TopBar } from "../../components/ui/kit";

// Wearables and health apps. A web app can't reach Apple Health or Health
// Connect, so these connect through the phone app; until it ships the page
// says so plainly instead of showing switches that do nothing.

const COPY = {
  en: {
    title: "Devices",
    heroTitle: "Arrives with the phone app",
    heroBody: "Health data stays on the phone, so these connect through FitClub's app for Android and iOS. Until then, log workouts and weigh-ins here and the coach reads them.",
    list: "What will connect", later: "Phone app",
    what: { apple_health: "Steps, heart rate, sleep and workouts", health_connect: "Steps, heart rate, sleep and workouts on Android", garmin: "Workouts and heart rate from Garmin watches", fitbit: "Steps, sleep and heart rate" },
  },
  fa: {
    title: "دستگاه‌ها",
    heroTitle: "با اپ گوشی می‌آید",
    heroBody: "داده‌های سلامت روی خود گوشی می‌ماند، پس این‌ها از راه اپ اندروید و iOS فیت‌کلاب وصل می‌شوند. تا آن موقع تمرین و وزنت را همین‌جا ثبت کن تا مربی ببیند.",
    list: "چه چیزهایی وصل می‌شود", later: "اپ گوشی",
    what: { apple_health: "قدم، ضربان، خواب و تمرین", health_connect: "قدم، ضربان، خواب و تمرین در اندروید", garmin: "تمرین و ضربان از ساعت‌های گارمین", fitbit: "قدم، خواب و ضربان" },
  },
};

const DEVICES = [
  { id: "apple_health", name: "Apple Health", icon: HeartPulse },
  { id: "health_connect", name: "Health Connect", icon: Activity },
  { id: "garmin", name: "Garmin Connect", icon: Watch },
  { id: "fitbit", name: "Fitbit", icon: Zap },
];

export default function DevicesPage({ onBack, isRtl }) {
  const c = COPY[isRtl ? "fa" : "en"];
  return (
    <Screen isRtl={isRtl}>
      <TopBar isRtl={isRtl} onBack={onBack} title={c.title} />

      <Card tone="hero" className="flex items-start gap-3.5">
        <IconWell tone="accent" size={48}><Smartphone className="w-[22px] h-[22px]" strokeWidth={2} /></IconWell>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <h2 className="m-0 text-[17px] font-bold">{c.heroTitle}</h2>
          <p className="m-0 text-sm leading-snug text-hero-muted">{c.heroBody}</p>
        </div>
      </Card>

      <Label as="h2" className="m-0 mt-2 px-1">{c.list}</Label>
      <List>
        {DEVICES.map(({ id, name, icon: Icon }) => (
          <Row key={id} isRtl={isRtl}
            icon={<IconWell tone="sunk" size={40}><Icon className="w-5 h-5" strokeWidth={2} /></IconWell>}
            title={name} subtitle={c.what[id]}
            right={<Tag tone="sunk">{c.later}</Tag>} />
        ))}
      </List>
    </Screen>
  );
}
