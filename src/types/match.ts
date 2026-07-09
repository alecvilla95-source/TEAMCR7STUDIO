import type { Team } from "./team";

export type MatchStatus =
  | "PENDING"
  | "PLAYING"
  | "FINISHED";

export interface Match {

  id: number;

  round: number;

  order: number;

  court: number;

  time: string;

  teamA: Team | null;

  teamB: Team | null;

  scoreA: number;

  scoreB: number;

  winner: Team | null;

  status: MatchStatus;

  nextMatchId: number | null;

  nextSlot: "A" | "B" | null;

  sourceMatchA?: number | null;

  sourceMatchB?: number | null;

}
