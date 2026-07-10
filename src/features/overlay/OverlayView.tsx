import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import type { Match } from "../../types/match";
import type { Team } from "../../types/team";
import type { Player } from "../../types/player";
import type { GoalScorerRecord } from "../../types/goal";

import { useFixture } from "../../store/fixtureStore";
import { useTournament } from "../../store/tournamentStore";
import { useOverlay } from "../../store/overlayStore";
import { useTimer } from "../../store/timerStore";
import { useTeams } from "../../store/teamStore";
import { useChampion } from "../../store/championStore";
import { usePlayers } from "../../store/playerStore";
import { useGoals } from "../../store/goalStore";

import { applyResult } from "../../engine/resultEngine";

const ACTIVE_MATCH_STORAGE_KEY =
  "teamcr7studio_active_match_id";

const OVERLAY_MODE_STORAGE_KEY =
  "teamcr7studio_overlay_mode";

type OverlayMode =
  | "SINGLE"
  | "MULTI";

function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

function safeNumber(value: number) {
  if (Number.isNaN(value)) return 0;

  return Math.max(0, value);
}

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
  const value = localStorage.getItem(
    ACTIVE_MATCH_STORAGE_KEY
  );

  if (!value) return null;

  const parsed = Number(value);

  if (Number.isNaN(parsed)) return null;

  return parsed;
}

