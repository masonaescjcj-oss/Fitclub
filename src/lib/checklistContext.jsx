import React, { createContext, useContext } from "react";
import useChecklists from "../hooks/useChecklists";

/**
 * One shared checklist store for the whole app shell.
 * Calling useChecklists() in two places would create two independent copies
 * that drift apart, so everything reads through this provider instead.
 */
const ChecklistContext = createContext(null);

export function ChecklistProvider({ children }) {
  const store = useChecklists();
  return <ChecklistContext.Provider value={store}>{children}</ChecklistContext.Provider>;
}

export function useChecklistStore() {
  const store = useContext(ChecklistContext);
  if (!store) throw new Error("useChecklistStore must be used inside a ChecklistProvider");
  return store;
}
