import { useFixture } from "../../store/fixtureStore";
import { useChampion } from "../../store/championStore";
import { useTournament } from "../../store/tournamentStore";
import { useOverlay } from "../../store/overlayStore";
import { useTimer } from "../../store/timerStore";

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");

  const secs = (seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${secs}`;
}

export default function OverlayView() {
  const { fixture } = useFixture();

  const { champion } = useChampion();

  const { tournament } = useTournament();

  const { activeMatchId } = useOverlay();

  const { secondsLeft, timer } = useTimer();

  const activeMatch = fixture.find(
    (match) => match.id === activeMatchId
  );

  const nextMatch = fixture.find(
    (match) =>
      match.status !== "FINISHED" &&
      match.teamA &&
      match.teamB
  );

  const lastFinished = [...fixture]
    .reverse()
    .find((match) => match.status === "FINISHED");

  if (champion) {
    return (
      <div style={overlayContainer}>
        <div style={championBox}>
          <div style={smallText}>
            {tournament?.name ?? "TEAMCR7STUDIO"}
          </div>

          <div style={championTitle}>
            🏆 CAMPEÓN
          </div>

          <div style={championName}>
            {champion.name}
          </div>
        </div>
      </div>
    );
  }

  const match =
    activeMatch ??
    nextMatch ??
    lastFinished;

  if (!match) {
    return (
      <div style={overlayContainer}>
        <div style={emptyBox}>
          <h1>TEAMCR7STUDIO</h1>

          <p>
            No hay partido disponible para mostrar.
          </p>
        </div>
      </div>
    );
  }

  const hasPenalties =
    match.penaltyA !== undefined &&
    match.penaltyB !== undefined;

  return (
    <div style={overlayContainer}>
      <div style={topBar}>
        <div>
          {tournament?.name ?? "TEAMCR7STUDIO"}
        </div>

        <div>
          ⏱ {formatTime(secondsLeft)}
          {"  |  "}
          🏟 Cancha {match.court || "-"}
        </div>
      </div>

      <div style={scoreboard}>
        <div style={teamBox}>
          <div style={teamName}>
            {match.teamA?.name ?? "Por definir"}
          </div>

          <div style={score}>
            {match.scoreA}
          </div>

          {hasPenalties && (
            <div style={penaltyScore}>
              Penales: {match.penaltyA}
            </div>
          )}
        </div>

        <div style={vsBox}>
          VS
        </div>

        <div style={teamBox}>
          <div style={teamName}>
            {match.teamB?.name ?? "Por definir"}
          </div>

          <div style={score}>
            {match.scoreB}
          </div>

          {hasPenalties && (
            <div style={penaltyScore}>
              Penales: {match.penaltyB}
            </div>
          )}
        </div>
      </div>

      {hasPenalties && (
        <div style={penaltyBanner}>
          ⚽ Definido por penales:
          {" "}
          {match.penaltyA} - {match.penaltyB}
        </div>
      )}

      <div style={bottomBar}>
        {match.status === "FINISHED"
          ? `🏆 Ganador: ${match.winner?.name ?? ""}`
          : timer.isRunning
          ? "PARTIDO EN VIVO"
          : activeMatchId
          ? "PARTIDO SELECCIONADO"
          : "PRÓXIMO PARTIDO"}
      </div>
    </div>
  );
}

const overlayContainer: React.CSSProperties = {
  width: "100%",
  minHeight: "100vh",
  background: "linear-gradient(135deg, #020617, #0f172a)",
  color: "white",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  padding: 40,
  boxSizing: "border-box",
};

const topBar: React.CSSProperties = {
  width: "100%",
  maxWidth: 1000,
  display: "flex",
  justifyContent: "space-between",
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: "16px 24px",
  marginBottom: 25,
  fontSize: 20,
  fontWeight: "bold",
};

const scoreboard: React.CSSProperties = {
  width: "100%",
  maxWidth: 1000,
  display: "grid",
  gridTemplateColumns: "1fr 120px 1fr",
  gap: 20,
  alignItems: "center",
};

const teamBox: React.CSSProperties = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 18,
  padding: 30,
  textAlign: "center",
};

const teamName: React.CSSProperties = {
  fontSize: 34,
  fontWeight: "bold",
  marginBottom: 20,
};

const score: React.CSSProperties = {
  fontSize: 72,
  fontWeight: "bold",
  color: "#60a5fa",
};

const penaltyScore: React.CSSProperties = {
  marginTop: 10,
  fontSize: 24,
  fontWeight: "bold",
  color: "#facc15",
};

const vsBox: React.CSSProperties = {
  fontSize: 38,
  fontWeight: "bold",
  textAlign: "center",
  color: "#facc15",
};

const penaltyBanner: React.CSSProperties = {
  marginTop: 25,
  width: "100%",
  maxWidth: 1000,
  background: "#713f12",
  border: "1px solid #facc15",
  color: "#fef3c7",
  borderRadius: 14,
  padding: 18,
  textAlign: "center",
  fontSize: 24,
  fontWeight: "bold",
};

const bottomBar: React.CSSProperties = {
  marginTop: 25,
  width: "100%",
  maxWidth: 1000,
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 18,
  textAlign: "center",
  fontSize: 22,
  fontWeight: "bold",
};

const emptyBox: React.CSSProperties = {
  background: "#1e293b",
  padding: 40,
  borderRadius: 20,
  textAlign: "center",
};

const championBox: React.CSSProperties = {
  background: "linear-gradient(135deg, #713f12, #facc15)",
  color: "#111827",
  padding: 60,
  borderRadius: 30,
  textAlign: "center",
  width: "100%",
  maxWidth: 900,
  boxShadow: "0 20px 60px rgba(0,0,0,.35)",
};

const smallText: React.CSSProperties = {
  fontSize: 24,
  fontWeight: "bold",
  marginBottom: 20,
};

const championTitle: React.CSSProperties = {
  fontSize: 54,
  fontWeight: "bold",
  marginBottom: 25,
};

const championName: React.CSSProperties = {
  fontSize: 64,
  fontWeight: "bold",
};