import type { Tournament } from "./tournament";
import type { Team } from "./team";
import type { Match } from "./match";

export interface AppData {
  tournament: Tournament | null;
  teams: Team[];
  fixture: Match[];
}