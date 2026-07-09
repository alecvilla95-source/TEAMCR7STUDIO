import {
  type CSSProperties,
} from "react";

import type { Match } from "../../types/match";

import { useApp } from "../../store/appStore";
import { useTournament } from "../../store/tournamentStore";
import { useTeams } from "../../store/teamStore";
import { useFixture } from "../../store/fixtureStore";
import { useChampion } from "../../store/championStore";

function getCourtLabel(match: Match) {
  return (
    match.courtLabel ??
    `Cancha ${match.court || 1}`
  );
}

function getCategoryLabel(match: Match) {
  if (match.category === "WOMEN") {
    return "MUJERES";
  }

  if (match.category === "MEN") {
    return "VARONES";
  }

  return "GENERAL";
}

function getCategoryColor(match: Match) {
  if (match.category === "WOMEN") {
    return "#f9a8d4";
  }

  if (match.category === "MEN") {
    return "#93c5fd";
  }

  return "#facc15";
}

function getTeamName(
  match: Match,
  side: "A" | "B"
) {
  const team =
    side === "A"
      ? match.teamA
      : match.teamB;

  const sourceMatch =
    side === "A"
      ? match.sourceMatchA
      : match.sourceMatchB;

  if (team) {
    return team.name;
  }

  if (sourceMatch) {
    return `Ganador Partido ${sourceMatch}`;
  }

  return "Por definir";
}

