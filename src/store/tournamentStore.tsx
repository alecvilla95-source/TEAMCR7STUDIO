import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import type {
  Tournament,
  TournamentMode,
  TournamentCourtMode,
  TournamentBreaks,
} from "../types/tournament";

import {
  loadData,
  saveData,
} from "../services/storageService";

interface CreateTournamentData {
  name: string;
  mode: TournamentMode;
  courtMode: TournamentCourtMode;
  teams: number;
  courts: number;
  startTime: string;
  duration: number;
  breaks: TournamentBreaks;
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

      courtMode: data.courtMode,

      teams: data.teams,

      courts: data.courts,

      startTime: data.startTime,

      duration: data.duration,

      breaks: data.breaks,

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