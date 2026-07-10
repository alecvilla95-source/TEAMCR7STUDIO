import type { Match } from "../../types/match";

type ScoreMap = Record<number, { a: number; b: number }>;

interface Props {
  matches: Match[];
  selectedMatchId: number | null;
  scores: ScoreMap;
  updateScore: (
    matchId: number,
    team: "a" | "b",
    value: number
  ) => void;
  saveResult: (matchId: number) => void;
  setSelectedMatchId: (matchId: number) => void;
}

function teamName(team: Match["teamA"] | Match["teamB"]) {
  return team?.name ?? "Por definir";
}

export default function SimultaneousScoreControls({
  matches,
  selectedMatchId,
  scores,
  updateScore,
  saveResult,
  setSelectedMatchId,
}: Props) {
  if (matches.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        marginTop: 20,
      }}
    >
      <div
        style={{
          color: "#ffffff",
          fontWeight: 800,
          fontSize: 18,
          marginBottom: 12,
        }}
      >
        ⚽ Control de partidos simultáneos
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 14,
        }}
      >
        {matches.map((match) => {
          const isSelected = selectedMatchId === match.id;
          const finished = match.status === "FINISHED";

          return (
            <div
              key={match.id}
              style={{
                background: "#0f172a",
                border: isSelected
                  ? "2px solid #22c55e"
                  : "1px solid #334155",
                borderRadius: 14,
                padding: 14,
                boxShadow: isSelected
                  ? "0 0 18px rgba(34,197,94,0.25)"
                  : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      color: "#93c5fd",
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {String(match.group ?? "").includes("Mujer")
                      ? "Mujeres"
                      : "Partido"}
                  </div>

                  <div
                    style={{
                      color: "#ffffff",
                      fontWeight: 800,
                      fontSize: 15,
                    }}
                  >
                    Partido {match.id}
                  </div>

                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: 12,
                    }}
                  >
                    🕒 {match.time || "--:--"} | 🏟 {match.court || "-"}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedMatchId(match.id)}
                  style={{
                    background: isSelected ? "#16a34a" : "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {isSelected
                    ? "PARTIDO PRINCIPAL"
                    : "Usar en overlay"}
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto 1fr",
                  gap: 10,
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      color: "#fff",
                      fontWeight: 700,
                      marginBottom: 6,
                    }}
                  >
                    {teamName(match.teamA)}
                  </div>

                  <input
                    type="number"
                    min={0}
                    disabled={finished}
                    value={scores[match.id]?.a ?? match.scoreA ?? 0}
                    onChange={(e) =>
                      updateScore(
                        match.id,
                        "a",
                        Number(e.target.value)
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #334155",
                      background: "#1e293b",
                      color: "#fff",
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  />
                </div>

                <div
                  style={{
                    color: "#38bdf8",
                    fontWeight: 900,
                    fontSize: 20,
                    textAlign: "center",
                    marginTop: 24,
                  }}
                >
                  VS
                </div>

                <div>
                  <div
                    style={{
                      color: "#fff",
                      fontWeight: 700,
                      marginBottom: 6,
                      textAlign: "right",
                    }}
                  >
                    {teamName(match.teamB)}
                  </div>

                  <input
                    type="number"
                    min={0}
                    disabled={finished}
                    value={scores[match.id]?.b ?? match.scoreB ?? 0}
                    onChange={(e) =>
                      updateScore(
                        match.id,
                        "b",
                        Number(e.target.value)
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #334155",
                      background: "#1e293b",
                      color: "#fff",
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  />
                </div>
              </div>

              {!finished ? (
                <button
                  onClick={() => saveResult(match.id)}
                  style={{
                    width: "100%",
                    background: "#22c55e",
                    color: "#081018",
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 12px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Guardar resultado
                </button>
              ) : (
                <div
                  style={{
                    background: "#14532d",
                    color: "#dcfce7",
                    borderRadius: 10,
                    padding: "10px 12px",
                    fontWeight: 800,
                    textAlign: "center",
                  }}
                >
                  🏆 Ganador: {match.winner?.name ?? "Definido"}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}