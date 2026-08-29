import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useChatT } from "../../lib/chat/chatI18n";
import { useChatStore } from "../../lib/chat/chatContext";
import ChatList from "../../components/chat/ChatList";
import ChatView from "../../components/chat/ChatView";
import { ChatActionsSheet } from "../../components/chat/ChatSheets";

export default function CommunityPage({ isRtl }) {
  const t = useChatT(isRtl);
  const store = useChatStore();
  const [menuChat, setMenuChat] = useState(null);

  const open = store.openedChat;

  return (
    <div className="w-full" dir={isRtl ? "rtl" : "ltr"}>
      <AnimatePresence mode="wait">
        {open ? (
          <motion.div key={`chat-${open.id}`}
            initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRtl ? -20 : 20 }}
            transition={{ duration: 0.16 }}>
            <ChatView store={store} chat={open} isRtl={isRtl} t={t} onBack={store.closeChat} />
          </motion.div>
        ) : (
          <motion.div key="list"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}>
            <ChatList
              store={store} isRtl={isRtl} t={t}
              onOpen={store.openChat}
              onMenu={setMenuChat}
              onCompose={() => store.openChat("saved")}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menuChat && (
          <ChatActionsSheet
            chat={menuChat} isRtl={isRtl} t={t}
            onPin={() => { store.togglePinned(menuChat.id); setMenuChat(null); }}
            onMute={() => { store.toggleMuted(menuChat.id); setMenuChat(null); }}
            onArchive={() => { store.toggleArchived(menuChat.id); setMenuChat(null); }}
            onRead={() => { store.markRead(menuChat.id); setMenuChat(null); }}
            onDelete={() => {
              if (window.confirm(t.deleteChatConfirm)) store.deleteChat(menuChat.id);
              setMenuChat(null);
            }}
            onClose={() => setMenuChat(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
