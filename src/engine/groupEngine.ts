import type { Match } from "../types/match";
import type { Team } from "../types/team";

const GROUP_NAMES = [
  "GRUPO A",
  "GRUPO B",
  "GRUPO C",
  "GRUPO D",
  "GRUPO E",
  "GRUPO F",
  "GRUPO G",
  "GRUPO H",
  "GRUPO I",
  "GRUPO J",
  "GRUPO K",
  "GRUPO L",
  "GRUPO M",
  "GRUPO N",
  "GRUPO O",
  "GRUPO P",
];

function createGroups(
  teams: Team[],
  groupSize = 4
): Team[][] {
  const groups: Team[][] = [];

  for (
    let i = 0;
    i < teams.length;
    i += groupSize
  ) {
    groups.push(
      teams.slice(i, i + groupSize)
    );
  }

  return groups;
}

export function buildGroupStage(
  teams: Team[]
): Match[] {
  const groups = createGroups(teams);

  const matches: Match[] = [];

  let id = 1;

  groups.forEach((groupTeams, groupIndex) => {
    const groupName =
      GROUP_NAMES[groupIndex] ??
      `GRUPO ${groupIndex + 1}`;

    let order = 1;

    for (
      let i = 0;
      i < groupTeams.length;
      i++
    ) {
      for (
        let j = i + 1;
        j < groupTeams.length;
        j++
      ) {
        matches.push({
          id,

          round: groupIndex + 1,

          order,

          court: 0,

          time: "",

          teamA: groupTeams[i],

          teamB: groupTeams[j],

          scoreA: 0,

          scoreB: 0,

          winner: null,

          status: "PENDING",

          nextMatchId: null,

          nextSlot: null,

          sourceMatchA: null,

          sourceMatchB: null,

          stage: "GROUP",

          groupName,
        });

        id++;
        order++;
      }
    }
  });

  return matches;
}