function readStoredOverlayMode(): OverlayMode {
  const value = localStorage.getItem(
    OVERLAY_MODE_STORAGE_KEY
  );

  if (value === "MULTI") return "MULTI";

  return "SINGLE";
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

function getTimeKey(match: Match) {
  return (match.time || "").trim();
}

function getCategoryName(match: Match) {
  if (match.category === "WOMEN") {
    return "MUJERES";
  }

  return "VARONES";
}

function getStageText(match: Match) {
  if (match.groupName) return match.groupName;

  if (match.stage === "GROUP") return "GRUPOS";

  if (
    (match.courtLabel ?? "")
      .toUpperCase()
      .includes("FINAL")
  ) {
    return "FINAL";
  }

  return "ELIMINACIÓN";
}

function getMatchLabel(match: Match) {
  const teamA =
    match.teamA?.name ??
    (
      match.sourceMatchA
        ? `Ganador P${match.sourceMatchA}`
        : "Por definir"
    );

  const teamB =
    match.teamB?.name ??
    (
      match.sourceMatchB
        ? `Ganador P${match.sourceMatchB}`
        : "Por definir"
    );

  return `P${match.id} | ${match.time || "--:--"} | ${getCourtLabel(
    match
  )} | ${teamA} vs ${teamB}`;
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

function getStatusText(
  match: Match,
  isRunning: boolean
) {
  if (match.status === "FINISHED") {
    return `GANADOR: ${match.winner?.name ?? "PENDIENTE"}`;
  }

  if (isRunning) {
    return "PARTIDO EN JUEGO";
  }

  return "CRONÓMETRO PAUSADO";
}

function sortMatchesForOverlay(matches: Match[]) {
  return [...matches].sort((a, b) => {
    const categoryA = a.category === "WOMEN" ? 2 : 1;
    const categoryB = b.category === "WOMEN" ? 2 : 1;

    if (categoryA !== categoryB) {
      return categoryA - categoryB;
    }

    if ((a.court ?? 0) !== (b.court ?? 0)) {
      return (a.court ?? 0) - (b.court ?? 0);
    }

    if (a.round !== b.round) {
      return a.round - b.round;
    }

    return a.id - b.id;
  });
}

function getSimultaneousMatches(
  fixture: Match[],
  selectedMatch: Match | null
) {
  if (!selectedMatch) return [];

  const selectedTime = getTimeKey(selectedMatch);

  if (!selectedTime) {
    return [selectedMatch];
  }

  return sortMatchesForOverlay(
    fixture.filter(
      (match) =>
        getTimeKey(match) === selectedTime &&
        match.teamA &&
        match.teamB
    )
  );
}

export default function OverlayView() {
  const {
    fixture,
    setFixture,
  } = useFixture();

  const { tournament } = useTournament();

  const {
    activeMatchId,
    setActiveMatchId,
  } = useOverlay();

  const {
    secondsLeft,
    durationSeconds,
    isRunning,
    startTimer,
    pauseTimer,
    resetTimer,
    restartTimer,
    setDurationMinutes,
    addSeconds,
  } = useTimer();

  const { teams } = useTeams();

  const { setChampion } =
    useChampion();

  const {
    getPlayersByTeam,
  } = usePlayers();

  const {
    getGoalsByMatch,
    setGoalsForMatch,
  } = useGoals();

  const [storedMatchId, setStoredMatchId] =
    useState<number | null>(() =>
      readStoredActiveMatchId()
    );

  const [overlayMode, setOverlayModeState] =
    useState<OverlayMode>(() =>
      readStoredOverlayMode()
    );

  const [minutesInput, setMinutesInput] =
    useState(() =>
      Math.max(
        1,
        Math.round(durationSeconds / 60)
      )
    );

  const [goalMatch, setGoalMatch] =
    useState<Match | null>(null);

  const isControlMode =
    new URLSearchParams(window.location.search).get("control") === "1";

  useEffect(() => {
    setMinutesInput(
      Math.max(
        1,
        Math.round(durationSeconds / 60)
      )
    );
  }, [durationSeconds]);

  useEffect(() => {
    function syncStoredData() {
      setStoredMatchId(readStoredActiveMatchId());
      setOverlayModeState(readStoredOverlayMode());
    }

    window.addEventListener(
      "storage",
      syncStoredData
    );

    window.addEventListener(
      "focus",
      syncStoredData
    );

    window.addEventListener(
      "teamcr7studio_overlay_mode_sync",
      syncStoredData
    );

    const interval =
      window.setInterval(syncStoredData, 500);

    return () => {
      window.removeEventListener(
        "storage",
        syncStoredData
      );

      window.removeEventListener(
        "focus",
        syncStoredData
      );

      window.removeEventListener(
        "teamcr7studio_overlay_mode_sync",
        syncStoredData
      );

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

  const simultaneousMatches =
    getSimultaneousMatches(
      fixture,
      match
    );

  function setOverlayMode(mode: OverlayMode) {
    setOverlayModeState(mode);

    localStorage.setItem(
      OVERLAY_MODE_STORAGE_KEY,
      mode
    );

    window.dispatchEvent(
      new Event("teamcr7studio_overlay_mode_sync")
    );
  }

  function selectMatch(matchId: number) {
    setActiveMatchId(matchId);
    setStoredMatchId(matchId);
  }

  function selectNextMatch() {
    const next = fixture.find(
      (item) =>
        item.status !== "FINISHED" &&
        item.teamA &&
        item.teamB
    );

    if (!next) {
      alert("No hay partido pendiente disponible.");
      return;
    }

    selectMatch(next.id);
  }

  function clearOverlayMatch() {
    setActiveMatchId(null);
    setStoredMatchId(null);
  }

  function applyMinutes() {
    setDurationMinutes(minutesInput);
  }

  function startSelectedMatch() {
    if (match) {
      selectMatch(match.id);
    }

    restartTimer();
  }

  function updateMatchNumber(
    matchId: number,
    field:
      | "scoreA"
      | "scoreB"
      | "penaltyA"
      | "penaltyB",
    value: number
  ) {
    const nextFixture = fixture.map((item) => {
      if (item.id !== matchId) {
        return item;
      }

      return {
        ...item,
        [field]: safeNumber(value),
        status:
          item.status === "FINISHED"
            ? "FINISHED"
            : "PLAYING",
      };
    });

    setFixture(nextFixture);
  }

  function adjustScore(
    matchId: number,
    field: "scoreA" | "scoreB",
    amount: number
  ) {
    const currentMatch = fixture.find(
      (item) => item.id === matchId
    );

    if (!currentMatch) return;

    updateMatchNumber(
      matchId,
      field,
      safeNumber(currentMatch[field] + amount)
    );
  }

  function saveResult(matchToSave: Match) {
    const currentMatch = fixture.find(
      (item) => item.id === matchToSave.id
    );

    if (!currentMatch) return;

    const isGroupMatch =
      currentMatch.stage === "GROUP";

    const isTie =
      currentMatch.scoreA === currentMatch.scoreB;

    const penaltyA =
      currentMatch.penaltyA;

    const penaltyB =
      currentMatch.penaltyB;

    if (
      !isGroupMatch &&
      isTie &&
      (
        penaltyA === undefined ||
        penaltyB === undefined ||
        penaltyA === penaltyB
      )
    ) {
      alert(
        "Debe ingresar penales válidos para definir el ganador."
      );

      return;
    }

    try {
      const updatedFixture = applyResult(
        fixture,
        currentMatch.id,
        currentMatch.scoreA,
        currentMatch.scoreB,
        isGroupMatch ? undefined : penaltyA,
        isGroupMatch ? undefined : penaltyB
      );

      setFixture(updatedFixture);

      const savedMatch =
        updatedFixture.find(
          (item) => item.id === currentMatch.id
        );

      if (
        savedMatch &&
        savedMatch.stage !== "GROUP" &&
        !savedMatch.nextMatchId &&
        savedMatch.winner
      ) {
        const category =
          savedMatch.category ??
          savedMatch.winner.category ??
          "GENERAL";

        setChampion(
          savedMatch.winner,
          category
        );
      }

      alert("Resultado guardado correctamente.");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el resultado."
      );
    }
  }

  function saveGoalScorers(
    selectedGoalMatch: Match,
    records: GoalScorerRecord[]
  ) {
    setGoalsForMatch(
      selectedGoalMatch.id,
      records
    );

    setGoalMatch(null);

    alert("Goleadores guardados correctamente.");
  }

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

          {isControlMode && (
            <ControlPanel
              fixture={fixture}
              selectedMatch={null}
              selectedMatchId={selectedMatchId}
              overlayMode={overlayMode}
              setOverlayMode={setOverlayMode}
              simultaneousCount={0}
              simultaneousTime=""
              secondsLeft={secondsLeft}
              durationSeconds={durationSeconds}
              isRunning={isRunning}
              minutesInput={minutesInput}
              setMinutesInput={setMinutesInput}
              selectMatch={selectMatch}
              selectNextMatch={selectNextMatch}
              clearOverlayMatch={clearOverlayMatch}
              startTimer={startTimer}
              pauseTimer={pauseTimer}
              resetTimer={resetTimer}
              restartTimer={restartTimer}
              startSelectedMatch={startSelectedMatch}
              addSeconds={addSeconds}
              applyMinutes={applyMinutes}
              updateMatchNumber={updateMatchNumber}
              adjustScore={adjustScore}
              saveResult={saveResult}
              openGoalScorers={() => {}}
            />
          )}
        </section>
      </main>
    );
  }

  return (
    <main
      style={{
        ...pageStyle,
        justifyContent: isControlMode
          ? "flex-start"
          : "center",
        overflowY: isControlMode
          ? "auto"
          : "hidden",
      }}
    >
      {overlayMode === "MULTI" ? (
        <MultiCourtOverlay
          tournamentName={tournament?.name ?? "TEAMCR7STUDIO"}
          matches={simultaneousMatches}
          selectedMatch={match}
          teamMap={teamMap}
          secondsLeft={secondsLeft}
          isRunning={isRunning}
        />
      ) : (
        <SingleMatchOverlay
          tournamentName={tournament?.name ?? "TEAMCR7STUDIO"}
          match={match}
          teamMap={teamMap}
          secondsLeft={secondsLeft}
          isRunning={isRunning}
        />
      )}

      {isControlMode && (
        <ControlPanel
          fixture={fixture}
          selectedMatch={match}
          selectedMatchId={selectedMatchId}
          overlayMode={overlayMode}
          setOverlayMode={setOverlayMode}
          simultaneousCount={simultaneousMatches.length}
          simultaneousTime={match.time || "--:--"}
          secondsLeft={secondsLeft}
          durationSeconds={durationSeconds}
          isRunning={isRunning}
          minutesInput={minutesInput}
          setMinutesInput={setMinutesInput}
          selectMatch={selectMatch}
          selectNextMatch={selectNextMatch}
          clearOverlayMatch={clearOverlayMatch}
          startTimer={startTimer}
          pauseTimer={pauseTimer}
          resetTimer={resetTimer}
          restartTimer={restartTimer}
          startSelectedMatch={startSelectedMatch}
          addSeconds={addSeconds}
          applyMinutes={applyMinutes}
          updateMatchNumber={updateMatchNumber}
          adjustScore={adjustScore}
          saveResult={saveResult}
          openGoalScorers={() => setGoalMatch(match)}
        />
      )}

      {goalMatch && (
        <GoalScorersModal
          key={goalMatch.id}
          match={goalMatch}
          teamAPlayers={
            goalMatch.teamA
              ? getPlayersByTeam(goalMatch.teamA.id)
              : []
          }
          teamBPlayers={
            goalMatch.teamB
              ? getPlayersByTeam(goalMatch.teamB.id)
              : []
          }
          existingRecords={getGoalsByMatch(goalMatch.id)}
          onSave={(records) =>
            saveGoalScorers(goalMatch, records)
          }
          onClose={() => setGoalMatch(null)}
        />
      )}
    </main>
  );
}

function SingleMatchOverlay({
  tournamentName,
  match,
  teamMap,
  secondsLeft,
  isRunning,
}: {
  tournamentName: string;
  match: Match;
  teamMap: Map<number, Team>;
  secondsLeft: number;
  isRunning: boolean;
}) {
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
    <section style={singleOverlayShellStyle}>
      <OverlayHeader tournamentName={tournamentName} />

      <section style={singleScoreboardStyle}>
        <TeamCircleLogo team={teamA} />

        <TeamNamePlate
          team={teamA}
          name={getTeamName(
            teamA,
            match.sourceMatchA
              ? `Ganador Partido ${match.sourceMatchA}`
              : "Por definir"
          )}
          side="left"
        />

        <CenterScoreBox
          scoreA={match.scoreA}
          scoreB={match.scoreB}
          secondsLeft={secondsLeft}
          isRunning={isRunning}
          courtLabel={getCourtLabel(match)}
          hasPenalties={hasPenalties}
          penaltyA={match.penaltyA}
          penaltyB={match.penaltyB}
        />

        <TeamNamePlate
          team={teamB}
          name={getTeamName(
            teamB,
            match.sourceMatchB
              ? `Ganador Partido ${match.sourceMatchB}`
              : "Por definir"
          )}
          side="right"
        />

        <TeamCircleLogo team={teamB} />
      </section>

      <LowerInfoBar
        match={match}
        tournamentName={tournamentName}
        isRunning={isRunning}
      />

      <SponsorStrip />
    </section>
  );
}

function MultiCourtOverlay({
  tournamentName,
  matches,
  selectedMatch,
  teamMap,
  secondsLeft,
  isRunning,
}: {
  tournamentName: string;
  matches: Match[];
  selectedMatch: Match;
  teamMap: Map<number, Team>;
  secondsLeft: number;
  isRunning: boolean;
}) {
  return (
    <section style={multiOverlayShellStyle}>
      <OverlayHeader tournamentName={tournamentName} />

      <section style={multiTitleBoxStyle}>
        <div>
          <div style={multiSmallTitleStyle}>
            TORNEO RELÁMPAGO EN VIVO
          </div>

          <h1 style={multiMainTitleStyle}>
            PARTIDOS SIMULTÁNEOS
          </h1>

          <p style={multiSubtitleStyle}>
            Horario: <strong>{selectedMatch.time || "--:--"}</strong> |{" "}
            {matches.length} cancha(s) jugando al mismo tiempo
          </p>
        </div>

        <div style={multiTimerBoxStyle}>
          <div style={multiTimerStyle}>
            {formatTime(secondsLeft)}
          </div>

          <div
            style={{
              ...multiLiveBadgeStyle,
              color: isRunning ? "#bbf7d0" : "#fef3c7",
              borderColor: isRunning ? "#22c55e" : "#facc15",
              background: isRunning ? "#064e3b" : "#713f12",
            }}
          >
            {isRunning ? "EN VIVO" : "PAUSADO"}
          </div>
        </div>
      </section>

      <section style={multiGridStyle}>
        {matches.map((match) => (
          <MultiMatchCard
            key={match.id}
            match={match}
            teamMap={teamMap}
            isRunning={isRunning}
          />
        ))}
      </section>

      <section style={multiBottomBarStyle}>
        <InfoItem
          icon="⚡"
          title="MODO MULTICANCHA"
          subtitle="Todos los partidos del mismo horario"
        />

        <InfoItem
          icon="🏆"
          title="FASE"
          subtitle={getStageText(selectedMatch)}
        />

        <InfoItem
          icon="#"
          title="#TEAMCR7STUDIO"
          subtitle="PASIÓN POR EL FÚTBOL"
        />
      </section>

      <SponsorStrip />
    </section>
  );
}

function MultiMatchCard({
  match,
  teamMap,
  isRunning,
}: {
  match: Match;
  teamMap: Map<number, Team>;
  isRunning: boolean;
}) {
  const teamA = getTeamWithLogo(
    match.teamA,
    teamMap
  );

  const teamB = getTeamWithLogo(
    match.teamB,
    teamMap
  );

  return (
    <article
      style={{
        ...multiCardStyle,
        borderColor:
          match.category === "WOMEN"
            ? "#f9a8d4"
            : "#38bdf8",
      }}
    >
      <div style={multiCardTopStyle}>
        <div>
          <div
            style={{
              ...multiCategoryStyle,
              color:
                match.category === "WOMEN"
                  ? "#f9a8d4"
                  : "#38bdf8",
            }}
          >
            {getCategoryName(match)}
          </div>

          <div style={multiCourtStyle}>
            {getCourtLabel(match)}
          </div>
        </div>

        <div style={multiCardTimeStyle}>
          {match.time || "--:--"}
        </div>
      </div>

      <div style={multiTeamsGridStyle}>
        <MiniTeamSide
          team={teamA}
          name={getTeamName(
            teamA,
            match.sourceMatchA
              ? `Ganador P${match.sourceMatchA}`
              : "Por definir"
          )}
        />

        <div style={multiScoreStyle}>
          <span>{match.scoreA}</span>
          <small>VS</small>
          <span>{match.scoreB}</span>
        </div>

        <MiniTeamSide
          team={teamB}
          name={getTeamName(
            teamB,
            match.sourceMatchB
              ? `Ganador P${match.sourceMatchB}`
              : "Por definir"
          )}
        />
      </div>

      <div style={multiStatusStyle}>
        {getStatusText(match, isRunning)}
      </div>
    </article>
  );
}

function MiniTeamSide({
  team,
  name,
}: {
  team: Team | null;
  name: string;
}) {
  return (
    <div style={miniTeamSideStyle}>
      <SmallTeamLogo team={team} />

      <div style={miniTeamNameStyle}>
        {name}
      </div>
    </div>
  );
}

function OverlayHeader({
  tournamentName,
}: {
  tournamentName: string;
}) {
  return (
    <header style={headerStyle}>
      <div style={socialPanelStyle}>
        <div style={socialTitleStyle}>
          SÍGUENOS EN
        </div>

        <div style={socialIconsStyle}>
          <span>f</span>
          <span>◎</span>
          <span>▶</span>
          <span>♪</span>
        </div>

        <div style={socialHandleStyle}>
          @TEAMCR7STUDIO
        </div>
      </div>

      <div style={brandCenterStyle}>
        <div style={brandTitleStyle}>
          TEAM<span style={brandBlueStyle}>CR7</span>STUDIO
        </div>

        <div style={brandSubtitleStyle}>
          ★ {tournamentName} ★
        </div>
      </div>

      <div style={rightBrandPanelStyle}>
        <img
          src="/teamcr7studio-logo.png"
          alt="TEAMCR7STUDIO"
          style={rightBrandLogoStyle}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />

        <div style={rightBrandTextStyle}>
          TEAM<br />CR7<br />STUDIO
        </div>
      </div>
    </header>
  );
}

function TeamCircleLogo({
  team,
}: {
  team: Team | null;
}) {
  return (
    <div style={teamCircleOuterStyle}>
      <div style={teamCircleMiddleStyle}>
        <div style={teamCircleInnerStyle}>
          {team?.logoDataUrl ? (
            <img
              src={team.logoDataUrl}
              alt={team.name}
              style={teamCircleImageStyle}
            />
          ) : (
            <div style={teamCirclePlaceholderStyle}>
              <div style={placeholderStarStyle}>★</div>
              <div style={placeholderTextStyle}>
                TU<br />LOGO<br />AQUÍ
              </div>
              <div style={placeholderStarsStyle}>★★★</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SmallTeamLogo({
  team,
}: {
  team: Team | null;
}) {
  if (!team?.logoDataUrl) {
    return (
      <div style={smallLogoEmptyStyle}>
        ⚽
      </div>
    );
  }

  return (
    <img
      src={team.logoDataUrl}
      alt={team.name}
      style={smallLogoStyle}
    />
  );
}

function TeamNamePlate({
  team,
  name,
  side,
}: {
  team: Team | null;
  name: string;
  side: "left" | "right";
}) {
  return (
    <div
      style={{
        ...teamPlateStyle,
        clipPath:
          side === "left"
            ? "polygon(0 0, 94% 0, 100% 50%, 94% 100%, 0 100%)"
            : "polygon(6% 0, 100% 0, 100% 100%, 6% 100%, 0 50%)",
        textAlign:
          side === "left" ? "left" : "right",
        paddingLeft:
          side === "left" ? 64 : 24,
        paddingRight:
          side === "right" ? 64 : 24,
      }}
    >
      <div style={teamNameProStyle}>
        {name}
      </div>

      <div style={teamMetaStyle}>
        {team?.category === "WOMEN"
          ? "FÚTBOL FEMENINO"
          : "FÚTBOL MASCULINO"}
      </div>
    </div>
  );
}

function CenterScoreBox({
  scoreA,
  scoreB,
  secondsLeft,
  isRunning,
  courtLabel,
  hasPenalties,
  penaltyA,
  penaltyB,
}: {
  scoreA: number;
  scoreB: number;
  secondsLeft: number;
  isRunning: boolean;
  courtLabel: string;
  hasPenalties: boolean;
  penaltyA?: number;
  penaltyB?: number;
}) {
  return (
    <div style={centerScoreWrapperStyle}>
      <div style={scoreNumbersRowStyle}>
        <div style={scoreNumberStyle}>
          {scoreA}
        </div>

        <div style={vsProStyle}>
          VS
        </div>

        <div style={scoreNumberStyle}>
          {scoreB}
        </div>
      </div>

      <div style={timerPlateStyle}>
        {formatTime(secondsLeft)}
      </div>

      <div style={liveBadgeStyle}>
        <span style={liveDotStyle}></span>
        {isRunning ? "EN VIVO" : "PAUSADO"}
      </div>

      {hasPenalties && (
        <div style={penaltyMiniStyle}>
          Penales {penaltyA ?? 0} - {penaltyB ?? 0}
        </div>
      )}

      <div style={courtBadgeStyle}>
        {courtLabel}
      </div>
    </div>
  );
}

function LowerInfoBar({
  match,
  tournamentName,
  isRunning,
}: {
  match: Match;
  tournamentName: string;
  isRunning: boolean;
}) {
  return (
    <section style={lowerInfoBarStyle}>
      <InfoItem
        icon="⚽"
        title={getStatusText(match, isRunning)}
        subtitle={
          isRunning
            ? "DISFRUTA CADA MOMENTO"
            : "LISTO PARA INICIAR"
        }
      />

      <InfoItem
        icon="⏱"
        title="TORNEO"
        subtitle={tournamentName}
      />

      <InfoItem
        icon="🏆"
        title="FASE"
        subtitle={getStageText(match)}
      />

      <InfoItem
        icon="📍"
        title="UBICACIÓN"
        subtitle={getCourtLabel(match)}
      />

      <InfoItem
        icon="#"
        title="#TEAMCR7STUDIO"
        subtitle="PASIÓN POR EL FÚTBOL"
      />
    </section>
  );
}

function InfoItem({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div style={infoItemStyle}>
      <div style={infoIconStyle}>
        {icon}
      </div>

      <div>
        <div style={infoTitleStyle}>
          {title}
        </div>

        <div style={infoSubtitleStyle}>
          {subtitle}
        </div>
      </div>
    </div>
  );
}

function SponsorStrip() {
  return (
    <section style={sponsorWrapperStyle}>
      <div style={sponsorTitleStyle}>
        PATROCINADORES OFICIALES
      </div>

      <div style={sponsorStripStyle}>
        <SponsorPlaceholder icon="▲" />
        <SponsorPlaceholder icon="●" />
        <SponsorPlaceholder icon="⬢" />
        <SponsorPlaceholder icon="▱" />
        <SponsorPlaceholder icon="⌁" />
      </div>
    </section>
  );
}

function SponsorPlaceholder({
  icon,
}: {
  icon: string;
}) {
  return (
    <div style={sponsorItemStyle}>
      <div style={sponsorIconStyle}>
        {icon}
      </div>

      <div style={sponsorTextStyle}>
        TU LOGO<br />AQUÍ
      </div>
    </div>
  );
}

function ControlPanel({
  fixture,
  selectedMatch,
  selectedMatchId,
  overlayMode,
  setOverlayMode,
  simultaneousCount,
  simultaneousTime,
  secondsLeft,
  durationSeconds,
  isRunning,
  minutesInput,
  setMinutesInput,
  selectMatch,
  selectNextMatch,
  clearOverlayMatch,
  startTimer,
  pauseTimer,
  resetTimer,
  restartTimer,
  startSelectedMatch,
  addSeconds,
  applyMinutes,
  updateMatchNumber,
  adjustScore,
  saveResult,
  openGoalScorers,
}: {
  fixture: Match[];
  selectedMatch: Match | null;
  selectedMatchId: number | null;
  overlayMode: OverlayMode;
  setOverlayMode: (mode: OverlayMode) => void;
  simultaneousCount: number;
  simultaneousTime: string;
  secondsLeft: number;
  durationSeconds: number;
  isRunning: boolean;
  minutesInput: number;
  setMinutesInput: (value: number) => void;
  selectMatch: (matchId: number) => void;
  selectNextMatch: () => void;
  clearOverlayMatch: () => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  restartTimer: () => void;
  startSelectedMatch: () => void;
  addSeconds: (seconds: number) => void;
  applyMinutes: () => void;
  updateMatchNumber: (
    matchId: number,
    field:
      | "scoreA"
      | "scoreB"
      | "penaltyA"
      | "penaltyB",
    value: number
  ) => void;
  adjustScore: (
    matchId: number,
    field: "scoreA" | "scoreB",
    amount: number
  ) => void;
  saveResult: (match: Match) => void;
  openGoalScorers: () => void;
}) {
  const matchOptions = [...fixture].sort((a, b) => {
    if (a.round !== b.round) {
      return a.round - b.round;
    }

    if (a.time !== b.time) {
      return a.time.localeCompare(b.time);
    }

    return a.id - b.id;
  });

  return (
    <section style={controlPanelStyle}>
      <div style={controlHeaderStyle}>
        <div>
          <div style={controlLabelStyle}>
            PANEL CONTROL OBS
          </div>

          <div style={controlTimeStyle}>
            {formatTime(secondsLeft)}
          </div>

          <div style={controlSubTextStyle}>
            Duración: {Math.round(durationSeconds / 60)} min |{" "}
            {isRunning ? "EN VIVO" : "PAUSADO"}
          </div>
        </div>

        <div
          style={{
            ...statusPillStyle,
            background: isRunning ? "#064e3b" : "#713f12",
            borderColor: isRunning ? "#22c55e" : "#facc15",
            color: isRunning ? "#bbf7d0" : "#fef3c7",
          }}
        >
          {isRunning ? "EN VIVO" : "PAUSADO"}
        </div>
      </div>

      <div style={controlGridStyle}>
        <div style={controlBlockStyle}>
          <h3 style={controlBlockTitleStyle}>
            🎛 Tipo de Overlay
          </h3>

          <div style={modeButtonsStyle}>
            <button
              onClick={() => setOverlayMode("SINGLE")}
              style={
                overlayMode === "SINGLE"
                  ? activeModeButtonStyle
                  : grayButtonStyle
              }
            >
              Marcador Principal
            </button>

            <button
              onClick={() => setOverlayMode("MULTI")}
              style={
                overlayMode === "MULTI"
                  ? activeModeButtonStyle
                  : grayButtonStyle
              }
            >
              Multicancha
            </button>
          </div>

          <div style={modeInfoStyle}>
            {overlayMode === "MULTI"
              ? `Mostrando ${simultaneousCount} partido(s) de las ${simultaneousTime}`
              : "Mostrando solo el partido seleccionado"}
          </div>
        </div>

        <div style={controlBlockStyle}>
          <h3 style={controlBlockTitleStyle}>
            📺 Partido base
          </h3>

          <select
            value={selectedMatchId ?? selectedMatch?.id ?? ""}
            onChange={(event) => {
              const value = event.target.value;

              if (!value) return;

              selectMatch(Number(value));
            }}
            style={selectStyle}
          >
            <option value="">
              Seleccionar partido
            </option>

            {matchOptions.map((match) => (
              <option
                key={match.id}
                value={match.id}
              >
                {getMatchLabel(match)}
              </option>
            ))}
          </select>

          <div style={smallButtonsGridStyle}>
            <button
              onClick={selectNextMatch}
              style={blueButtonStyle}
            >
              Siguiente pendiente
            </button>

            <button
              onClick={clearOverlayMatch}
              style={redButtonStyle}
            >
              Limpiar OBS
            </button>
          </div>
        </div>

        <div style={controlBlockStyle}>
          <h3 style={controlBlockTitleStyle}>
            ⏱ Cronómetro
          </h3>

          <div style={smallButtonsGridStyle}>
            <button
              onClick={startTimer}
              style={greenButtonStyle}
            >
              ▶ Iniciar
            </button>

            <button
              onClick={pauseTimer}
              style={orangeButtonStyle}
            >
              ⏸ Pausar
            </button>

            <button
              onClick={() => resetTimer()}
              style={grayButtonStyle}
            >
              ↺ Reiniciar
            </button>

            <button
              onClick={startSelectedMatch}
              style={purpleButtonStyle}
            >
              🔁 Iniciar partido
            </button>

            <button
              onClick={() => addSeconds(60)}
              style={grayButtonStyle}
            >
              +1 min
            </button>

            <button
              onClick={() => addSeconds(-60)}
              style={grayButtonStyle}
            >
              -1 min
            </button>
          </div>

          <div style={minutesRowStyle}>
            <input
              type="number"
              min={1}
              value={minutesInput}
              onChange={(event) =>
                setMinutesInput(Number(event.target.value))
              }
              style={minutesInputStyle}
            />

            <button
              onClick={applyMinutes}
              style={blueButtonStyle}
            >
              Aplicar minutos
            </button>
          </div>
        </div>

        <div style={controlBlockStyle}>
          <h3 style={controlBlockTitleStyle}>
            ⚽ Marcador del partido base
          </h3>

          {!selectedMatch ? (
            <div style={emptyControlStyle}>
              Selecciona un partido para editar marcador.
            </div>
          ) : (
            <>
              <ScoreControlRow
                label={selectedMatch.teamA?.name ?? "Equipo A"}
                value={selectedMatch.scoreA}
                onMinus={() =>
                  adjustScore(
                    selectedMatch.id,
                    "scoreA",
                    -1
                  )
                }
                onPlus={() =>
                  adjustScore(
                    selectedMatch.id,
                    "scoreA",
                    1
                  )
                }
                onChange={(value) =>
                  updateMatchNumber(
                    selectedMatch.id,
                    "scoreA",
                    value
                  )
                }
              />

              <ScoreControlRow
                label={selectedMatch.teamB?.name ?? "Equipo B"}
                value={selectedMatch.scoreB}
                onMinus={() =>
                  adjustScore(
                    selectedMatch.id,
                    "scoreB",
                    -1
                  )
                }
                onPlus={() =>
                  adjustScore(
                    selectedMatch.id,
                    "scoreB",
                    1
                  )
                }
                onChange={(value) =>
                  updateMatchNumber(
                    selectedMatch.id,
                    "scoreB",
                    value
                  )
                }
              />

              {selectedMatch.scoreA === selectedMatch.scoreB &&
                selectedMatch.stage !== "GROUP" && (
                  <div style={penaltyControlBoxStyle}>
                    <strong>Penales</strong>

                    <div style={penaltyControlGridStyle}>
                      <input
                        type="number"
                        min={0}
                        value={selectedMatch.penaltyA ?? 0}
                        onChange={(event) =>
                          updateMatchNumber(
                            selectedMatch.id,
                            "penaltyA",
                            Number(event.target.value)
                          )
                        }
                        style={scoreInputStyle}
                      />

                      <span>-</span>

                      <input
                        type="number"
                        min={0}
                        value={selectedMatch.penaltyB ?? 0}
                        onChange={(event) =>
                          updateMatchNumber(
                            selectedMatch.id,
                            "penaltyB",
                            Number(event.target.value)
                          )
                        }
                        style={scoreInputStyle}
                      />
                    </div>
                  </div>
                )}

              <div style={smallButtonsGridStyle}>
                <button
                  onClick={() => saveResult(selectedMatch)}
                  style={greenButtonStyle}
                >
                  💾 Guardar resultado
                </button>

                <button
                  onClick={openGoalScorers}
                  style={orangeButtonStyle}
                >
                  ⚽ Registrar goleadores
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={controlHelpStyle}>
        OBS limpio: <strong>/overlay</strong> | Panel control:{" "}
        <strong>/overlay?control=1</strong>
      </div>
    </section>
  );
}

function ScoreControlRow({
  label,
  value,
  onMinus,
  onPlus,
  onChange,
}: {
  label: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
  onChange: (value: number) => void;
}) {
  return (
    <div style={scoreControlRowStyle}>
      <strong>{label}</strong>

      <div style={scoreControlsStyle}>
        <button
          onClick={onMinus}
          style={grayButtonStyle}
        >
          -
        </button>

        <input
          type="number"
          min={0}
          value={value}
          onChange={(event) =>
            onChange(Number(event.target.value))
          }
          style={scoreInputStyle}
        />

        <button
          onClick={onPlus}
          style={grayButtonStyle}
        >
          +
        </button>
      </div>
    </div>
  );
}

function GoalScorersModal({
  match,
  teamAPlayers,
  teamBPlayers,
  existingRecords,
  onSave,
  onClose,
}: {
  match: Match;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  existingRecords: GoalScorerRecord[];
  onSave: (
    records: GoalScorerRecord[]
  ) => void;
  onClose: () => void;
}) {
  const [goalsByPlayer, setGoalsByPlayer] =
    useState<Record<string, number>>(() => {
      const data: Record<string, number> = {};

      existingRecords.forEach((record) => {
        data[record.playerId] = record.goals;
      });

      return data;
    });

  const courtLabel =
    getCourtLabel(match);

  const totalA =
    teamAPlayers.reduce(
      (sum, player) =>
        sum + (goalsByPlayer[player.id] ?? 0),
      0
    );

  const totalB =
    teamBPlayers.reduce(
      (sum, player) =>
        sum + (goalsByPlayer[player.id] ?? 0),
      0
    );

  function updatePlayerGoals(
    playerId: string,
    value: number
  ) {
    setGoalsByPlayer((current) => ({
      ...current,
      [playerId]: safeNumber(value),
    }));
  }

  function buildRecords() {
    const rows: GoalScorerRecord[] = [];

    [...teamAPlayers, ...teamBPlayers].forEach(
      (player) => {
        const goals =
          goalsByPlayer[player.id] ?? 0;

        if (goals <= 0) return;

        rows.push({
          id: createId(),

          matchId: match.id,

          teamId: player.teamId,

          teamName: player.teamName,

          playerId: player.id,

          playerName: player.name,

          category: player.category,

          courtLabel,

          goals,
        });
      }
    );

    return rows;
  }

  function save() {
    const warnings: string[] = [];

    if (
      match.teamA &&
      totalA !== match.scoreA
    ) {
      warnings.push(
        `${match.teamA.name}: marcador ${match.scoreA}, goleadores ${totalA}`
      );
    }

    if (
      match.teamB &&
      totalB !== match.scoreB
    ) {
      warnings.push(
        `${match.teamB.name}: marcador ${match.scoreB}, goleadores ${totalB}`
      );
    }

    if (warnings.length > 0) {
      const confirmSave = window.confirm(
        `La cantidad de goles no coincide con el marcador:\n\n${warnings.join(
          "\n"
        )}\n\n¿Deseas guardar de todas formas?`
      );

      if (!confirmSave) return;
    }

    onSave(buildRecords());
  }

  return (
    <div style={modalOverlayStyle}>
      <div style={modalBoxStyle}>
        <div style={modalHeaderStyle}>
          <div>
            <h2 style={modalTitleStyle}>
              ⚽ Registro de Goleadores
            </h2>

            <p style={modalSubtitleStyle}>
              Partido {match.id} | {courtLabel} | {match.time || "--:--"}
            </p>
          </div>

          <button
            onClick={onClose}
            style={redButtonStyle}
          >
            ✕ Cerrar
          </button>
        </div>

        <div style={modalScoreStyle}>
          <strong>
            {match.teamA?.name ?? "Equipo A"}
          </strong>

          <span>
            {match.scoreA} - {match.scoreB}
          </span>

          <strong>
            {match.teamB?.name ?? "Equipo B"}
          </strong>
        </div>

        <div style={goalGridStyle}>
          <TeamGoalEditor
            title={match.teamA?.name ?? "Equipo A"}
            score={match.scoreA}
            totalGoals={totalA}
            players={teamAPlayers}
            color="#93c5fd"
            goalsByPlayer={goalsByPlayer}
            onChange={updatePlayerGoals}
          />

          <TeamGoalEditor
            title={match.teamB?.name ?? "Equipo B"}
            score={match.scoreB}
            totalGoals={totalB}
            players={teamBPlayers}
            color="#f9a8d4"
            goalsByPlayer={goalsByPlayer}
            onChange={updatePlayerGoals}
          />
        </div>

        <div style={modalActionsStyle}>
          <button
            onClick={onClose}
            style={grayButtonStyle}
          >
            Cancelar
          </button>

          <button
            onClick={save}
            style={greenButtonStyle}
          >
            💾 Guardar goleadores
          </button>
        </div>
      </div>
    </div>
  );
}

function TeamGoalEditor({
  title,
  score,
  totalGoals,
  players,
  color,
  goalsByPlayer,
  onChange,
}: {
  title: string;
  score: number;
  totalGoals: number;
  players: Player[];
  color: string;
  goalsByPlayer: Record<string, number>;
  onChange: (
    playerId: string,
    value: number
  ) => void;
}) {
  return (
    <div
      style={{
        ...teamGoalEditorStyle,
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

      <p
        style={{
          color:
            totalGoals === score
              ? "#22c55e"
              : "#facc15",
          fontWeight: 900,
        }}
      >
        Goles registrados: {totalGoals} / Marcador: {score}
      </p>

      {players.length === 0 && (
        <div style={emptyControlStyle}>
          Este equipo todavía no tiene jugadores cargados.
        </div>
      )}

      {players.map((player) => (
        <div
          key={player.id}
          style={goalPlayerRowStyle}
        >
          <div>
            <strong>{player.name}</strong>

            <div style={playerMetaStyle}>
              DNI: {player.documentId || "-"} | Dorsal:{" "}
              {player.jerseyNumber || "-"}
            </div>
          </div>

          <input
            type="number"
            min={0}
            value={goalsByPlayer[player.id] ?? 0}
            onChange={(event) =>
              onChange(
                player.id,
                Number(event.target.value)
              )
            }
            style={scoreInputStyle}
          />
        </div>
      ))}
    </div>
  );
}

/* ===================== ESTILOS OVERLAY ===================== */

const pageStyle: CSSProperties = {
  width: "100%",
  minHeight: "100vh",
  background:
    "radial-gradient(circle at 50% 10%, rgba(14,165,233,.36), transparent 30%), radial-gradient(circle at 50% 86%, rgba(22,163,74,.22), transparent 26%), linear-gradient(180deg, #020617 0%, #07111f 55%, #06180f 100%)",
  color: "white",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: 22,
  position: "relative",
};

const singleOverlayShellStyle: CSSProperties = {
  width: "100%",
  maxWidth: 1500,
  minHeight: 820,
  position: "relative",
  borderRadius: 10,
  overflow: "hidden",
  background:
    "linear-gradient(180deg, rgba(2,6,23,.12), rgba(2,6,23,.20))",
};

const multiOverlayShellStyle: CSSProperties = {
  width: "100%",
  maxWidth: 1500,
  minHeight: 820,
  position: "relative",
  borderRadius: 10,
  overflow: "hidden",
};

const headerStyle: CSSProperties = {
  minHeight: 118,
  display: "grid",
  gridTemplateColumns: "290px 1fr 290px",
  gap: 18,
  alignItems: "center",
  padding: "12px 26px",
  background:
    "linear-gradient(180deg, rgba(2,6,23,.98), rgba(15,23,42,.94))",
  borderBottom: "2px solid rgba(14,165,233,.8)",
  boxShadow: "0 18px 55px rgba(0,0,0,.45)",
};

const socialPanelStyle: CSSProperties = {
  height: "100%",
  background:
    "linear-gradient(135deg, rgba(15,23,42,.98), rgba(2,6,23,.9))",
  border: "1px solid rgba(14,165,233,.55)",
  borderRadius: 14,
  padding: "14px 22px",
};

const socialTitleStyle: CSSProperties = {
  fontSize: 15,
  fontStyle: "italic",
  fontWeight: 900,
  letterSpacing: 1,
};

const socialIconsStyle: CSSProperties = {
  display: "flex",
  gap: 16,
  color: "#facc15",
  fontSize: 24,
  fontWeight: 900,
  marginTop: 7,
};

const socialHandleStyle: CSSProperties = {
  color: "#22d3ee",
  fontWeight: 900,
  marginTop: 5,
  fontSize: 15,
};

const brandCenterStyle: CSSProperties = {
  height: "100%",
  background:
    "linear-gradient(180deg, rgba(15,23,42,.98), rgba(2,6,23,.94))",
  border: "1px solid rgba(14,165,233,.7)",
  borderRadius: 18,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  boxShadow:
    "inset 0 0 28px rgba(14,165,233,.2), 0 0 28px rgba(14,165,233,.18)",
};

const brandTitleStyle: CSSProperties = {
  fontSize: 52,
  lineHeight: 1,
  fontWeight: 1000,
  letterSpacing: 3,
  textTransform: "uppercase",
  color: "#f8fafc",
  textShadow:
    "0 3px 0 #64748b, 0 0 22px rgba(14,165,233,.28)",
};

const brandBlueStyle: CSSProperties = {
  color: "#0ea5e9",
  textShadow:
    "0 0 22px rgba(14,165,233,.95)",
};

const brandSubtitleStyle: CSSProperties = {
  color: "#facc15",
  fontWeight: 900,
  letterSpacing: 4,
  marginTop: 10,
  fontSize: 13,
  textTransform: "uppercase",
  maxWidth: "90%",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const rightBrandPanelStyle: CSSProperties = {
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 14,
  background:
    "linear-gradient(225deg, rgba(15,23,42,.98), rgba(2,6,23,.9))",
  border: "1px solid rgba(14,165,233,.55)",
  borderRadius: 14,
  padding: "12px 20px",
};

const rightBrandLogoStyle: CSSProperties = {
  width: 68,
  height: 68,
  objectFit: "contain",
};

const rightBrandTextStyle: CSSProperties = {
  fontSize: 21,
  lineHeight: 0.95,
  fontWeight: 1000,
  letterSpacing: 3,
};

const singleScoreboardStyle: CSSProperties = {
  marginTop: 120,
  display: "grid",
  gridTemplateColumns: "170px 1fr 315px 1fr 170px",
  gap: 0,
  alignItems: "center",
  padding: "0 38px",
};

const teamCircleOuterStyle: CSSProperties = {
  width: 172,
  height: 172,
  borderRadius: "50%",
  background:
    "conic-gradient(from 120deg, #0ea5e9, #facc15, #38bdf8, #0ea5e9)",
  padding: 6,
  zIndex: 4,
  boxShadow:
    "0 0 28px rgba(14,165,233,.75), 0 0 45px rgba(250,204,21,.26)",
};

const teamCircleMiddleStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: "50%",
  background:
    "linear-gradient(180deg, #020617, #0f172a)",
  padding: 9,
  border: "3px solid rgba(255,255,255,.18)",
};

const teamCircleInnerStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: "50%",
  background:
    "radial-gradient(circle, #111827, #020617)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  border: "2px solid rgba(14,165,233,.8)",
};

const teamCircleImageStyle: CSSProperties = {
  width: "82%",
  height: "82%",
  objectFit: "contain",
};

const teamCirclePlaceholderStyle: CSSProperties = {
  textAlign: "center",
  fontWeight: 1000,
};

const placeholderStarStyle: CSSProperties = {
  color: "#facc15",
  fontSize: 24,
  marginBottom: 4,
};

const placeholderTextStyle: CSSProperties = {
  fontSize: 20,
  lineHeight: 1.05,
};

const placeholderStarsStyle: CSSProperties = {
  color: "#facc15",
  fontSize: 19,
  marginTop: 8,
  letterSpacing: 3,
};

const teamPlateStyle: CSSProperties = {
  height: 140,
  background:
    "linear-gradient(180deg, rgba(15,46,102,.96), rgba(3,14,35,.96))",
  borderTop: "2px solid #0ea5e9",
  borderBottom: "2px solid #0ea5e9",
  position: "relative",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  boxShadow:
    "inset 0 0 36px rgba(14,165,233,.25), 0 0 24px rgba(14,165,233,.28)",
};

const teamNameProStyle: CSSProperties = {
  fontSize: 38,
  fontWeight: 1000,
  fontStyle: "italic",
  letterSpacing: 1,
  textTransform: "uppercase",
  textShadow:
    "0 3px 0 rgba(15,23,42,.8), 0 0 14px rgba(255,255,255,.18)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const teamMetaStyle: CSSProperties = {
  color: "#38bdf8",
  fontWeight: 900,
  fontSize: 12,
  letterSpacing: 1.2,
  marginTop: 8,
};

const centerScoreWrapperStyle: CSSProperties = {
  height: 225,
  background:
    "linear-gradient(180deg, rgba(2,6,23,.98), rgba(15,23,42,.98))",
  border: "2px solid rgba(250,204,21,.72)",
  borderRadius: 18,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 3,
  boxShadow:
    "0 0 30px rgba(14,165,233,.35), inset 0 0 22px rgba(14,165,233,.18)",
};

const scoreNumbersRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 68px 1fr",
  alignItems: "center",
  gap: 4,
  width: "90%",
};

const scoreNumberStyle: CSSProperties = {
  fontSize: 78,
  fontWeight: 1000,
  lineHeight: 0.92,
  textAlign: "center",
  color: "#f8fafc",
  textShadow:
    "0 4px 0 #475569, 0 0 20px rgba(255,255,255,.2)",
};

const vsProStyle: CSSProperties = {
  fontSize: 28,
  color: "#22d3ee",
  fontWeight: 1000,
  textAlign: "center",
  fontStyle: "italic",
  textShadow: "0 0 18px rgba(34,211,238,.95)",
};

const timerPlateStyle: CSSProperties = {
  marginTop: 10,
  fontSize: 40,
  fontWeight: 1000,
  letterSpacing: 2,
  color: "#f8fafc",
  lineHeight: 1,
};

const liveBadgeStyle: CSSProperties = {
  marginTop: 10,
  border: "1px solid #facc15",
  borderRadius: 999,
  padding: "6px 22px",
  color: "#facc15",
  fontWeight: 1000,
  fontSize: 18,
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "rgba(2,6,23,.76)",
};

const liveDotStyle: CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: "50%",
  background: "#ef4444",
  boxShadow: "0 0 12px rgba(239,68,68,.95)",
};

const penaltyMiniStyle: CSSProperties = {
  marginTop: 7,
  color: "#fde68a",
  fontWeight: 900,
  fontSize: 14,
};

const courtBadgeStyle: CSSProperties = {
  marginTop: 8,
  background:
    "linear-gradient(180deg, #0f3b82, #071832)",
  border: "1px solid #0ea5e9",
  color: "#f8fafc",
  padding: "7px 28px",
  borderRadius: 8,
  fontWeight: 1000,
  fontSize: 18,
  textTransform: "uppercase",
  boxShadow: "0 0 18px rgba(14,165,233,.45)",
};

const lowerInfoBarStyle: CSSProperties = {
  margin: "72px auto 0",
  width: "94%",
  minHeight: 92,
  display: "grid",
  gridTemplateColumns: "1.35fr 1fr 1fr 1fr 1.25fr",
  gap: 0,
  alignItems: "center",
  background:
    "linear-gradient(180deg, rgba(15,23,42,.98), rgba(2,6,23,.98))",
  border: "2px solid rgba(14,165,233,.75)",
  borderRadius: 14,
  boxShadow:
    "0 0 30px rgba(14,165,233,.38), inset 0 0 28px rgba(14,165,233,.14)",
  overflow: "hidden",
};

const infoItemStyle: CSSProperties = {
  height: "100%",
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "16px 18px",
  borderRight: "1px solid rgba(148,163,184,.35)",
};

const infoIconStyle: CSSProperties = {
  width: 45,
  height: 45,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#0ea5e9",
  fontSize: 27,
  fontWeight: 1000,
};

const infoTitleStyle: CSSProperties = {
  color: "#f8fafc",
  fontSize: 15,
  fontWeight: 1000,
  fontStyle: "italic",
  textTransform: "uppercase",
  lineHeight: 1.05,
};

const infoSubtitleStyle: CSSProperties = {
  color: "#22d3ee",
  fontSize: 12,
  fontWeight: 900,
  marginTop: 5,
  textTransform: "uppercase",
  maxWidth: 240,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const sponsorWrapperStyle: CSSProperties = {
  margin: "15px auto 0",
  width: "86%",
  textAlign: "center",
};

const sponsorTitleStyle: CSSProperties = {
  display: "inline-block",
  color: "#facc15",
  fontSize: 15,
  fontWeight: 1000,
  letterSpacing: 4,
  padding: "0 20px",
  marginBottom: 8,
};

const sponsorStripStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  background:
    "linear-gradient(180deg, rgba(15,23,42,.98), rgba(2,6,23,.98))",
  border: "1px solid rgba(14,165,233,.5)",
  borderRadius: 12,
  minHeight: 72,
  overflow: "hidden",
};

const sponsorItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  borderRight: "1px solid rgba(148,163,184,.35)",
};

const sponsorIconStyle: CSSProperties = {
  color: "#f8fafc",
  fontSize: 28,
  fontWeight: 1000,
};

const sponsorTextStyle: CSSProperties = {
  color: "#f8fafc",
  fontSize: 12,
  fontWeight: 900,
  lineHeight: 1.05,
};

/* ===================== MULTICANCHA ===================== */

const multiTitleBoxStyle: CSSProperties = {
  margin: "42px auto 24px",
  width: "92%",
  display: "flex",
  justifyContent: "space-between",
  gap: 24,
  alignItems: "center",
  background:
    "linear-gradient(135deg, rgba(15,23,42,.98), rgba(2,6,23,.92))",
  border: "2px solid rgba(14,165,233,.75)",
  borderRadius: 18,
  padding: "24px 30px",
  boxShadow: "0 0 30px rgba(14,165,233,.32)",
};

const multiSmallTitleStyle: CSSProperties = {
  color: "#facc15",
  fontSize: 15,
  fontWeight: 1000,
  letterSpacing: 2,
};

const multiMainTitleStyle: CSSProperties = {
  margin: "6px 0",
  fontSize: 44,
  fontWeight: 1000,
  lineHeight: 1,
};

const multiSubtitleStyle: CSSProperties = {
  margin: 0,
  color: "#cbd5e1",
  fontSize: 18,
};

const multiTimerBoxStyle: CSSProperties = {
  minWidth: 210,
  textAlign: "center",
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 16,
  padding: 18,
};

const multiTimerStyle: CSSProperties = {
  fontSize: 44,
  fontWeight: 1000,
  color: "#60a5fa",
};

const multiLiveBadgeStyle: CSSProperties = {
  marginTop: 8,
  border: "1px solid",
  borderRadius: 999,
  padding: "7px 16px",
  fontWeight: 1000,
};

const multiGridStyle: CSSProperties = {
  width: "92%",
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(420px, 1fr))",
  gap: 20,
};

const multiCardStyle: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(15,23,42,.98), rgba(2,6,23,.98))",
  border: "2px solid #38bdf8",
  borderRadius: 18,
  padding: 18,
  boxShadow:
    "0 18px 45px rgba(0,0,0,.38), inset 0 0 22px rgba(14,165,233,.14)",
};

const multiCardTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  marginBottom: 14,
};

const multiCategoryStyle: CSSProperties = {
  fontWeight: 1000,
  letterSpacing: 1.5,
  fontSize: 13,
};

const multiCourtStyle: CSSProperties = {
  fontSize: 24,
  fontWeight: 1000,
  marginTop: 4,
};

const multiCardTimeStyle: CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 999,
  padding: "8px 14px",
  fontWeight: 1000,
  color: "#facc15",
};

const multiTeamsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 130px 1fr",
  gap: 12,
  alignItems: "center",
};

const miniTeamSideStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  textAlign: "center",
};

const smallLogoStyle: CSSProperties = {
  width: 66,
  height: 66,
  objectFit: "contain",
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 5,
};

const smallLogoEmptyStyle: CSSProperties = {
  width: 66,
  height: 66,
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 30,
};

const miniTeamNameStyle: CSSProperties = {
  fontSize: 19,
  fontWeight: 1000,
  textTransform: "uppercase",
  lineHeight: 1.05,
};

const multiScoreStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  justifyItems: "center",
  alignItems: "center",
  background:
    "linear-gradient(180deg, #020617, #0f172a)",
  border: "1px solid #facc15",
  borderRadius: 14,
  padding: "10px 8px",
};

const multiStatusStyle: CSSProperties = {
  marginTop: 14,
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: 10,
  textAlign: "center",
  fontWeight: 1000,
  color: "#e0f2fe",
};

const multiBottomBarStyle: CSSProperties = {
  width: "92%",
  margin: "24px auto 0",
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(260px, 1fr))",
  background:
    "linear-gradient(180deg, rgba(15,23,42,.98), rgba(2,6,23,.98))",
  border: "2px solid rgba(14,165,233,.75)",
  borderRadius: 14,
  overflow: "hidden",
};

