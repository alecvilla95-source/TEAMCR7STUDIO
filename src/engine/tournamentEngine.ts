import type { Team } from "../types/team";
import type { Match } from "../types/match";
import type { Tournament } from "../types/tournament";

import { generateFixtureV2 } from "./fixtureEngineV2";
import { buildGroupStage } from "./groupEngine";
import { buildCourtBrackets } from "./courtBracketEngine";
import { scheduleMatches } from "./scheduleEngine";

function getNextMatchId(matches: Match[]) {
  if (matches.length === 0) {
    return 1;
  }

  return Math.max(
    ...matches.map((match) => match.id)
  ) + 1;
}

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
    const menTeams = teams.filter(
      (team) => team.category !== "WOMEN"
    );

    const womenTeams = teams.filter(
      (team) => team.category === "WOMEN"
    );

    const menMatches =
      buildCourtBrackets(
        menTeams,
        tournament.courts,
        {
          startId: 1,
          category: "MEN",
          courtLabelPrefix: "Cancha",
          finalLabel: "Final Varones",
        }
      );

    const womenMatches =
      tournament.womenCourts > 0
        ? buildCourtBrackets(
            womenTeams,
            tournament.womenCourts,
            {
              startId: getNextMatchId(menMatches),
              category: "WOMEN",
              courtLabelPrefix: "C. Mujer",
              finalLabel: "Final Mujeres",
            }
          )
        : [];

    matches = [
      ...menMatches,
      ...womenMatches,
    ];
  } else {
    matches = generateFixtureV2(teams);
  }

  return scheduleMatches(
    matches,
    tournament.courts +
      (tournament.womenCourts ?? 0),
    tournament.startTime,
    tournament.duration,
    tournament.breaks
  );
}