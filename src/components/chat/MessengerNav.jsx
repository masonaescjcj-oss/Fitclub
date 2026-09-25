import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Settings, Users } from "lucide-react";
import { ClubIcon } from "../ui/icons";
import { num } from "../ui/kit";

/**
 * The messenger's own bottom bar, in the app's floating ink pill: Chats,
 * Contacts and Settings, and apart from it a round button back to the app.
 * It takes the place of the app's tab bar, so the messenger reads as a
 * place of its own.
 */
export default function MessengerNav({ screen, onScreen, onBack, unread = 0, isRtl, t }) {
  const Back = isRtl ? ArrowRight : ArrowLeft;
  const tabs = [
    { id: "list", icon: ClubIcon, label: t.chats, badge: unread },
    { id: "contacts", icon: Users, label: t.contactsTab },
    { id: "settings", icon: Settings, label: t.settingsTab },
  ];
  return (
    <div className="ui !bg-transparent fixed inset-x-0 bottom-0 z-50 pointer-events-none pb-[max(env(safe-area-inset-bottom),16px)] px-5 select-none">
      <div dir={isRtl ? "rtl" : "ltr"} className="pointer-events-auto w-full md:max-w-[472px] mx-auto flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label={t.backToApp}
          className="w-16 h-16 shrink-0 rounded-full bg-bar text-hero-fg ring-1 ring-inset ring-bar-edge shadow-bar flex items-center justify-center border-0 p-0 cursor-pointer transition-transform active:scale-95">
          <Back className="w-6 h-6" strokeWidth={2.2} />
        </button>

        <nav aria-label={t.sectionsLabel}
          className="flex-1 min-w-0 h-16 p-2 rounded-[32px] bg-bar ring-1 ring-inset ring-bar-edge shadow-bar flex items-center gap-1">
          {tabs.map((tab) => {
            const on = screen === tab.id;
            const Icon = tab.icon;
            return (
              <button key={tab.id} type="button" onClick={() => onScreen(tab.id)}
                aria-current={on ? "page" : undefined}
                className={`relative flex-1 min-w-0 h-12 rounded-3xl flex flex-col items-center justify-center gap-0.5 border-0 bg-transparent cursor-pointer transition-colors ${
                  on ? "text-on-accent" : "text-hero-muted hover:text-hero-fg"}`}>
                {on && (
                  <motion.span layoutId="messenger-tab-pill" transition={{ type: "spring", stiffness: 520, damping: 40 }}
                    className="absolute inset-0 rounded-3xl bg-accent" />
                )}
                <span className="relative">
                  <Icon className="block" size={20} />
                  {tab.badge > 0 && (
                    <span aria-hidden="true"
                      className={`absolute -top-1.5 -end-3 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-none inline-flex items-center justify-center ring-2 ${
                        on ? "bg-jet text-accent ring-accent" : "bg-accent text-on-accent ring-bar"}`}>
                      {num(tab.badge > 99 ? "99+" : tab.badge, isRtl)}
                    </span>
                  )}
                </span>
                <span className="relative max-w-full truncate text-[11px] font-semibold leading-tight">{tab.label}</span>
                {tab.badge > 0 && <span className="sr-only">{t.unreadChats(num(tab.badge, isRtl))}</span>}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
