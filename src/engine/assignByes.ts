import type { Match } from "../types/match";
import type { Team } from "../types/team";

export function assignByes(
    matches: Match[],
    byeTeams: Team[]
): Match[] {

    if (byeTeams.length === 0)
        return matches;

    const copy = matches.map(m => ({
        ...m,
    }));

    const secondRound = copy.filter(
        m => m.round === 2
    );

    byeTeams.forEach((team, index) => {

        const match = secondRound[index];

        if (!match) return;

        if (!match.teamA)
            match.teamA = team;
        else
            match.teamB = team;

    });

    return copy;

}