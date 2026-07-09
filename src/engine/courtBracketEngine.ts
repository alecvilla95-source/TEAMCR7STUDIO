import type { Match } from "../types/match";
import type {
  Team,
  TeamCategory,
} from "../types/team";

import { generateFixtureV2 } from "./fixtureEngineV2";

type SourceParticipant = {
  matchId: number;
};

interface BuildCourtBracketsOptions {
  startId?: number;
  category?: TeamCategory;
  courtLabelPrefix?: string;
  finalLabel?: string;
}

function nextPowerOfTwo(value: number): number {
  return 2 ** Math.ceil(Math.log2(value));
}

function cloneMatchesForCourt(
  matches: Match[],
  court: number,
  startId: number,
  category: TeamCategory | undefined,
  courtLabel: string
) {
  const idMap = new Map<number, number>();

  let nextId = startId;

  matches.forEach((match) => {
    idMap.set(match.id, nextId++);
  });

  const cloned = matches.map((match) => ({
    ...match,

    id: idMap.get(match.id)!,

    court,

    courtLabel,

    category,

    stage: "ELIMINATION" as const,

    nextMatchId: match.nextMatchId
      ? idMap.get(match.nextMatchId) ?? null
      : null,

    sourceMatchA: match.sourceMatchA
      ? idMap.get(match.sourceMatchA) ?? null
      : null,

    sourceMatchB: match.sourceMatchB
      ? idMap.get(match.sourceMatchB) ?? null
      : null,
  }));

  return {
    matches: cloned,
    nextId,
  };
}

function createGeneralMatch(
  id: number,
  round: number,
  order: number,
  category: TeamCategory | undefined,
  courtLabel: string
): Match {
  return {
    id,

    round,

    order,

    court: 1,

    courtLabel,

    category,

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

    stage: "ELIMINATION",
  };
}

function linkSourceToMatch(
  allMatches: Match[],
  sourceMatchId: number,
  targetMatch: Match,
  slot: "A" | "B"
) {
  const sourceMatch = allMatches.find(
    (match) => match.id === sourceMatchId
  );

  if (sourceMatch) {
    sourceMatch.nextMatchId = targetMatch.id;
    sourceMatch.nextSlot = slot;
  }

  if (slot === "A") {
    targetMatch.sourceMatchA = sourceMatchId;
  } else {
    targetMatch.sourceMatchB = sourceMatchId;
  }
}

function buildGeneralFinals(
  courtFinals: Match[],
  startId: number,
  startRound: number,
  allMatches: Match[],
  category: TeamCategory | undefined,
  finalLabel: string
) {
  if (courtFinals.length <= 1) {
    return {
      nextId: startId,
    };
  }

  let nextId = startId;

  let round = startRound;

  let participants: SourceParticipant[] =
    courtFinals.map((match) => ({
      matchId: match.id,
    }));

  while (participants.length > 1) {
    const bracketSize =
      nextPowerOfTwo(participants.length);

    const byeCount =
      bracketSize - participants.length;

    const firstRoundMatches =
      (participants.length - byeCount) / 2;

    const playingParticipants =
      participants.slice(
        0,
        firstRoundMatches * 2
      );

    const byeParticipants =
      participants.slice(
        firstRoundMatches * 2
      );

    const roundMatches: Match[] = [];

    for (
      let index = 0;
      index < firstRoundMatches;
      index++
    ) {
      const match = createGeneralMatch(
        nextId++,
        round,
        index + 1,
        category,
        finalLabel
      );

      const participantA =
        playingParticipants[index * 2];

      const participantB =
        playingParticipants[index * 2 + 1];

      if (participantA) {
        linkSourceToMatch(
          allMatches,
          participantA.matchId,
          match,
          "A"
        );
      }

      if (participantB) {
        linkSourceToMatch(
          allMatches,
          participantB.matchId,
          match,
          "B"
        );
      }

      allMatches.push(match);

      roundMatches.push(match);
    }

    participants = [
      ...byeParticipants,

      ...roundMatches.map((match) => ({
        matchId: match.id,
      })),
    ];

    round++;
  }

  return {
    nextId,
  };
}

export function buildCourtBrackets(
  teams: Team[],
  courts: number,
  options: BuildCourtBracketsOptions = {}
): Match[] {
  const safeCourts = Math.max(
    1,
    courts
  );

  const category = options.category;

  const courtLabelPrefix =
    options.courtLabelPrefix ?? "Cancha";

  const finalLabel =
    options.finalLabel ?? "Final General";

  const allMatches: Match[] = [];

  const courtFinals: Match[] = [];

  let nextId = options.startId ?? 1;

  for (
    let court = 1;
    court <= safeCourts;
    court++
  ) {
    const courtTeams = teams.filter(
      (team) => team.assignedCourt === court
    );

    if (courtTeams.length < 2) {
      continue;
    }

    const localBracket =
      generateFixtureV2(courtTeams);

    const courtLabel =
      `${courtLabelPrefix} ${court}`;

    const cloned =
      cloneMatchesForCourt(
        localBracket,
        court,
        nextId,
        category,
        courtLabel
      );

    nextId = cloned.nextId;

    allMatches.push(...cloned.matches);

    const courtFinal = [...cloned.matches]
      .sort((a, b) => {
        if (b.round !== a.round) {
          return b.round - a.round;
        }

        return b.order - a.order;
      })[0];

    if (courtFinal) {
      courtFinals.push(courtFinal);
    }
  }

  const maxRound =
    allMatches.length > 0
      ? Math.max(
          ...allMatches.map((match) => match.round)
        )
      : 1;

  const general =
    buildGeneralFinals(
      courtFinals,
      nextId,
      maxRound + 1,
      allMatches,
      category,
      finalLabel
    );

  nextId = general.nextId;

  return allMatches.sort((a, b) => {
    if (a.round !== b.round) {
      return a.round - b.round;
    }

    if (a.order !== b.order) {
      return a.order - b.order;
    }

    return a.court - b.court;
  });
}