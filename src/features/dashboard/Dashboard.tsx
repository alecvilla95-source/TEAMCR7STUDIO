import {
  useState,
  type CSSProperties,
} from "react";

import type { Match } from "../../types/match";
import type {
  Team,
  TeamCategory,
} from "../../types/team";
import type { GoalScorerRecord } from "../../types/goal";

import { useApp } from "../../store/appStore";
import { useTournament } from "../../store/tournamentStore";
import { useTeams } from "../../store/teamStore";
import { useFixture } from "../../store/fixtureStore";
import { useChampion } from "../../store/championStore";
import { useGoals } from "../../store/goalStore";

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

interface DashboardTopScorer {
  key: string;

  playerName: string;

  teamName: string;

  category: TeamCategory;

  goals: number;
}

function calculateDashboardTopScorers(
  records: GoalScorerRecord[]
): DashboardTopScorer[] {
  const map =
    new Map<string, DashboardTopScorer>();

  records.forEach((record) => {
    const key =
      `${record.category}_${record.teamId}_${record.playerId}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        playerName: record.playerName,
        teamName: record.teamName,
        category: record.category,
        goals: 0,
      });
    }

    const row = map.get(key)!;

    row.goals += record.goals;
  });

  return Array.from(map.values()).sort(
    (a, b) => {
      if (b.goals !== a.goals) {
        return b.goals - a.goals;
      }

      return a.playerName.localeCompare(
        b.playerName
      );
    }
  );
}

export default function Dashboard() {
  const { setPage } = useApp();

  const { tournament } = useTournament();

  const { teams } = useTeams();

  const { fixture } = useFixture();

  const { champions } = useChampion();

  const { goalRecords } = useGoals();

  const [showParticipants, setShowParticipants] =
    useState(false);

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
  );

  const womenTeams = teams.filter(
    (team) => team.category === "WOMEN"
  );

  const menCourts =
    tournament?.courts ?? 0;

  const womenCourts =
    tournament?.womenCourts ?? 0;

  const topScorers =
    calculateDashboardTopScorers(goalRecords);

  const topMenScorers = topScorers
    .filter((row) => row.category !== "WOMEN")
    .slice(0, 5);

  const topWomenScorers = topScorers
    .filter((row) => row.category === "WOMEN")
    .slice(0, 5);

  function countMenByCourt(court: number) {
    return menTeams.filter(
      (team) => team.assignedCourt === court
    ).length;
  }

  function countWomenByCourt(court: number) {
    return womenTeams.filter(
      (team) => team.assignedCourt === court
    ).length;
  }

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
            onClick={() => setShowParticipants(true)}
            style={secondaryButton}
          >
            👥 Ver Participantes
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
          label="Total Equipos Varones"
          value={menTeams.length}
          icon="⚽"
        />

        <StatCard
          label="Total Equipos Mujeres"
          value={womenTeams.length}
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
          value={menCourts}
          icon="🏟"
        />

        <StatCard
          label="Canchas Mujeres"
          value={womenCourts}
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

          {womenCourts > 0 && (
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                marginBottom: 0,
              }}
            >
              📋 Equipos por cancha
            </h2>

            <button
              onClick={() => setShowParticipants(true)}
              style={miniButton}
            >
              👥 Ver lista completa
            </button>
          </div>

          <div
            style={{
              marginTop: 18,
            }}
          >
            <div style={courtCountGrid}>
              <div>
                <h3
                  style={{
                    color: "#93c5fd",
                    marginTop: 0,
                  }}
                >
                  VARONES
                </h3>

                {menCourts > 0 ? (
                  Array.from({
                    length: menCourts,
                  }).map((_, index) => (
                    <CourtCountRow
                      key={index}
                      label={`Cancha ${index + 1}`}
                      value={countMenByCourt(index + 1)}
                      color="#93c5fd"
                    />
                  ))
                ) : (
                  <p style={mutedText}>
                    Sin canchas de varones.
                  </p>
                )}

                <div style={totalMiniBox}>
                  Total Varones:{" "}
                  <strong>{menTeams.length}</strong>
                </div>
              </div>

              <div>
                <h3
                  style={{
                    color: "#f9a8d4",
                    marginTop: 0,
                  }}
                >
                  MUJERES
                </h3>

                {womenCourts > 0 ? (
                  Array.from({
                    length: womenCourts,
                  }).map((_, index) => (
                    <CourtCountRow
                      key={index}
                      label={`C. Mujer ${index + 1}`}
                      value={countWomenByCourt(index + 1)}
                      color="#f9a8d4"
                    />
                  ))
                ) : (
                  <p style={mutedText}>
                    Sin canchas de mujeres.
                  </p>
                )}

                <div style={totalMiniBox}>
                  Total Mujeres:{" "}
                  <strong>{womenTeams.length}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={panelBox}>
          <h2
            style={{
              marginTop: 0,
            }}
          >
            ⚽ Top Goleadores
          </h2>

          <TopScorersMini
            title="🏆 Varones"
            rows={topMenScorers}
            color="#93c5fd"
          />

          {womenCourts > 0 && (
            <TopScorersMini
              title="🏆 Mujeres"
              rows={topWomenScorers}
              color="#f9a8d4"
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
          title="Participantes"
          description="Mira la lista completa de varones y mujeres."
          icon="👥"
          onClick={() => setShowParticipants(true)}
        />

        <QuickButton
          title="Registrar Equipos"
          description="Agrega equipos o importa desde Excel."
          icon="👥"
          onClick={() => setPage("teams")}
        />

        <QuickButton
          title="Jugadores"
          description="Fichas Excel, documentos y dorsales."
          icon="📝"
          onClick={() => setPage("players")}
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

      {showParticipants && (
        <ParticipantsModal
          menTeams={menTeams}
          womenTeams={womenTeams}
          menCourts={menCourts}
          womenCourts={womenCourts}
          onClose={() => setShowParticipants(false)}
        />
      )}
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

function CourtCountRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #334155",
        borderLeft: `4px solid ${color}`,
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <strong>{label}</strong>

      <span
        style={{
          color,
          fontWeight: "bold",
        }}
      >
        {value} equipos
      </span>
    </div>
  );
}

function TopScorersMini({
  title,
  rows,
  color,
}: {
  title: string;
  rows: DashboardTopScorer[];
  color: string;
}) {
  return (
    <div
      style={{
        marginBottom: 18,
      }}
    >
      <h3
        style={{
          color,
          marginTop: 0,
        }}
      >
        {title}
      </h3>

      {rows.length === 0 ? (
        <p style={mutedText}>
          Sin goles registrados.
        </p>
      ) : (
        rows.map((row, index) => (
          <div
            key={row.key}
            style={miniScorerRow}
          >
            <strong
              style={{
                color,
                textAlign: "center",
              }}
            >
              {index + 1}
            </strong>

            <div>
              <strong>{row.playerName}</strong>

              <div
                style={{
                  color: "#94a3b8",
                  fontSize: 13,
                }}
              >
                {row.teamName}
              </div>
            </div>

            <strong
              style={{
                color,
                textAlign: "right",
              }}
            >
              {row.goals} ⚽
            </strong>
          </div>
        ))
      )}
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

function ParticipantsModal({
  menTeams,
  womenTeams,
  menCourts,
  womenCourts,
  onClose,
}: {
  menTeams: Team[];
  womenTeams: Team[];
  menCourts: number;
  womenCourts: number;
  onClose: () => void;
}) {
  return (
    <div style={modalOverlay}>
      <div style={modalBox}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 15,
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 30,
              }}
            >
              👥 Participantes del Campeonato
            </h2>

            <p
              style={{
                color: "#94a3b8",
                marginBottom: 0,
              }}
            >
              Lista completa de equipos registrados, separados por categoría
              y cancha.
            </p>
          </div>

          <button
            onClick={onClose}
            style={closeButton}
          >
            ✕ Cerrar
          </button>
        </div>

        <div style={participantsSummary}>
          <ParticipantTotalBox
            label="Total Varones"
            value={menTeams.length}
            color="#93c5fd"
          />

          <ParticipantTotalBox
            label="Total Mujeres"
            value={womenTeams.length}
            color="#f9a8d4"
          />

          <ParticipantTotalBox
            label="Total General"
            value={menTeams.length + womenTeams.length}
            color="#facc15"
          />
        </div>

        <div style={participantsGrid}>
          <ParticipantCategorySection
            title="⚽ VARONES"
            teams={menTeams}
            courts={menCourts}
            courtPrefix="Cancha"
            color="#93c5fd"
          />

          <ParticipantCategorySection
            title="👩 MUJERES"
            teams={womenTeams}
            courts={womenCourts}
            courtPrefix="C. Mujer"
            color="#f9a8d4"
          />
        </div>
      </div>
    </div>
  );
}

function ParticipantTotalBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        background: "#0f172a",
        border: `1px solid ${color}`,
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div
        style={{
          color,
          fontWeight: "bold",
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 26,
          fontWeight: "bold",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ParticipantCategorySection({
  title,
  teams,
  courts,
  courtPrefix,
  color,
}: {
  title: string;
  teams: Team[];
  courts: number;
  courtPrefix: string;
  color: string;
}) {
  const groups = getParticipantGroups(
    teams,
    courts,
    courtPrefix
  );

  return (
    <div
      style={{
        background: "#111827",
        border: `1px solid ${color}`,
        borderRadius: 14,
        padding: 18,
      }}
    >
      <h3
        style={{
          color,
          marginTop: 0,
          fontSize: 24,
        }}
      >
        {title}
      </h3>

      <p
        style={{
          color: "#94a3b8",
        }}
      >
        Total: <strong>{teams.length}</strong> equipos
      </p>

      {teams.length === 0 && (
        <div style={emptyParticipants}>
          No hay equipos registrados en esta categoría.
        </div>
      )}

      {groups.map((group) => (
        <div
          key={group.label}
          style={{
            marginTop: 18,
          }}
        >
          <h4
            style={{
              color,
              borderBottom: "1px solid #334155",
              paddingBottom: 8,
              marginBottom: 10,
            }}
          >
            🏟 {group.label}{" "}
            <span
              style={{
                color: "#94a3b8",
                fontSize: 14,
              }}
            >
              ({group.teams.length})
            </span>
          </h4>

          {group.teams.length === 0 ? (
            <p style={mutedText}>
              Sin equipos registrados.
            </p>
          ) : (
            <div style={teamList}>
              {group.teams.map((team, index) => (
                <div
                  key={team.id}
                  style={participantRow}
                >
                  <span style={participantNumber}>
                    {index + 1}
                  </span>

                  <strong>{team.name}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function getParticipantGroups(
  teams: Team[],
  courts: number,
  courtPrefix: string
) {
  const groups: {
    label: string;
    teams: Team[];
  }[] = [];

  for (
    let court = 1;
    court <= courts;
    court++
  ) {
    const courtTeams = teams.filter(
      (team) => team.assignedCourt === court
    );

    groups.push({
      label: `${courtPrefix} ${court}`,
      teams: courtTeams,
    });
  }

  const unassigned = teams.filter(
    (team) => !team.assignedCourt
  );

  if (unassigned.length > 0) {
    groups.push({
      label: "Sin cancha asignada",
      teams: unassigned,
    });
  }

  return groups;
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
    "repeat(auto-fit, minmax(170px, 1fr))",
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

const courtCountGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(230px, 1fr))",
  gap: 18,
};

const totalMiniBox: CSSProperties = {
  marginTop: 12,
  background: "#111827",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: 12,
  color: "#e5e7eb",
};

const mutedText: CSSProperties = {
  color: "#94a3b8",
};

const miniScorerRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "35px 1fr 60px",
  gap: 10,
  alignItems: "center",
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: 10,
  marginBottom: 8,
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

const miniButton: CSSProperties = {
  padding: "10px 14px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 8,
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

const modalOverlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(2, 6, 23, 0.85)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const modalBox: CSSProperties = {
  width: "min(1200px, 95vw)",
  maxHeight: "88vh",
  overflowY: "auto",
  background: "#1e293b",
  border: "1px solid #475569",
  borderRadius: 18,
  padding: 25,
  boxShadow: "0 25px 80px rgba(0,0,0,0.45)",
};

const closeButton: CSSProperties = {
  padding: "12px 18px",
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const participantsSummary: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 15,
  marginBottom: 20,
};

const participantsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(360px, 1fr))",
  gap: 20,
};

const teamList: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
};

const participantRow: CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: 10,
  display: "flex",
  gap: 10,
  alignItems: "center",
};

const participantNumber: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 999,
  background: "#334155",
  color: "white",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "bold",
  fontSize: 13,
};

const emptyParticipants: CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: 14,
  color: "#94a3b8",
};