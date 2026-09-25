import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Award, BarChart3, Camera, Check as CheckIcon, Crown, Dumbbell, FileText, Loader2, Trash2, Flame, GraduationCap, Languages, LogOut, Moon,
  Settings, ShieldCheck, Sun, Trophy, Users, Wallet, Watch,
} from "lucide-react";
import { Avatar, Card, IconButton, IconWell, Label, List, Row, Screen, Segmented, Sheet, Toast, TopBar, cx, num } from "../../components/ui/kit";
import { useTheme } from "../../lib/theme";
import { ACCENTS, useAccent } from "../../lib/accent";
import { loadSession, saveSession } from "../../lib/session";
import { backendOn } from "../../lib/backend/supabase";
import { removeAvatar, uploadAvatar } from "../../lib/backend/account";
import { squareJpeg, toDataUrl } from "../../lib/image";
import { useTrainingStore } from "../../lib/training/trainingContext";
import { useNutritionStore } from "../../lib/nutrition/nutritionContext";
import { useChecklistStore } from "../../lib/checklistContext";
import { overallBest, overallStreak } from "../../lib/checklistModel";

// Profile and settings in one screen: who you are and what you've done on
// top, then the account pages, then appearance (theme, accent, language).

const COPY = {
  en: {
    title: "Profile & Settings", settings: "Settings",
    workouts: "workouts", streak: "day streak", records: "records",
    weight: "Weight", height: "Height", bmi: "BMI", kg: "kg", cm: "cm",
    change: (d) => `${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(1)} kg in 30 days`, noTrend: "Log your weight in Fuel to see the trend here.",
    today: "Today", trend: (a, b) => `Weight trend, ${a} kg to ${b} kg`,
    badges: "Badges", of: (a, b) => `${a} of ${b}`,
    badge: { pr: "First PR", run7: "7-day run", tons: "100 t lifted", run30: "30-day run" },
    training: "Training", history: "Workout history & logs", historySub: "Every session you've finished",
    report: "Progress report", reportSub: "Volume, burn and records", tutorials: "Tutorials", tutorialsSub: "Form, muscles and routines on Lift Manual",
    account: "Account", proRow: "FitClub Pro", proSub: "Membership and plans", wallet: "Wallet & rewards", walletSub: "XP balance and your referral code",
    devices: "Connected wearables & devices", devicesSub: "Apple Health, Health Connect, Garmin: with the phone app", team: "Teams & clubs", teamSub: "Weekly team challenges",
    appearance: "Appearance", theme: "Theme", paper: "Paper", night: "Night", accent: "Accent",
    preferences: "Preferences", language: "App language", languageName: "English",
    logout: "Log out", privacy: "Privacy policy", terms: "Terms of use",
    photo: "Profile photo", addPhoto: "Add a profile photo", changePhoto: "Change profile photo", newPhoto: "Choose a new photo",
    removePhoto: "Remove photo", photoFailed: "Couldn't save the photo. Try again.", close: "Close",
  },
  fa: {
    title: "پروفایل کاربری", settings: "تنظیمات",
    workouts: "تمرین", streak: "روز استریک", records: "رکورد",
    weight: "وزن", height: "قد", bmi: "شاخص BMI", kg: "کیلو", cm: "سانتی‌متر",
    change: (d, n) => `${d > 0 ? "+" : "−"}${n(Math.abs(d).toFixed(1))} کیلو در ۳۰ روز`, noTrend: "وزنت را در بخش تغذیه ثبت کن تا روندش اینجا بیاید.",
    today: "امروز", trend: (a, b) => `روند وزن، از ${a} تا ${b} کیلو`,
    badges: "نشان‌ها", of: (a, b) => `${a} از ${b}`,
    badge: { pr: "اولین رکورد", run7: "۷ روز پیاپی", tons: "۱۰۰ تن وزنه", run30: "۳۰ روز پیاپی" },
    training: "تمرین", history: "تاریخچه تمرینات و فعالیت‌ها", historySub: "همه‌ی جلسه‌هایی که تمام کردی",
    report: "گزارش پیشرفت", reportSub: "حجم، کالری و رکوردها", tutorials: "آموزش‌ها", tutorialsSub: "فرم حرکات، عضلات و برنامه‌ها در Lift Manual",
    account: "حساب کاربری", proRow: "اشتراک و عضویت ویژه‌", proSub: "عضویت و پلن‌ها", wallet: "کیف پول و امتیازها", walletSub: "موجودی امتیاز و کد دعوت",
    devices: "دستگاه‌ها و ساعت‌های هوشمند", devicesSub: "اپل هلث، هلث کانکت، گارمین: با اپ گوشی", team: "تیم‌ها و کلوب‌ها", teamSub: "چالش‌های تیمی هفتگی",
    appearance: "ظاهر برنامه", theme: "تم", paper: "روشن", night: "تیره", accent: "رنگ اصلی",
    preferences: "ترجیحات", language: "زبان برنامه", languageName: "فارسی",
    logout: "خروج از حساب کاربری", privacy: "حریم خصوصی", terms: "شرایط استفاده",
    photo: "عکس پروفایل", addPhoto: "افزودن عکس پروفایل", changePhoto: "تغییر عکس پروفایل", newPhoto: "انتخاب عکس تازه",
    removePhoto: "حذف عکس", photoFailed: "عکس ذخیره نشد. دوباره امتحان کن.", close: "بستن",
  },
};

