import type { Match } from "../types/match";
import type { Team } from "../types/team";

export function placeByes(
  matches: Match[],
  byeTeams: Team[]
): Match[] {

  if (byeTeams.length === 0) {
    return matches;
  }

  const fixture = matches.map(match => ({
    ...match,
  }));

  const secondRound = fixture
    .filter(match => match.round === 2)
    .sort((a, b) => a.order - b.order);

  let byeIndex = 0;

  for (const match of secondRound) {

    if (byeIndex >= byeTeams.length) {
      break;
    }

    // Si colocamos un BYE en A,
    // ya no debe mostrarse "Ganador Partido X"
    if (!match.teamA) {
      match.teamA = byeTeams[byeIndex++];
      match.sourceMatchA = null;
    }

    if (byeIndex >= byeTeams.length) {
      break;
    }

    // Si colocamos un BYE en B,
    // ya no debe mostrarse "Ganador Partido X"
    if (!match.teamB) {
      match.teamB = byeTeams[byeIndex++];
      match.sourceMatchB = null;
    }

  }

  return fixture;
}