import type { Match } from "../types/match";

export function applyResult(
  fixture: Match[],
  matchId: number,
  scoreA: number,
  scoreB: number,
  penaltyA?: number,
  penaltyB?: number
): Match[] {
  const copy = fixture.map((match) => ({
    ...match,
  }));

  const current = copy.find(
    (match) => match.id === matchId
  );

  if (!current) return copy;

  const isGroupMatch =
    current.stage === "GROUP";

  current.scoreA = scoreA;
  current.scoreB = scoreB;

  current.penaltyA = isGroupMatch
    ? undefined
    : penaltyA;

  current.penaltyB = isGroupMatch
    ? undefined
    : penaltyB;

  current.status = "FINISHED";

  let winner = null;

  if (scoreA > scoreB) {
    winner = current.teamA;
  }

  if (scoreB > scoreA) {
    winner = current.teamB;
  }

  if (scoreA === scoreB) {
    if (isGroupMatch) {
      winner = null;
    } else {
      if (
        penaltyA === undefined ||
        penaltyB === undefined ||
        penaltyA === penaltyB
      ) {
        throw new Error(
          "Debe ingresar penales válidos para definir el ganador."
        );
      }

      winner =
        penaltyA > penaltyB
          ? current.teamA
          : current.teamB;
    }
  }

  current.winner = winner;

  if (
    !isGroupMatch &&
    current.nextMatchId &&
    current.nextSlot &&
    winner
  ) {
    const next = copy.find(
      (match) => match.id === current.nextMatchId
    );

    if (next) {
      if (current.nextSlot === "A") {
        next.teamA = winner;
      } else {
        next.teamB = winner;
      }

      if (next.teamA && next.teamB) {
        next.status = "PENDING";
      }
    }
  }

  return copy;
}