import {
  useMemo,
  type CSSProperties,
} from "react";

import type { Match } from "../../types/match";
import type {
  Team,
  TeamCategory,
} from "../../types/team";
import type { GoalScorerRecord } from "../../types/goal";

import { useTournament } from "../../store/tournamentStore";
import { useTeams } from "../../store/teamStore";
import { useFixture } from "../../store/fixtureStore";
import { useChampion } from "../../store/championStore";
import { useGoals } from "../../store/goalStore";

type DashboardCategory =
  | TeamCategory
  | "GENERAL";

interface TopScorerRow {
  key: string;
  teamId: number;
  playerId: string;
  playerName: string;
  teamName: string;
  teamLogoDataUrl?: string;
  category: TeamCategory;
  goals: number;
}

function getCategoryLabel(
  category: DashboardCategory
) {
  if (category === "WOMEN") return "MUJERES";

  if (category === "MEN") return "VARONES";

  return "GENERAL";
}

function getCourtLabel(team: Team) {
  if (team.category === "WOMEN") {
    return `C. Mujer ${team.assignedCourt ?? "-"}`;
  }

  return `Cancha ${team.assignedCourt ?? "-"}`;
}

function getMatchCourtLabel(match: Match) {
  if (match.courtLabel) return match.courtLabel;

  if (match.category === "WOMEN") {
    return `C. Mujer ${match.court || "-"}`;
  }

  return `Cancha ${match.court || "-"}`;
}

