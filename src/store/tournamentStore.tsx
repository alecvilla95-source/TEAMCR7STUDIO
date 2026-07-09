import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import type {
  Tournament,
  TournamentMode,
} from "../types/tournament";

import {
  loadData,
  saveData,
} from "../services/storageService";

interface CreateTournamentData {
  name: string;
  mode: TournamentMode;
  teams: number;
  courts: number;
  startTime: string;
  duration: number;
}

interface TournamentContextType {
  tournament: Tournament | null;

  createTournament: (
    data: CreateTournamentData
  ) => void;
}

const TournamentContext =
  createContext<TournamentContextType>(
    {} as TournamentContextType
  );

export function TournamentProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [tournament, setTournament] =
    useState<Tournament | null>(() =>
      loadData<Tournament | null>(
        "tournament",
        null
      )
    );

  function createTournament(
    data: CreateTournamentData
  ) {
    const tournament: Tournament = {
      id: crypto.randomUUID(),

      name: data.name,

      mode: data.mode,

      teams: data.teams,

      courts: data.courts,

      startTime: data.startTime,

      duration: data.duration,

      createdAt: new Date(),

      rounds: [],
    };

    setTournament(tournament);

    saveData(
      "tournament",
      tournament
    );
  }

  return (
    <TournamentContext.Provider
      value={{
        tournament,
        createTournament,
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  return useContext(TournamentContext);
}