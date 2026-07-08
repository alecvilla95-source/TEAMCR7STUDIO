import type { Match } from "../types/match";

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

export function scheduleMatches(
  matches: Match[],
  courts: number,
  startTime: string,
  duration: number
): Match[] {

  const fixture = [...matches];

  fixture.forEach((match, index) => {

    match.court = (index % courts) + 1;

    const block = Math.floor(index / courts);

    match.time = addMinutes(
      startTime,
      block * duration
    );

  });

  return fixture;

}