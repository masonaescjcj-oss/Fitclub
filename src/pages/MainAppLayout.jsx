import React, { Suspense, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChecklistProvider, useChecklistStore } from "../lib/checklistContext";
import { NutritionProvider } from "../lib/nutrition/nutritionContext";
import { ChatProvider, useChatStore } from "../lib/chat/chatContext";
import { TrainingProvider, useTrainingStore } from "../lib/training/trainingContext";
import { CoachProvider } from "../lib/coach/coachContext";
import { useNutritionStore } from "../lib/nutrition/nutritionContext";
import { useTrainingT } from "../lib/training/trainingI18n";
import { appAlerts, unreadAppAlerts } from "../lib/notifications";
import { publishActivity } from "../lib/activity";
import { overallBest, overallStreak } from "../lib/checklistModel";
import { backendOn } from "../lib/backend/supabase";
import { loadSession } from "../lib/session";
import { clearShareFromLocation, readShareFromLocation } from "../lib/training/programModel";
import { clearJoinFromLocation, readJoinFromLocation } from "../lib/chat/search";
import { applyMealPlan } from "../lib/nutrition/mealPlan";
import { importWithRetry, lazyScreen } from "../lib/lazyScreen";
import BottomNavBar from "../components/BottomNavBar";
import { Toast } from "../components/ui/kit";

// Today opens first, so it ships with the shell. Every other screen loads
// when it's first opened, and all of them are fetched quietly once the app
// is up, so switching stays instant and the installed app works offline.
import TodayPage from "./main/TodayPage";

const SCREENS = {
  WorkoutPage: () => import("./main/WorkoutPage"),
  DietPage: () => import("./main/DietPage"),
  AiCoachPage: () => import("./main/AiCoachPage"),
  CommunityPage: () => import("./main/CommunityPage"),
  ChecklistPage: () => import("./main/ChecklistPage"),
  LegalPage: () => import("./LegalPage"),
  ProfilePage: () => import("./sub/ProfilePage"),
  DevicesPage: () => import("./sub/DevicesPage"),
  StreakDetailPage: () => import("./sub/StreakDetailPage"),
  MyRankPage: () => import("./sub/MyRankPage"),
  HistoryPage: () => import("./sub/HistoryPage"),
  NotificationsPage: () => import("./sub/NotificationsPage"),
  WorkoutReportPage: () => import("./sub/WorkoutReportPage"),
  TeamPage: () => import("./sub/TeamPage"),
  WalletPage: () => import("./sub/WalletPage"),
  SubscriptionPage: () => import("./sub/SubscriptionPage"),
  RecipeExplorePage: () => import("./sub/RecipeExplorePage"),
  DietGuidePage: () => import("./sub/DietGuidePage"),
  ImportSheet: () => import("../components/training/TrainingSheets").then((m) => ({ default: m.ImportSheet })),
};
const WorkoutPage = lazyScreen(SCREENS.WorkoutPage);
const DietPage = lazyScreen(SCREENS.DietPage);
const AiCoachPage = lazyScreen(SCREENS.AiCoachPage);
const CommunityPage = lazyScreen(SCREENS.CommunityPage);
const ChecklistPage = lazyScreen(SCREENS.ChecklistPage);
const LegalPage = lazyScreen(SCREENS.LegalPage);
const ProfilePage = lazyScreen(SCREENS.ProfilePage);
const DevicesPage = lazyScreen(SCREENS.DevicesPage);
const StreakDetailPage = lazyScreen(SCREENS.StreakDetailPage);
const MyRankPage = lazyScreen(SCREENS.MyRankPage);
const HistoryPage = lazyScreen(SCREENS.HistoryPage);
const NotificationsPage = lazyScreen(SCREENS.NotificationsPage);
const WorkoutReportPage = lazyScreen(SCREENS.WorkoutReportPage);
const TeamPage = lazyScreen(SCREENS.TeamPage);
const WalletPage = lazyScreen(SCREENS.WalletPage);
const SubscriptionPage = lazyScreen(SCREENS.SubscriptionPage);
const RecipeExplorePage = lazyScreen(SCREENS.RecipeExplorePage);
const DietGuidePage = lazyScreen(SCREENS.DietGuidePage);
const ImportSheet = lazyScreen(SCREENS.ImportSheet);

/** Fetches every screen in the background once the app is idle. */
function prefetchScreens() {
  const run = () => Object.values(SCREENS).forEach((load) => importWithRetry(load).catch(() => {}));
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 2500);
}

/** While a screen's code arrives (the first time only): the canvas, nothing else. */
const ScreenFallback = () => <div className="min-h-[100dvh] bg-canvas" aria-busy="true" />;


// Tabs that open full screen, without the shell's tab bar.
const FULL_SCREEN_TABS = ["club", "coach"];

