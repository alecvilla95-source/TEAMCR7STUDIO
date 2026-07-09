import type { Match } from "../types/match";
import type { Team } from "../types/team";

function nextPowerOfTwo(value: number) {
  return 2 ** Math.ceil(Math.log2(value));
}

export function generateFixtureV2(
  teams: Team[]
): Match[] {

  const bracketSize = nextPowerOfTwo(teams.length);

  const totalRounds =
    Math.log2(bracketSize);

  const matches: Match[] = [];

  let id = 1;

  let matchesInRound =
    bracketSize / 2;

  for (
    let round = 1;
    round <= totalRounds;
    round++
  ) {

    for (
      let order = 1;
      order <= matchesInRound;
      order++
    ) {

      matches.push({

        id: id++,

        round,

        order,

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

        sourceMatchA: null,

        sourceMatchB: null,

      });

    }

    matchesInRound /= 2;

  }

  return matches;

}