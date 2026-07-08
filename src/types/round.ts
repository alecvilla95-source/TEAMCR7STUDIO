import type { Match } from "./match";

export interface Round {

  id: number;

  name: string;

  order: number;

  matches: Match[];

}