export default function Dashboard() {
  const { setPage } = useApp();

  const { tournament } = useTournament();

  const { teams } = useTeams();

  const { fixture } = useFixture();

  const { champions } = useChampion();

  const matches = fixture ?? [];

  const totalMatches = matches.length;

  const finishedMatches = matches.filter(
    (match) => match.status === "FINISHED"
  ).length;

  const pendingMatches = matches.filter(
    (match) => match.status !== "FINISHED"
  ).length;

  const playingMatch = matches.find(
    (match) => match.status === "PLAYING"
  );

  const nextMatch =
    playingMatch ??
    matches.find(
      (match) => match.status !== "FINISHED"
    ) ??
    null;

  const menTeams = teams.filter(
    (team) => team.category !== "WOMEN"
  ).length;

  const womenTeams = teams.filter(
    (team) => team.category === "WOMEN"
  ).length;

  return (
    <div>
      <div style={heroBox}>
        <div>
          <h2
            style={{
              margin: 0,
              color: "#94a3b8",
            }}
          >
            Panel Principal
          </h2>

          <h1
            style={{
              marginTop: 8,
              marginBottom: 10,
              fontSize: 42,
            }}
          >
            {tournament?.name ?? "TEAMCR7STUDIO"}
          </h1>

          <p
            style={{
              color: "#cbd5e1",
              margin: 0,
            }}
          >
            Organizador profesional para campeonatos relámpago,
            fixture, resultados y OBS.
          </p>
        </div>

        <div style={heroActions}>
          <button
            onClick={() => setPage("tournament")}
            style={primaryButton}
          >
            🏆 Nuevo Campeonato
          </button>

          <button
            onClick={() => setPage("fixture")}
            style={secondaryButton}
          >
            📅 Ver Fixture
          </button>

          <button
            onClick={() => setPage("results")}
            style={secondaryButton}
          >
            📊 Resultados
          </button>
        </div>
      </div>

      <div style={statsGrid}>
        <StatCard
          label="Equipos Totales"
          value={teams.length}
          icon="👥"
        />

        <StatCard
          label="Varones"
          value={menTeams}
          icon="⚽"
        />

        <StatCard
          label="Mujeres"
          value={womenTeams}
          icon="👩"
        />

        <StatCard
          label="Partidos"
          value={totalMatches}
          icon="📅"
        />

        <StatCard
          label="Jugados"
          value={finishedMatches}
          icon="✅"
        />

        <StatCard
          label="Pendientes"
          value={pendingMatches}
          icon="⏳"
        />

        <StatCard
          label="Canchas Varones"
          value={tournament?.courts ?? 0}
          icon="🏟"
        />

        <StatCard
          label="Canchas Mujeres"
          value={tournament?.womenCourts ?? 0}
          icon="🏟"
        />
      </div>

      <div style={mainGrid}>
        <div style={panelBox}>
          <h2
            style={{
              marginTop: 0,
            }}
          >
            🏆 Campeones
          </h2>

          <ChampionBox
            title="Campeón Varones"
            value={champions.MEN?.name ?? "Pendiente"}
            color="#93c5fd"
          />

          {(tournament?.womenCourts ?? 0) > 0 && (
            <ChampionBox
              title="Campeona Mujeres"
              value={champions.WOMEN?.name ?? "Pendiente"}
              color="#f9a8d4"
            />
          )}

          {champions.GENERAL && (
            <ChampionBox
              title="Campeón General"
              value={champions.GENERAL.name}
              color="#facc15"
            />
          )}
        </div>

        <div style={panelBox}>
          <h2
            style={{
              marginTop: 0,
            }}
          >
            🔴 Partido actual / siguiente
          </h2>

          {nextMatch ? (
            <NextMatchCard match={nextMatch} />
          ) : (
            <p
              style={{
                color: "#94a3b8",
              }}
            >
              Todavía no hay partidos pendientes.
            </p>
          )}
        </div>
      </div>

      <div style={quickGrid}>
        <QuickButton
          title="Registrar Equipos"
          description="Agrega equipos o importa desde Excel."
          icon="👥"
          onClick={() => setPage("teams")}
        />

        <QuickButton
          title="Fixture"
          description="Revisa llaves, canchas y horarios."
          icon="📅"
          onClick={() => setPage("fixture")}
        />

        <QuickButton
          title="Resultados"
          description="Guarda marcadores, penales y campeones."
          icon="📊"
          onClick={() => setPage("results")}
        />

        <QuickButton
          title="Overlay OBS"
          description="Pantalla en vivo para transmisión."
          icon="📺"
          onClick={() => setPage("overlay")}
        />

        <QuickButton
          title="Configuración"
          description="Backup, restauración y limpieza."
          icon="⚙️"
          onClick={() => setPage("settings")}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: string;
}) {
  return (
    <div style={statCard}>
      <div
        style={{
          fontSize: 28,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          color: "#94a3b8",
          fontSize: 13,
          marginTop: 8,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: "bold",
          marginTop: 5,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ChampionBox({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: "#0f172a",
        border: `1px solid ${color}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          color,
          fontWeight: "bold",
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 24,
          fontWeight: "bold",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function NextMatchCard({
  match,
}: {
  match: Match;
}) {
  const color = getCategoryColor(match);

  return (
    <div
      style={{
        background: "#0f172a",
        border: `1px solid ${color}`,
        borderRadius: 12,
        padding: 18,
      }}
    >
      <div
        style={{
          color,
          fontWeight: "bold",
          marginBottom: 12,
        }}
      >
        {getCategoryLabel(match)}
      </div>

      <div
        style={{
          color: "#94a3b8",
          marginBottom: 12,
        }}
      >
        🕒 {match.time || "--:--"} | 🏟 {getCourtLabel(match)}
      </div>

      <div style={matchTeam}>
        {getTeamName(match, "A")}
      </div>

      <div style={vsText}>VS</div>

      <div style={matchTeam}>
        {getTeamName(match, "B")}
      </div>

      <div
        style={{
          marginTop: 14,
          color:
            match.status === "PLAYING"
              ? "#22c55e"
              : "#facc15",
          fontWeight: "bold",
        }}
      >
        {match.status === "PLAYING"
          ? "EN JUEGO"
          : "PENDIENTE"}
      </div>
    </div>
  );
}

function QuickButton({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={quickButton}
    >
      <div
        style={{
          fontSize: 32,
          marginBottom: 10,
        }}
      >
        {icon}
      </div>

      <strong
        style={{
          fontSize: 18,
        }}
      >
        {title}
      </strong>

      <p
        style={{
          color: "#94a3b8",
          marginBottom: 0,
        }}
      >
        {description}
      </p>
    </button>
  );
}

const heroBox: CSSProperties = {
  background:
    "linear-gradient(135deg, #1e293b, #0f172a)",
  border: "1px solid #334155",
  borderRadius: 18,
  padding: 30,
  marginBottom: 25,
  display: "flex",
  justifyContent: "space-between",
  gap: 25,
  flexWrap: "wrap",
  alignItems: "center",
};

const heroActions: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const statsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 15,
  marginBottom: 25,
};

const statCard: CSSProperties = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 18,
};

const mainGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 20,
  marginBottom: 25,
};

const panelBox: CSSProperties = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 20,
};

const quickGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 15,
};

const quickButton: CSSProperties = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 20,
  color: "white",
  textAlign: "left",
  cursor: "pointer",
};

const primaryButton: CSSProperties = {
  padding: "13px 20px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const secondaryButton: CSSProperties = {
  padding: "13px 20px",
  background: "#334155",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const matchTeam: CSSProperties = {
  fontSize: 22,
  fontWeight: "bold",
};

const vsText: CSSProperties = {
  color: "#60a5fa",
  fontWeight: "bold",
  margin: "10px 0",
};