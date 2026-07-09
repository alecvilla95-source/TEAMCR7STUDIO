import type { Match } from "../types/match";

export function linkMatches(matches: Match[]): Match[] {

  const fixture = matches.map(match => ({
    ...match,
    sourceMatchA: null,
    sourceMatchB: null,
  }));

  const totalRounds = Math.max(
    ...fixture.map(match => match.round)
  );

  for (let round = 1; round < totalRounds; round++) {

    const current = fixture
      .filter(match => match.round === round)
      .sort((a, b) => a.order - b.order);

    const next = fixture
      .filter(match => match.round === round + 1)
      .sort((a, b) => a.order - b.order);

    for (let i = 0; i < current.length; i += 2) {

      const nextMatch = next[Math.floor(i / 2)];

      if (!nextMatch) continue;

      const first = current[i];
      const second = current[i + 1];

      if (first) {
        first.nextMatchId = nextMatch.id;
        first.nextSlot = "A";
        nextMatch.sourceMatchA = first.id;
      }

      if (second) {
        second.nextMatchId = nextMatch.id;
        second.nextSlot = "B";
        nextMatch.sourceMatchB = second.id;
      }

    }

  }

  return fixture;

}