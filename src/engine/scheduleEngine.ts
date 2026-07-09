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

  const safeCourts = Math.max(
    1,
    courts
  );

  const eliminationRounds = fixture
    .filter((match) => match.stage !== "GROUP")
    .map((match) => match.round);

  const totalEliminationRounds =
    eliminationRounds.length > 0
      ? Math.max(...eliminationRounds)
      : 0;

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