function calculateTopScorers(
  records: GoalScorerRecord[],
  teams: Team[]
): TopScorerRow[] {
  const teamMap = new Map<number, Team>();

  teams.forEach((team) => {
    teamMap.set(team.id, team);
  });

  const map =
    new Map<string, TopScorerRow>();

  records.forEach((record) => {
    const key =
      `${record.category}_${record.teamId}_${record.playerId}`;

    const team =
      teamMap.get(record.teamId);

    if (!map.has(key)) {
      map.set(key, {
        key,
        teamId: record.teamId,
        playerId: record.playerId,
        playerName: record.playerName,
        teamName: record.teamName,
        teamLogoDataUrl: team?.logoDataUrl,
        category: record.category,
        goals: 0,
      });
    }

    const row = map.get(key)!;

    row.goals += record.goals;

    if (!row.teamLogoDataUrl && team?.logoDataUrl) {
      row.teamLogoDataUrl = team.logoDataUrl;
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    if (b.goals !== a.goals) {
      return b.goals - a.goals;
    }

    return a.playerName.localeCompare(
      b.playerName
    );
  });
}

function getNextMatch(fixture: Match[]) {
  return fixture.find(
    (match) =>
      match.status !== "FINISHED" &&
      match.teamA &&
      match.teamB
  );
}

function getLastFinishedMatch(fixture: Match[]) {
  return [...fixture]
    .reverse()
    .find((match) => match.status === "FINISHED");
}

function groupTeamsByCourt(teams: Team[]) {
  const map = new Map<string, Team[]>();

  teams.forEach((team) => {
    const label = getCourtLabel(team);

    if (!map.has(label)) {
      map.set(label, []);
    }

    map.get(label)!.push(team);
  });

  return Array.from(map.entries()).map(
    ([label, list]) => ({
      label,
      teams: list,
    })
  );
}

export default function DashboardView() {
  const { tournament } = useTournament();

  const { teams } = useTeams();

  const { fixture } = useFixture();

  const { champions } = useChampion();

  const { goalRecords } = useGoals();

  const menTeams = teams.filter(
    (team) => team.category !== "WOMEN"
  );

  const womenTeams = teams.filter(
    (team) => team.category === "WOMEN"
  );

  const finishedMatches = fixture.filter(
    (match) => match.status === "FINISHED"
  );

  const pendingMatches = fixture.filter(
    (match) => match.status !== "FINISHED"
  );

  const nextMatch = getNextMatch(fixture);

  const lastFinishedMatch =
    getLastFinishedMatch(fixture);

  const topScorers = useMemo(
    () => calculateTopScorers(goalRecords, teams),
    [goalRecords, teams]
  );

  const menTopScorers = topScorers.filter(
    (row) => row.category !== "WOMEN"
  );

  const womenTopScorers = topScorers.filter(
    (row) => row.category === "WOMEN"
  );

  const groupedMenTeams =
    groupTeamsByCourt(menTeams);

  const groupedWomenTeams =
    groupTeamsByCourt(womenTeams);

  return (
    <div>
      <section style={heroBox}>
        <div>
          <div style={smallLabel}>
            PANEL PRINCIPAL
          </div>

          <h1 style={mainTitle}>
            {tournament?.name ?? "TEAMCR7STUDIO"}
          </h1>

          <p style={subtitle}>
            Control general del campeonato, equipos, partidos,
            campeones y goleadores.
          </p>
        </div>

        <div style={brandCard}>
          <img
            src="/teamcr7studio-logo.png"
            alt="TEAMCR7STUDIO"
            style={brandLogo}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />

          <div style={brandText}>
            TEAM CR7<br />STUDIO
          </div>
        </div>
      </section>

      <section style={statsGrid}>
        <StatCard
          title="Equipos Totales"
          value={teams.length}
          color="#facc15"
          emoji="👥"
        />

        <StatCard
          title="Equipos Varones"
          value={menTeams.length}
          color="#93c5fd"
          emoji="⚽"
        />

        <StatCard
          title="Equipos Mujeres"
          value={womenTeams.length}
          color="#f9a8d4"
          emoji="👩"
        />

        <StatCard
          title="Partidos"
          value={fixture.length}
          color="#22c55e"
          emoji="📅"
        />

        <StatCard
          title="Jugados"
          value={finishedMatches.length}
          color="#16a34a"
          emoji="✅"
        />

        <StatCard
          title="Pendientes"
          value={pendingMatches.length}
          color="#f97316"
          emoji="⏳"
        />
      </section>

      <section style={mainGrid}>
        <div style={leftColumn}>
          <div style={sectionBox}>
            <SectionTitle
              title="🏆 Campeones"
              subtitle="Ganadores principales del campeonato"
            />

            <div style={championGrid}>
              <ChampionCard
                title="Campeón Varones"
                team={champions.MEN ?? null}
                color="#93c5fd"
              />

              {(tournament?.womenCourts ?? 0) > 0 && (
                <ChampionCard
                  title="Campeona Mujeres"
                  team={champions.WOMEN ?? null}
                  color="#f9a8d4"
                />
              )}

              {champions.GENERAL && (
                <ChampionCard
                  title="Campeón General"
                  team={champions.GENERAL}
                  color="#facc15"
                />
              )}
            </div>
          </div>

          <div style={sectionBox}>
            <SectionTitle
              title="⚽ Top Goleadores"
              subtitle="Jugadores con más goles registrados"
            />

            <div style={topScorersGrid}>
              <TopScorersMiniTable
                title="Goleadores Varones"
                rows={menTopScorers}
                color="#93c5fd"
              />

              {(tournament?.womenCourts ?? 0) > 0 && (
                <TopScorersMiniTable
                  title="Goleadoras Mujeres"
                  rows={womenTopScorers}
                  color="#f9a8d4"
                />
              )}
            </div>
          </div>
        </div>

        <div style={rightColumn}>
          <div style={sectionBox}>
            <SectionTitle
              title="📺 Partido para seguir"
              subtitle="Próximo o último partido del campeonato"
            />

            {nextMatch ? (
              <MatchPreviewCard
                title="Próximo partido"
                match={nextMatch}
                color="#22c55e"
              />
            ) : lastFinishedMatch ? (
              <MatchPreviewCard
                title="Último resultado"
                match={lastFinishedMatch}
                color="#facc15"
              />
            ) : (
              <div style={emptyBox}>
                Todavía no hay partidos disponibles.
              </div>
            )}
          </div>

          <div style={sectionBox}>
            <SectionTitle
              title="🏟 Equipos por cancha"
              subtitle="Distribución visual de equipos en columnas"
            />

            <CourtTeamsPanel
              title="Varones"
              groups={groupedMenTeams}
              color="#93c5fd"
            />

            {womenTeams.length > 0 && (
              <CourtTeamsPanel
                title="Mujeres"
                groups={groupedWomenTeams}
                color="#f9a8d4"
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h2 style={sectionTitle}>
        {title}
      </h2>

      <p style={sectionSubtitle}>
        {subtitle}
      </p>
    </div>
  );
}

function StatCard({
  title,
  value,
  color,
  emoji,
}: {
  title: string;
  value: number;
  color: string;
  emoji: string;
}) {
  return (
    <div
      style={{
        ...statCard,
        borderColor: color,
      }}
    >
      <div style={statTop}>
        <span style={{ fontSize: 28 }}>
          {emoji}
        </span>

        <span
          style={{
            color,
            fontWeight: 900,
          }}
        >
          {title}
        </span>
      </div>

      <div style={statValue}>
        {value}
      </div>
    </div>
  );
}

function TeamLogo({
  team,
  size = 54,
}: {
  team: Team | null;
  size?: number;
}) {
  if (!team?.logoDataUrl) {
    return (
      <div
        style={{
          ...teamLogoEmpty,
          width: size,
          height: size,
          fontSize: Math.round(size * 0.42),
        }}
      >
        ⚽
      </div>
    );
  }

  return (
    <img
      src={team.logoDataUrl}
      alt={team.name}
      style={{
        ...teamLogo,
        width: size,
        height: size,
      }}
    />
  );
}

function ChampionCard({
  title,
  team,
  color,
}: {
  title: string;
  team: Team | null;
  color: string;
}) {
  return (
    <div
      style={{
        ...championCard,
        borderColor: color,
      }}
    >
      <div
        style={{
          color,
          fontWeight: 900,
          marginBottom: 12,
        }}
      >
        🏆 {title}
      </div>

      <div style={championContent}>
        <TeamLogo
          team={team}
          size={78}
        />

        <div>
          <div style={championName}>
            {team?.name ?? "Pendiente"}
          </div>

          <div style={championHint}>
            {team
              ? getCategoryLabel(team.category ?? "MEN")
              : "Aún no definido"}
          </div>
        </div>
      </div>
    </div>
  );
}

function TopScorersMiniTable({
  title,
  rows,
  color,
}: {
  title: string;
  rows: TopScorerRow[];
  color: string;
}) {
  return (
    <div
      style={{
        ...miniTableBox,
        borderColor: color,
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
        <div style={emptyMiniBox}>
          Sin goles registrados.
        </div>
      ) : (
        <div style={scorerList}>
          {rows.slice(0, 5).map((row, index) => (
            <div
              key={row.key}
              style={scorerRow}
            >
              <div style={positionBadge}>
                {index + 1}
              </div>

              <TeamLogo
                team={{
                  id: row.teamId,
                  name: row.teamName,
                  category: row.category,
                  logoDataUrl: row.teamLogoDataUrl,
                }}
                size={42}
              />

              <div style={scorerInfo}>
                <strong>{row.playerName}</strong>

                <span>{row.teamName}</span>
              </div>

              <div style={goalsBadge}>
                {row.goals}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchPreviewCard({
  title,
  match,
  color,
}: {
  title: string;
  match: Match;
  color: string;
}) {
  return (
    <div
      style={{
        ...matchPreviewCard,
        borderColor: color,
      }}
    >
      <div
        style={{
          color,
          fontWeight: 900,
          marginBottom: 12,
        }}
      >
        {title}
      </div>

      <div style={matchMeta}>
        🕒 {match.time || "--:--"} | 🏟 {getMatchCourtLabel(match)}
      </div>

      <div style={matchTeamsRow}>
        <MatchTeamSide team={match.teamA} />

        <div style={scoreCenter}>
          {match.scoreA} - {match.scoreB}
        </div>

        <MatchTeamSide team={match.teamB} />
      </div>

      <div style={matchStatus}>
        {match.status === "FINISHED"
          ? `Ganador: ${match.winner?.name ?? "Pendiente"}`
          : "Pendiente / En juego"}
      </div>
    </div>
  );
}

function MatchTeamSide({
  team,
}: {
  team: Team | null;
}) {
  return (
    <div style={matchTeamSide}>
      <TeamLogo
        team={team}
        size={56}
      />

      <strong>
        {team?.name ?? "Por definir"}
      </strong>
    </div>
  );
}

function CourtTeamsPanel({
  title,
  groups,
  color,
}: {
  title: string;
  groups: Array<{
    label: string;
    teams: Team[];
  }>;
  color: string;
}) {
  return (
    <div style={{ marginTop: 16 }}>
      <h3
        style={{
          color,
          marginBottom: 12,
        }}
      >
        {title}
      </h3>

      {groups.length === 0 ? (
        <div style={emptyMiniBox}>
          Sin equipos registrados.
        </div>
      ) : (
        <div style={courtGrid}>
          {groups.map((group) => (
            <div
              key={group.label}
              style={{
                ...courtCard,
                borderColor: color,
              }}
            >
              <div
                style={{
                  color,
                  fontWeight: 900,
                  marginBottom: 10,
                }}
              >
                {group.label}
              </div>

              <div style={courtTeamList}>
                {group.teams.map((team) => (
                  <div
                    key={team.id}
                    style={courtTeamRow}
                    title={team.name}
                  >
                    <TeamLogo
                      team={team}
                      size={28}
                    />

                    <span style={courtTeamName}>
                      {team.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const heroBox: CSSProperties = {
  background:
    "linear-gradient(135deg, #1e293b, #0f172a)",
  border: "1px solid #334155",
  borderRadius: 18,
  padding: 28,
  marginBottom: 22,
  display: "flex",
  justifyContent: "space-between",
  gap: 22,
  alignItems: "center",
  flexWrap: "wrap",
};

const smallLabel: CSSProperties = {
  color: "#93c5fd",
  fontWeight: 900,
  letterSpacing: 1.5,
  fontSize: 13,
};

const mainTitle: CSSProperties = {
  margin: "8px 0",
  fontSize: 38,
  lineHeight: 1,
};

const subtitle: CSSProperties = {
  color: "#94a3b8",
  margin: 0,
  fontSize: 16,
};

const brandCard: CSSProperties = {
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 16,
  padding: 16,
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const brandLogo: CSSProperties = {
  width: 72,
  height: 72,
  objectFit: "contain",
};

const brandText: CSSProperties = {
  fontWeight: 1000,
  fontSize: 18,
  lineHeight: 1.05,
};

const statsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 15,
  marginBottom: 22,
};

const statCard: CSSProperties = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 16,
};

const statTop: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const statValue: CSSProperties = {
  fontSize: 34,
  fontWeight: 1000,
  marginTop: 12,
};

const mainGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.15fr 0.85fr",
  gap: 22,
  alignItems: "start",
};

const leftColumn: CSSProperties = {
  display: "grid",
  gap: 22,
};

const rightColumn: CSSProperties = {
  display: "grid",
  gap: 22,
};

const sectionBox: CSSProperties = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 16,
  padding: 20,
};

const sectionTitle: CSSProperties = {
  margin: 0,
  fontSize: 25,
};

const sectionSubtitle: CSSProperties = {
  color: "#94a3b8",
  margin: "6px 0 0",
};

const championGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 15,
};

const championCard: CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 16,
};

const championContent: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
};

const championName: CSSProperties = {
  fontSize: 22,
  fontWeight: 1000,
  textTransform: "uppercase",
};

const championHint: CSSProperties = {
  color: "#94a3b8",
  marginTop: 4,
  fontSize: 13,
};

const teamLogo: CSSProperties = {
  objectFit: "contain",
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: 4,
  flexShrink: 0,
};

const teamLogoEmpty: CSSProperties = {
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const topScorersGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 15,
};

const miniTableBox: CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 16,
};

const emptyMiniBox: CSSProperties = {
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: 14,
  color: "#94a3b8",
};

const scorerList: CSSProperties = {
  display: "grid",
  gap: 10,
};

const scorerRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "34px 42px 1fr 46px",
  alignItems: "center",
  gap: 10,
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: 10,
};

const positionBadge: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: "50%",
  background: "#334155",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
};

const scorerInfo: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  gap: 3,
  color: "#e5e7eb",
};

const goalsBadge: CSSProperties = {
  background: "#16a34a",
  color: "white",
  borderRadius: 10,
  padding: "8px 0",
  textAlign: "center",
  fontWeight: 1000,
  fontSize: 18,
};

const matchPreviewCard: CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 16,
};

const matchMeta: CSSProperties = {
  color: "#94a3b8",
  marginBottom: 16,
};

const matchTeamsRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 80px 1fr",
  gap: 12,
  alignItems: "center",
};

const matchTeamSide: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  textAlign: "center",
};

const scoreCenter: CSSProperties = {
  fontSize: 28,
  fontWeight: 1000,
  color: "#60a5fa",
  textAlign: "center",
};

const matchStatus: CSSProperties = {
  marginTop: 16,
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: 10,
  textAlign: "center",
  fontWeight: 900,
};

const courtGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 12,
};

const courtCard: CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: 12,
};

const courtTeamList: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(125px, 1fr))",
  gap: 8,
};

const courtTeamRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: "6px 8px",
  minWidth: 0,
  overflow: "hidden",
};

const courtTeamName: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};

const emptyBox: CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 18,
  color: "#94a3b8",
};