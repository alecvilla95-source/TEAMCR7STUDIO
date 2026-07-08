import type { Match } from "../types/match";

export function updateMatch(
  fixture: Match[],
  matchId: number,
  scoreA: number,
  scoreB: number
): Match[] {

  const matches = [...fixture];

  const match = matches.find(
    (m) => m.id === matchId
  );

  if (!match) return matches;

  match.scoreA = scoreA;
  match.scoreB = scoreB;

  match.status = "FINISHED";

  const winner =
    scoreA > scoreB
      ? match.teamA
      : match.teamB;

  match.winner = winner;

  if (
    match.nextMatchId &&
    winner
  ) {

    const next = matches.find(
      (m) => m.id === match.nextMatchId
    );

    if (next) {

      if (match.nextSlot === "A")
        next.teamA = winner;

      if (match.nextSlot === "B")
        next.teamB = winner;

    }

  }

  return matches;

}