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

function getCourtLabel(match: Match) {
  if (match.courtLabel) {
    return match.courtLabel;
  }

  if (match.category === "WOMEN") {
    return `C. Mujer ${match.court || "-"}`;
  }

  return `Cancha ${match.court || "-"}`;
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

  return `P${match.id} | ${getCourtLabel(match)} | ${teamA} vs ${teamB}`;
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
    return "PARTIDO EN VIVO";
  }

  return "CRONÓMETRO PAUSADO";
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
    function syncStoredMatch() {
      setStoredMatchId(readStoredActiveMatchId());
    }

    window.addEventListener(
      "storage",
      syncStoredMatch
    );

    window.addEventListener(
      "focus",
      syncStoredMatch
    );

    const interval =
      window.setInterval(syncStoredMatch, 500);

    return () => {
      window.removeEventListener(
        "storage",
        syncStoredMatch
      );

      window.removeEventListener(
        "focus",
        syncStoredMatch
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
          <span>
            ⏱ {formatTime(secondsLeft)}
          </span>

          <span>
            🏟 {getCourtLabel(match)}
          </span>
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
        {getStatusText(match, isRunning)}
      </section>

      {isControlMode && (
        <ControlPanel
          fixture={fixture}
          selectedMatch={match}
          selectedMatchId={selectedMatchId}
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
    flexDirection:
      side === "left" ? "row" : "row-reverse",
  };

  const nameStyle: CSSProperties = {
    fontSize: 40,
    fontWeight: 900,
    lineHeight: 1.05,
    textTransform: "uppercase",
    wordBreak: "break-word",
    textAlign:
      side === "left" ? "left" : "right",
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

function ControlPanel({
  fixture,
  selectedMatch,
  selectedMatchId,
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
            📺 Partido en OBS
          </h3>

          <select
            value={selectedMatchId ?? selectedMatch?.id ?? ""}
            onChange={(event) =>
              selectMatch(Number(event.target.value))
            }
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
            ⚽ Marcador
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

const pageStyle: CSSProperties = {
  width: "100%",
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top, rgba(37, 99, 235, 0.35), transparent 35%), linear-gradient(135deg, #020617, #0f172a 55%, #111827)",
  color: "white",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: 40,
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

const controlPanelStyle: CSSProperties = {
  width: "100%",
  maxWidth: 1180,
  marginTop: 24,
  background: "rgba(15, 23, 42, 0.97)",
  border: "1px solid #475569",
  borderRadius: 20,
  padding: 20,
  boxShadow: "0 20px 55px rgba(0,0,0,.35)",
  position: "relative",
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