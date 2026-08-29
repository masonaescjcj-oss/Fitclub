import React from "react";
import { Dumbbell, Utensils, Brain, MessageSquare, CheckSquare } from "lucide-react";

export default function BottomNavBar({ activeTab, setActiveTab, isRtl }) {
  const tabs = [
    {
      id: "fitness",
      icon: Dumbbell,
    },
    {
      id: "diet",
      icon: Utensils,
    },
    {
      id: "aiCoach",
      icon: Brain,
    },
    {
      id: "chat",
      icon: MessageSquare,
    },
    {
      id: "checklist",
      icon: CheckSquare,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-t border-white/10 select-none">
      <div className="w-full md:max-w-lg mx-auto h-14 flex items-center justify-around px-2" dir={isRtl ? "rtl" : "ltr"}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="relative flex items-center justify-center flex-1 h-full transition-all duration-200 group focus:outline-none"
            >
              {/* Icon */}
              <div
                className={`transition-all duration-200 flex items-center justify-center ${
                  isActive
                    ? "text-[#844783] scale-110"
                    : "text-neutral-500 group-hover:text-white group-hover:scale-105"
                }`}
              >
                <Icon className="w-6 h-6 stroke-[2.2]" />
              </div>

              {/* Active Indicator Line / Dot at bottom edge */}
              {isActive && (
                <div className="absolute bottom-0 w-8 h-1 rounded-t-full bg-[#844783] shadow-[0_-2px_10px_#844783]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
