import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import type { Team } from "../types/team";

import {
  loadData,
  saveData,
} from "../services/storageService";

interface ChampionContextType {
  champion: Team | null;
  setChampion: (team: Team | null) => void;
}

const ChampionContext =
  createContext<ChampionContextType>(
    {} as ChampionContextType
  );

export function ChampionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [champion, setChampionState] =
    useState<Team | null>(() =>
      loadData<Team | null>(
        "champion",
        null
      )
    );

  function setChampion(team: Team | null) {
    setChampionState(team);

    saveData(
      "champion",
      team
    );
  }

  return (
    <ChampionContext.Provider
      value={{
        champion,
        setChampion,
      }}
    >
      {children}
    </ChampionContext.Provider>
  );
}

export function useChampion() {
  return useContext(ChampionContext);
}