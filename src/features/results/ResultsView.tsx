import { useState, type CSSProperties } from "react";

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

  const [penalties, setPenalties] = useState<
    Record<number, { a: number; b: number }>
  >({});

  const totalMatches = fixture.length;

  const finishedMatches = fixture.filter(
    (match) => match.status === "FINISHED"
  ).length;

  const pendingMatches =
    totalMatches - finishedMatches;

  function exportPDF() {
    window.print();
  }

  function getScore(
    matchId: number,
    team: "a" | "b"
  ) {
    const match = fixture.find(
      (item) => item.id === matchId
    );

    if (!match) return 0;

    if (team === "a") {
      return scores[matchId]?.a ?? match.scoreA;
    }

    return scores[matchId]?.b ?? match.scoreB;
  }

  function getPenalty(
    matchId: number,
    team: "a" | "b"
  ) {
    if (team === "a") {
      return penalties[matchId]?.a ?? 0;
    }

    return penalties[matchId]?.b ?? 0;
  }

  function updateScore(
    matchId: number,
    team: "a" | "b",
    value: number
  ) {
    const cleanValue = Math.max(
      0,
      Number.isNaN(value) ? 0 : value
    );

    setScores((currentScores) => {
      const match = fixture.find(
        (item) => item.id === matchId
      );

      const previous = currentScores[matchId] ?? {
        a: match?.scoreA ?? 0,
        b: match?.scoreB ?? 0,
      };

      return {
        ...currentScores,
        [matchId]: {
          ...previous,
          [team]: cleanValue,
        },
      };
    });

    if (activeMatchId === matchId) {
      const updatedFixture = fixture.map((match) => {
        if (match.id !== matchId) return match;

        return {
          ...match,
          scoreA:
            team === "a"
              ? cleanValue
              : match.scoreA,
          scoreB:
            team === "b"
              ? cleanValue
              : match.scoreB,
        };
      });

      setFixture(updatedFixture);
    }
  }

  function updatePenalty(
    matchId: number,
    team: "a" | "b",
    value: number
  ) {
    const cleanValue = Math.max(
      0,
      Number.isNaN(value) ? 0 : value
    );

    setPenalties((currentPenalties) => {
      const previous = currentPenalties[matchId] ?? {
        a: 0,
        b: 0,
      };

      return {
        ...currentPenalties,
        [matchId]: {
          ...previous,
          [team]: cleanValue,
        },
      };
    });
  }

  function addGoal(
    matchId: number,
    team: "a" | "b"
  ) {
    const current = getScore(
      matchId,
      team
    );

    updateScore(
      matchId,
      team,
      current + 1
    );
  }

  function removeGoal(
    matchId: number,
    team: "a" | "b"
  ) {
    const current = getScore(
      matchId,
      team
    );

    updateScore(
      matchId,
      team,
      Math.max(0, current - 1)
    );
  }

  function addPenalty(
    matchId: number,
    team: "a" | "b"
  ) {
    const current = getPenalty(
      matchId,
      team
    );

    updatePenalty(
      matchId,
      team,
      current + 1
    );
  }

  function removePenalty(
    matchId: number,
    team: "a" | "b"
  ) {
    const current = getPenalty(
      matchId,
      team
    );

    updatePenalty(
      matchId,
      team,
      Math.max(0, current - 1)
    );
  }

  function saveResult(matchId: number) {
    const currentMatch = fixture.find(
      (match) => match.id === matchId
    );

    if (!currentMatch) {
      alert("No se encontró el partido.");
      return;
    }

    if (!currentMatch.teamA || !currentMatch.teamB) {
      alert("Este partido aún no está listo.");
      return;
    }

    const result = scores[matchId] ?? {
      a: currentMatch.scoreA,
      b: currentMatch.scoreB,
    };

    const penaltyResult =
      result.a === result.b
        ? penalties[matchId]
        : undefined;

    if (result.a === result.b) {
      if (!penaltyResult) {
        alert("El partido está empatado. Ingrese los penales.");
        return;
      }

      if (penaltyResult.a === penaltyResult.b) {
        alert("Los penales no pueden quedar empatados.");
        return;
      }
    }

    try {
      const updatedMatches = applyResult(
        fixture,
        matchId,
        result.a,
        result.b,
        penaltyResult?.a,
        penaltyResult?.b
      );

      const finishedMatch = updatedMatches.find(
        (match) => match.id === matchId
      );

      if (
        finishedMatch &&
        finishedMatch.winner &&
        finishedMatch.stage !== "GROUP" &&
        !finishedMatch.nextMatchId
      ) {
        setChampion(finishedMatch.winner);
        alert(`🏆 Campeón: ${finishedMatch.winner.name}`);
      }

      pauseTimer();

      if (activeMatchId === matchId) {
        setActiveMatchId(null);
      }

      setFixture(updatedMatches);
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("No se pudo guardar el resultado.");
      }
    }
  }

  function showInOBS(matchId: number) {
    setActiveMatchId(matchId);

    const duration =
      (tournament?.duration ?? 20) * 60;

    resetTimer(duration);

    const updatedFixture = fixture.map((match) => {
      if (match.status === "FINISHED") {
        return match;
      }

      if (match.id === matchId) {
        return {
          ...match,
          status: "PLAYING" as const,
        };
      }

      if (match.status === "PLAYING") {
        return {
          ...match,
          status: "PENDING" as const,
        };
      }

      return match;
    });

    setFixture(updatedFixture);
  }

  return (
    <div>
      <div
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 14,
          padding: 25,
          marginBottom: 25,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                marginBottom: 8,
              }}
            >
              📊 Resultados
            </h2>

            <h1
              style={{
                margin: 0,
                fontSize: 32,
              }}
            >
              {tournament?.name ?? "TEAMCR7STUDIO"}
            </h1>

            <p
              style={{
                color: "#94a3b8",
                marginTop: 10,
                marginBottom: 0,
              }}
            >
              Reporte de resultados del campeonato.
            </p>
          </div>

          <button
            onClick={exportPDF}
            style={primaryButton}
          >
            📄 Exportar PDF
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 15,
            marginTop: 25,
          }}
        >
          <InfoBox
            label="Partidos"
            value={totalMatches}
          />

          <InfoBox
            label="Jugados"
            value={finishedMatches}
          />

          <InfoBox
            label="Pendientes"
            value={pendingMatches}
          />

          <InfoBox
            label="Canchas"
            value={tournament?.courts ?? 0}
          />

          <InfoBox
            label="Duración"
            value={`${tournament?.duration ?? 0} min`}
          />
        </div>
      </div>

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
            textAlign: "center",
          }}
        >
          🏆 CAMPEÓN: {champion.name}
        </div>
      )}

      {fixture.map((match) => {
        const finished =
          match.status === "FINISHED";

        const playing =
          match.status === "PLAYING";

        const ready =
          Boolean(match.teamA && match.teamB);

        const active =
          activeMatchId === match.id;

        const scoreA = getScore(match.id, "a");
        const scoreB = getScore(match.id, "b");

        const showPenalties =
          ready &&
          !finished &&
          scoreA === scoreB;

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
                : playing
                ? "2px solid #22c55e"
                : "1px solid #334155",
              breakInside: "avoid",
            }}
          >
            <h3>
              Partido {match.id}

              {match.stage === "GROUP" && (
                <span
                  style={{
                    marginLeft: 10,
                    color: "#60a5fa",
                    fontSize: 14,
                  }}
                >
                  👥 {match.groupName}
                </span>
              )}

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

              {playing && (
                <span
                  style={{
                    marginLeft: 10,
                    color: "#22c55e",
                    fontSize: 14,
                  }}
                >
                  🟢 En juego
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
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 15,
                marginTop: 20,
                alignItems: "center",
              }}
            >
              <strong>
                {match.teamA?.name ?? "Equipo A"}
              </strong>

              <div style={scoreControls}>
                <button
                  disabled={finished || !ready}
                  onClick={() => removeGoal(match.id, "a")}
                  style={scoreButton}
                >
                  -
                </button>

                <input
                  type="number"
                  min={0}
                  disabled={finished || !ready}
                  value={scoreA}
                  onChange={(e) =>
                    updateScore(
                      match.id,
                      "a",
                      Number(e.target.value)
                    )
                  }
                  style={scoreInput}
                />

                <button
                  disabled={finished || !ready}
                  onClick={() => addGoal(match.id, "a")}
                  style={scoreButton}
                >
                  +
                </button>
              </div>

              <strong>
                {match.teamB?.name ?? "Equipo B"}
              </strong>

              <div style={scoreControls}>
                <button
                  disabled={finished || !ready}
                  onClick={() => removeGoal(match.id, "b")}
                  style={scoreButton}
                >
                  -
                </button>

                <input
                  type="number"
                  min={0}
                  disabled={finished || !ready}
                  value={scoreB}
                  onChange={(e) =>
                    updateScore(
                      match.id,
                      "b",
                      Number(e.target.value)
                    )
                  }
                  style={scoreInput}
                />

                <button
                  disabled={finished || !ready}
                  onClick={() => addGoal(match.id, "b")}
                  style={scoreButton}
                >
                  +
                </button>
              </div>
            </div>

            {showPenalties && (
              <div
                style={{
                  marginTop: 20,
                  background: "#0f172a",
                  border: "1px solid #facc15",
                  borderRadius: 12,
                  padding: 15,
                }}
              >
                <strong
                  style={{
                    color: "#facc15",
                  }}
                >
                  ⚽ Definir por penales
                </strong>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 15,
                    marginTop: 15,
                    alignItems: "center",
                  }}
                >
                  <span>
                    {match.teamA?.name}
                  </span>

                  <div style={scoreControls}>
                    <button
                      onClick={() => removePenalty(match.id, "a")}
                      style={scoreButton}
                    >
                      -
                    </button>

                    <input
                      type="number"
                      min={0}
                      value={getPenalty(match.id, "a")}
                      onChange={(e) =>
                        updatePenalty(
                          match.id,
                          "a",
                          Number(e.target.value)
                        )
                      }
                      style={scoreInput}
                    />

                    <button
                      onClick={() => addPenalty(match.id, "a")}
                      style={scoreButton}
                    >
                      +
                    </button>
                  </div>

                  <span>
                    {match.teamB?.name}
                  </span>

                  <div style={scoreControls}>
                    <button
                      onClick={() => removePenalty(match.id, "b")}
                      style={scoreButton}
                    >
                      -
                    </button>

                    <input
                      type="number"
                      min={0}
                      value={getPenalty(match.id, "b")}
                      onChange={(e) =>
                        updatePenalty(
                          match.id,
                          "b",
                          Number(e.target.value)
                        )
                      }
                      style={scoreInput}
                    />

                    <button
                      onClick={() => addPenalty(match.id, "b")}
                      style={scoreButton}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            {finished && (
              <div
                style={{
                  marginTop: 15,
                  color: "#bbf7d0",
                  fontWeight: "bold",
                }}
              >
                Resultado final: {match.scoreA} - {match.scoreB}
                {match.penaltyA !== undefined &&
                  match.penaltyB !== undefined && (
                    <>
                      {" "}
                      | Penales: {match.penaltyA} - {match.penaltyB}
                    </>
                  )}
              </div>
            )}

            {active && !finished && (
              <div
                style={{
                  marginTop: 15,
                  color: "#facc15",
                  fontWeight: "bold",
                }}
              >
                Marcador en vivo para OBS
              </div>
            )}

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

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #334155",
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div
        style={{
          color: "#94a3b8",
          fontSize: 13,
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 22,
          fontWeight: "bold",
        }}
      >
        {value}
      </div>
    </div>
  );
}

const scoreControls: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
};

const scoreInput: CSSProperties = {
  width: 70,
  padding: 10,
  fontSize: 20,
  fontWeight: "bold",
  textAlign: "center",
  borderRadius: 8,
  border: "1px solid #334155",
};

const scoreButton: CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 8,
  border: "none",
  background: "#334155",
  color: "white",
  cursor: "pointer",
  fontSize: 20,
  fontWeight: "bold",
};

const primaryButton: CSSProperties = {
  padding: "12px 18px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const greenButton: CSSProperties = {
  padding: "12px 18px",
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const secondaryButton: CSSProperties = {
  padding: "12px 18px",
  background: "#334155",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const purpleButton: CSSProperties = {
  padding: "12px 18px",
  background: "#7c3aed",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};