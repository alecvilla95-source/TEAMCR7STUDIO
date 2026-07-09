import type { Match } from "../types/match";
import type { Team } from "../types/team";

function nextPowerOfTwo(value: number): number {
  return 2 ** Math.ceil(Math.log2(value));
}

export function generateFixture(
  teams: Team[],
  firstRoundMatches: number
): Match[] {

  const matches: Match[] = [];

  let matchId = 1;

  // ---------- Primera ronda ----------
for (let i = 0; i < firstRoundMatches; i++) {

  matches.push({
    id: matchId++,
    round: 1,
    order: i + 1,
    court: 0,
    time: "",

    teamA: teams[i * 2],
    teamB: teams[i * 2 + 1],

    scoreA: 0,
    scoreB: 0,

    winner: null,

    status: "PENDING",

    nextMatchId: null,
    nextSlot: null,
  });

}

  // Cantidad de partidos de la primera ronda
  let matchesInRound = firstRoundMatches;

  let round = 2;

  // ---------- Rondas siguientes ----------
  while (matchesInRound > 1) {

    const nextRoundMatches = Math.ceil(
      matchesInRound / 2
    );

    for (let i = 0; i < nextRoundMatches; i++) {

      matches.push({
        id: matchId++,
        round,
        order: i + 1,
        court: 0,
        time: "",

        teamA: null,
        teamB: null,

        scoreA: 0,
        scoreB: 0,

        winner: null,

        status: "PENDING",

        nextMatchId: null,
        nextSlot: null,
      });

    }

    matchesInRound = nextRoundMatches;

    round++;

  }

  return matches;

}