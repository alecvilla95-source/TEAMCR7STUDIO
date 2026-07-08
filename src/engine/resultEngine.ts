import type { Match } from "../types/match";

export function applyResult(
  fixture: Match[],
  matchId: number,
  scoreA: number,
  scoreB: number
): Match[] {

  const copy = fixture.map(match => ({
    ...match,
  }));

  const current = copy.find(
    match => match.id === matchId
  );

  if (!current) return copy;

  current.scoreA = scoreA;
  current.scoreB = scoreB;

  current.status = "FINISHED";

  const winner =
    scoreA > scoreB
      ? current.teamA
      : current.teamB;

  current.winner = winner;

  if (
    current.nextMatchId &&
    current.nextSlot &&
    winner
  ) {

    const next = copy.find(
      match => match.id === current.nextMatchId
    );

    if (next) {

      if (current.nextSlot === "A") {
        next.teamA = winner;
      } else {
        next.teamB = winner;
      }

      // Cuando ambos equipos estén definidos,
      // el partido queda listo para jugar.
      if (next.teamA && next.teamB) {
        next.status = "PENDING";
      }

    }

  }

  return copy;

}