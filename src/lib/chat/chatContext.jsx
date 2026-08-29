import React, { createContext, useContext } from "react";
import useChat from "../../hooks/useChat";

const ChatContext = createContext(null);

export function ChatProvider({ lang, children }) {
  const store = useChat(lang);
  return <ChatContext.Provider value={store}>{children}</ChatContext.Provider>;
}

export function useChatStore() {
  const store = useContext(ChatContext);
  if (!store) throw new Error("useChatStore must be used inside a ChatProvider");
  return store;
}
