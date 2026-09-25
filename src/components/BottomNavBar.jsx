import React from "react";
import { motion } from "framer-motion";
import { ClubIcon, CoachIcon, FuelIcon, TodayIcon, TrainIcon } from "./ui/icons";

// The floating ink pill. Only the tab you are on shows its label, on an
// accent fill; the Club tab carries a dot while chats are unread.
export const TABS = [
  { id: "today", icon: TodayIcon, en: "Today", fa: "امروز" },
  { id: "train", icon: TrainIcon, en: "Train", fa: "تمرین" },
  { id: "fuel", icon: FuelIcon, en: "Fuel", fa: "تغذیه" },
  { id: "coach", icon: CoachIcon, en: "Coach", fa: "مربی" },
  { id: "club", icon: ClubIcon, en: "Club", fa: "باشگاه" },
];

export default function BottomNavBar({ activeTab, setActiveTab, isRtl, clubDot = false }) {
  return (
    <nav aria-label={isRtl ? "منوی اصلی" : "Main"}
      className="ui !bg-transparent fixed inset-x-0 bottom-0 z-50 pointer-events-none pb-[max(env(safe-area-inset-bottom),16px)] px-5 select-none">
      <div dir={isRtl ? "rtl" : "ltr"}
        className="pointer-events-auto w-full md:max-w-[472px] mx-auto h-16 p-2 rounded-[32px] bg-bar ring-1 ring-inset ring-bar-edge shadow-bar flex items-center justify-between">
        {TABS.map((tab) => {
          const on = activeTab === tab.id;
          const Icon = tab.icon;
          const label = isRtl ? tab.fa : tab.en;
          return (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
              aria-label={label} aria-current={on ? "page" : undefined}
              className={`relative h-12 min-w-[48px] rounded-3xl flex items-center justify-center gap-2 border-0 bg-transparent cursor-pointer text-sm font-semibold transition-colors ${
                on ? "ps-3.5 pe-[18px] text-on-accent" : "text-hero-muted hover:text-hero-fg"}`}>
              {on && (
                <motion.span layoutId="tab-pill" transition={{ type: "spring", stiffness: 520, damping: 40 }}
                  className="absolute inset-0 rounded-3xl bg-accent" />
              )}
              <Icon className="relative" size={22} />
              {on && <span className="relative">{label}</span>}
              {tab.id === "club" && clubDot && !on && (
                <span aria-hidden="true" className="absolute top-[9px] end-[10px] w-2 h-2 rounded-full bg-accent ring-2 ring-bar" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
