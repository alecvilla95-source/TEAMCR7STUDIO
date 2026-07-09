import type { Team } from "../types/team";

export interface PreparedTeams {
  bracketSize: number;
  byeCount: number;
  firstRoundMatches: number;

  playingTeams: Team[];
  byeTeams: Team[];
}

function nextPowerOfTwo(value: number): number {
  return 2 ** Math.ceil(Math.log2(value));
}

export function prepareTeams(
  teams: Team[]
): PreparedTeams {

  if (teams.length < 2) {
    throw new Error("Se necesitan al menos 2 equipos.");
  }

  const bracketSize = nextPowerOfTwo(teams.length);

  const byeCount = bracketSize - teams.length;

  const firstRoundMatches =
    (teams.length - byeCount) / 2;

  const playingTeams = teams.slice(
    0,
    firstRoundMatches * 2
  );

  const byeTeams = teams.slice(
    firstRoundMatches * 2
  );

  return {
    bracketSize,
    byeCount,
    firstRoundMatches,
    playingTeams,
    byeTeams,
  };

}