import { createContext, useContext, useState, type ReactNode } from "react";
import type { Team } from "../types/team";

interface TeamContextType {
  teams: Team[];
  setTeams: (teams: Team[]) => void;
}

const TeamContext = createContext<TeamContextType>(
  {} as TeamContextType
);

export function TeamProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [teams, setTeams] = useState<Team[]>([]);

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