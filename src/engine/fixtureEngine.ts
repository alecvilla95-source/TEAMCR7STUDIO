import type { Match } from "../types/match";
import type { Team } from "../types/team";

type BracketEntry =
  | {
      type: "team";
      team: Team;
    }
  | {
      type: "winner";
      matchId: number;
    };

function nextPowerOfTwo(value: number): number {
  return 2 ** Math.ceil(Math.log2(value));
}

function createMatch(
  id: number,
  round: number,
  order: number
): Match {
  return {
    id,
    round,
    order,
    court: 0,
    time: "",

    teamA: null,
    teamB: null,

    scoreA: 0,
    scoreB: 0,

    winner: null,
    status: "PENDING",

    nextMatchId: null,
    nextSlot: null,

    sourceMatchA: null,
    sourceMatchB: null,
  };
}

function applyEntryToMatch(
  matches: Match[],
  match: Match,
  entry: BracketEntry,
  slot: "A" | "B"
) {
  if (entry.type === "team") {
    if (slot === "A") {
      match.teamA = entry.team;
      match.sourceMatchA = null;
    } else {
      match.teamB = entry.team;
      match.sourceMatchB = null;
    }

    return;
  }

  const source = matches.find(
    (item) => item.id === entry.matchId
  );

  if (source) {
    source.nextMatchId = match.id;
    source.nextSlot = slot;
  }

  if (slot === "A") {
    match.sourceMatchA = entry.matchId;
  } else {
    match.sourceMatchB = entry.matchId;
  }
}

function buildNextRoundEntries(
  byeTeams: Team[],
  winners: BracketEntry[]
): BracketEntry[] {
  const entries: BracketEntry[] = [];

  const max = Math.max(
    byeTeams.length,
    winners.length
  );

  for (let index = 0; index < max; index++) {
    if (byeTeams[index]) {
      entries.push({
        type: "team",
        team: byeTeams[index],
      });
    }

    if (winners[index]) {
      entries.push(winners[index]);
    }
  }

  return entries;
}

export function generateFixture(
  teams: Team[]
): Match[] {

  if (teams.length < 2) {
    return [];
  }

  const bracketSize = nextPowerOfTwo(
    teams.length
  );

  const byeCount = bracketSize - teams.length;

  const firstRoundMatches =
    (teams.length - byeCount) / 2;

  const playingTeams = teams.slice(
    0,
    firstRoundMatches * 2
  );

  const byeTeams = teams.slice(
    firstRoundMatches * 2
  );

  const matches: Match[] = [];

  let matchId = 1;

  const firstRoundWinners: BracketEntry[] = [];

  for (
    let index = 0;
    index < firstRoundMatches;
    index++
  ) {
    const match = createMatch(
      matchId++,
      1,
      index + 1
    );

    match.teamA = playingTeams[index * 2];
    match.teamB = playingTeams[index * 2 + 1];

    matches.push(match);

    firstRoundWinners.push({
      type: "winner",
      matchId: match.id,
    });
  }

  let entries = buildNextRoundEntries(
    byeTeams,
    firstRoundWinners
  );

  let round = 2;

  while (entries.length > 1) {
    const nextEntries: BracketEntry[] = [];

    for (
      let index = 0;
      index < entries.length;
      index += 2
    ) {
      const match = createMatch(
        matchId++,
        round,
        Math.floor(index / 2) + 1
      );

      applyEntryToMatch(
        matches,
        match,
        entries[index],
        "A"
      );

      if (entries[index + 1]) {
        applyEntryToMatch(
          matches,
          match,
          entries[index + 1],
          "B"
        );
      }

      matches.push(match);

      nextEntries.push({
        type: "winner",
        matchId: match.id,
      });
    }

    entries = nextEntries;
    round++;
  }

  return matches;

}
