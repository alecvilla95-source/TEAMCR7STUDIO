import type { Match } from "../types/match";
import type { TournamentBreaks } from "../types/tournament";

function addMinutes(
  time: string,
  minutes: number
) {
  const [h, m] = time.split(":").map(Number);

  const total = h * 60 + m + minutes;

  const hh = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");

  const mm = (total % 60)
    .toString()
    .padStart(2, "0");

  return `${hh}:${mm}`;
}

const defaultBreaks: TournamentBreaks = {
  default: 10,
  group: 10,
  quarterFinal: 15,
  semifinal: 20,
  final: 30,
};

function getBreakForMatch(
  match: Match,
  totalEliminationRounds: number,
  breaks: TournamentBreaks
) {
  if (match.stage === "GROUP") {
    return breaks.group;
  }

  if (totalEliminationRounds <= 0) {
    return breaks.default;
  }

  if (match.round === totalEliminationRounds) {
    return breaks.final;
  }

  if (match.round === totalEliminationRounds - 1) {
    return breaks.semifinal;
  }

  if (match.round === totalEliminationRounds - 2) {
    return breaks.quarterFinal;
  }

  return breaks.default;
}

function getTotalEliminationRounds(
  fixture: Match[]
) {
  const rounds = fixture
    .filter((match) => match.stage !== "GROUP")
    .map((match) => match.round);

  return rounds.length > 0
    ? Math.max(...rounds)
    : 0;
}

function scheduleNormal(
  fixture: Match[],
  courts: number,
  startTime: string,
  duration: number,
  breaks: TournamentBreaks
) {
  const safeCourts = Math.max(
    1,
    courts
  );

  const totalEliminationRounds =
    getTotalEliminationRounds(fixture);

  let currentTime = startTime;

  for (
    let index = 0;
    index < fixture.length;
    index += safeCourts
  ) {
    const block = fixture.slice(
      index,
      index + safeCourts
    );

    block.forEach((match, courtIndex) => {
      match.court = courtIndex + 1;
      match.time = currentTime;
    });

    const maxBreak = Math.max(
      ...block.map((match) =>
        getBreakForMatch(
          match,
          totalEliminationRounds,
          breaks
        )
      )
    );

    currentTime = addMinutes(
      currentTime,
      duration + maxBreak
    );
  }

  return fixture;
}

function schedulePreassignedCourts(
  fixture: Match[],
  startTime: string,
  duration: number,
  breaks: TournamentBreaks
) {
  const totalEliminationRounds =
    getTotalEliminationRounds(fixture);

  const sorted = [...fixture].sort((a, b) => {
    if (a.round !== b.round) {
      return a.round - b.round;
    }

    if (a.order !== b.order) {
      return a.order - b.order;
    }

    return a.court - b.court;
  });

  const blocks = new Map<string, Match[]>();

  sorted.forEach((match) => {
    const key = `${match.round}_${match.order}`;

    if (!blocks.has(key)) {
      blocks.set(key, []);
    }

    blocks.get(key)!.push(match);
  });

  let currentTime = startTime;

  Array.from(blocks.values()).forEach(
    (block) => {
      block.forEach((match) => {
        match.time = currentTime;
      });

      const maxBreak = Math.max(
        ...block.map((match) =>
          getBreakForMatch(
            match,
            totalEliminationRounds,
            breaks
          )
        )
      );

      currentTime = addMinutes(
        currentTime,
        duration + maxBreak
      );
    }
  );

  return sorted;
}

export function scheduleMatches(
  matches: Match[],
  courts: number,
  startTime: string,
  duration: number,
  breaks: TournamentBreaks = defaultBreaks
): Match[] {
  const fixture = matches.map((match) => ({
    ...match,
  }));

  const hasPreassignedCourts =
    fixture.some((match) => match.court > 0);

  if (hasPreassignedCourts) {
    return schedulePreassignedCourts(
      fixture,
      startTime,
      duration,
      breaks
    );
  }

  return scheduleNormal(
    fixture,
    courts,
    startTime,
    duration,
    breaks
  );
}