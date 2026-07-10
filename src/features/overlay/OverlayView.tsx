import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import type { Match } from "../../types/match";
import type { Team } from "../../types/team";

import { useFixture } from "../../store/fixtureStore";
import { useTournament } from "../../store/tournamentStore";
import { useOverlay } from "../../store/overlayStore";
import { useTimer } from "../../store/timerStore";
import { useTeams } from "../../store/teamStore";

const STORAGE_KEY = "teamcr7studio_active_match_id";

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);

  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");

  const secs = (safeSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${secs}`;
}

function readStoredActiveMatchId() {
  const value = localStorage.getItem(STORAGE_KEY);

  if (!value) return null;

  const parsed = Number(value);

  if (Number.isNaN(parsed)) return null;

  return parsed;
}

function getCourtLabel(match: Match) {
  if (match.courtLabel) {
    return match.courtLabel;
  }

  if (match.category === "WOMEN") {
    return `C. Mujer ${match.court || "-"}`;
  }

  return `Cancha ${match.court || "-"}`;
}

function getTeamWithLogo(
  team: Team | null | undefined,
  teamMap: Map<number, Team>
): Team | null {
  if (!team) return null;

  const savedTeam = teamMap.get(team.id);

  return {
    ...team,
    logoDataUrl:
      savedTeam?.logoDataUrl ??
      team.logoDataUrl,
  };
}

function getTeamName(
  team: Team | null,
  fallback: string
) {
  return team?.name ?? fallback;
}

function getStatusText(match: Match) {
  if (match.status === "FINISHED") {
    return `GANADOR: ${match.winner?.name ?? "PENDIENTE"}`;
  }

  return "PARTIDO EN VIVO";
}

export default function OverlayView() {
  const { fixture } = useFixture();

  const { tournament } = useTournament();

  const { activeMatchId } = useOverlay();

  const { secondsLeft } = useTimer();

  const { teams } = useTeams();

  const [storedMatchId, setStoredMatchId] =
    useState<number | null>(() => readStoredActiveMatchId());

  useEffect(() => {
    function syncStoredMatch() {
      setStoredMatchId(readStoredActiveMatchId());
    }

    window.addEventListener("storage", syncStoredMatch);
    window.addEventListener("focus", syncStoredMatch);

    const interval = window.setInterval(syncStoredMatch, 500);

    return () => {
      window.removeEventListener("storage", syncStoredMatch);
      window.removeEventListener("focus", syncStoredMatch);
      window.clearInterval(interval);
    };
  }, []);

  const selectedMatchId =
    activeMatchId ?? storedMatchId;

  const teamMap = useMemo(() => {
    const map = new Map<number, Team>();

    teams.forEach((team) => {
      map.set(team.id, team);
    });

    return map;
  }, [teams]);

  const selectedMatch = fixture.find(
    (match) => match.id === selectedMatchId
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

  const match =
    selectedMatch ??
    nextMatch ??
    lastFinished ??
    null;

  if (!match) {
    return (
      <main style={pageStyle}>
        <section style={emptyCardStyle}>
          <img
            src="/teamcr7studio-logo.png"
            alt="TEAMCR7STUDIO"
            style={brandLogoStyle}
          />

          <h1 style={emptyTitleStyle}>
            TEAMCR7STUDIO
          </h1>

          <p style={emptyTextStyle}>
            No hay partido seleccionado para mostrar.
          </p>

          <p style={emptyHelpStyle}>
            Ve a Resultados y presiona el botón 📺 OBS en un partido.
          </p>
        </section>
      </main>
    );
  }

  const teamA = getTeamWithLogo(
    match.teamA,
    teamMap
  );

  const teamB = getTeamWithLogo(
    match.teamB,
    teamMap
  );

  const hasPenalties =
    match.penaltyA !== undefined &&
    match.penaltyB !== undefined;

  return (
    <main style={pageStyle}>
      <section style={topBarStyle}>
        <div style={brandBoxStyle}>
          <img
            src="/teamcr7studio-logo.png"
            alt="TEAMCR7STUDIO"
            style={brandLogoStyle}
          />

          <div style={brandTextStyle}>
            {tournament?.name ?? "TEAMCR7STUDIO"}
          </div>
        </div>

        <div style={topInfoStyle}>
          <span>⏱ {formatTime(secondsLeft)}</span>

          <span>🏟 {getCourtLabel(match)}</span>
        </div>
      </section>

      <section style={scoreboardStyle}>
        <TeamPanel
          side="left"
          team={teamA}
          name={getTeamName(
            teamA,
            match.sourceMatchA
              ? `Ganador Partido ${match.sourceMatchA}`
              : "Por definir"
          )}
          score={match.scoreA}
          penalty={match.penaltyA}
          hasPenalties={hasPenalties}
        />

        <div style={vsStyle}>
          VS
        </div>

        <TeamPanel
          side="right"
          team={teamB}
          name={getTeamName(
            teamB,
            match.sourceMatchB
              ? `Ganador Partido ${match.sourceMatchB}`
              : "Por definir"
          )}
          score={match.scoreB}
          penalty={match.penaltyB}
          hasPenalties={hasPenalties}
        />
      </section>

      {hasPenalties && (
        <section style={penaltyBannerStyle}>
          Definido por penales: {match.penaltyA} - {match.penaltyB}
        </section>
      )}

      <section style={bottomBarStyle}>
        {getStatusText(match)}
      </section>
    </main>
  );
}

function TeamPanel({
  team,
  name,
  score,
  penalty,
  hasPenalties,
  side,
}: {
  team: Team | null;
  name: string;
  score: number;
  penalty?: number;
  hasPenalties: boolean;
  side: "left" | "right";
}) {
  const headerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 24,
    flexDirection: side === "left" ? "row" : "row-reverse",
  };

  const nameStyle: CSSProperties = {
    fontSize: 40,
    fontWeight: 900,
    lineHeight: 1.05,
    textTransform: "uppercase",
    wordBreak: "break-word",
    textAlign: side === "left" ? "left" : "right",
    flex: 1,
  };

  return (
    <article style={teamPanelStyle}>
      <div style={headerStyle}>
        <TeamLogo team={team} />

        <div style={nameStyle}>
          {name}
        </div>
      </div>

      <div style={scoreStyle}>
        {score}
      </div>

      {hasPenalties && (
        <div style={penaltyScoreStyle}>
          Penales: {penalty ?? 0}
        </div>
      )}
    </article>
  );
}

function TeamLogo({
  team,
}: {
  team: Team | null;
}) {
  if (!team?.logoDataUrl) {
    return (
      <div style={teamLogoEmptyStyle}>
        ⚽
      </div>
    );
  }

  return (
    <img
      src={team.logoDataUrl}
      alt={team.name}
      style={teamLogoStyle}
    />
  );
}

const pageStyle: CSSProperties = {
  width: "100%",
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top, rgba(37, 99, 235, 0.35), transparent 35%), linear-gradient(135deg, #020617, #0f172a 55%, #111827)",
  color: "white",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  padding: 40,
  overflow: "hidden",
};

const topBarStyle: CSSProperties = {
  width: "100%",
  maxWidth: 1180,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "rgba(15, 23, 42, 0.94)",
  border: "1px solid #334155",
  borderRadius: 18,
  padding: "16px 24px",
  marginBottom: 28,
  boxShadow: "0 18px 45px rgba(0,0,0,.28)",
};

const brandBoxStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
};

const brandLogoStyle: CSSProperties = {
  width: 58,
  height: 58,
  objectFit: "contain",
  flexShrink: 0,
};

const brandTextStyle: CSSProperties = {
  fontSize: 24,
  fontWeight: 900,
  textTransform: "uppercase",
};

const topInfoStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 22,
  color: "#e0f2fe",
  fontSize: 24,
  fontWeight: 900,
};

const scoreboardStyle: CSSProperties = {
  width: "100%",
  maxWidth: 1180,
  display: "grid",
  gridTemplateColumns: "1fr 120px 1fr",
  gap: 22,
  alignItems: "center",
};

const teamPanelStyle: CSSProperties = {
  minHeight: 300,
  background:
    "linear-gradient(180deg, rgba(30,41,59,.97), rgba(15,23,42,.97))",
  border: "1px solid #475569",
  borderRadius: 24,
  padding: 28,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  boxShadow: "0 22px 60px rgba(0,0,0,.38)",
};

const teamLogoStyle: CSSProperties = {
  width: 120,
  height: 120,
  objectFit: "contain",
  background: "#020617",
  border: "2px solid #334155",
  borderRadius: 22,
  padding: 8,
  flexShrink: 0,
  boxShadow: "0 12px 30px rgba(0,0,0,.35)",
};

const teamLogoEmptyStyle: CSSProperties = {
  width: 120,
  height: 120,
  background: "#020617",
  border: "2px solid #334155",
  borderRadius: 22,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  fontSize: 48,
  boxShadow: "0 12px 30px rgba(0,0,0,.35)",
};

const scoreStyle: CSSProperties = {
  fontSize: 100,
  fontWeight: 900,
  color: "#60a5fa",
  lineHeight: 1,
  textAlign: "center",
  textShadow: "0 8px 30px rgba(96,165,250,.35)",
};

const penaltyScoreStyle: CSSProperties = {
  marginTop: 8,
  fontSize: 24,
  fontWeight: 900,
  color: "#facc15",
  textAlign: "center",
};

const vsStyle: CSSProperties = {
  width: 120,
  height: 120,
  borderRadius: "50%",
  background:
    "linear-gradient(135deg, #facc15, #f97316)",
  color: "#111827",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 38,
  fontWeight: 900,
  boxShadow: "0 18px 45px rgba(250,204,21,.28)",
};

const penaltyBannerStyle: CSSProperties = {
  marginTop: 26,
  width: "100%",
  maxWidth: 1180,
  background: "#713f12",
  border: "1px solid #facc15",
  color: "#fef3c7",
  borderRadius: 18,
  padding: 18,
  textAlign: "center",
  fontSize: 26,
  fontWeight: 900,
};

const bottomBarStyle: CSSProperties = {
  marginTop: 26,
  width: "100%",
  maxWidth: 1180,
  background: "rgba(2, 6, 23, 0.92)",
  border: "1px solid #334155",
  borderRadius: 18,
  padding: 18,
  textAlign: "center",
  fontSize: 28,
  fontWeight: 900,
  letterSpacing: 1,
};

const emptyCardStyle: CSSProperties = {
  background: "rgba(30, 41, 59, 0.94)",
  padding: 48,
  borderRadius: 24,
  textAlign: "center",
  border: "1px solid #334155",
};

const emptyTitleStyle: CSSProperties = {
  marginTop: 20,
  marginBottom: 10,
  fontSize: 42,
};

const emptyTextStyle: CSSProperties = {
  color: "#cbd5e1",
  fontSize: 20,
};

const emptyHelpStyle: CSSProperties = {
  color: "#93c5fd",
  fontSize: 17,
};