import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import type { GoalScorerRecord } from "../types/goal";

import {
  loadData,
  saveData,
} from "../services/storageService";

interface GoalContextType {
  goalRecords: GoalScorerRecord[];

  setGoalRecords: (
    records: GoalScorerRecord[]
  ) => void;

  setGoalsForMatch: (
    matchId: number,
    records: GoalScorerRecord[]
  ) => void;

  getGoalsByMatch: (
    matchId: number
  ) => GoalScorerRecord[];

  clearGoals: () => void;
}

const GoalContext =
  createContext<GoalContextType>(
    {} as GoalContextType
  );

export function GoalProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [goalRecords, setGoalRecordsState] =
    useState<GoalScorerRecord[]>(() =>
      loadData<GoalScorerRecord[]>(
        "goalRecords",
        []
      )
    );

  function saveGoalRecords(
    records: GoalScorerRecord[]
  ) {
    setGoalRecordsState(records);

    saveData(
      "goalRecords",
      records
    );
  }

  function setGoalRecords(
    records: GoalScorerRecord[]
  ) {
    saveGoalRecords(records);
  }

  function setGoalsForMatch(
    matchId: number,
    records: GoalScorerRecord[]
  ) {
    const otherRecords =
      goalRecords.filter(
        (record) => record.matchId !== matchId
      );

    saveGoalRecords([
      ...otherRecords,
      ...records,
    ]);
  }

  function getGoalsByMatch(
    matchId: number
  ) {
    return goalRecords.filter(
      (record) => record.matchId === matchId
    );
  }

  function clearGoals() {
    saveGoalRecords([]);
  }

  return (
    <GoalContext.Provider
      value={{
        goalRecords,
        setGoalRecords,
        setGoalsForMatch,
        getGoalsByMatch,
        clearGoals,
      }}
    >
      {children}
    </GoalContext.Provider>
  );
}

export function useGoals() {
  return useContext(GoalContext);
}