/* ===================== PANEL CONTROL ===================== */

const controlPanelStyle: CSSProperties = {
  width: "100%",
  maxWidth: 1180,
  marginTop: 24,
  background: "rgba(15, 23, 42, 0.97)",
  border: "1px solid #475569",
  borderRadius: 20,
  padding: 20,
  boxShadow: "0 20px 55px rgba(0,0,0,.35)",
};

const controlHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
  alignItems: "center",
  marginBottom: 18,
};

const controlGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 16,
};

const controlBlockStyle: CSSProperties = {
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 16,
};

const controlBlockTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 12,
};

const controlLabelStyle: CSSProperties = {
  color: "#93c5fd",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: 1,
};

const controlTimeStyle: CSSProperties = {
  fontSize: 50,
  fontWeight: 1000,
  color: "#60a5fa",
  lineHeight: 1,
  marginTop: 6,
};

const controlSubTextStyle: CSSProperties = {
  color: "#cbd5e1",
  fontSize: 13,
};

const statusPillStyle: CSSProperties = {
  border: "1px solid",
  borderRadius: 999,
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 900,
};

const modeButtonsStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

const activeModeButtonStyle: CSSProperties = {
  padding: "12px",
  background: "#0ea5e9",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 900,
};

const modeInfoStyle: CSSProperties = {
  marginTop: 12,
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: 10,
  color: "#cbd5e1",
  fontSize: 13,
};

