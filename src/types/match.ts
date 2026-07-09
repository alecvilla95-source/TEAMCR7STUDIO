import type {
  Team,
  TeamCategory,
} from "./team";

export type MatchStatus =
  | "PENDING"
  | "PLAYING"
  | "FINISHED";

export type MatchStage =
  | "ELIMINATION"
  | "GROUP";

export interface Match {
  id: number;

  round: number;

  order: number;

  court: number;

  courtLabel?: string;

  category?: TeamCategory;

  time: string;

  teamA: Team | null;

  teamB: Team | null;

  scoreA: number;

  scoreB: number;

  penaltyA?: number;

  penaltyB?: number;

  winner: Team | null;

  status: MatchStatus;

  nextMatchId: number | null;

  nextSlot: "A" | "B" | null;

  sourceMatchA?: number | null;

  sourceMatchB?: number | null;

  stage?: MatchStage;

  groupName?: string;
}