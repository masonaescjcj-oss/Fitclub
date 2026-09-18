import React, { createContext, useContext } from "react";
import useTraining from "../../hooks/useTraining";

const TrainingContext = createContext(null);

export function TrainingProvider({ children }) {
  const store = useTraining();
  return <TrainingContext.Provider value={store}>{children}</TrainingContext.Provider>;
}

export function useTrainingStore() {
  const store = useContext(TrainingContext);
  if (!store) throw new Error("useTrainingStore must be used inside a TrainingProvider");
  return store;
}