const selectStyle: CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "white",
  fontWeight: 800,
};

const smallButtonsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 10,
  marginTop: 12,
};

const minutesRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "100px 1fr",
  gap: 10,
  marginTop: 12,
};

const minutesInputStyle: CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 10,
  color: "white",
  fontWeight: 900,
  fontSize: 18,
};

const scoreControlRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 150px",
  gap: 10,
  alignItems: "center",
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: 10,
  marginBottom: 10,
};

const scoreControlsStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "36px 1fr 36px",
  gap: 6,
};

const scoreInputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 6px",
  textAlign: "center",
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#020617",
  color: "white",
  fontWeight: 900,
};

const penaltyControlBoxStyle: CSSProperties = {
  background: "#713f12",
  border: "1px solid #facc15",
  color: "#fef3c7",
  borderRadius: 10,
  padding: 10,
  marginTop: 10,
};

const penaltyControlGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 20px 1fr",
  gap: 8,
  alignItems: "center",
  textAlign: "center",
  marginTop: 8,
};

const controlHelpStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: 13,
  borderTop: "1px solid #334155",
  paddingTop: 12,
  marginTop: 16,
};

const greenButtonStyle: CSSProperties = {
  padding: "12px",
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 900,
};

const orangeButtonStyle: CSSProperties = {
  padding: "12px",
  background: "#f97316",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 900,
};

