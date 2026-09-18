import React, { createContext, useContext } from "react";
import useCoach from "../../hooks/useCoach";

/**
 * One coach conversation for the whole app shell, so a reply that is still
 * streaming survives a hop to another tab and back.
 */
const CoachContext = createContext(null);

export function CoachProvider({ isRtl, children }) {
  const store = useCoach(isRtl);
  return <CoachContext.Provider value={store}>{children}</CoachContext.Provider>;
}

export function useCoachStore() {
  const store = useContext(CoachContext);
  if (!store) throw new Error("useCoachStore must be used inside a CoachProvider");
  return store;
}
