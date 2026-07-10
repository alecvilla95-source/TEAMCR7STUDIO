import type { Match } from "../types/match";
import type { Team } from "../types/team";

type Participant =
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

function createEmptyMatch(
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

    stage: "ELIMINATION",
  };
}

function assignParticipant(
  match: Match,
  slot: "A" | "B",
  participant: Participant | undefined,
  matches: Match[]
) {
  if (!participant) return;

  if (participant.type === "team") {
    if (slot === "A") {
      match.teamA = participant.team;
      match.sourceMatchA = null;
    } else {
      match.teamB = participant.team;
      match.sourceMatchB = null;
    }

    return;
  }

  if (slot === "A") {
    match.sourceMatchA = participant.matchId;
  } else {
    match.sourceMatchB = participant.matchId;
  }

  const sourceMatch = matches.find(
    (item) => item.id === participant.matchId
  );

  if (!sourceMatch) return;

  sourceMatch.nextMatchId = match.id;
  sourceMatch.nextSlot = slot;
}

export function generateFixtureV2(
  teams: Team[]
): Match[] {
  if (teams.length < 2) {
    return [];
  }

  const bracketSize =
    nextPowerOfTwo(teams.length);

  const totalRounds =
    Math.log2(bracketSize);

  const byeCount =
    bracketSize - teams.length;

  const firstRoundMatches =
    (teams.length - byeCount) / 2;

  const playingTeams =
    teams.slice(0, firstRoundMatches * 2);

  const byeTeams =
    teams.slice(firstRoundMatches * 2);

  const matches: Match[] = [];

  let matchId = 1;

  // -------------------------
  // RONDA 1
  // Solo partidos reales.
  // Los BYE no generan partido ni horario.
  // -------------------------

  for (
    let i = 0;
    i < firstRoundMatches;
    i++
  ) {
    const match = createEmptyMatch(
      matchId++,
      1,
      i + 1
    );

    match.teamA = playingTeams[i * 2] ?? null;
    match.teamB = playingTeams[i * 2 + 1] ?? null;

    matches.push(match);
  }

  if (totalRounds === 1) {
    return matches;
  }

  // -------------------------
  // Participantes que llegan a ronda 2
  // Primero entran los equipos con BYE.
  // Luego entran los ganadores de ronda 1.
  // -------------------------

  let participants: Participant[] = [
    ...byeTeams.map((team) => ({
      type: "team" as const,
      team,
    })),

    ...matches
      .filter((match) => match.round === 1)
      .sort((a, b) => a.order - b.order)
      .map((match) => ({
        type: "winner" as const,
        matchId: match.id,
      })),
  ];

  // -------------------------
  // RONDAS 2 EN ADELANTE
  // -------------------------

  for (
    let round = 2;
    round <= totalRounds;
    round++
  ) {
    const matchesInRound =
      bracketSize / 2 ** round;

    const roundMatches: Match[] = [];

    for (
      let order = 1;
      order <= matchesInRound;
      order++
    ) {
      const match = createEmptyMatch(
        matchId++,
        round,
        order
      );

      const participantA =
        participants[(order - 1) * 2];

      const participantB =
        participants[(order - 1) * 2 + 1];

      assignParticipant(
        match,
        "A",
        participantA,
        matches
      );

      assignParticipant(
        match,
        "B",
        participantB,
        matches
      );

      matches.push(match);

      roundMatches.push(match);
    }

    participants = roundMatches.map((match) => ({
      type: "winner" as const,
      matchId: match.id,
    }));
  }

  return matches;
}