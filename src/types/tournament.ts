import type { Round } from "./round";

export type TournamentMode =
  | "ELIMINATION"
  | "GROUPS";

export interface Tournament {

  id: string;

  name: string;

  mode: TournamentMode;

  teams: number;

  courts: number;

  startTime: string;

  duration: number;

  createdAt: Date;

  rounds: Round[];

}