import type { Match } from "../types/match";

export function linkMatches(matches: Match[]): Match[] {

  // Copia profunda
  const fixture = matches.map(match => ({
    ...match,
  }));

  // Obtener todas las rondas
  const totalRounds = Math.max(
    ...fixture.map(match => match.round)
  );

  for (let round = 1; round < totalRounds; round++) {

    const current = fixture.filter(
      match => match.round === round
    );

    const next = fixture.filter(
      match => match.round === round + 1
    );

    current.forEach((match, index) => {

      const nextMatch =
        next[Math.floor(index / 2)];

      if (!nextMatch) return;

      match.nextMatchId = nextMatch.id;

      match.nextSlot =
        index % 2 === 0
          ? "A"
          : "B";

    });

  }

  return fixture;

}