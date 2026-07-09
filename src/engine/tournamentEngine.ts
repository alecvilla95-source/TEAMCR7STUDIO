import type { Team } from "../types/team";
import type { Match } from "../types/match";
import type { Tournament } from "../types/tournament";

import { generateFixtureV2 } from "./fixtureEngineV2";
import { buildGroupStage } from "./groupEngine";
import { buildCourtBrackets } from "./courtBracketEngine";
import { scheduleMatches } from "./scheduleEngine";

export function buildTournament(
  tournament: Tournament,
  teams: Team[]
): Match[] {
  let matches: Match[] = [];

  if (tournament.mode === "GROUPS") {
    matches = buildGroupStage(teams);
  } else if (
    tournament.courtMode === "SEPARATE_BRACKETS" &&
    tournament.courts > 1
  ) {
    matches = buildCourtBrackets(
      teams,
      tournament.courts
    );
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