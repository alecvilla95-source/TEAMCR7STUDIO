import type React from "react";
import type { Match } from "../../types/match";

interface Props {
  match: Match;
  displayLabel?: string;
}

export default function MatchCard({
  match,
  displayLabel,
}: Props) {
  const finished =
    match.status === "FINISHED";

  const playing =
    match.status === "PLAYING";

  const hasScore =
    finished ||
    match.scoreA > 0 ||
    match.scoreB > 0;

  const hasPenalties =
    match.penaltyA !== undefined &&
    match.penaltyB !== undefined;

  const courtLabel =
    match.courtLabel ??
    `Cancha ${match.court || "-"}`;

  function teamLabel(
    team: typeof match.teamA,
    sourceMatch: number | null | undefined
  ) {
    if (team) {
      return team.name;
    }

    if (match.round === 1) {
      return "Por definir";
    }

    if (sourceMatch) {
      return `🏆 Ganador Partido ${sourceMatch}`;
    }

    return "Por definir";
  }

  function statusLabel() {
    if (finished) return "FINALIZADO";
    if (playing) return "EN JUEGO";
    return "PENDIENTE";
  }

  function statusColor() {
    if (finished) return "#16a34a";
    if (playing) return "#22c55e";
    return "#facc15";
  }

  return (
    <div
      style={{
        background: "#1e293b",
        borderRadius: 14,
        padding: 20,
        marginBottom: 18,
        border: finished
          ? "2px solid #16a34a"
          : playing
          ? "2px solid #22c55e"
          : "1px solid #334155",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
          color: "#94a3b8",
          fontSize: 14,
          gap: 15,
          flexWrap: "wrap",
        }}
      >
        <span>
          <strong>
            {displayLabel ?? `Partido ${match.id}`}
          </strong>
        </span>

        <span>
          🕒 {match.time || "--:--"} | 🏟 {courtLabel}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: hasScore ? "1fr 70px" : "1fr",
          gap: 15,
          alignItems: "center",
        }}
      >
        <div style={teamName}>
          {teamLabel(match.teamA, match.sourceMatchA)}
        </div>

        {hasScore && (
          <div style={scoreBox}>
            {match.scoreA}
          </div>
        )}

        <div style={teamName}>
          {teamLabel(match.teamB, match.sourceMatchB)}
        </div>

        {hasScore && (
          <div style={scoreBox}>
            {match.scoreB}
          </div>
        )}
      </div>

      <div
        style={{
          textAlign: "center",
          color: "#60a5fa",
          fontWeight: "bold",
          margin: "16px 0 0",
        }}
      >
        VS
      </div>

      {hasPenalties && (
        <div
          style={{
            marginTop: 15,
            background: "#713f12",
            color: "#fef3c7",
            padding: 10,
            borderRadius: 8,
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          ⚽ Penales: {match.penaltyA} - {match.penaltyB}
        </div>
      )}

      <div
        style={{
          marginTop: 15,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            background: statusColor(),
            color: "#111827",
            padding: "6px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: "bold",
          }}
        >
          {statusLabel()}
        </span>

        {finished && (
          <span
            style={{
              color: "#bbf7d0",
              fontWeight: "bold",
            }}
          >
            🏆 Ganador: {match.winner?.name ?? "Empate"}
          </span>
        )}
      </div>
    </div>
  );
}

const teamName: React.CSSProperties = {
  fontSize: 18,
  fontWeight: "bold",
};

const scoreBox: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: "8px 0",
  textAlign: "center",
  fontSize: 24,
  fontWeight: "bold",
  color: "#60a5fa",
};