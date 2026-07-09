import type { Match } from "../types/match";
import type { Round } from "../types/round";

import { getRoundName } from "./tournamentUtils";

export function groupMatches(
  matches: Match[]
): Round[] {
  const rounds: Round[] = [];

  const map = new Map<string, Match[]>();

  matches.forEach((match) => {
    const key =
      match.groupName ??
      `ROUND_${match.round}`;

    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key)!.push(match);
  });

  Array.from(map.entries()).forEach(
    ([key, list], index) => {
      const sorted = [...list].sort(
        (a, b) => a.order - b.order
      );

      const firstMatch = sorted[0];

      rounds.push({
        id: index + 1,

        order: index + 1,

        name:
          firstMatch?.groupName ??
          getRoundName(sorted.length * 2),

        matches: sorted,
      });
    }
  );

  return rounds;
}