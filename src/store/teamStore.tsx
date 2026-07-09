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

interface TeamContextType {
  teams: Team[];

  setTeams: (teams: Team[]) => void;
}

const TeamContext =
  createContext<TeamContextType>(
    {} as TeamContextType
  );

export function TeamProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [teams, setTeamsState] =
    useState<Team[]>(() =>
      loadData<Team[]>(
        "teams",
        []
      )
    );

  function setTeams(teams: Team[]) {
    setTeamsState(teams);

    saveData(
      "teams",
      teams
    );
  }

  return (
    <TeamContext.Provider
      value={{
        teams,
        setTeams,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeams() {
  return useContext(TeamContext);
}