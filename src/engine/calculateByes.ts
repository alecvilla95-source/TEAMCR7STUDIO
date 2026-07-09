import type { Team } from "../types/team";
import { prepareTeams } from "./prepareTeams";

export function calculateByes(
  teams: Team[]
) {
  return prepareTeams(teams);
}