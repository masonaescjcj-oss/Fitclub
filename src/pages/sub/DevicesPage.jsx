import React, { useState } from "react";
import { Activity, HeartPulse, RefreshCw, Watch, Zap } from "lucide-react";
import { Card, IconWell, Label, List, Row, Screen, Tag, Toggle, TopBar, num } from "../../components/ui/kit";

// Wearables: a sync status card, then each integration with a connect switch.

const COPY = {
  en: {
    title: "Devices", syncTitle: "Auto-Sync Active", syncBody: "Syncing steps, heart rate & sleep",
    connectedCount: (k) => `${k} connected`, available: "Available Integrations", connect: "Connect", connected: "Connected",
    category: { ios: "iOS Sync", watch: "Smartwatch", android: "Android Sync", tracker: "Fitness Tracker" },
    sync: { now: "Just now", m2: "2 mins ago", h1: "1 hour ago", never: "Never" },
  },
  fa: {
    title: "دستگاه‌ها", syncTitle: "همگام‌سازی خودکار فعال است", syncBody: "همگام‌سازی ضربان، گام‌ها و خواب",
    connectedCount: (k) => `${k} دستگاه متصل`, available: "ساعت‌ها و اپلیکیشن‌های پشتیبانی‌شده", connect: "اتصال", connected: "متصل شد",
    category: { ios: "همگام‌سازی iOS", watch: "ساعت هوشمند", android: "همگام‌سازی اندروید", tracker: "مچ‌بند ورزشی" },
    sync: { now: "همین حالا", m2: "۲ دقیقه پیش", h1: "۱ ساعت پیش", never: "هرگز" },
  },
};

const ICONS = { apple_health: HeartPulse, garmin: Watch, google_fit: Activity, fitbit: Zap };

export default function DevicesPage({ onBack, isRtl }) {
  const c = COPY[isRtl ? "fa" : "en"];
  const [devices, setDevices] = useState([
    { id: "apple_health", name: "Apple Health", category: "ios", connected: true, lastSync: "m2" },
    { id: "garmin", name: "Garmin Connect", category: "watch", connected: false, lastSync: "never" },
    { id: "google_fit", name: "Google Fit", category: "android", connected: true, lastSync: "h1" },
    { id: "fitbit", name: "Fitbit Sense", category: "tracker", connected: false, lastSync: "never" },
  ]);

  const toggleConnect = (id) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, connected: !d.connected, lastSync: "now" } : d))
    );
  };

  const live = devices.filter((d) => d.connected).length;

  return (
    <Screen isRtl={isRtl}>
      <TopBar isRtl={isRtl} onBack={onBack} title={c.title} />

      <Card tone="hero" className="flex items-center gap-3.5">
        <IconWell tone="accent" size={48}>
          <RefreshCw className="w-[22px] h-[22px] animate-spin" style={{ animationDuration: "8s" }} strokeWidth={2} />
        </IconWell>
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <h2 className="m-0 text-[17px] font-bold">{c.syncTitle}</h2>
          <p className="m-0 text-sm text-hero-muted">{c.syncBody}</p>
          <Tag tone="hero" className="self-start mt-2 font-semibold">{c.connectedCount(num(live, isRtl))}</Tag>
        </div>
      </Card>

      <Label as="h2" className="m-0 mt-2 px-1">{c.available}</Label>
      <List>
        {devices.map((device) => {
          const Icon = ICONS[device.id] || Watch;
          return (
            <Row key={device.id} isRtl={isRtl}
              icon={<IconWell tone={device.connected ? "inv" : "sunk"} size={40}><Icon className="w-5 h-5" strokeWidth={2} /></IconWell>}
              title={device.name}
              subtitle={`${device.connected ? c.connected : c.category[device.category]}${isRtl ? "، " : " · "}${c.sync[device.lastSync]}`}
              right={<Toggle checked={device.connected} onChange={() => toggleConnect(device.id)} label={`${c.connect} ${device.name}`} />} />
          );
        })}
      </List>
    </Screen>
  );
}
