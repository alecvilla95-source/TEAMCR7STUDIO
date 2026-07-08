import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import type { Team } from "../types/team";

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
  const [champion, setChampion] =
    useState<Team | null>(null);

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