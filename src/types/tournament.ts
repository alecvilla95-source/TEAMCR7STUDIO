import type { Round } from "./round";

export type TournamentMode =
  | "ELIMINATION"
  | "GROUPS";

export type TournamentCourtMode =
  | "SHARED"
  | "SEPARATE_BRACKETS";

export interface TournamentBreaks {
  default: number;
  group: number;
  quarterFinal: number;
  semifinal: number;
  final: number;
}

export interface Tournament {
  id: string;

  name: string;

  mode: TournamentMode;

  courtMode: TournamentCourtMode;

  teams: number;

  courts: number;

  startTime: string;

  duration: number;

  breaks: TournamentBreaks;

  createdAt: Date;

  rounds: Round[];
}