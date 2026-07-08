import type { Match } from "../types/match";
import type { Round } from "../types/round";

import { getRoundName } from "./tournamentUtils";

export function groupMatches(matches: Match[]): Round[] {
  const rounds: Round[] = [];

  const map = new Map<number, Match[]>();

  matches.forEach((match) => {
    if (!map.has(match.round)) {
      map.set(match.round, []);
    }

    map.get(match.round)!.push(match);
  });

  Array.from(map.entries()).forEach(([round, list]) => {
    rounds.push({
      id: round,
      order: round,
      name: getRoundName(list.length * 2),
      matches: list,
    });
  });

  return rounds;
}