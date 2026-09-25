import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChecklistProvider } from "../lib/checklistContext";
import { NutritionProvider } from "../lib/nutrition/nutritionContext";
import { ChatProvider, useChatStore } from "../lib/chat/chatContext";
import { TrainingProvider, useTrainingStore } from "../lib/training/trainingContext";
import { CoachProvider } from "../lib/coach/coachContext";
import { useNutritionStore } from "../lib/nutrition/nutritionContext";
import { useTrainingT } from "../lib/training/trainingI18n";
import { clearShareFromLocation, readShareFromLocation } from "../lib/training/programModel";
import { clearJoinFromLocation, readJoinFromLocation } from "../lib/chat/search";
import { ImportSheet } from "../components/training/TrainingSheets";
import { applyMealPlan } from "./main/WorkoutPage";
import BottomNavBar from "../components/BottomNavBar";
import { Toast } from "../components/ui/kit";

// Main 5 Pages
import TodayPage from "./main/TodayPage";
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
  const [activeTab, setActiveTab] = useState("today");
  const [subPage, setSubPage] = useState(null);
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
  const tt = useTrainingT((localStorage.getItem("language") || "en") === "fa");
  const [flash, setFlash] = useState("");
  useEffect(() => { if (shareCode) clearShareFromLocation(); }, [shareCode]);
  useEffect(() => {
    const onHash = () => {
      const c = readShareFromLocation(); if (c) setShareCode(c);
      const j = readJoinFromLocation(); if (j) setJoinCode(j);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => { if (joinCode) { clearJoinFromLocation(); setSubPage(null); setActiveTab("club"); } }, [joinCode]);
  useEffect(() => { if (!flash) return undefined; const id = setTimeout(() => setFlash(""), 1800); return () => clearTimeout(id); }, [flash]);

  // The messenger keeps its Telegram look and draws its own navigation,
  // header and tab bar alike, so FitClub's tab bar steps aside on the whole
  // Club tab; its Back button is the way out.
  const immersive = activeTab === "club" && !subPage;
  const alerts = chat.unreadMentionTotal + chat.notifications.filter((n) => n.unread && n.kind === "system").length;

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
  // Every tab and sub-screen opens at its top, not where the last one was scrolled to.
  useEffect(() => { window.scrollTo(0, 0); }, [currentViewKey]);

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="w-full md:max-w-lg mx-auto min-h-[100dvh] bg-canvas text-white flex flex-col justify-between overflow-x-clip relative font-sans select-none"
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
          {/* Sub Pages */}
          {subPage === "profile" && <ProfilePage onNavigate={handleSubNavigate} onBack={() => setSubPage(null)} isRtl={isRtl} />}
          {subPage === "devices" && <DevicesPage onBack={() => setSubPage("profile")} isRtl={isRtl} />}
          {subPage === "streakDetail" && <StreakDetailPage onBack={() => setSubPage(null)} onGoToRank={() => setSubPage("myRank")} onGoToHistory={() => setSubPage("history")} isRtl={isRtl} />}
          {subPage === "myRank" && <MyRankPage onBack={() => setSubPage("streakDetail")} isRtl={isRtl} />}
          {subPage === "history" && <HistoryPage onBack={() => setSubPage(null)} isRtl={isRtl} />}
          {subPage === "tutorials" && <TutorialsPage onBack={() => setSubPage(null)} isRtl={isRtl} />}
          {subPage === "notifications" && <NotificationsPage onBack={() => setSubPage(null)} isRtl={isRtl}
            onOpenChat={(chatId, messageId) => { setOpenTarget({ chatId, messageId }); setSubPage(null); setActiveTab("club"); }} />}
          {subPage === "workoutReport" && <WorkoutReportPage onBack={() => setSubPage(null)} isRtl={isRtl} />}
          {subPage === "team" && <TeamPage onBack={() => setSubPage(null)} isRtl={isRtl} />}
          {subPage === "wallet" && <WalletPage onBack={() => setSubPage(null)} isRtl={isRtl} />}
          {subPage === "subscription" && <SubscriptionPage onBack={() => setSubPage(null)} isRtl={isRtl} />}
          {subPage === "recipeExplore" && <RecipeExplorePage onBack={() => setSubPage(null)} isRtl={isRtl} />}
          {subPage === "dietGuide" && <DietGuidePage onBack={() => setSubPage(null)} isRtl={isRtl} />}
          {subPage === "checklist" && <ChecklistPage isRtl={isRtl} onBack={() => setSubPage(null)} onGoToStreak={() => setSubPage("streakDetail")} />}

          {/* Main 5 Tabs */}
          {!subPage && (
            <>
              {activeTab === "today" && <TodayPage isRtl={isRtl} alerts={alerts} onOpen={handleSubNavigate} onTab={setActiveTab} />}
              {activeTab === "train" && <WorkoutPage isRtl={isRtl} onOpen={handleSubNavigate} />}
              {activeTab === "fuel" && <DietPage isRtl={isRtl} onGoToRecipe={() => setSubPage("recipeExplore")} onGoToGuide={() => setSubPage("dietGuide")} />}
              {activeTab === "coach" && <AiCoachPage isRtl={isRtl} />}
              {activeTab === "club" && <CommunityPage isRtl={isRtl} onExit={() => setActiveTab("today")} joinCode={joinCode} onJoinHandled={() => setJoinCode(null)}
                openTarget={openTarget} onOpenHandled={() => setOpenTarget(null)} />}
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
          clubDot={chat.unreadTotal > 0}
        />
      )}

      {/* A shared plan opened from a link */}
      {shareCode && (
        <ImportSheet initialCode={shareCode} isRtl={isRtl} t={tt}
          onImportProgram={(compact) => { const p = training.importProgram(compact); training.setActiveProgram(p.id); setActiveTab("train"); setSubPage(null); setShareCode(null); setFlash(tt.importedOk); }}
          onApplyMeal={(meal) => { applyMealPlan(nutrition, meal); setActiveTab("fuel"); setSubPage(null); setShareCode(null); setFlash(tt.appliedOk); }}
          onClose={() => setShareCode(null)} />
      )}
      {flash && <Toast>{flash}</Toast>}
    </div>
  );
}
