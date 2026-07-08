import type { Team } from "../types/team";

export interface ByeResult {
  playingTeams: Team[];
  byeTeams: Team[];
}

export function calculateByes(
  registeredTeams: Team[],
  bracketSize: number
): ByeResult {

  const byeCount = Math.max(
    0,
    bracketSize - registeredTeams.length
  );

  if (byeCount === 0) {
    return {
      playingTeams: registeredTeams,
      byeTeams: [],
    };
  }

  const playingTeams = registeredTeams.slice(
    0,
    registeredTeams.length - byeCount
  );

  const byeTeams = registeredTeams.slice(
    registeredTeams.length - byeCount
  );

  return {
    playingTeams,
    byeTeams,
  };

}