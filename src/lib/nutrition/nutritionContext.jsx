import React, { createContext, useContext } from "react";
import useNutrition from "../../hooks/useNutrition";

/** One shared diary for the app shell, for the same reason checklists have one. */
const NutritionContext = createContext(null);

export function NutritionProvider({ children }) {
  const store = useNutrition();
  return <NutritionContext.Provider value={store}>{children}</NutritionContext.Provider>;
}

export function useNutritionStore() {
  const store = useContext(NutritionContext);
  if (!store) throw new Error("useNutritionStore must be used inside a NutritionProvider");
  return store;
}
