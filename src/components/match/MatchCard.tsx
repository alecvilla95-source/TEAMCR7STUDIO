import type { Match } from "../../types/match";

interface Props {
  match: Match;
}

export default function MatchCard({ match }: Props) {
  function teamLabel(team: typeof match.teamA, slot: "A" | "B") {
    if (team) return team.name;

    if (match.round === 1) {
      return "Por definir";
    }

    return slot === "A"
      ? "⏳ Ganador del partido anterior"
      : "⏳ Ganador del partido anterior";
  }

  return (
    <div
      style={{
        background: "#1e293b",
        borderRadius: 12,
        padding: 18,
        marginBottom: 18,
        border:
          match.status === "FINISHED"
            ? "2px solid #16a34a"
            : "1px solid #334155",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 12,
          color: "#94a3b8",
          fontSize: 14,
        }}
      >
        <span>Partido {match.id}</span>

        <span>
          🕒 {match.time || "--:--"} | 🏟 Cancha {match.court || "-"}
        </span>
      </div>

      <div
        style={{
          fontSize: 18,
          fontWeight: "bold",
        }}
      >
        {teamLabel(match.teamA, "A")}
      </div>

      <div
        style={{
          textAlign: "center",
          margin: "10px 0",
          color: "#60a5fa",
          fontWeight: "bold",
        }}
      >
        VS
      </div>

      <div
        style={{
          fontSize: 18,
          fontWeight: "bold",
        }}
      >
        {teamLabel(match.teamB, "B")}
      </div>

      {match.status === "FINISHED" && (
        <div
          style={{
            marginTop: 15,
            padding: 10,
            background: "#14532d",
            color: "#bbf7d0",
            borderRadius: 8,
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
            🏆 Ganador: {match.winner?.name}
        </div>
      )}
    </div>
  );
}