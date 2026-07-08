import type { Team } from "../types/team";
import type { Match } from "../types/match";

export interface FirstRoundResult {
  matches: Match[];
  byeTeams: Team[];
}

export function generateFirstRound(
  teams: Team[],
  playingTeams: number
): FirstRoundResult {

  const matches: Match[] = [];

  const byeTeams = teams.slice(playingTeams);

  let id = 1;

  for (let i = 0; i < playingTeams; i += 2) {

    matches.push({
      id,
      round: 1,
      order: id,
      court: 0,
      time: "",

      teamA: teams[i],
      teamB: teams[i + 1],

      scoreA: 0,
      scoreB: 0,

      winner: null,

      status: "PENDING",

      nextMatchId: null,
      nextSlot: null,
    });

    id++;

  }

  return {
    matches,
    byeTeams,
  };

}