import { useState } from "react";

import { useFixture } from "../../store/fixtureStore";
import { useChampion } from "../../store/championStore";
import { useOverlay } from "../../store/overlayStore";

import { applyResult } from "../../engine/resultEngine";

export default function ResultsView() {
  const { fixture, setFixture } = useFixture();

  const { champion, setChampion } = useChampion();

  const { activeMatchId, setActiveMatchId } = useOverlay();

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

      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 25,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setActiveMatchId(null)}
          style={{
            padding: "12px 18px",
            background: "#334155",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          🧹 LIMPIAR OBS
        </button>

        <button
          onClick={() => {
            const url = `${window.location.origin}?page=overlay`;
            window.open(url, "_blank");
          }}
          style={{
            padding: "12px 18px",
            background: "#7c3aed",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          📺 ABRIR OVERLAY
        </button>
      </div>

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
        const finished =
          match.status === "FINISHED";

        const ready =
          Boolean(match.teamA && match.teamB);

        const active =
          activeMatchId === match.id;

        return (
          <div
            key={match.id}
            style={{
              background: "#1e293b",
              padding: 20,
              borderRadius: 12,
              marginBottom: 25,
              border: active
                ? "2px solid #facc15"
                : finished
                ? "2px solid #16a34a"
                : "1px solid #334155",
            }}
          >
            <h3>
              Partido {match.id}
              {active && (
                <span
                  style={{
                    marginLeft: 10,
                    color: "#facc15",
                    fontSize: 14,
                  }}
                >
                  📺 En OBS
                </span>
              )}
            </h3>

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
                disabled={finished || !ready}
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
                disabled={finished || !ready}
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

            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 20,
                flexWrap: "wrap",
              }}
            >
              {!finished ? (
                <button
                  disabled={!ready}
                  onClick={() => saveResult(match.id)}
                  style={{
                    padding: "10px 20px",
                    background: !ready
                      ? "#475569"
                      : "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    cursor: !ready
                      ? "not-allowed"
                      : "pointer",
                  }}
                >
                  GUARDAR RESULTADO
                </button>
              ) : (
                <div
                  style={{
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

              <button
                disabled={!ready}
                onClick={() => setActiveMatchId(match.id)}
                style={{
                  padding: "10px 20px",
                  background: active
                    ? "#facc15"
                    : ready
                    ? "#7c3aed"
                    : "#475569",
                  color: active ? "#111827" : "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: ready
                    ? "pointer"
                    : "not-allowed",
                  fontWeight: "bold",
                }}
              >
                📺 MOSTRAR EN OBS
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}