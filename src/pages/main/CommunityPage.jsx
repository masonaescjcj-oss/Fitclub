import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useChatT } from "../../lib/chat/chatI18n";
import { useChatStore } from "../../lib/chat/chatContext";
import ChatList from "../../components/chat/ChatList";
import ChatView from "../../components/chat/ChatView";
import Drawer from "../../components/chat/Drawer";
import ContactsScreen from "../../components/chat/ContactsScreen";
import CallsScreen from "../../components/chat/CallsScreen";
import SettingsScreen from "../../components/chat/SettingsScreen";
import ProfileScreen from "../../components/chat/ProfileScreen";
import { ChatActionsSheet } from "../../components/chat/ChatSheets";
import { loadSession } from "../../lib/session";

/** The messenger: chat list plus the Telegram-style shell around it. */
export default function CommunityPage({ isRtl }) {
  const t = useChatT(isRtl);
  const store = useChatStore();
  const [menuChat, setMenuChat] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState("");

  const name = loadSession().name || "Isaac";
  const open = store.openedChat;

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(id);
  }, [toast]);

  const go = (target) => {
    setDrawer(false);
    if (target === "saved") { store.openChat("saved"); store.setScreen("list"); }
    else store.setScreen(target);
  };

  const toggleLanguage = () => {
    const next = (localStorage.getItem("language") || "en") === "fa" ? "en" : "fa";
    localStorage.setItem("language", next);
    store.bump(); // MainAppShell re-reads the language on the next render
  };

  const screenView = () => {
    switch (store.screen) {
      case "contacts":
        return <ContactsScreen store={store} isRtl={isRtl} t={t}
          onBack={() => store.setScreen("list")} onGoCalls={() => store.setScreen("calls")} />;
      case "calls":
        return <CallsScreen isRtl={isRtl} t={t}
          onBack={() => store.setScreen("list")} onToast={setToast} />;
      case "settings":
        return <SettingsScreen store={store} name={name} isRtl={isRtl} t={t}
          onBack={() => store.setScreen("list")}
          onGoProfile={() => store.setScreen("profile")}
          onToast={setToast} onToggleLanguage={toggleLanguage} />;
      case "profile":
        return <ProfileScreen store={store} name={name} isRtl={isRtl} t={t}
          onBack={() => store.setScreen("list")}
          onGoSettings={() => store.setScreen("settings")}
          onOpenChannel={() => { store.openChat("news"); store.setScreen("list"); }} />;
      default:
        return <ChatList store={store} isRtl={isRtl} t={t}
          onOpen={store.openChat}
          onMenu={setMenuChat}
          onCompose={() => store.setScreen("contacts")}
          onOpenDrawer={() => setDrawer(true)} />;
    }
  };

  return (
    <div className="w-full" dir={isRtl ? "rtl" : "ltr"}>
      <AnimatePresence mode="wait">
        <motion.div key={open ? `chat-${open.id}` : store.screen}
          initial={{ opacity: 0, x: isRtl ? -16 : 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isRtl ? -16 : 16 }}
          transition={{ duration: 0.15 }}>
          {open
            ? <ChatView store={store} chat={open} isRtl={isRtl} t={t} onBack={store.closeChat} />
            : screenView()}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {drawer && (
          <Drawer me={store.me} name={name} unread={store.unreadTotal} isRtl={isRtl} t={t}
            onGo={go} onClose={() => setDrawer(false)} onToast={setToast} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menuChat && (
          <ChatActionsSheet chat={menuChat} isRtl={isRtl} t={t}
            onPin={() => { store.togglePinned(menuChat.id); setMenuChat(null); }}
            onMute={() => { store.toggleMuted(menuChat.id); setMenuChat(null); }}
            onArchive={() => { store.toggleArchived(menuChat.id); setMenuChat(null); }}
            onRead={() => { store.markRead(menuChat.id); setMenuChat(null); }}
            onDelete={() => {
              if (window.confirm(t.deleteChatConfirm)) store.deleteChat(menuChat.id);
              setMenuChat(null);
            }}
            onClose={() => setMenuChat(null)} />
        )}
      </AnimatePresence>

      {toast && (
        <div className="fixed bottom-24 inset-x-0 flex justify-center z-[80] pointer-events-none">
          <span className="px-4 py-2 rounded-full bg-white/15 backdrop-blur text-xs font-black text-white max-w-[85%] text-center">
            {toast}
          </span>
        </div>
      )}
    </div>
  );
}
