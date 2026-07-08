import type { Tournament } from "../types/tournament";
import type { Team } from "../types/team";
import type { Match } from "../types/match";

export interface AppState {

  tournament: Tournament | null;

  teams: Team[];

  fixture: Match[];

}