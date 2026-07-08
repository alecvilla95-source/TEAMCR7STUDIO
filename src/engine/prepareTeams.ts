import type { Team } from "../types/team";

export interface PreparedTeams {
  playingTeams: Team[];
  byeTeams: Team[];
}

export function prepareTeams(
  teams: Team[],
  bracketSize: number
): PreparedTeams {

  const byeCount = bracketSize - teams.length;

  if (byeCount <= 0) {
    return {
      playingTeams: teams,
      byeTeams: [],
    };
  }

  const playingTeams = teams.slice(
    0,
    teams.length - byeCount
  );

  const byeTeams = teams.slice(
    teams.length - byeCount
  );

  return {
    playingTeams,
    byeTeams,
  };

}