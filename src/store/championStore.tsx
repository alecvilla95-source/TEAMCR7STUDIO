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

export type ChampionCategory =
  | "MEN"
  | "WOMEN"
  | "GENERAL";

export type Champions = Record<
  ChampionCategory,
  Team | null
>;

interface ChampionContextType {
  champion: Team | null;

  champions: Champions;

  setChampion: (
    team: Team | null,
    category?: ChampionCategory
  ) => void;
}

function emptyChampions(): Champions {
  return {
    MEN: null,
    WOMEN: null,
    GENERAL: null,
  };
}

function normalizeChampions(
  value: unknown
): Champions {
  if (
    value &&
    typeof value === "object" &&
    (
      "MEN" in value ||
      "WOMEN" in value ||
      "GENERAL" in value
    )
  ) {
    const data = value as Partial<Champions>;

    return {
      MEN: data.MEN ?? null,
      WOMEN: data.WOMEN ?? null,
      GENERAL: data.GENERAL ?? null,
    };
  }

  if (
    value &&
    typeof value === "object" &&
    "name" in value
  ) {
    return {
      ...emptyChampions(),
      GENERAL: value as Team,
    };
  }

  return emptyChampions();
}

function getCategoryFromTeam(
  team: Team | null,
  category?: ChampionCategory
): ChampionCategory {
  if (category) return category;

  if (team?.category === "WOMEN") {
    return "WOMEN";
  }

  if (team?.category === "MEN") {
    return "MEN";
  }

  return "GENERAL";
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
  const [champions, setChampions] =
    useState<Champions>(() =>
      normalizeChampions(
        loadData<unknown>(
          "champion",
          emptyChampions()
        )
      )
    );

  const champion =
    champions.GENERAL ??
    champions.MEN ??
    champions.WOMEN ??
    null;

  function setChampion(
    team: Team | null,
    category?: ChampionCategory
  ) {
    if (!team && !category) {
      const clean = emptyChampions();

      setChampions(clean);

      saveData(
        "champion",
        clean
      );

      return;
    }

    const key =
      getCategoryFromTeam(
        team,
        category
      );

    const next: Champions = {
      ...champions,
      [key]: team,
    };

    setChampions(next);

    saveData(
      "champion",
      next
    );
  }

  return (
    <ChampionContext.Provider
      value={{
        champion,
        champions,
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