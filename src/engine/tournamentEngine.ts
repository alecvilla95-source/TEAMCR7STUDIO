import type { Team } from "../types/team";
import type { Tournament } from "../types/tournament";
import type { TournamentBracket } from "../types/tournamentBracket";

import { calculateByes } from "./calculateByes";
import { generateFixture } from "./fixtureEngine";
import { linkMatches } from "./linkMatches";
import { placeByes } from "./placeByes";
import { scheduleMatches } from "./scheduleEngine";

export function buildTournament(
  tournament: Tournament,
  teams: Team[]
): TournamentBracket {

  const prepared = calculateByes(teams);

  let matches = generateFixture(
    prepared.playingTeams,
    prepared.firstRoundMatches
  );

  matches = linkMatches(matches);

  matches = placeByes(
    matches,
    prepared.byeTeams
  );

  matches = scheduleMatches(
    matches,
    tournament.courts,
    tournament.startTime,
    tournament.duration
  );

  return {
    matches,
    byeTeams: prepared.byeTeams,
  };

}