const grayButtonStyle: CSSProperties = {
  padding: "12px",
  background: "#334155",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 900,
};

const blueButtonStyle: CSSProperties = {
  padding: "12px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 900,
};

const purpleButtonStyle: CSSProperties = {
  padding: "12px",
  background: "#7c3aed",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 900,
};

const redButtonStyle: CSSProperties = {
  padding: "12px",
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 900,
};

const emptyControlStyle: CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: 14,
  color: "#94a3b8",
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

const brandLogoStyle: CSSProperties = {
  width: 58,
  height: 58,
  objectFit: "contain",
  flexShrink: 0,
};

/* ===================== MODAL GOLEADORES ===================== */

const modalOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(2, 6, 23, 0.88)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const modalBoxStyle: CSSProperties = {
  width: "min(1100px, 95vw)",
  maxHeight: "88vh",
  overflowY: "auto",
  background: "#1e293b",
  border: "1px solid #475569",
  borderRadius: 18,
  padding: 25,
  boxShadow: "0 25px 80px rgba(0,0,0,0.45)",
};

const modalHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 15,
  alignItems: "center",
  marginBottom: 20,
};

const modalTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 30,
};

const modalSubtitleStyle: CSSProperties = {
  color: "#94a3b8",
  marginBottom: 0,
};

const modalScoreStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 120px 1fr",
  gap: 12,
  alignItems: "center",
  textAlign: "center",
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: 16,
  marginBottom: 20,
  fontSize: 20,
};

const goalGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 18,
};

const modalActionsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  marginTop: 20,
  flexWrap: "wrap",
};

const teamGoalEditorStyle: CSSProperties = {
  background: "#111827",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 16,
};

const goalPlayerRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 80px",
  gap: 12,
  alignItems: "center",
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: 12,
  marginBottom: 10,
};

const playerMetaStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: 13,
};