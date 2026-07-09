import type { Round } from "./round";

export type TournamentMode =
  | "ELIMINATION"
  | "GROUPS";

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

  teams: number;

  courts: number;

  startTime: string;

  duration: number;

  breaks: TournamentBreaks;

  createdAt: Date;

  rounds: Round[];
}