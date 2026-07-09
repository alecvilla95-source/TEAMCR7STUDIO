import type { Team } from "../types/team";
import type { Match } from "../types/match";
import type { Tournament } from "../types/tournament";

import { generateFixtureV2 } from "./fixtureEngineV2";
import { buildGroupStage } from "./groupEngine";
import { scheduleMatches } from "./scheduleEngine";

export function buildTournament(
  tournament: Tournament,
  teams: Team[]
): Match[] {
  let matches: Match[] = [];

  if (tournament.mode === "GROUPS") {
    matches = buildGroupStage(teams);
  } else {
    matches = generateFixtureV2(teams);
  }

  return scheduleMatches(
    matches,
    tournament.courts,
    tournament.startTime,
    tournament.duration,
    tournament.breaks
  );
}