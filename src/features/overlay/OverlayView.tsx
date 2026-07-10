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
  | "MULTI"
  | "BRACKET"
  | "CHAMPION";

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

  if (value === "BRACKET") return "BRACKET";

  if (value === "CHAMPION") return "CHAMPION";

  return "SINGLE";
}

function getWomenFieldLetter(index: number) {
  const letters = ["A", "B", "C", "D"];

  return letters[index - 1] ?? String(index);
}

function replaceOldCourtText(label: string) {
  return label
    .replaceAll("C. Mujer 1", "Campo A")
    .replaceAll("C. Mujer 2", "Campo B")
    .replaceAll("C. Mujer 3", "Campo C")
    .replaceAll("C. Mujer 4", "Campo D")
    .replaceAll("Cancha 1", "Campo 1")
    .replaceAll("Cancha 2", "Campo 2")
    .replaceAll("Cancha 3", "Campo 3")
    .replaceAll("Cancha 4", "Campo 4")
    .replaceAll("cancha", "campo")
    .replaceAll("Cancha", "Campo")
    .replaceAll("canchas", "campos")
    .replaceAll("Canchas", "Campos");
}

function getCourtLabel(match: Match) {
  if (match.courtLabel) {
    return replaceOldCourtText(match.courtLabel);
  }

  if (match.category === "WOMEN") {
    return `Campo ${getWomenFieldLetter(match.court || 1)}`;
  }

  return `Campo ${match.court || "-"}`;
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
    getCourtLabel(match)
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

  const { champions, setChampion } =
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
              simultaneousMatches={[]}
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
      {overlayMode === "CHAMPION" ? (
        <ChampionOverlay
          tournamentName={tournament?.name ?? "TEAMCR7STUDIO"}
          champions={champions}
          fixture={fixture}
          teamMap={teamMap}
        />
      ) : overlayMode === "BRACKET" ? (
        <BracketOverlay
          tournamentName={tournament?.name ?? "TEAMCR7STUDIO"}
          fixture={fixture}
          teamMap={teamMap}
        />
      ) : overlayMode === "MULTI" ? (
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
          simultaneousMatches={simultaneousMatches}
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
          openGoalScorers={(targetMatch) => setGoalMatch(targetMatch)}
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
            {matches.length} campo(s) jugando al mismo tiempo
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
          title="MODO MULTICAMPO"
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
          <span style={multiScoreNumberStyle}>{match.scoreA}</span>
          <small style={multiVsStyle}>VS</small>
          <span style={multiScoreNumberStyle}>{match.scoreB}</span>
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



interface ChampionDisplayItem {
  key: string;
  title: string;
  team: Team | null;
  color: string;
}

function getLastFinalWinner(fixture: Match[]) {
  const finalMatch = [...fixture]
    .reverse()
    .find((match) => {
      const label = `${getCourtLabel(match)} ${match.round ?? ""}`.toUpperCase();

      return (
        match.status === "FINISHED" &&
        match.winner &&
        (!match.nextMatchId || label.includes("FINAL"))
      );
    });

  return finalMatch?.winner ?? null;
}

function getChampionDisplayItems({
  champions,
  fixture,
  teamMap,
}: {
  champions: {
    MEN?: Team | null;
    WOMEN?: Team | null;
    GENERAL?: Team | null;
  };
  fixture: Match[];
  teamMap: Map<number, Team>;
}): ChampionDisplayItem[] {
  const fallbackWinner = getLastFinalWinner(fixture);

  const items: ChampionDisplayItem[] = [];

  if (champions.GENERAL) {
    items.push({
      key: "GENERAL",
      title: "CAMPEÓN GENERAL",
      team: getTeamWithLogo(champions.GENERAL, teamMap),
      color: "#facc15",
    });
  }

  if (champions.MEN) {
    items.push({
      key: "MEN",
      title: "CAMPEÓN VARONES",
      team: getTeamWithLogo(champions.MEN, teamMap),
      color: "#38bdf8",
    });
  }

  if (champions.WOMEN) {
    items.push({
      key: "WOMEN",
      title: "CAMPEONA MUJERES",
      team: getTeamWithLogo(champions.WOMEN, teamMap),
      color: "#f9a8d4",
    });
  }

  if (items.length === 0) {
    items.push({
      key: "PENDING",
      title: fallbackWinner ? "ÚLTIMO GANADOR" : "CAMPEÓN PENDIENTE",
      team: getTeamWithLogo(fallbackWinner, teamMap),
      color: "#facc15",
    });
  }

  return items;
}

function ChampionOverlay({
  tournamentName,
  champions,
  fixture,
  teamMap,
}: {
  tournamentName: string;
  champions: {
    MEN?: Team | null;
    WOMEN?: Team | null;
    GENERAL?: Team | null;
  };
  fixture: Match[];
  teamMap: Map<number, Team>;
}) {
  const championItems = getChampionDisplayItems({
    champions,
    fixture,
    teamMap,
  });

  const mainChampion = championItems[0];

  return (
    <section style={championOverlayShellStyle}>
      <OverlayHeader tournamentName={tournamentName} />

      <div style={championConfettiLayerStyle}>
        <span>★</span>
        <span>◆</span>
        <span>✦</span>
        <span>●</span>
        <span>★</span>
        <span>◆</span>
      </div>

      <section style={championHeroStyle}>
        <div style={championSupTitleStyle}>
          TEAMCR7STUDIO PRESENTA
        </div>

        <h1 style={championMainTitleStyle}>
          {mainChampion.title}
        </h1>

        <div
          style={{
            ...championLogoRingStyle,
            borderColor: mainChampion.color,
            boxShadow: `0 0 45px ${mainChampion.color}55`,
          }}
        >
          {mainChampion.team?.logoDataUrl ? (
            <img
              src={mainChampion.team.logoDataUrl}
              alt={mainChampion.team.name}
              style={championLogoImageStyle}
            />
          ) : (
            <div style={championLogoPlaceholderStyle}>
              🏆
            </div>
          )}
        </div>

        <div style={championTeamNameStyle}>
          {mainChampion.team?.name ?? "POR DEFINIR"}
        </div>

        <div
          style={{
            ...championRibbonStyle,
            borderColor: mainChampion.color,
            color: mainChampion.color,
          }}
        >
          {mainChampion.team
            ? "¡FELICITACIONES, CAMPEONES!"
            : "ESPERANDO RESULTADO DE LA FINAL"}
        </div>
      </section>

      <section style={championCardsGridStyle}>
        {championItems.map((item) => (
          <ChampionMiniCard
            key={item.key}
            item={item}
          />
        ))}
      </section>

      <SponsorStrip />
    </section>
  );
}

function ChampionMiniCard({
  item,
}: {
  item: ChampionDisplayItem;
}) {
  return (
    <article
      style={{
        ...championMiniCardStyle,
        borderColor: item.color,
      }}
    >
      <div style={{ ...championMiniTitleStyle, color: item.color }}>
        {item.title}
      </div>

      <div style={championMiniContentStyle}>
        {item.team?.logoDataUrl ? (
          <img
            src={item.team.logoDataUrl}
            alt={item.team.name}
            style={championMiniLogoStyle}
          />
        ) : (
          <div style={championMiniLogoEmptyStyle}>
            🏆
          </div>
        )}

        <div style={championMiniNameStyle}>
          {item.team?.name ?? "Pendiente"}
        </div>
      </div>
    </article>
  );
}

function BracketOverlay({
  tournamentName,
  fixture,
  teamMap,
}: {
  tournamentName: string;
  fixture: Match[];
  teamMap: Map<number, Team>;
}) {
  const menMatches = fixture.filter(
    (match) =>
      match.stage !== "GROUP" &&
      match.category !== "WOMEN"
  );

  const womenMatches = fixture.filter(
    (match) =>
      match.stage !== "GROUP" &&
      match.category === "WOMEN"
  );

  const totalFinished = fixture.filter(
    (match) => match.status === "FINISHED"
  ).length;

  return (
    <section style={bracketOverlayShellStyle}>
      <OverlayHeader tournamentName={tournamentName} />

      <section style={bracketHeroStyle}>
        <div>
          <div style={bracketSmallTitleStyle}>
            MODO PAUSA · FIXTURE EN VIVO
          </div>

          <h1 style={bracketMainTitleStyle}>
            LLAVE TIPO COPA DEL MUNDO
          </h1>

          <p style={bracketSubtitleStyle}>
            Campo 1 avanza de izquierda a derecha · Campo 2 avanza de derecha a izquierda · La final se junta al centro
          </p>
        </div>

        <div style={bracketHeroStatsStyle}>
          <div style={bracketStatBoxStyle}>
            <span>Partidos</span>
            <strong>{fixture.length}</strong>
          </div>

          <div style={bracketStatBoxStyle}>
            <span>Jugados</span>
            <strong>{totalFinished}</strong>
          </div>

          <div style={bracketBrandPillStyle}>
            #TEAMCR7STUDIO
          </div>
        </div>
      </section>

      <section style={bracketCategoriesStyle}>
        <BracketCategory
          title="VARONES"
          color="#38bdf8"
          matches={menMatches}
          teamMap={teamMap}
        />

        {womenMatches.length > 0 && (
          <BracketCategory
            title="MUJERES"
            color="#f9a8d4"
            matches={womenMatches}
            teamMap={teamMap}
          />
        )}
      </section>

      <SponsorStrip />
    </section>
  );
}

function BracketCategory({
  title,
  color,
  matches,
  teamMap,
}: {
  title: string;
  color: string;
  matches: Match[];
  teamMap: Map<number, Team>;
}) {
  const finalMatch = getBracketFinalMatch(matches);

  const playableMatches = finalMatch
    ? matches.filter((match) => match.id !== finalMatch.id)
    : matches;

  const courtGroups = getBracketCourtGroups(playableMatches);

  const leftGroup = courtGroups[0] ?? null;

  const rightGroup = courtGroups[1] ?? null;

  const extraGroups = courtGroups.slice(2);

  const leftChampion = getSideChampion(leftGroup?.matches ?? []);

  const rightChampion = getSideChampion(rightGroup?.matches ?? []);

  const champion = finalMatch?.winner ?? null;

  return (
    <section
      style={{
        ...bracketCategoryBoxStyle,
        borderColor: color,
      }}
    >
      <div style={bracketCategoryHeaderStyle}>
        <div>
          <div
            style={{
              ...bracketCategoryLabelStyle,
              color,
            }}
          >
            CATEGORÍA
          </div>

          <h2 style={bracketCategoryTitleStyle}>
            {title}
          </h2>
        </div>

        <div style={bracketHeaderRightStyle}>
          <div
            style={{
              ...bracketCountBadgeStyle,
              borderColor: color,
              color,
            }}
          >
            {matches.length} partido(s)
          </div>

          <div style={bracketChampionMiniStyle}>
            <span>Campeón</span>
            <strong>{champion?.name ?? "Pendiente"}</strong>
          </div>
        </div>
      </div>

      {matches.length === 0 ? (
        <div style={bracketEmptyStyle}>
          Todavía no hay llave generada para esta categoría.
        </div>
      ) : (
        <>
          <div style={mirrorBracketStageStyle}>
            <MirrorBracketSide
              label={leftGroup?.label ?? "Campo 1"}
              matches={leftGroup?.matches ?? []}
              color={color}
              teamMap={teamMap}
              side="left"
            />

            <BracketFinalCenter
              finalMatch={finalMatch}
              leftChampion={leftChampion}
              rightChampion={rightChampion}
              color={color}
              teamMap={teamMap}
            />

            <MirrorBracketSide
              label={rightGroup?.label ?? "Campo 2"}
              matches={rightGroup?.matches ?? []}
              color={color}
              teamMap={teamMap}
              side="right"
            />
          </div>

          {extraGroups.length > 0 && (
            <div style={extraCourtsBoxStyle}>
              <div style={extraCourtsTitleStyle}>
                Otros campos
              </div>

              <div style={extraCourtsGridStyle}>
                {extraGroups.map((group) => (
                  <MirrorBracketSide
                    key={group.label}
                    label={group.label}
                    matches={group.matches}
                    color={color}
                    teamMap={teamMap}
                    side="left"
                    compact
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function MirrorBracketSide({
  label,
  matches,
  color,
  teamMap,
  side,
  compact = false,
}: {
  label: string;
  matches: Match[];
  color: string;
  teamMap: Map<number, Team>;
  side: "left" | "right";
  compact?: boolean;
}) {
  const rounds = getBracketRounds(matches);

  const displayedRounds = side === "left"
    ? rounds
    : [...rounds].reverse();

  return (
    <section
      style={{
        ...mirrorSideBoxStyle,
        borderColor: color,
      }}
    >
      <div
        style={{
          ...mirrorSideTitleStyle,
          borderColor: color,
          color,
          textAlign: side === "left" ? "left" : "right",
        }}
      >
        <strong>{label}</strong>
        <span>
          {side === "left"
            ? "Avanza →"
            : "← Avanza"}
        </span>
      </div>

      {rounds.length === 0 ? (
        <div style={bracketEmptyStyle}>
          Todavía no hay partidos en esta campo.
        </div>
      ) : (
        <div
          style={{
            ...mirrorRoundsGridStyle,
            gridAutoColumns: compact
              ? "minmax(155px, 1fr)"
              : "minmax(132px, 1fr)",
          }}
        >
          {displayedRounds.map((round, displayIndex) => {
            const showConnector = side === "left"
              ? displayIndex < displayedRounds.length - 1
              : displayIndex > 0;

            return (
              <div
                key={`${side}-${round.round}-${round.title}`}
                style={bracketRoundColumnStyle}
              >
                <div
                  style={{
                    ...bracketRoundTitleStyle,
                    borderColor: color,
                    color,
                  }}
                >
                  <span>{round.title}</span>
                  <small>{round.matches.length}</small>
                </div>

                <div style={bracketMatchListStyle}>
                  {round.matches.map((match) => (
                    <BracketMatchCard
                      key={match.id}
                      match={match}
                      teamMap={teamMap}
                      color={color}
                      showConnector={showConnector}
                      connectorSide={side === "left" ? "right" : "left"}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function BracketFinalCenter({
  finalMatch,
  leftChampion,
  rightChampion,
  color,
  teamMap,
}: {
  finalMatch: Match | null;
  leftChampion: Team | null;
  rightChampion: Team | null;
  color: string;
  teamMap: Map<number, Team>;
}) {
  const teamA = getTeamWithLogo(
    finalMatch?.teamA ?? leftChampion,
    teamMap
  );

  const teamB = getTeamWithLogo(
    finalMatch?.teamB ?? rightChampion,
    teamMap
  );

  const teamAName = finalMatch
    ? getTeamName(
        teamA,
        finalMatch.sourceMatchA
          ? `Ganador P${finalMatch.sourceMatchA}`
          : "Finalista Campo 1"
      )
    : teamA?.name ?? "Finalista Campo 1";

  const teamBName = finalMatch
    ? getTeamName(
        teamB,
        finalMatch.sourceMatchB
          ? `Ganador P${finalMatch.sourceMatchB}`
          : "Finalista Campo 2"
      )
    : teamB?.name ?? "Finalista Campo 2";

  return (
    <section
      style={{
        ...finalCenterBoxStyle,
        borderColor: color,
      }}
    >
      <div style={finalCrownStyle}>🏆</div>

      <div
        style={{
          ...finalTitleStyle,
          color,
        }}
      >
        GRAN FINAL
      </div>

      <div style={finalSubtitleStyle}>
        Se juntan los finalistas
      </div>

      <div style={finalMatchCardStyle}>
        <BracketTeamRow
          team={teamA}
          name={teamAName}
          score={finalMatch?.scoreA ?? 0}
          isWinner={finalMatch?.winner?.id === teamA?.id}
          color={color}
        />

        <div style={finalVsStyle}>VS</div>

        <BracketTeamRow
          team={teamB}
          name={teamBName}
          score={finalMatch?.scoreB ?? 0}
          isWinner={finalMatch?.winner?.id === teamB?.id}
          color={color}
        />
      </div>

      <div style={finalWinnerStyle}>
        {finalMatch?.winner ? (
          <>
            <span>Campeón</span>
            <strong>{finalMatch.winner.name}</strong>
          </>
        ) : (
          <>
            <span>Campeón</span>
            <strong>Pendiente</strong>
          </>
        )}
      </div>
    </section>
  );
}

function getBracketFinalMatch(matches: Match[]) {
  const knockoutMatches = matches.filter(
    (match) => match.stage !== "GROUP"
  );

  const explicitFinal = knockoutMatches.find((match) =>
    getCourtLabel(match)
      .toUpperCase()
      .includes("FINAL")
  );

  if (explicitFinal) return explicitFinal;

  const terminal = knockoutMatches.find(
    (match) => !match.nextMatchId
  );

  if (terminal) return terminal;

  return [...knockoutMatches].sort((a, b) => {
    if ((b.round ?? 0) !== (a.round ?? 0)) {
      return (b.round ?? 0) - (a.round ?? 0);
    }

    return b.id - a.id;
  })[0] ?? null;
}

function getSideChampion(matches: Match[]) {
  return [...matches]
    .sort((a, b) => {
      if ((b.round ?? 0) !== (a.round ?? 0)) {
        return (b.round ?? 0) - (a.round ?? 0);
      }

      return b.id - a.id;
    })
    .find((match) => match.winner)
    ?.winner ?? null;
}

function getBracketCourtGroups(matches: Match[]) {
  const map = new Map<string, Match[]>();

  matches.forEach((match) => {
    const label = getCourtLabel(match);

    if (
      label
        .toUpperCase()
        .includes("FINAL")
    ) {
      return;
    }

    if (!map.has(label)) {
      map.set(label, []);
    }

    map.get(label)!.push(match);
  });

  return Array.from(map.entries())
    .map(([label, list]) => ({
      label,
      matches: sortMatchesForOverlay(list),
      order: getBracketCourtOrder(label, list),
    }))
    .sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }

      return a.label.localeCompare(b.label);
    });
}

function getBracketCourtOrder(label: string, matches: Match[]) {
  const courtNumber =
    matches[0]?.court ??
    Number(label.match(/\d+/)?.[0] ?? 0);

  const isWomen = matches.some(
    (match) => match.category === "WOMEN"
  );

  if (isWomen) {
    return 40 + courtNumber;
  }

  return courtNumber || 99;
}

function getBracketRounds(matches: Match[]) {
  const map = new Map<number, Match[]>();

  matches.forEach((match) => {
    const round = match.round ?? 1;

    if (!map.has(round)) {
      map.set(round, []);
    }

    map.get(round)!.push(match);
  });

  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([round, list]) => {
      const sorted = [...list].sort((a, b) => {
        if ((a.court ?? 0) !== (b.court ?? 0)) {
          return (a.court ?? 0) - (b.court ?? 0);
        }

        if (a.time !== b.time) {
          return a.time.localeCompare(b.time);
        }

        return a.id - b.id;
      });

      return {
        round,
        title: getBracketRoundTitle(sorted, round),
        matches: sorted,
      };
    });
}

function getBracketRoundTitle(
  matches: Match[],
  round: number
) {
  const firstMatch = matches[0];

  if (
    firstMatch &&
    getCourtLabel(firstMatch)
      .toUpperCase()
      .includes("FINAL")
  ) {
    return "FINAL";
  }

  if (matches.length >= 16) return "16AVOS";

  if (matches.length === 8) return "8VOS";

  if (matches.length === 4) return "CUARTOS";

  if (matches.length === 2) return "SEMIFINAL";

  if (matches.length === 1) return "FINALISTA";

  return `RONDA ${round}`;
}

function BracketMatchCard({
  match,
  teamMap,
  color,
  showConnector,
  connectorSide,
}: {
  match: Match;
  teamMap: Map<number, Team>;
  color: string;
  showConnector: boolean;
  connectorSide: "left" | "right";
}) {
  const teamA = getTeamWithLogo(
    match.teamA,
    teamMap
  );

  const teamB = getTeamWithLogo(
    match.teamB,
    teamMap
  );

  const teamAName = getTeamName(
    teamA,
    match.sourceMatchA
      ? `Ganador P${match.sourceMatchA}`
      : "Por definir"
  );

  const teamBName = getTeamName(
    teamB,
    match.sourceMatchB
      ? `Ganador P${match.sourceMatchB}`
      : "Por definir"
  );

  return (
    <div style={bracketMatchWrapStyle}>
      <article
        style={{
          ...bracketMatchCardStyle,
          borderColor:
            match.status === "FINISHED"
              ? color
              : "#334155",
        }}
      >
        <div style={bracketMatchMetaStyle}>
          <span>P{match.id}</span>
          <span>{getCourtLabel(match)}</span>
          <span>{match.time || "--:--"}</span>
        </div>

        <BracketTeamRow
          team={teamA}
          name={teamAName}
          score={match.scoreA}
          isWinner={match.winner?.id === teamA?.id}
          color={color}
        />

        <BracketTeamRow
          team={teamB}
          name={teamBName}
          score={match.scoreB}
          isWinner={match.winner?.id === teamB?.id}
          color={color}
        />

        <div style={bracketFooterLineStyle}>
          {match.winner ? (
            <span style={{ color }}>
              Avanza: {match.winner.name}
            </span>
          ) : (
            <span>Ganador pendiente</span>
          )}
        </div>
      </article>

      {showConnector && (
        <div
          style={{
            ...bracketConnectorStyle,
            borderColor: color,
            left: connectorSide === "left" ? -16 : undefined,
            right: connectorSide === "right" ? -16 : undefined,
          }}
        />
      )}
    </div>
  );
}

function BracketSmallLogo({
  team,
}: {
  team: Team | null;
}) {
  if (!team?.logoDataUrl) {
    return (
      <div style={bracketSmallLogoEmptyStyle}>
        ⚽
      </div>
    );
  }

  return (
    <img
      src={team.logoDataUrl}
      alt={team.name}
      style={bracketSmallLogoStyle}
    />
  );
}

function BracketTeamRow({
  team,
  name,
  score,
  isWinner,
  color,
}: {
  team: Team | null;
  name: string;
  score: number;
  isWinner: boolean;
  color: string;
}) {
  return (
    <div
      style={{
        ...bracketTeamRowStyle,
        borderColor: isWinner ? color : "#334155",
        background: isWinner
          ? "linear-gradient(90deg, rgba(22,163,74,.28), rgba(15,23,42,.96))"
          : "#020617",
        boxShadow: isWinner
          ? `0 0 18px ${color}55`
          : "none",
      }}
    >
      <BracketSmallLogo team={team} />

      <div style={bracketTeamNameStyle}>
        {isWinner && <span style={winnerDotStyle}>●</span>}
        {name}
      </div>

      <div
        style={{
          ...bracketScoreStyle,
          color: isWinner ? color : "#f8fafc",
        }}
      >
        {score}
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
  simultaneousMatches,
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
  simultaneousMatches: Match[];
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
  openGoalScorers: (match: Match) => void;
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

  const controlledMatches =
    simultaneousMatches.length > 0
      ? simultaneousMatches
      : selectedMatch
      ? [selectedMatch]
      : [];

  return (
    <section style={controlPanelStyle}>
      <div style={controlLayoutStyle}>
        <aside style={controlSidebarStyle}>
          <div style={controlSidebarHeaderStyle}>
            <div>
              <div style={controlLabelStyle}>
                PANEL CONTROL OBS
              </div>

              <div style={controlTimeStyle}>
                {formatTime(secondsLeft)}
              </div>

              <div style={controlSubTextStyle}>
                Duración: {Math.round(durationSeconds / 60)} min
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

          <div style={sidebarBlocksStyle}>
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
                  Multicampo
                </button>

                <button
                  onClick={() => setOverlayMode("BRACKET")}
                  style={
                    overlayMode === "BRACKET"
                      ? activeModeButtonStyle
                      : grayButtonStyle
                  }
                >
                  Llave / Fixture
                </button>

                <button
                  onClick={() => setOverlayMode("CHAMPION")}
                  style={
                    overlayMode === "CHAMPION"
                      ? activeModeButtonStyle
                      : grayButtonStyle
                  }
                >
                  Campeón
                </button>
              </div>

              <div style={modeInfoStyle}>
                {overlayMode === "MULTI"
                  ? `Mostrando ${simultaneousCount} partido(s) de las ${simultaneousTime}`
                  : overlayMode === "BRACKET"
                  ? "Mostrando llave / fixture para pausas"
                  : overlayMode === "CHAMPION"
                  ? "Mostrando pantalla de campeón"
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
          </div>
        </aside>

        <div style={controlMainAreaStyle}>
          <div style={simultaneousControlBoxStyle}>
            <div style={simultaneousControlHeaderStyle}>
              <div>
                <h3 style={controlBlockTitleStyle}>
                  ⚽ Control de marcadores simultáneos
                </h3>

                <div style={modeInfoStyle}>
                  Controlando {controlledMatches.length} partido(s) del horario{" "}
                  {simultaneousTime || "--:--"}.
                </div>
              </div>

              <div style={simultaneousBadgeStyle}>
                {controlledMatches.length} campo(s)
              </div>
            </div>

            {controlledMatches.length === 0 ? (
              <div style={emptyControlStyle}>
                Selecciona un partido para mostrar sus controles.
              </div>
            ) : (
              <div style={simultaneousCardsGridStyle}>
                {controlledMatches.map((match) => (
                  <SimultaneousScoreCard
                    key={match.id}
                    match={match}
                    isMain={selectedMatchId === match.id}
                    selectMatch={selectMatch}
                    updateMatchNumber={updateMatchNumber}
                    adjustScore={adjustScore}
                    saveResult={saveResult}
                    openGoalScorers={openGoalScorers}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={controlHelpStyle}>
        OBS limpio: <strong>/overlay</strong> | Panel control:{" "}
        <strong>/overlay?control=1</strong>
      </div>
    </section>
  );
}

function SimultaneousScoreCard({
  match,
  isMain,
  selectMatch,
  updateMatchNumber,
  adjustScore,
  saveResult,
  openGoalScorers,
}: {
  match: Match;
  isMain: boolean;
  selectMatch: (matchId: number) => void;
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
  openGoalScorers: (match: Match) => void;
}) {
  const needsPenalties =
    match.scoreA === match.scoreB &&
    match.stage !== "GROUP";

  return (
    <article
      style={{
        ...simultaneousScoreCardStyle,
        borderColor: isMain ? "#22c55e" : "#334155",
        boxShadow: isMain
          ? "0 0 18px rgba(34,197,94,.25)"
          : "none",
      }}
    >
      <div style={simultaneousCardHeaderStyle}>
        <div>
          <div
            style={{
              color:
                match.category === "WOMEN"
                  ? "#f9a8d4"
                  : "#38bdf8",
              fontWeight: 1000,
              fontSize: 12,
              letterSpacing: 1,
            }}
          >
            {getCategoryName(match)}
          </div>

          <div style={simultaneousCardTitleStyle}>
            {getCourtLabel(match)}
          </div>

          <div style={simultaneousCardMetaStyle}>
            Partido {match.id} | {match.time || "--:--"}
          </div>
        </div>

        <button
          onClick={() => selectMatch(match.id)}
          style={isMain ? greenButtonStyle : blueButtonStyle}
        >
          {isMain ? "Principal" : "Usar principal"}
        </button>
      </div>

      <ScoreControlRow
        label={match.teamA?.name ?? "Equipo A"}
        value={match.scoreA}
        onMinus={() =>
          adjustScore(
            match.id,
            "scoreA",
            -1
          )
        }
        onPlus={() =>
          adjustScore(
            match.id,
            "scoreA",
            1
          )
        }
        onChange={(value) =>
          updateMatchNumber(
            match.id,
            "scoreA",
            value
          )
        }
      />

      <ScoreControlRow
        label={match.teamB?.name ?? "Equipo B"}
        value={match.scoreB}
        onMinus={() =>
          adjustScore(
            match.id,
            "scoreB",
            -1
          )
        }
        onPlus={() =>
          adjustScore(
            match.id,
            "scoreB",
            1
          )
        }
        onChange={(value) =>
          updateMatchNumber(
            match.id,
            "scoreB",
            value
          )
        }
      />

      {needsPenalties && (
        <div style={penaltyControlBoxStyle}>
          <strong>Penales</strong>

          <div style={penaltyControlGridStyle}>
            <input
              type="number"
              min={0}
              value={match.penaltyA ?? 0}
              onChange={(event) =>
                updateMatchNumber(
                  match.id,
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
              value={match.penaltyB ?? 0}
              onChange={(event) =>
                updateMatchNumber(
                  match.id,
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
          onClick={() => saveResult(match)}
          style={greenButtonStyle}
        >
          💾 Guardar
        </button>

        <button
          onClick={() => openGoalScorers(match)}
          style={orangeButtonStyle}
        >
          ⚽ Goleadores
        </button>
      </div>

      {match.status === "FINISHED" && (
        <div style={winnerControlStyle}>
          🏆 Ganador: {match.winner?.name ?? "Definido"}
        </div>
      )}
    </article>
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

/* ===================== MULTICAMPO ===================== */

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

const multiScoreNumberStyle: CSSProperties = {
  fontSize: 34,
  fontWeight: 1000,
  color: "#f8fafc",
};

const multiVsStyle: CSSProperties = {
  color: "#22d3ee",
  fontWeight: 1000,
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


/* ===================== OVERLAY LLAVE ===================== */

const bracketOverlayShellStyle: CSSProperties = {
  width: 1080,
  maxWidth: "100%",
  minHeight: 1090,
  position: "relative",
  borderRadius: 12,
  overflow: "hidden",
  background:
    "radial-gradient(circle at 50% 42%, rgba(14,165,233,.18), transparent 28%), linear-gradient(180deg, rgba(2,6,23,.18), rgba(2,6,23,.28))",
};

const bracketHeroStyle: CSSProperties = {
  margin: "20px auto 14px",
  width: "96%",
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
  background:
    "linear-gradient(135deg, rgba(15,23,42,.98), rgba(2,6,23,.94))",
  border: "2px solid rgba(14,165,233,.78)",
  borderRadius: 18,
  padding: "16px 20px",
  boxShadow:
    "0 0 34px rgba(14,165,233,.32), inset 0 0 28px rgba(14,165,233,.10)",
};

const bracketSmallTitleStyle: CSSProperties = {
  color: "#facc15",
  fontSize: 12,
  fontWeight: 1000,
  letterSpacing: 2,
};

const bracketMainTitleStyle: CSSProperties = {
  margin: "5px 0",
  fontSize: 32,
  fontWeight: 1000,
  lineHeight: 1,
  textTransform: "uppercase",
  textShadow: "0 0 18px rgba(14,165,233,.35)",
};

const bracketSubtitleStyle: CSSProperties = {
  margin: 0,
  color: "#cbd5e1",
  fontSize: 12,
  fontWeight: 800,
  maxWidth: 640,
};

const bracketHeroStatsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8,
  flexWrap: "wrap",
};

const bracketStatBoxStyle: CSSProperties = {
  minWidth: 78,
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: "8px 10px",
  display: "grid",
  gap: 3,
  textAlign: "center",
  fontSize: 11,
};

const bracketBrandPillStyle: CSSProperties = {
  background: "#020617",
  border: "1px solid #0ea5e9",
  borderRadius: 999,
  padding: "11px 14px",
  color: "#22d3ee",
  fontWeight: 1000,
  letterSpacing: 1,
  fontSize: 11,
};

const bracketCategoriesStyle: CSSProperties = {
  width: "96%",
  margin: "0 auto",
  display: "grid",
  gap: 14,
  alignItems: "start",
};

const bracketCategoryBoxStyle: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(15,23,42,.98), rgba(2,6,23,.98))",
  border: "2px solid #38bdf8",
  borderRadius: 18,
  padding: 14,
  boxShadow:
    "0 18px 45px rgba(0,0,0,.38), inset 0 0 22px rgba(14,165,233,.14)",
};

const bracketCategoryHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 12,
  borderBottom: "1px solid rgba(148,163,184,.24)",
  paddingBottom: 10,
};

const bracketCategoryLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 1000,
  letterSpacing: 2,
};

const bracketCategoryTitleStyle: CSSProperties = {
  margin: "3px 0 0",
  fontSize: 24,
  fontWeight: 1000,
};

const bracketHeaderRightStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const bracketCountBadgeStyle: CSSProperties = {
  border: "1px solid",
  borderRadius: 999,
  padding: "7px 10px",
  fontWeight: 1000,
  background: "#020617",
  fontSize: 11,
};

const bracketChampionMiniStyle: CSSProperties = {
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: "7px 10px",
  display: "grid",
  gap: 2,
  minWidth: 150,
  fontSize: 11,
};

const mirrorBracketStageStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 210px minmax(0, 1fr)",
  gap: 12,
  alignItems: "stretch",
};

const mirrorSideBoxStyle: CSSProperties = {
  minWidth: 0,
  background: "rgba(2,6,23,.50)",
  border: "1px solid rgba(51,65,85,.95)",
  borderRadius: 14,
  padding: 10,
  overflow: "hidden",
};

const mirrorSideTitleStyle: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(2,6,23,.98), rgba(15,23,42,.98))",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: "8px 10px",
  marginBottom: 10,
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
  fontWeight: 1000,
  textTransform: "uppercase",
  letterSpacing: 1,
  fontSize: 11,
};

const mirrorRoundsGridStyle: CSSProperties = {
  width: "100%",
  overflowX: "auto",
  display: "grid",
  gridAutoFlow: "column",
  gap: 14,
  alignItems: "stretch",
  padding: "4px 2px 8px",
};

const finalCenterBoxStyle: CSSProperties = {
  minHeight: 360,
  alignSelf: "center",
  background:
    "radial-gradient(circle at 50% 0%, rgba(250,204,21,.22), transparent 36%), linear-gradient(180deg, rgba(15,23,42,.99), rgba(2,6,23,.99))",
  border: "2px solid #facc15",
  borderRadius: 20,
  padding: 14,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  textAlign: "center",
  boxShadow:
    "0 0 34px rgba(250,204,21,.26), inset 0 0 22px rgba(250,204,21,.10)",
};

const finalCrownStyle: CSSProperties = {
  fontSize: 38,
  lineHeight: 1,
  marginBottom: 6,
};

const finalTitleStyle: CSSProperties = {
  fontSize: 24,
  fontWeight: 1000,
  letterSpacing: 1,
  textTransform: "uppercase",
};

const finalSubtitleStyle: CSSProperties = {
  color: "#cbd5e1",
  fontSize: 11,
  fontWeight: 800,
  marginTop: 4,
  marginBottom: 12,
  textTransform: "uppercase",
};

const finalMatchCardStyle: CSSProperties = {
  background: "rgba(2,6,23,.72)",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 9,
};

const finalVsStyle: CSSProperties = {
  color: "#facc15",
  fontWeight: 1000,
  fontSize: 15,
  margin: "5px 0 9px",
};

const finalWinnerStyle: CSSProperties = {
  marginTop: 12,
  background: "#020617",
  border: "1px solid #facc15",
  borderRadius: 12,
  padding: "10px 8px",
  display: "grid",
  gap: 3,
  fontSize: 12,
};

const extraCourtsBoxStyle: CSSProperties = {
  marginTop: 12,
  borderTop: "1px solid rgba(148,163,184,.22)",
  paddingTop: 12,
};

const extraCourtsTitleStyle: CSSProperties = {
  color: "#facc15",
  fontWeight: 1000,
  fontSize: 12,
  letterSpacing: 1,
  marginBottom: 8,
  textTransform: "uppercase",
};

const extraCourtsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 12,
};

const bracketRoundColumnStyle: CSSProperties = {
  display: "grid",
  gridTemplateRows: "auto 1fr",
  gap: 10,
  minWidth: 132,
};

const bracketRoundTitleStyle: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(2,6,23,.98), rgba(15,23,42,.98))",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: "8px 8px",
  textAlign: "center",
  fontWeight: 1000,
  letterSpacing: 1,
  display: "grid",
  gap: 2,
  fontSize: 10,
  boxShadow: "inset 0 0 16px rgba(14,165,233,.12)",
};

const bracketMatchListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-around",
  gap: 10,
  minHeight: 245,
};

const bracketMatchWrapStyle: CSSProperties = {
  position: "relative",
};

const bracketMatchCardStyle: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(15,23,42,.98), rgba(2,6,23,.98))",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: 8,
  position: "relative",
  zIndex: 2,
  boxShadow: "0 12px 26px rgba(0,0,0,.28)",
};

const bracketConnectorStyle: CSSProperties = {
  position: "absolute",
  top: "50%",
  width: 16,
  height: 2,
  borderTop: "2px solid",
  opacity: 0.82,
  boxShadow: "0 0 12px rgba(14,165,233,.45)",
};

const bracketMatchMetaStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  gap: 5,
  color: "#94a3b8",
  fontSize: 8,
  fontWeight: 900,
  marginBottom: 6,
  textTransform: "uppercase",
};

const bracketSmallLogoStyle: CSSProperties = {
  width: 26,
  height: 26,
  objectFit: "contain",
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 7,
  padding: 2,
};

const bracketSmallLogoEmptyStyle: CSSProperties = {
  width: 26,
  height: 26,
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 7,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
};

const bracketTeamRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "28px 1fr 26px",
  gap: 5,
  alignItems: "center",
  border: "1px solid #334155",
  borderRadius: 9,
  padding: 5,
  marginBottom: 5,
};

const bracketTeamNameStyle: CSSProperties = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontWeight: 1000,
  textTransform: "uppercase",
  fontSize: 10,
  display: "flex",
  alignItems: "center",
  gap: 4,
};

const winnerDotStyle: CSSProperties = {
  fontSize: 7,
};

const bracketScoreStyle: CSSProperties = {
  textAlign: "center",
  fontSize: 15,
  fontWeight: 1000,
};

const bracketFooterLineStyle: CSSProperties = {
  marginTop: 5,
  background: "rgba(2,6,23,.75)",
  border: "1px solid #334155",
  borderRadius: 7,
  padding: "5px 6px",
  color: "#94a3b8",
  fontSize: 9,
  fontWeight: 1000,
  textAlign: "center",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const bracketEmptyStyle: CSSProperties = {
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: 16,
  color: "#94a3b8",
  textAlign: "center",
  fontSize: 12,
};




/* ===================== CAMPEÓN OVERLAY ===================== */

const championOverlayShellStyle: CSSProperties = {
  width: "100%",
  maxWidth: 1500,
  minHeight: 860,
  position: "relative",
  borderRadius: 10,
  overflow: "hidden",
  background:
    "radial-gradient(circle at 50% 32%, rgba(250,204,21,.22), transparent 30%), radial-gradient(circle at 50% 70%, rgba(14,165,233,.22), transparent 25%), linear-gradient(180deg, rgba(2,6,23,.18), rgba(2,6,23,.32))",
};

const championConfettiLayerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  display: "flex",
  justifyContent: "space-around",
  alignItems: "flex-start",
  color: "#facc15",
  fontSize: 34,
  opacity: 0.38,
  paddingTop: 140,
};

const championHeroStyle: CSSProperties = {
  width: "92%",
  margin: "42px auto 0",
  minHeight: 430,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background:
    "linear-gradient(135deg, rgba(113,63,18,.82), rgba(2,6,23,.92) 45%, rgba(14,165,233,.20))",
  border: "2px solid rgba(250,204,21,.72)",
  borderRadius: 28,
  boxShadow:
    "0 0 70px rgba(250,204,21,.23), inset 0 0 45px rgba(14,165,233,.15)",
  padding: 32,
  position: "relative",
  overflow: "hidden",
};

const championSupTitleStyle: CSSProperties = {
  color: "#22d3ee",
  fontWeight: 1000,
  letterSpacing: 4,
  fontSize: 15,
  textTransform: "uppercase",
};

const championMainTitleStyle: CSSProperties = {
  margin: "10px 0 22px",
  color: "#facc15",
  fontSize: 64,
  fontWeight: 1000,
  letterSpacing: 2,
  textTransform: "uppercase",
  textAlign: "center",
  textShadow:
    "0 5px 0 rgba(2,6,23,.85), 0 0 28px rgba(250,204,21,.35)",
};

const championLogoRingStyle: CSSProperties = {
  width: 190,
  height: 190,
  borderRadius: "50%",
  border: "4px solid #facc15",
  background:
    "radial-gradient(circle, rgba(15,23,42,.98), rgba(2,6,23,.98))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 14,
};

const championLogoImageStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
};

const championLogoPlaceholderStyle: CSSProperties = {
  fontSize: 92,
};

const championTeamNameStyle: CSSProperties = {
  marginTop: 22,
  color: "#f8fafc",
  fontSize: 58,
  fontWeight: 1000,
  textTransform: "uppercase",
  letterSpacing: 1,
  textAlign: "center",
  textShadow:
    "0 4px 0 rgba(15,23,42,.9), 0 0 22px rgba(255,255,255,.18)",
};

const championRibbonStyle: CSSProperties = {
  marginTop: 18,
  background: "rgba(2,6,23,.72)",
  border: "1px solid #facc15",
  borderRadius: 999,
  padding: "10px 28px",
  fontSize: 18,
  fontWeight: 1000,
  letterSpacing: 1.5,
};

const championCardsGridStyle: CSSProperties = {
  width: "92%",
  margin: "20px auto 0",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 16,
};

const championMiniCardStyle: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(15,23,42,.98), rgba(2,6,23,.98))",
  border: "1px solid #334155",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 14px 35px rgba(0,0,0,.28)",
};

const championMiniTitleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 1000,
  letterSpacing: 1.4,
  marginBottom: 12,
};

const championMiniContentStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
};

const championMiniLogoStyle: CSSProperties = {
  width: 64,
  height: 64,
  objectFit: "contain",
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 5,
};

const championMiniLogoEmptyStyle: CSSProperties = {
  width: 64,
  height: 64,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 14,
  fontSize: 30,
};

const championMiniNameStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 1000,
  textTransform: "uppercase",
};

/* ===================== PANEL CONTROL ===================== */

const controlPanelStyle: CSSProperties = {
  width: "100%",
  maxWidth: 1500,
  marginTop: 24,
  background: "rgba(15, 23, 42, 0.97)",
  border: "1px solid #475569",
  borderRadius: 20,
  padding: 18,
  boxShadow: "0 20px 55px rgba(0,0,0,.35)",
};

const controlLayoutStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "350px minmax(0, 1fr)",
  gap: 18,
  alignItems: "start",
};

const controlSidebarStyle: CSSProperties = {
  display: "grid",
  gap: 14,
  position: "sticky",
  top: 14,
  alignSelf: "start",
};

const controlSidebarHeaderStyle: CSSProperties = {
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 16,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
};

const sidebarBlocksStyle: CSSProperties = {
  display: "grid",
  gap: 14,
};

const controlMainAreaStyle: CSSProperties = {
  minWidth: 0,
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
  fontSize: 44,
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
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const modeButtonsStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
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
    "repeat(auto-fit, minmax(110px, 1fr))",
  gap: 10,
  marginTop: 12,
};

const minutesRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "90px 1fr",
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

const simultaneousControlBoxStyle: CSSProperties = {
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 16,
  marginTop: 0,
};

const simultaneousControlHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  marginBottom: 14,
};

const simultaneousBadgeStyle: CSSProperties = {
  background: "#0ea5e9",
  color: "white",
  borderRadius: 999,
  padding: "8px 14px",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const simultaneousCardsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(300px, 1fr))",
  gap: 14,
  marginTop: 14,
};

const simultaneousScoreCardStyle: CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 14,
};

const simultaneousCardHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  marginBottom: 12,
};

const simultaneousCardTitleStyle: CSSProperties = {
  fontSize: 20,
  fontWeight: 1000,
  marginTop: 4,
};

const simultaneousCardMetaStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: 12,
  marginTop: 4,
};

const winnerControlStyle: CSSProperties = {
  marginTop: 12,
  background: "#064e3b",
  color: "#bbf7d0",
  border: "1px solid #16a34a",
  borderRadius: 10,
  padding: 10,
  textAlign: "center",
  fontWeight: 900,
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