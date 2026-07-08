import type { Team } from "../types/team";
import type { Tournament } from "../types/tournament";
import type { TournamentBracket } from "../types/tournamentBracket";

import { calculateByes } from "./calculateByes";
import { generateFixture } from "./fixtureEngine";
import { linkMatches } from "./linkMatches";
import { scheduleMatches } from "./scheduleEngine";

export function buildTournament(
  tournament: Tournament,
  teams: Team[]
): TournamentBracket {

  const {
    playingTeams,
    byeTeams,
  } = calculateByes(
    teams,
    tournament.teams
  );

  const matches = scheduleMatches(
    linkMatches(
      generateFixture(playingTeams)
    ),
    tournament.courts,
    tournament.startTime,
    tournament.duration
  );

  return {
    matches,
    byeTeams,
  };

}