import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MainAppHeader from "../components/MainAppHeader";
import { ChecklistProvider, useChecklistStore } from "../lib/checklistContext";
import { NutritionProvider } from "../lib/nutrition/nutritionContext";
import { ChatProvider } from "../lib/chat/chatContext";
import { TrainingProvider, useTrainingStore } from "../lib/training/trainingContext";
import { CoachProvider } from "../lib/coach/coachContext";
import { useNutritionStore } from "../lib/nutrition/nutritionContext";
import { useTrainingT } from "../lib/training/trainingI18n";
import { clearShareFromLocation, readShareFromLocation } from "../lib/training/programModel";
import { ImportSheet } from "../components/training/TrainingSheets";
import { applyMealPlan } from "./main/WorkoutPage";
import { loadSession } from "../lib/session";
import { overallStreak } from "../lib/checklistModel";
import BottomNavBar from "../components/BottomNavBar";

// Main 5 Pages
import WorkoutPage from "./main/WorkoutPage";
import DietPage from "./main/DietPage";
import AiCoachPage from "./main/AiCoachPage";
import CommunityPage from "./main/CommunityPage";
import ChecklistPage from "./main/ChecklistPage";

// Sub-Pages
import ProfilePage from "./sub/ProfilePage";
import DevicesPage from "./sub/DevicesPage";
import StreakDetailPage from "./sub/StreakDetailPage";
import MyRankPage from "./sub/MyRankPage";
import HistoryPage from "./sub/HistoryPage";
import TutorialsPage from "./sub/TutorialsPage";
import NotificationsPage from "./sub/NotificationsPage";
import WorkoutReportPage from "./sub/WorkoutReportPage";
import TeamPage from "./sub/TeamPage";
import WalletPage from "./sub/WalletPage";
import SubscriptionPage from "./sub/SubscriptionPage";
import RecipeExplorePage from "./sub/RecipeExplorePage";
import DietGuidePage from "./sub/DietGuidePage";


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
  const [activeTab, setActiveTab] = useState("fitness");
  const [subPage, setSubPage] = useState(null);
  // A plan shared by link lands here; the sheet decides whether it is a
  // program or a nutrition plan and hands it to the right store.
  const [shareCode, setShareCode] = useState(() => readShareFromLocation());
  const training = useTrainingStore();
  const nutrition = useNutritionStore();
  const tt = useTrainingT((localStorage.getItem("language") || "en") === "fa");
  const [flash, setFlash] = useState("");
  useEffect(() => { if (shareCode) clearShareFromLocation(); }, [shareCode]);
  useEffect(() => {
    const onHash = () => { const c = readShareFromLocation(); if (c) setShareCode(c); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => { if (!flash) return undefined; const id = setTimeout(() => setFlash(""), 1800); return () => clearTimeout(id); }, [flash]);

  const { lists } = useChecklistStore();
  // An open conversation takes the whole screen, the way a messenger does:
  // the app header and tab bar step aside so the composer isn't buried.
  const onChatTab = activeTab === "chat" && !subPage;
  // The messenger draws its own navigation, header and tab bar alike, so
  // FitClub's step aside on the whole tab; its Back button is the way out.
  const hideHeader = onChatTab;
  const immersive = onChatTab;
  const userName = loadSession().name || "Isaac";
  // The header badge now reflects the real longest run across the athlete's lists.
  const streak = overallStreak(lists);

  const language = localStorage.getItem("language") || "en";
  const isRtl = language === "fa";

  const handleSubNavigate = (page) => {
    if (page === "welcome") {
      onNavigate("welcome");
    } else {
      setSubPage(page);
    }
  };

  const currentViewKey = subPage || activeTab;

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="w-full md:max-w-lg mx-auto min-h-[100dvh] bg-black text-white flex flex-col justify-between overflow-x-hidden relative font-sans select-none"
    >
      {/* Top Header (Shown unless on sub-pages or Active Workout) */}
      {!subPage && !hideHeader && (
        <MainAppHeader
          userName={userName}
          streak={streak}
          coins={450}
          onProfileClick={() => setSubPage("profile")}
          onNotificationClick={() => setSubPage("notifications")}
          onWalletClick={() => setSubPage("wallet")}
          onStreakClick={() => setSubPage("streakDetail")}
          isRtl={isRtl}
        />
      )}

      {/* Main & Sub-View Page Container */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentViewKey}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          className="w-full flex-grow"
        >
          {/* Sub Pages */}
          {subPage === "profile" && <ProfilePage onNavigate={handleSubNavigate} onBack={() => setSubPage(null)} isRtl={isRtl} />}
          {subPage === "devices" && <DevicesPage onBack={() => setSubPage("profile")} isRtl={isRtl} />}
          {subPage === "streakDetail" && <StreakDetailPage onBack={() => setSubPage(null)} onGoToRank={() => setSubPage("myRank")} onGoToHistory={() => setSubPage("history")} isRtl={isRtl} />}
          {subPage === "myRank" && <MyRankPage onBack={() => setSubPage("streakDetail")} isRtl={isRtl} />}
          {subPage === "history" && <HistoryPage onBack={() => setSubPage(null)} isRtl={isRtl} />}
          {subPage === "tutorials" && <TutorialsPage onBack={() => setSubPage(null)} isRtl={isRtl} />}
          {subPage === "notifications" && <NotificationsPage onBack={() => setSubPage(null)} isRtl={isRtl} />}
          {subPage === "workoutReport" && <WorkoutReportPage onBack={() => setSubPage(null)} isRtl={isRtl} />}
          {subPage === "team" && <TeamPage onBack={() => setSubPage(null)} isRtl={isRtl} />}
          {subPage === "wallet" && <WalletPage onBack={() => setSubPage(null)} isRtl={isRtl} />}
          {subPage === "subscription" && <SubscriptionPage onBack={() => setSubPage(null)} isRtl={isRtl} />}
          {subPage === "recipeExplore" && <RecipeExplorePage onBack={() => setSubPage(null)} isRtl={isRtl} />}
          {subPage === "dietGuide" && <DietGuidePage onBack={() => setSubPage(null)} isRtl={isRtl} />}

          {/* Main 5 Tabs */}
          {!subPage && (
            <>
              {activeTab === "fitness" && <WorkoutPage isRtl={isRtl} />}
              {activeTab === "diet" && <DietPage isRtl={isRtl} onGoToRecipe={() => setSubPage("recipeExplore")} onGoToGuide={() => setSubPage("dietGuide")} />}
              {activeTab === "aiCoach" && <AiCoachPage isRtl={isRtl} />}
              {activeTab === "chat" && <CommunityPage isRtl={isRtl} onExit={() => setActiveTab("fitness")} />}
              {activeTab === "checklist" && <ChecklistPage isRtl={isRtl} onGoToStreak={() => setSubPage("streakDetail")} />}
            </>
          )}
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
        />
      )}

      {/* A shared plan opened from a link */}
      {shareCode && (
        <ImportSheet initialCode={shareCode} isRtl={isRtl} t={tt}
          onImportProgram={(compact) => { const p = training.importProgram(compact); training.setActiveProgram(p.id); setActiveTab("fitness"); setSubPage(null); setShareCode(null); setFlash(tt.importedOk); }}
          onApplyMeal={(meal) => { applyMealPlan(nutrition, meal); setActiveTab("diet"); setSubPage(null); setShareCode(null); setFlash(tt.appliedOk); }}
          onClose={() => setShareCode(null)} />
      )}
      {flash && (
        <div className="fixed bottom-24 inset-x-0 flex justify-center z-[95] pointer-events-none">
          <span className="px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/40 backdrop-blur text-xs font-black text-emerald-200">✓ {flash}</span>
        </div>
      )}
    </div>
  );
}