export default function MainAppLayout({ onNavigate }) {
  const isRtl = (localStorage.getItem("language") || "en") === "fa";
  return (
    <ChecklistProvider>
      <NutritionProvider>
        <ChatProvider lang={isRtl ? "fa" : "en"}>
          <TrainingProvider>
            <CoachProvider isRtl={isRtl}>
              <MainAppShell onNavigate={onNavigate} />
            </CoachProvider>
          </TrainingProvider>
        </ChatProvider>
      </NutritionProvider>
    </ChecklistProvider>
  );
}

function MainAppShell({ onNavigate }) {
  const [activeTab, setActiveTab] = useState("today");
  const [subPage, setSubPage] = useState(null);
  // A Train segment to open on, once (the profile's exercise guide opens the library).
  const [trainSegment, setTrainSegment] = useState(null);
  // A plan shared by link lands here; the sheet decides whether it is a
  // program or a nutrition plan and hands it to the right store.
  const [shareCode, setShareCode] = useState(() => readShareFromLocation());
  // An invite to a group or channel (…#join=<id>) lands in the messenger, which resolves it.
  const [joinCode, setJoinCode] = useState(() => readJoinFromLocation());
  // A chat the notifications centre asked to open, at a message.
  const [openTarget, setOpenTarget] = useState(null);
  const chat = useChatStore();
  const training = useTrainingStore();
  const nutrition = useNutritionStore();
  const checklist = useChecklistStore();
  const tt = useTrainingT((localStorage.getItem("language") || "en") === "fa");
  const [flash, setFlash] = useState("");
  useEffect(() => { if (shareCode) clearShareFromLocation(); }, [shareCode]);
  useEffect(() => { prefetchScreens(); }, []);

  // The leaderboards read each account's daily activity: sent a few seconds
  // after the log changes, and only when it did (supabase/migrations/0006).
  useEffect(() => {
    if (!backendOn || !loadSession().userId) return undefined;
    const timer = setTimeout(() => {
      const streak = overallStreak(checklist.lists);
      publishActivity({ sessions: training.sessions, lists: checklist.lists, diaryDays: nutrition.diary?.days },
        streak, Math.max(overallBest(checklist.lists), streak)).catch(() => {});
    }, 4000);
    return () => clearTimeout(timer);
  }, [training.sessions, checklist.lists, nutrition.diary]);
  useEffect(() => {
    const onHash = () => {
      const c = readShareFromLocation(); if (c) setShareCode(c);
      const j = readJoinFromLocation(); if (j) setJoinCode(j);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => { if (joinCode) { clearJoinFromLocation(); setSubPage(null); setActiveTab("club"); } }, [joinCode]);
  // A tapped notification opens its chat: "?chat=<id>" on a cold start, or a
  // message from the service worker when the app is already open.
  useEffect(() => {
    const openFrom = (href) => {
      const id = new URL(href, window.location.origin).searchParams.get("chat");
      if (!id) return;
      setOpenTarget({ chatId: id }); setSubPage(null); setActiveTab("club");
    };
    if (new URLSearchParams(window.location.search).get("chat")) {
      openFrom(window.location.href);
      try { window.history.replaceState(null, "", window.location.pathname); } catch { /* read-only history */ }
    }
    const onMessage = (e) => { if (e.data && e.data.type === "fitclub:open" && e.data.url) openFrom(e.data.url); };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", onMessage);
  }, []);
  useEffect(() => { if (!flash) return undefined; const id = setTimeout(() => setFlash(""), 1800); return () => clearTimeout(id); }, [flash]);

  // Two tabs open full screen, without the shell's bar. The messenger keeps
  // its Telegram layout in the app's colours and draws its own bottom bar
  // (chats, contacts, settings, and a round button back); the coach closes
  // with an X at the top. Either way out returns to the tab the athlete
  // came from.
  const immersive = FULL_SCREEN_TABS.includes(activeTab) && !subPage;
  const homeTab = useRef("today");
  useEffect(() => { if (!FULL_SCREEN_TABS.includes(activeTab)) homeTab.current = activeTab; }, [activeTab]);
  const goHome = () => setActiveTab(homeTab.current);
  const alerts = chat.unreadMentionTotal + chat.notifications.filter((n) => n.unread && n.kind === "system").length
    + unreadAppAlerts(appAlerts({ training, checklist, nutrition }));

  const language = localStorage.getItem("language") || "en";
  const isRtl = language === "fa";

  const handleSubNavigate = (page) => {
    if (page === "welcome") {
      onNavigate("welcome");
    } else if (page === "exerciseLibrary") {
      // The exercise guide is Train's own library.
      setTrainSegment("exercises"); setSubPage(null); setActiveTab("train");
    } else {
      setSubPage(page);
    }
  };

  const currentViewKey = subPage || activeTab;
  // Every tab and sub-screen opens at its top, not where the last one was scrolled to.
  useEffect(() => { window.scrollTo(0, 0); }, [currentViewKey]);

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="w-full md:max-w-lg mx-auto min-h-[100dvh] bg-canvas text-ink flex flex-col justify-between overflow-x-clip relative font-ui select-none"
    >
      {/* Main & Sub-View Page Container */}
      <AnimatePresence mode="wait">
        {/* A fade only: a transform here would become the containing block for
            the fixed sheets and docks inside the pages. */}
        <motion.div
          key={currentViewKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          className="w-full flex-grow"
        >
          <Suspense fallback={<ScreenFallback />}>
          {/* Sub Pages */}
          {subPage === "profile" && <ProfilePage onNavigate={handleSubNavigate} onBack={() => setSubPage(null)} isRtl={isRtl} />}
          {subPage === "devices" && <DevicesPage onBack={() => setSubPage("profile")} isRtl={isRtl} />}
          {subPage === "streakDetail" && <StreakDetailPage onBack={() => setSubPage(null)} onGoToRank={() => setSubPage("myRank")} onGoToHistory={() => setSubPage("history")} isRtl={isRtl} />}
          {subPage === "myRank" && <MyRankPage onBack={() => setSubPage("streakDetail")} isRtl={isRtl} />}
          {subPage === "history" && <HistoryPage onBack={() => setSubPage(null)} isRtl={isRtl} />}
          {subPage === "notifications" && <NotificationsPage onBack={() => setSubPage(null)} isRtl={isRtl}
            onOpenChat={(chatId, messageId) => { setOpenTarget({ chatId, messageId }); setSubPage(null); setActiveTab("club"); }}
            onGo={(target) => { if (target.tab) { setSubPage(null); setActiveTab(target.tab); } else setSubPage(target.sub); }} />}
          {subPage === "workoutReport" && <WorkoutReportPage onBack={() => setSubPage(null)} isRtl={isRtl} />}
          {subPage === "team" && <TeamPage onBack={() => setSubPage(null)} isRtl={isRtl} onOpenClub={() => { setSubPage(null); setActiveTab("club"); }} />}
          {subPage === "wallet" && <WalletPage onBack={() => setSubPage(null)} isRtl={isRtl} />}
          {subPage === "subscription" && <SubscriptionPage onBack={() => setSubPage(null)} isRtl={isRtl} />}
          {subPage === "recipeExplore" && <RecipeExplorePage onBack={() => setSubPage(null)} isRtl={isRtl} />}
          {subPage === "dietGuide" && <DietGuidePage onBack={() => setSubPage(null)} isRtl={isRtl} />}
          {(subPage === "privacy" || subPage === "terms") && <LegalPage kind={subPage} isRtl={isRtl} onBack={() => setSubPage("profile")} />}
          {subPage === "checklist" && <ChecklistPage isRtl={isRtl} onBack={() => setSubPage(null)} onGoToStreak={() => setSubPage("streakDetail")} />}

          {/* Main 5 Tabs */}
          {!subPage && (
            <>
              {activeTab === "today" && <TodayPage isRtl={isRtl} alerts={alerts} onOpen={handleSubNavigate} onTab={setActiveTab} />}
              {activeTab === "train" && <WorkoutPage isRtl={isRtl} onOpen={handleSubNavigate}
                initialSegment={trainSegment} onSegmentShown={() => setTrainSegment(null)} />}
              {activeTab === "fuel" && <DietPage isRtl={isRtl} onGoToRecipe={() => setSubPage("recipeExplore")} onGoToGuide={() => setSubPage("dietGuide")} />}
              {activeTab === "coach" && <AiCoachPage isRtl={isRtl} onClose={goHome} />}
              {activeTab === "club" && <CommunityPage isRtl={isRtl} onExit={goHome} joinCode={joinCode} onJoinHandled={() => setJoinCode(null)}
                openTarget={openTarget} onOpenHandled={() => setOpenTarget(null)} />}
            </>
          )}
          </Suspense>
        </motion.div>
      </AnimatePresence>

      {/* Floating Bottom Navigation (Only shown when not in sub-page) */}
      {!subPage && !immersive && (
        <BottomNavBar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setSubPage(null);
            setActiveTab(tab);
          }}
          isRtl={isRtl}
          clubDot={chat.unreadTotal > 0}
        />
      )}

      {/* A shared plan opened from a link */}
      {shareCode && (
        <Suspense fallback={null}>
          <ImportSheet initialCode={shareCode} isRtl={isRtl} t={tt}
            onImportProgram={(compact) => { const p = training.importProgram(compact); training.setActiveProgram(p.id); setActiveTab("train"); setSubPage(null); setShareCode(null); setFlash(tt.importedOk); }}
            onApplyMeal={(meal) => { applyMealPlan(nutrition, meal); setActiveTab("fuel"); setSubPage(null); setShareCode(null); setFlash(tt.appliedOk); }}
            onClose={() => setShareCode(null)} />
        </Suspense>
      )}
      {flash && <Toast>{flash}</Toast>}
    </div>
  );
}
