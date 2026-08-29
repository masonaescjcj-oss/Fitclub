import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MainAppHeader from "../components/MainAppHeader";
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

// Modals
import ActiveWorkoutModal from "../components/modals/ActiveWorkoutModal";

export default function MainAppLayout({ onNavigate }) {
  const [activeTab, setActiveTab] = useState("fitness");
  const [subPage, setSubPage] = useState(null);
  const [isActiveWorkoutOpen, setIsActiveWorkoutOpen] = useState(false);

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
      {!subPage && !isActiveWorkoutOpen && (
        <MainAppHeader
          userName="Isaac"
          streak={14}
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
              {activeTab === "fitness" && <WorkoutPage isRtl={isRtl} onStartWorkout={() => setIsActiveWorkoutOpen(true)} />}
              {activeTab === "diet" && <DietPage isRtl={isRtl} onGoToRecipe={() => setSubPage("recipeExplore")} onGoToGuide={() => setSubPage("dietGuide")} />}
              {activeTab === "aiCoach" && <AiCoachPage isRtl={isRtl} />}
              {activeTab === "chat" && <CommunityPage isRtl={isRtl} />}
              {activeTab === "checklist" && <ChecklistPage isRtl={isRtl} onGoToStreak={() => setSubPage("streakDetail")} />}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Floating Bottom Navigation (Only shown when not in sub-page) */}
      {!subPage && !isActiveWorkoutOpen && (
        <BottomNavBar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setSubPage(null);
            setActiveTab(tab);
          }}
          isRtl={isRtl}
        />
      )}

      {/* Active Live Workout Tracker Modal */}
      {isActiveWorkoutOpen && (
        <ActiveWorkoutModal
          onClose={() => setIsActiveWorkoutOpen(false)}
          isRtl={isRtl}
        />
      )}
    </div>
  );
}
