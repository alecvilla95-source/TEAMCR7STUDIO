import { useState } from "react";

import { useFixture } from "../../store/fixtureStore";
import { useChampion } from "../../store/championStore";

import { applyResult } from "../../engine/resultEngine";

export default function ResultsView() {
  const { fixture, setFixture } = useFixture();
  const { champion, setChampion } = useChampion();

  const [scores, setScores] = useState<
    Record<number, { a: number; b: number }>
  >({});

  function updateScore(
    matchId: number,
    team: "a" | "b",
    value: number
  ) {
    setScores({
      ...scores,
      [matchId]: {
        ...scores[matchId],
        [team]: value,
      },
    });
  }

  function saveResult(matchId: number) {
    const result = scores[matchId];

    if (!result) {
      alert("Ingrese el resultado.");
      return;
    }

    if (result.a === result.b) {
      alert("No se permiten empates.");
      return;
    }

    const updatedMatches = applyResult(
      fixture,
      matchId,
      result.a,
      result.b
    );

    const finishedMatch = updatedMatches.find(
      (match) => match.id === matchId
    );

    if (
      finishedMatch &&
      finishedMatch.winner &&
      !finishedMatch.nextMatchId
    ) {
      setChampion(finishedMatch.winner);
      alert(`🏆 Campeón: ${finishedMatch.winner.name}`);
    }

    setFixture(updatedMatches);
  }

  return (
    <div>
      <h2>Resultados</h2>

      {champion && (
        <div
          style={{
            background: "#713f12",
            color: "#fef3c7",
            padding: 20,
            borderRadius: 12,
            marginBottom: 25,
            fontSize: 22,
            fontWeight: "bold",
          }}
        >
          🏆 CAMPEÓN: {champion.name}
        </div>
      )}

      {fixture.map((match) => {
        const finished = match.status === "FINISHED";

        return (
          <div
            key={match.id}
            style={{
              background: "#1e293b",
              padding: 20,
              borderRadius: 12,
              marginBottom: 25,
              border: finished
                ? "2px solid #16a34a"
                : "1px solid #334155",
            }}
          >
            <h3>Partido {match.id}</h3>

            <p>
              {match.teamA?.name ?? "Por definir"}
              {"  VS  "}
              {match.teamB?.name ?? "Por definir"}
            </p>

            <div
              style={{
                display: "flex",
                gap: 15,
                marginTop: 15,
              }}
            >
              <input
                type="number"
                min={0}
                disabled={finished || !match.teamA || !match.teamB}
                value={scores[match.id]?.a ?? match.scoreA}
                onChange={(e) =>
                  updateScore(
                    match.id,
                    "a",
                    Number(e.target.value)
                  )
                }
              />

              <input
                type="number"
                min={0}
                disabled={finished || !match.teamA || !match.teamB}
                value={scores[match.id]?.b ?? match.scoreB}
                onChange={(e) =>
                  updateScore(
                    match.id,
                    "b",
                    Number(e.target.value)
                  )
                }
              />
            </div>

            {!finished ? (
              <button
                disabled={!match.teamA || !match.teamB}
                onClick={() => saveResult(match.id)}
                style={{
                  marginTop: 20,
                  padding: "10px 20px",
                  background:
                    !match.teamA || !match.teamB
                      ? "#475569"
                      : "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor:
                    !match.teamA || !match.teamB
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                GUARDAR RESULTADO
              </button>
            ) : (
              <div
                style={{
                  marginTop: 20,
                  padding: 12,
                  background: "#14532d",
                  color: "#bbf7d0",
                  borderRadius: 8,
                  fontWeight: "bold",
                }}
              >
                🏆 Ganador: {match.winner?.name}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}