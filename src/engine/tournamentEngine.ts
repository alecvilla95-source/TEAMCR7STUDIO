import type { Team } from "../types/team";
import type { Match } from "../types/match";
import type { Tournament } from "../types/tournament";

import { generateFixture } from "./fixtureEngine";
import { scheduleMatches } from "./scheduleEngine";

export function buildTournament(
  tournament: Tournament,
  teams: Team[]
): Match[] {

  const matches = generateFixture(teams);

  return scheduleMatches(
    matches,
    tournament.courts,
    tournament.startTime,
    tournament.duration
  );

}