export default function ProfilePage({ onNavigate, onBack, isRtl }) {
  const [language, setLanguage] = useState(localStorage.getItem("language") || "en");
  const [theme, setTheme] = useTheme();
  const [accent, setAccent] = useAccent();
  const c = COPY[isRtl ? "fa" : "en"];
  const n = (v) => num(v, isRtl);
  const settingsRef = useRef(null);

  const session = loadSession();
  const name = session.name || (isRtl ? "ورزشکار" : "Athlete");

  // The profile photo: picked here, cropped square and shrunk on the device,
  // then uploaded to the account (or, in the demo build, kept on the device).
  const [photo, setPhoto] = useState(session.avatarUrl || null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoSheet, setPhotoSheet] = useState(false);
  const [toast, setToast] = useState("");
  const fileRef = useRef(null);
  useEffect(() => { if (!toast) return undefined; const id = setTimeout(() => setToast(""), 2200); return () => clearTimeout(id); }, [toast]);
  const pickPhoto = () => { setPhotoSheet(false); fileRef.current?.click(); };
  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoBusy(true);
    try {
      if (backendOn) {
        const res = await uploadAvatar(await squareJpeg(file, 512));
        if (res.error) throw new Error(res.error);
        setPhoto(res.profile?.avatar_url || loadSession().avatarUrl);
      } else {
        const url = await toDataUrl(await squareJpeg(file, 256, 0.8));
        saveSession({ avatarUrl: url });
        setPhoto(url);
      }
    } catch {
      setToast(c.photoFailed);
    } finally {
      setPhotoBusy(false);
    }
  };
  const dropPhoto = async () => {
    setPhotoSheet(false);
    setPhotoBusy(true);
    try {
      if (backendOn) { const res = await removeAvatar(); if (res.error) throw new Error(res.error); }
      else saveSession({ avatarUrl: null });
      setPhoto(null);
    } catch {
      setToast(c.photoFailed);
    } finally {
      setPhotoBusy(false);
    }
  };
  const training = useTrainingStore();
  const nutrition = useNutritionStore();
  const { lists } = useChecklistStore();

  // The profile is long; a page opened from its lower rows should start at the top.
  const go = (page) => {
    onNavigate(page);
    window.scrollTo(0, 0);
  };

  const toggleLanguage = () => {
    const newLang = language === "fa" ? "en" : "fa";
    localStorage.setItem("language", newLang);
    setLanguage(newLang);
    window.location.reload();
  };

  const streak = overallStreak(lists);
  const best = Math.max(overallBest(lists), streak);
  const records = training.sessions.reduce((a, s) => a + (s.prs?.length || 0), 0);

  // Body: the smoothed scale trend when there is one, else the profile's numbers.
  const profile = nutrition.profile || {};
  const recent = useMemo(() => {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    return (nutrition.trend || []).filter((p) => new Date(`${p.key}T00:00:00`) >= since);
  }, [nutrition.trend]);
  const latest = recent.length ? recent[recent.length - 1].trend : profile.weight;
  const delta = recent.length > 1 ? recent[recent.length - 1].trend - recent[0].trend : null;
  const bmi = profile.height && latest ? latest / (profile.height / 100) ** 2 : null;

  const badges = [
    { id: "pr", earned: records > 0, Icon: Trophy, shape: "rounded-[22px] -rotate-6", tone: "bg-jet text-accent dark:ring-1 dark:ring-inset dark:ring-line" },
    { id: "run7", earned: best >= 7, Icon: Flame, shape: "rounded-full", tone: "bg-accent text-on-accent" },
    { id: "tons", earned: (training.stats?.volume || 0) >= 100000, Icon: Dumbbell, shape: "rounded-[22px] rotate-6", tone: "bg-coach text-on-accent" },
    { id: "run30", earned: best >= 30, Icon: Award, shape: "rounded-full", tone: "bg-sand text-on-accent" },
  ];
  const earned = badges.filter((b) => b.earned).length;

  const icon = (Icon, tone = "sunk") => <IconWell tone={tone} size={36}><Icon className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>;

  return (
    <Screen isRtl={isRtl}>
      <TopBar isRtl={isRtl} onBack={onBack} title={<span className="sr-only">{c.title}</span>}
        right={(
          <IconButton label={c.settings} onClick={() => settingsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            <Settings className="w-5 h-5" strokeWidth={2} />
          </IconButton>
        )} />

      <section aria-label={name} className="flex flex-col items-center text-center">
        <button type="button" onClick={() => (photo ? setPhotoSheet(true) : pickPhoto())} disabled={photoBusy}
          aria-label={photo ? c.changePhoto : c.addPhoto} aria-busy={photoBusy}
          className="relative rounded-full border-0 p-0 bg-transparent cursor-pointer transition-transform active:scale-[0.97] disabled:cursor-wait">
          <Avatar name={name} src={photo} tone="bg-sand" size={96} className="font-display !font-extrabold tracking-[-0.03em]" />
          <span aria-hidden="true" className="absolute -end-0.5 bottom-0.5 w-8 h-8 rounded-full bg-jet text-accent flex items-center justify-center ring-[3px] ring-canvas">
            {photoBusy ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.4} /> : <Camera className="w-4 h-4" strokeWidth={2.2} />}
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} aria-hidden="true" tabIndex={-1} />
        <h2 className="m-0 mt-3.5 font-display font-extrabold text-[36px] leading-none tracking-[-0.04em] text-ink">{name}</h2>
        {session.username && <span className="mt-1.5 text-[15px] text-muted" dir="ltr">@{session.username}</span>}
        {session.email && <span className="mt-0.5 text-sm text-muted" dir="ltr">{session.email}</span>}
      </section>

      <div className="grid grid-cols-3 gap-2">
        <StatTile value={n(training.stats?.count || 0)} label={c.workouts} onClick={() => go("history")} />
        <StatTile value={n(streak)} label={c.streak} accent onClick={() => go("streakDetail")} />
        <StatTile value={n(records)} label={c.records} onClick={() => go("workoutReport")} />
      </div>

      <Card className="flex flex-col gap-2" aria-labelledby="profile-weight">
        <div className="flex justify-between items-center gap-2">
          <h2 id="profile-weight" className="m-0 text-base font-bold">{c.weight}</h2>
          {delta !== null && Math.abs(delta) >= 0.05 && (
            <span className="h-[26px] px-2.5 rounded-full bg-jet text-accent inline-flex items-center text-xs font-bold dark:ring-1 dark:ring-inset dark:ring-line">
              {c.change(delta, n)}
            </span>
          )}
        </div>
        <span className="font-display font-extrabold text-[32px] leading-none tracking-[-0.035em]">
          {latest ? n(Math.round(latest * 10) / 10) : "—"} <span className="text-base font-semibold text-muted">{c.kg}</span>
        </span>
        {recent.length > 1 ? (
          <>
            <Sparkline points={recent.map((p) => p.trend)}
              label={c.trend(n(recent[0].trend.toFixed(1)), n(recent[recent.length - 1].trend.toFixed(1)))} />
            <div className="flex justify-between text-xs text-muted">
              <span>{new Date(`${recent[0].key}T00:00:00`).toLocaleDateString(isRtl ? "fa-IR" : "en-GB", { day: "numeric", month: "short" })}</span>
              <span>{c.today}</span>
            </div>
          </>
        ) : (
          <p className="m-0 text-[13px] text-muted">{c.noTrend}</p>
        )}
        <div className="mt-1 pt-3 border-t border-hair grid grid-cols-2 gap-2">
          <span className="flex flex-col gap-0.5">
            <Label>{c.height}</Label>
            <span className="text-[15px] font-semibold">{profile.height ? `${n(profile.height)} ${c.cm}` : "—"}</span>
          </span>
          <span className="flex flex-col gap-0.5">
            <Label>{c.bmi}</Label>
            <span className="text-[15px] font-semibold">{bmi ? n(bmi.toFixed(1)) : "—"}</span>
          </span>
        </div>
      </Card>

      <Card className="flex flex-col gap-3" aria-labelledby="profile-badges">
        <div className="flex justify-between items-center">
          <h2 id="profile-badges" className="m-0 text-base font-bold">{c.badges}</h2>
          <span className="text-[13px] text-muted">{c.of(n(earned), n(badges.length))}</span>
        </div>
        <ul className="m-0 p-0 list-none grid grid-cols-4 gap-2">
          {badges.map(({ id, earned: got, Icon, shape, tone }) => (
            <li key={id} className="flex flex-col items-center gap-2 text-center">
              <span className={cx("w-16 h-16 flex items-center justify-center",
                got ? cx(shape, tone) : "rounded-full border-2 border-dashed border-faint text-faint")}>
                <Icon className="w-6 h-6" strokeWidth={2} />
              </span>
              <span className={cx("text-xs leading-tight", got ? "font-semibold text-ink" : "text-muted")}>{c.badge[id]}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Label as="h2" className="m-0 mt-2 px-1">{c.training}</Label>
      <List>
        <Row isRtl={isRtl} chevron icon={icon(Dumbbell)} title={c.history} subtitle={c.historySub} onClick={() => go("history")} />
        <Row isRtl={isRtl} chevron icon={icon(BarChart3)} title={c.report} subtitle={c.reportSub} onClick={() => go("workoutReport")} />
        <Row isRtl={isRtl} chevron icon={icon(GraduationCap)} title={c.tutorials} subtitle={c.tutorialsSub} onClick={() => go("tutorials")} />
      </List>

      <Label as="h2" className="m-0 mt-2 px-1">{c.account}</Label>
      <List>
        <Row isRtl={isRtl} chevron icon={icon(Crown, "inv")} title={c.proRow} subtitle={c.proSub} onClick={() => go("subscription")} />
        <Row isRtl={isRtl} chevron icon={icon(Wallet)} title={c.wallet} subtitle={c.walletSub} onClick={() => go("wallet")} />
        <Row isRtl={isRtl} chevron icon={icon(Watch)} title={c.devices} subtitle={c.devicesSub} onClick={() => go("devices")} />
        <Row isRtl={isRtl} chevron icon={icon(Users)} title={c.team} subtitle={c.teamSub} onClick={() => go("team")} />
      </List>

      <div ref={settingsRef} className="scroll-mt-5 flex flex-col gap-3.5">
        <h2 className="m-0 mt-4 font-display font-extrabold text-[22px] leading-none tracking-[-0.02em] text-ink">{c.settings}</h2>

        <Label as="h3" className="m-0 px-1">{c.appearance}</Label>
        <Card className="flex flex-col gap-4" aria-label={c.appearance}>
          <div className="flex flex-col gap-2">
            <span className="text-[15px] font-medium">{c.theme}</span>
            <Segmented className="!bg-sunk" value={theme === "dark" ? "dark" : "light"} onChange={setTheme}
              options={[
                { id: "light", label: <span className="inline-flex items-center gap-1.5"><Sun className="w-4 h-4" strokeWidth={2} />{c.paper}</span> },
                { id: "dark", label: <span className="inline-flex items-center gap-1.5"><Moon className="w-4 h-4" strokeWidth={2} />{c.night}</span> },
              ]} />
          </div>
          <div className="flex flex-col gap-3 pt-4 border-t border-hair">
            <span id="accent-label" className="text-[15px] font-medium">{c.accent}</span>
            <div role="radiogroup" aria-labelledby="accent-label" className="grid grid-cols-4 gap-2">
              {ACCENTS.map((a) => {
                const on = a.id === accent;
                const label = isRtl ? a.fa : a.en;
                return (
                  <button key={a.id} type="button" role="radio" aria-checked={on} aria-label={label} onClick={() => setAccent(a.id)}
                    className="flex flex-col items-center gap-2 bg-transparent border-0 p-0 cursor-pointer min-h-[44px]">
                    <span style={{ backgroundColor: `rgb(${a.rgb})` }}
                      className={cx("w-11 h-11 rounded-full flex items-center justify-center text-jet transition-shadow",
                        on && "ring-2 ring-ink ring-offset-[3px] ring-offset-card")}>
                      {on && <CheckIcon className="w-5 h-5" strokeWidth={3} />}
                    </span>
                    <span className={cx("text-xs", on ? "font-semibold text-ink" : "text-muted")}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <Label as="h3" className="m-0 px-1">{c.preferences}</Label>
        <List>
          <Row isRtl={isRtl} chevron icon={icon(Languages)} title={c.language} right={c.languageName} onClick={toggleLanguage} />
        </List>

        <List>
          <Row isRtl={isRtl} chevron icon={icon(ShieldCheck)} title={c.privacy} onClick={() => go("privacy")} />
          <Row isRtl={isRtl} chevron icon={icon(FileText)} title={c.terms} onClick={() => go("terms")} />
        </List>

        <List>
          <Row isRtl={isRtl} danger icon={<IconWell tone="alert" size={36}><LogOut className="w-[18px] h-[18px] rtl:-scale-x-100" strokeWidth={2} /></IconWell>}
            title={c.logout} onClick={() => go("welcome")} />
        </List>
      </div>
      <Sheet open={photoSheet} title={c.photo} isRtl={isRtl} onClose={() => setPhotoSheet(false)} closeLabel={c.close}>
        <List>
          <Row isRtl={isRtl} icon={icon(Camera)} title={c.newPhoto} onClick={pickPhoto} />
          <Row isRtl={isRtl} danger icon={<IconWell tone="alert" size={36}><Trash2 className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>}
            title={c.removePhoto} onClick={dropPhoto} />
        </List>
      </Sheet>
      {toast && <Toast check={false}>{toast}</Toast>}
    </Screen>
  );
}

/** One of the three numbers under the name. The streak tile is the accent fill. */
function StatTile({ value, label, accent, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={cx("rounded-[22px] p-3.5 flex flex-col gap-1 text-start border-0 cursor-pointer transition-transform active:scale-[0.98]",
        accent ? "bg-accent text-on-accent" : "bg-card text-ink")}>
      <span className="font-display font-extrabold text-[30px] leading-none tracking-[-0.03em]">{value}</span>
      <span className={cx("text-[13px]", accent ? "font-medium" : "text-muted")}>{label}</span>
    </button>
  );
}

/** The 30-day weight line: ink on hairline gridlines, today as an accent dot. */
function Sparkline({ points, label }) {
  const w = 318;
  const h = 78;
  const lo = Math.min(...points);
  const hi = Math.max(...points);
  const span = hi - lo || 1;
  const xy = points.map((p, i) => [(i / (points.length - 1)) * (w - 8) + 2, 8 + (1 - (p - lo) / span) * (h - 22)]);
  const [lx, ly] = xy[xy.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} className="w-full h-auto">
      <path d={`M0 ${h - 18}H${w}M0 ${(h - 10) / 2}H${w}M0 8H${w}`} stroke="rgb(var(--ui-hair))" strokeWidth="1" />
      <polyline points={xy.map((p) => p.join(",")).join(" ")} fill="none" stroke="rgb(var(--ui-fg))" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="6" fill="rgb(var(--ui-accent))" stroke="rgb(var(--ui-fg))" strokeWidth="2.5" />
    </svg>
  );
}
