import { useState } from "react";

import { useFixture } from "../../store/fixtureStore";
import { useChampion } from "../../store/championStore";
import { useOverlay } from "../../store/overlayStore";
import { useTimer } from "../../store/timerStore";
import { useTournament } from "../../store/tournamentStore";

import { applyResult } from "../../engine/resultEngine";

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");

  const secs = (seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${secs}`;
}

export default function ResultsView() {
  const { fixture, setFixture } = useFixture();

  const { champion, setChampion } = useChampion();

  const { activeMatchId, setActiveMatchId } = useOverlay();

  const {
    timer,
    secondsLeft,
    startTimer,
    pauseTimer,
    resetTimer,
  } = useTimer();

  const { tournament } = useTournament();

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

    if (activeMatchId === matchId) {
      const updatedFixture = fixture.map((match) => {
        if (match.id !== matchId) return match;

        return {
          ...match,
          scoreA:
            team === "a"
              ? value
              : match.scoreA,
          scoreB:
            team === "b"
              ? value
              : match.scoreB,
        };
      });

      setFixture(updatedFixture);
    }
  }

  function saveResult(matchId: number) {
    const currentMatch = fixture.find(
      (match) => match.id === matchId
    );

    const result =
      scores[matchId] ??
      {
        a: currentMatch?.scoreA ?? 0,
        b: currentMatch?.scoreB ?? 0,
      };

    if (!currentMatch) {
      alert("No se encontró el partido.");
      return;
    }

    if (!currentMatch.teamA || !currentMatch.teamB) {
      alert("Este partido aún no está listo.");
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

  function showInOBS(matchId: number) {
    setActiveMatchId(matchId);

    const duration =
      (tournament?.duration ?? 20) * 60;

    resetTimer(duration);
  }

  return (
    <div>
      <h2>Resultados</h2>

      <div
        style={{
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: 12,
          padding: 20,
          marginBottom: 25,
        }}
      >
        <h3
          style={{
            marginTop: 0,
          }}
        >
          ⏱ Cronómetro OBS
        </h3>

        <div
          style={{
            fontSize: 42,
            fontWeight: "bold",
            color:
              secondsLeft <= 10
                ? "#ef4444"
                : "#60a5fa",
            marginBottom: 15,
          }}
        >
          {formatTime(secondsLeft)}
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={startTimer}
            style={greenButton}
          >
            ▶ INICIAR
          </button>

          <button
            onClick={pauseTimer}
            style={secondaryButton}
          >
            ⏸ PAUSAR
          </button>

          <button
            onClick={() => resetTimer()}
            style={secondaryButton}
          >
            🔄 REINICIAR
          </button>

          <button
            onClick={() => setActiveMatchId(null)}
            style={secondaryButton}
          >
            🧹 LIMPIAR OBS
          </button>

          <button
            onClick={() => {
              const url = `${window.location.origin}?page=overlay`;
              window.open(url, "_blank");
            }}
            style={purpleButton}
          >
            📺 ABRIR OVERLAY
          </button>
        </div>

        <p
          style={{
            color: "#94a3b8",
            marginBottom: 0,
            marginTop: 15,
          }}
        >
          Estado:{" "}
          <strong>
            {timer.isRunning
              ? "En marcha"
              : "Pausado"}
          </strong>
        </p>
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
                alignItems: "center",
              }}
            >
              <input
                type="number"
                min={0}
                disabled={finished || !ready}
                value={
                  scores[match.id]?.a ??
                  match.scoreA
                }
                onChange={(e) =>
                  updateScore(
                    match.id,
                    "a",
                    Number(e.target.value)
                  )
                }
                style={scoreInput}
              />

              <span
                style={{
                  fontWeight: "bold",
                  color: "#94a3b8",
                }}
              >
                -
              </span>

              <input
                type="number"
                min={0}
                disabled={finished || !ready}
                value={
                  scores[match.id]?.b ??
                  match.scoreB
                }
                onChange={(e) =>
                  updateScore(
                    match.id,
                    "b",
                    Number(e.target.value)
                  )
                }
                style={scoreInput}
              />

              {active && !finished && (
                <span
                  style={{
                    color: "#facc15",
                    fontWeight: "bold",
                  }}
                >
                  Marcador en vivo
                </span>
              )}
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
                onClick={() => showInOBS(match.id)}
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

const scoreInput: React.CSSProperties = {
  width: 70,
  padding: 10,
  fontSize: 20,
  fontWeight: "bold",
  textAlign: "center",
  borderRadius: 8,
  border: "1px solid #334155",
};

const greenButton: React.CSSProperties = {
  padding: "12px 18px",
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const secondaryButton: React.CSSProperties = {
  padding: "12px 18px",
  background: "#334155",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const purpleButton: React.CSSProperties = {
  padding: "12px 18px",
  background: "#7c3aed",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};