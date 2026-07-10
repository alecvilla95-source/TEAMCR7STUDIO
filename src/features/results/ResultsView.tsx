import {
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import type { Match } from "../../types/match";
import type { Player } from "../../types/player";
import type {
  Team,
  TeamCategory,
} from "../../types/team";
import type { GoalScorerRecord } from "../../types/goal";

import { useFixture } from "../../store/fixtureStore";
import { useTournament } from "../../store/tournamentStore";
import { useTeams } from "../../store/teamStore";
import { useChampion } from "../../store/championStore";
import { useOverlay } from "../../store/overlayStore";
import { useApp } from "../../store/appStore";
import { usePlayers } from "../../store/playerStore";
import { useGoals } from "../../store/goalStore";

import { applyResult } from "../../engine/resultEngine";
import { exportTopScorersToExcel } from "../../services/goalExcelService";

type VenueCategory =
  | TeamCategory
  | "GENERAL";

interface RoundGroup {
  key: string;
  round: number;
  name: string;
  matches: Match[];
}

interface VenueGroup {
  key: string;
  label: string;
  category: VenueCategory;
  court: number;
  matches: Match[];
}

interface TopScorerRow {
  key: string;
  playerId: string;
  playerName: string;
  teamName: string;
  category: TeamCategory;
  goals: number;
}

function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCategoryLabel(
  category: VenueCategory
) {
  if (category === "MEN") return "VARONES";

  if (category === "WOMEN") return "MUJERES";

  return "GENERAL";
}

function getCategoryColor(
  category: VenueCategory
) {
  if (category === "WOMEN") return "#f9a8d4";

  if (category === "MEN") return "#93c5fd";

  return "#facc15";
}

function getGoalCategoryTitle(
  category: TeamCategory
) {
  if (category === "WOMEN") {
    return "🏆 Goleadoras Mujeres";
  }

  return "🏆 Goleadores Varones";
}

function getRoundTitle(
  matches: Match[],
  round: number
) {
  const first = matches[0];

  if (first?.groupName) {
    return first.groupName;
  }

  const hasFinal = matches.some((match) =>
    (match.courtLabel ?? "")
      .toUpperCase()
      .includes("FINAL")
  );

  if (hasFinal) {
    return "FINALES";
  }

  return `RONDA ${round}`;
}

function groupByRound(
  matches: Match[]
): RoundGroup[] {
  const map = new Map<string, Match[]>();

  matches.forEach((match) => {
    const key =
      match.groupName ??
      `ROUND_${match.round}`;

    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key)!.push(match);
  });

  return Array.from(map.entries())
    .map(([key, list]) => {
      const sorted = [...list].sort((a, b) => {
        if (a.round !== b.round) {
          return a.round - b.round;
        }

        if (a.order !== b.order) {
          return a.order - b.order;
        }

        return a.court - b.court;
      });

      const round =
        sorted[0]?.round ?? 1;

      return {
        key,
        round,
        name: getRoundTitle(
          sorted,
          round
        ),
        matches: sorted,
      };
    })
    .sort((a, b) => a.round - b.round);
}

function groupByVenue(
  matches: Match[]
): VenueGroup[] {
  const map = new Map<string, VenueGroup>();

  matches.forEach((match) => {
    const label =
      match.courtLabel ??
      `Cancha ${match.court || 1}`;

    const category: VenueCategory =
      match.category ?? "GENERAL";

    const key =
      `${category}_${label}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        label,
        category,
        court: match.court || 1,
        matches: [],
      });
    }

    map.get(key)!.matches.push(match);
  });

  const order: Record<VenueCategory, number> = {
    MEN: 1,
    WOMEN: 2,
    GENERAL: 3,
  };

  return Array.from(map.values())
    .map((venue) => ({
      ...venue,
      matches: [...venue.matches].sort((a, b) => {
        if (a.time !== b.time) {
          return a.time.localeCompare(b.time);
        }

        return a.order - b.order;
      }),
    }))
    .sort((a, b) => {
      if (order[a.category] !== order[b.category]) {
        return order[a.category] - order[b.category];
      }

      if (a.court !== b.court) {
        return a.court - b.court;
      }

      return a.label.localeCompare(b.label);
    });
}

function safeNumber(value: number) {
  if (Number.isNaN(value)) return 0;

  return Math.max(0, value);
}

function calculateTopScorers(
  records: GoalScorerRecord[]
): TopScorerRow[] {
  const map =
    new Map<string, TopScorerRow>();

  records.forEach((record) => {
    const key =
      `${record.category}_${record.teamId}_${record.playerId}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        playerId: record.playerId,
        playerName: record.playerName,
        teamName: record.teamName,
        category: record.category,
        goals: 0,
      });
    }

    const row = map.get(key)!;

    row.goals += record.goals;
  });

  return Array.from(map.values())
    .sort((a, b) => {
      if (b.goals !== a.goals) {
        return b.goals - a.goals;
      }

      return a.playerName.localeCompare(
        b.playerName
      );
    });
}

function buildTopScorersPrintHtml({
  tournamentName,
  topScorers,
  showWomen,
}: {
  tournamentName: string;
  topScorers: TopScorerRow[];
  showWomen: boolean;
}) {
  const menRows = topScorers.filter(
    (row) => row.category !== "WOMEN"
  );

  const womenRows = topScorers.filter(
    (row) => row.category === "WOMEN"
  );

  function renderRows(rows: TopScorerRow[]) {
    if (rows.length === 0) {
      return `
        <tr>
          <td colspan="4" class="empty">
            Sin goles registrados.
          </td>
        </tr>
      `;
    }

    return rows
      .map(
        (row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(row.playerName)}</td>
            <td>${escapeHtml(row.teamName)}</td>
            <td><strong>${row.goals}</strong></td>
          </tr>
        `
      )
      .join("");
  }

  function renderTable(
    title: string,
    rows: TopScorerRow[]
  ) {
    return `
      <section>
        <h2>${escapeHtml(title)}</h2>

        <table>
          <thead>
            <tr>
              <th>Pos</th>
              <th>Jugador/a</th>
              <th>Equipo</th>
              <th>Goles</th>
            </tr>
          </thead>

          <tbody>
            ${renderRows(rows)}
          </tbody>
        </table>
      </section>
    `;
  }

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />

        <title>Tabla de Goleadores</title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, sans-serif;
            margin: 30px;
            color: #111827;
          }

          .header {
            border-bottom: 3px solid #111827;
            padding-bottom: 14px;
            margin-bottom: 22px;
          }

          h1 {
            margin: 0;
            font-size: 28px;
          }

          h2 {
            margin-top: 28px;
            margin-bottom: 10px;
            font-size: 22px;
          }

          .subtitle {
            margin-top: 8px;
            color: #374151;
            font-size: 14px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }

          th,
          td {
            border: 1px solid #111827;
            padding: 9px;
            text-align: left;
            font-size: 14px;
          }

          th {
            background: #e5e7eb;
          }

          td:first-child,
          td:last-child,
          th:first-child,
          th:last-child {
            text-align: center;
          }

          .empty {
            text-align: center;
            color: #6b7280;
            padding: 16px;
          }

          .footer {
            margin-top: 35px;
            font-size: 12px;
            color: #6b7280;
            border-top: 1px solid #d1d5db;
            padding-top: 10px;
          }

          @media print {
            body {
              margin: 18mm;
            }

            button {
              display: none;
            }
          }
        </style>
      </head>

      <body>
        <div class="header">
          <h1>⚽ Tabla de Goleadores</h1>

          <div class="subtitle">
            Campeonato: <strong>${escapeHtml(tournamentName)}</strong>
          </div>

          <div class="subtitle">
            Generado: ${escapeHtml(new Date().toLocaleString())}
          </div>
        </div>

        ${renderTable("🏆 Goleadores Varones", menRows)}

        ${
          showWomen
            ? renderTable("🏆 Goleadoras Mujeres", womenRows)
            : ""
        }

        <div class="footer">
          TEAMCR7STUDIO — Registro oficial de goleadores.
        </div>

        <script>
          window.onload = function () {
            window.focus();
            setTimeout(function () {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;
}

export default function ResultsView() {
  const { fixture, setFixture } = useFixture();

  const { tournament } = useTournament();

  const { teams } = useTeams();

  const { champions, setChampion } =
    useChampion();

  const { setActiveMatchId } = useOverlay();

  const { setPage } = useApp();

  const { getPlayersByTeam } =
    usePlayers();

  const {
    goalRecords,
    getGoalsByMatch,
    setGoalsForMatch,
  } = useGoals();

  const [goalMatch, setGoalMatch] =
    useState<Match | null>(null);

  const rounds = groupByRound(fixture);

  const topScorers =
    useMemo(
      () => calculateTopScorers(goalRecords),
      [goalRecords]
    );

  const finishedMatches = fixture.filter(
    (match) => match.status === "FINISHED"
  ).length;

  function updateMatchNumber(
    matchId: number,
    field:
      | "scoreA"
      | "scoreB"
      | "penaltyA"
      | "penaltyB",
    value: number
  ) {
    const nextFixture = fixture.map((match) => {
      if (match.id !== matchId) {
        return match;
      }

      return {
        ...match,
        [field]: safeNumber(value),
        status:
          match.status === "FINISHED"
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
    const match = fixture.find(
      (item) => item.id === matchId
    );

    if (!match) return;

    updateMatchNumber(
      matchId,
      field,
      safeNumber(match[field] + amount)
    );
  }

  function saveResult(match: Match) {
    const currentMatch = fixture.find(
      (item) => item.id === match.id
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
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el resultado."
      );
    }
  }

  function saveGoalScorers(
    match: Match,
    records: GoalScorerRecord[]
  ) {
    setGoalsForMatch(
      match.id,
      records
    );

    setGoalMatch(null);
  }

  function printTopScorers() {
    const html = buildTopScorersPrintHtml({
      tournamentName:
        tournament?.name ?? "TEAMCR7STUDIO",
      topScorers,
      showWomen:
        (tournament?.womenCourts ?? 0) > 0,
    });

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=1000,height=800"
      );

    if (!printWindow) {
      alert(
        "No se pudo abrir la ventana de impresión. Revisa si el navegador bloqueó ventanas emergentes."
      );

      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  function exportTopScorersExcel() {
    exportTopScorersToExcel({
      tournamentName:
        tournament?.name ?? "TEAMCR7STUDIO",
      rows: topScorers,
      showWomen:
        (tournament?.womenCourts ?? 0) > 0,
    });
  }

  function clearObs() {
    setActiveMatchId(null);
  }

  function exportPDF() {
    window.print();
  }

  return (
    <div>
      <div style={headerBox}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                marginBottom: 8,
              }}
            >
              📊 Resultados del Campeonato
            </h2>

            <h1
              style={{
                margin: 0,
                fontSize: 34,
              }}
            >
              {tournament?.name ?? "TEAMCR7STUDIO"}
            </h1>

            <p
              style={{
                color: "#94a3b8",
                marginTop: 10,
                marginBottom: 0,
              }}
            >
              Partidos jugados:{" "}
              <strong>
                {finishedMatches} / {fixture.length}
              </strong>
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => setPage("fixture")}
              style={secondaryButton}
            >
              📅 Fixture
            </button>

            <button
              onClick={clearObs}
              style={dangerButton}
            >
              🧹 Limpiar OBS
            </button>

            <button
              onClick={exportPDF}
              style={primaryButton}
            >
              📄 Exportar PDF
            </button>
          </div>
        </div>

        <div style={infoGrid}>
          <InfoBox
            label="Equipos"
            value={teams.length}
          />

          <InfoBox
            label="Partidos"
            value={fixture.length}
          />

          <InfoBox
            label="Jugados"
            value={finishedMatches}
          />

          <InfoBox
            label="Canchas Varones"
            value={tournament?.courts ?? 0}
          />

          <InfoBox
            label="Canchas Mujeres"
            value={tournament?.womenCourts ?? 0}
          />
        </div>

        <div style={championsBox}>
          <ChampionCard
            title="🏆 Campeón Varones"
            value={champions.MEN?.name ?? "Pendiente"}
            color="#93c5fd"
          />

          {(tournament?.womenCourts ?? 0) > 0 && (
            <ChampionCard
              title="🏆 Campeona Mujeres"
              value={champions.WOMEN?.name ?? "Pendiente"}
              color="#f9a8d4"
            />
          )}

          {champions.GENERAL && (
            <ChampionCard
              title="🏆 Campeón General"
              value={champions.GENERAL.name}
              color="#facc15"
            />
          )}
        </div>

        <TopScorersPanel
          topScorers={topScorers}
          showWomen={
            (tournament?.womenCourts ?? 0) > 0
          }
          onPrint={printTopScorers}
          onExportExcel={exportTopScorersExcel}
        />
      </div>

      {fixture.length === 0 && (
        <div style={emptyBox}>
          Todavía no hay partidos generados.
        </div>
      )}

      {rounds.map((roundGroup) => {
        const venues =
          groupByVenue(roundGroup.matches);

        return (
          <section
            key={roundGroup.key}
            style={{
              marginBottom: 50,
              breakInside: "avoid",
            }}
          >
            <h2
              style={{
                color: "#60a5fa",
                fontSize: 26,
                borderBottom: "3px solid #334155",
                paddingBottom: 12,
                marginBottom: 25,
              }}
            >
              {roundGroup.name}
            </h2>

            <div
              style={{
                overflowX: "auto",
                paddingBottom: 12,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${venues.length}, minmax(360px, 1fr))`,
                  minWidth:
                    venues.length > 3
                      ? venues.length * 380
                      : undefined,
                  gap: 22,
                  alignItems: "start",
                }}
              >
                {venues.map((venue) => (
                  <div
                    key={venue.key}
                    style={{
                      background: "#0f172a",
                      border: `1px solid ${getCategoryColor(
                        venue.category
                      )}`,
                      borderRadius: 14,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        textAlign: "center",
                        color: getCategoryColor(
                          venue.category
                        ),
                        fontWeight: "bold",
                        fontSize: 13,
                        marginBottom: 8,
                      }}
                    >
                      {getCategoryLabel(
                        venue.category
                      )}
                    </div>

                    <h3
                      style={{
                        marginTop: 0,
                        marginBottom: 16,
                        color: "#f8fafc",
                        textAlign: "center",
                        fontSize: 22,
                        borderBottom:
                          "1px solid #334155",
                        paddingBottom: 12,
                      }}
                    >
                      🏟 {venue.label}
                    </h3>

                    {venue.matches.map(
                      (match, index) => (
                        <ResultCard
                          key={match.id}
                          match={match}
                          displayLabel={`Partido ${
                            index + 1
                          }`}
                          onScoreChange={
                            updateMatchNumber
                          }
                          onAdjustScore={adjustScore}
                          onSave={saveResult}
                          onObs={() =>
                            setActiveMatchId(match.id)
                          }
                          onGoals={() =>
                            setGoalMatch(match)
                          }
                        />
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {goalMatch && (
        <GoalScorersModal
          key={goalMatch.id}
          match={goalMatch}
          teamAPlayers={
            goalMatch.teamA
              ? getPlayersByTeam(
                  goalMatch.teamA.id
                )
              : []
          }
          teamBPlayers={
            goalMatch.teamB
              ? getPlayersByTeam(
                  goalMatch.teamB.id
                )
              : []
          }
          existingRecords={getGoalsByMatch(
            goalMatch.id
          )}
          onSave={(records) =>
            saveGoalScorers(
              goalMatch,
              records
            )
          }
          onClose={() => setGoalMatch(null)}
        />
      )}
    </div>
  );
}

function ResultCard({
  match,
  displayLabel,
  onScoreChange,
  onAdjustScore,
  onSave,
  onObs,
  onGoals,
}: {
  match: Match;
  displayLabel: string;
  onScoreChange: (
    matchId: number,
    field:
      | "scoreA"
      | "scoreB"
      | "penaltyA"
      | "penaltyB",
    value: number
  ) => void;
  onAdjustScore: (
    matchId: number,
    field: "scoreA" | "scoreB",
    amount: number
  ) => void;
  onSave: (match: Match) => void;
  onObs: () => void;
  onGoals: () => void;
}) {
  const isFinished =
    match.status === "FINISHED";

  const isGroupMatch =
    match.stage === "GROUP";

  const needsPenalties =
    !isGroupMatch &&
    match.scoreA === match.scoreB;

  const courtLabel =
    match.courtLabel ??
    `Cancha ${match.court || 1}`;

  return (
    <div style={resultCard}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          color: "#94a3b8",
          fontSize: 14,
          marginBottom: 14,
        }}
      >
        <strong>{displayLabel}</strong>

        <span>
          🕒 {match.time || "--:--"} | 🏟 {courtLabel}
        </span>
      </div>

      <TeamScoreRow
        team={match.teamA}
        name={
          match.teamA?.name ??
          (
            match.sourceMatchA
              ? `Ganador Partido ${match.sourceMatchA}`
              : "Por definir"
          )
        }
        value={match.scoreA}
        onChange={(value) =>
          onScoreChange(
            match.id,
            "scoreA",
            value
          )
        }
        onMinus={() =>
          onAdjustScore(
            match.id,
            "scoreA",
            -1
          )
        }
        onPlus={() =>
          onAdjustScore(
            match.id,
            "scoreA",
            1
          )
        }
      />

      <div style={vsText}>VS</div>

      <TeamScoreRow
        team={match.teamB}
        name={
          match.teamB?.name ??
          (
            match.sourceMatchB
              ? `Ganador Partido ${match.sourceMatchB}`
              : "Por definir"
          )
        }
        value={match.scoreB}
        onChange={(value) =>
          onScoreChange(
            match.id,
            "scoreB",
            value
          )
        }
        onMinus={() =>
          onAdjustScore(
            match.id,
            "scoreB",
            -1
          )
        }
        onPlus={() =>
          onAdjustScore(
            match.id,
            "scoreB",
            1
          )
        }
      />

      {needsPenalties && (
        <div style={penaltyBox}>
          <strong>Penales</strong>

          <div style={penaltyGrid}>
            <input
              type="number"
              min={0}
              value={match.penaltyA ?? 0}
              onChange={(event) =>
                onScoreChange(
                  match.id,
                  "penaltyA",
                  Number(event.target.value)
                )
              }
              style={scoreInput}
            />

            <span>-</span>

            <input
              type="number"
              min={0}
              value={match.penaltyB ?? 0}
              onChange={(event) =>
                onScoreChange(
                  match.id,
                  "penaltyB",
                  Number(event.target.value)
                )
              }
              style={scoreInput}
            />
          </div>
        </div>
      )}

      {isFinished && (
        <div style={winnerBox}>
          {match.winner
            ? `🏆 Ganador: ${match.winner.name}`
            : "🤝 Empate"}
        </div>
      )}

      <div style={actionsRow}>
        <button
          onClick={onObs}
          style={obsButton}
        >
          📺 OBS
        </button>

        <button
          onClick={onGoals}
          style={goalButton}
        >
          ⚽ Goleadores
        </button>

        <button
          onClick={() => onSave(match)}
          style={saveButton}
        >
          💾 Guardar
        </button>
      </div>
    </div>
  );
}

function TeamScoreRow({
  team,
  name,
  value,
  onChange,
  onMinus,
  onPlus,
}: {
  team: Team | null;
  name: string;
  value: number;
  onChange: (value: number) => void;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div style={teamRow}>
      <div style={teamIdentity}>
        <TeamMiniLogo team={team} />

        <div style={teamName}>
          {name}
        </div>
      </div>

      <div style={scoreControls}>
        <button
          onClick={onMinus}
          style={smallButton}
        >
          -
        </button>

        <input
          type="number"
          min={0}
          value={value}
          onChange={(event) =>
            onChange(
              Number(event.target.value)
            )
          }
          style={scoreInput}
        />

        <button
          onClick={onPlus}
          style={smallButton}
        >
          +
        </button>
      </div>
    </div>
  );
}

function TeamMiniLogo({
  team,
}: {
  team: Team | null;
}) {
  if (!team?.logoDataUrl) {
    return (
      <div style={teamMiniLogoEmpty}>
        ⚽
      </div>
    );
  }

  return (
    <img
      src={team.logoDataUrl}
      alt={team.name}
      style={teamMiniLogo}
    />
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
    match.courtLabel ??
    `Cancha ${match.court || 1}`;

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
              ⚽ Registro de Goleadores
            </h2>

            <p
              style={{
                color: "#94a3b8",
                marginBottom: 0,
              }}
            >
              Partido {match.id} | {courtLabel} | {match.time || "--:--"}
            </p>
          </div>

          <button
            onClick={onClose}
            style={closeButton}
          >
            ✕ Cerrar
          </button>
        </div>

        <div style={scoreSummary}>
          <div style={modalTeamSide}>
            <TeamMiniLogo team={match.teamA} />

            <strong>
              {match.teamA?.name ?? "Equipo A"}
            </strong>
          </div>

          <span>
            {match.scoreA} - {match.scoreB}
          </span>

          <div style={modalTeamSide}>
            <TeamMiniLogo team={match.teamB} />

            <strong>
              {match.teamB?.name ?? "Equipo B"}
            </strong>
          </div>
        </div>

        <div style={goalGrid}>
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

        <div style={modalActions}>
          <button
            onClick={onClose}
            style={secondaryButton}
          >
            Cancelar
          </button>

          <button
            onClick={save}
            style={saveButton}
          >
            💾 Guardar Goleadores
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
        background: "#111827",
        border: `1px solid ${color}`,
        borderRadius: 14,
        padding: 16,
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
          fontWeight: "bold",
        }}
      >
        Goles registrados: {totalGoals} / Marcador: {score}
      </p>

      {players.length === 0 && (
        <div style={emptyBox}>
          Este equipo todavía no tiene jugadores cargados.
        </div>
      )}

      {players.map((player) => (
        <div
          key={player.id}
          style={goalPlayerRow}
        >
          <div>
            <strong>{player.name}</strong>

            <div
              style={{
                color: "#94a3b8",
                fontSize: 13,
              }}
            >
              Doc: {player.documentId || "-"} | Dorsal:{" "}
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
            style={goalInput}
          />
        </div>
      ))}
    </div>
  );
}

function TopScorersPanel({
  topScorers,
  showWomen,
  onPrint,
  onExportExcel,
}: {
  topScorers: TopScorerRow[];
  showWomen: boolean;
  onPrint: () => void;
  onExportExcel: () => void;
}) {
  const menRows = topScorers.filter(
    (row) => row.category !== "WOMEN"
  );

  const womenRows = topScorers.filter(
    (row) => row.category === "WOMEN"
  );

  return (
    <div style={topScorersBox}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 15,
        }}
      >
        <h2
          style={{
            margin: 0,
          }}
        >
          ⚽ Tabla de Goleadores
        </h2>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={onPrint}
            style={printScorersButton}
          >
            📄 Imprimir / PDF Goleadores
          </button>

          <button
            onClick={onExportExcel}
            style={excelScorersButton}
          >
            📊 Exportar Excel
          </button>
        </div>
      </div>

      <div style={topScorersGrid}>
        <TopScorersTable
          title={getGoalCategoryTitle("MEN")}
          rows={menRows}
          color="#93c5fd"
        />

        {showWomen && (
          <TopScorersTable
            title={getGoalCategoryTitle("WOMEN")}
            rows={womenRows}
            color="#f9a8d4"
          />
        )}
      </div>
    </div>
  );
}

function TopScorersTable({
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
        background: "#0f172a",
        border: `1px solid ${color}`,
        borderRadius: 12,
        padding: 16,
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
        <p style={{ color: "#94a3b8" }}>
          Sin goles registrados.
        </p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Pos</th>
              <th style={thStyle}>Jugador</th>
              <th style={thStyle}>Equipo</th>
              <th style={thStyle}>Goles</th>
            </tr>
          </thead>

          <tbody>
            {rows.slice(0, 10).map((row, index) => (
              <tr key={row.key}>
                <td style={tdStyle}>
                  {index + 1}
                </td>

                <td style={tdStyle}>
                  {row.playerName}
                </td>

                <td style={tdStyle}>
                  {row.teamName}
                </td>

                <td style={tdStyle}>
                  <strong>{row.goals}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div style={infoBox}>
      <div
        style={{
          color: "#94a3b8",
          fontSize: 13,
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 22,
          fontWeight: "bold",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ChampionCard({
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
          fontSize: 22,
          fontWeight: "bold",
        }}
      >
        {value}
      </div>
    </div>
  );
}

const headerBox: CSSProperties = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 25,
  marginBottom: 30,
};

const infoGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 15,
  marginTop: 25,
};

const infoBox: CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: 14,
};

const championsBox: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 15,
  marginTop: 20,
};

const topScorersBox: CSSProperties = {
  background: "#111827",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 18,
  marginTop: 22,
};

const topScorersGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 15,
};

const printScorersButton: CSSProperties = {
  padding: "12px 18px",
  background: "#f97316",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const excelScorersButton: CSSProperties = {
  padding: "12px 18px",
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const emptyBox: CSSProperties = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 25,
  color: "#94a3b8",
};

const resultCard: CSSProperties = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 16,
  marginBottom: 18,
};

const teamRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 130px",
  gap: 12,
  alignItems: "center",
  marginTop: 10,
};

const teamIdentity: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  minWidth: 0,
};

const teamMiniLogo: CSSProperties = {
  width: 46,
  height: 46,
  objectFit: "contain",
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: 4,
  flexShrink: 0,
};

const teamMiniLogoEmpty: CSSProperties = {
  width: 46,
  height: 46,
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const teamName: CSSProperties = {
  fontSize: 17,
  fontWeight: "bold",
  wordBreak: "break-word",
};

const scoreControls: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "32px 60px 32px",
  gap: 6,
  alignItems: "center",
};

const scoreInput: CSSProperties = {
  width: "100%",
  padding: "8px 4px",
  textAlign: "center",
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "white",
  fontWeight: "bold",
};

const smallButton: CSSProperties = {
  padding: "8px 0",
  border: "none",
  borderRadius: 8,
  background: "#334155",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold",
};

const vsText: CSSProperties = {
  textAlign: "center",
  color: "#60a5fa",
  fontWeight: "bold",
  marginTop: 10,
};

const penaltyBox: CSSProperties = {
  marginTop: 15,
  background: "#713f12",
  color: "#fef3c7",
  padding: 12,
  borderRadius: 10,
  textAlign: "center",
};

const penaltyGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 20px 1fr",
  gap: 8,
  alignItems: "center",
  marginTop: 10,
};

const winnerBox: CSSProperties = {
  marginTop: 15,
  background: "#064e3b",
  color: "#bbf7d0",
  padding: 10,
  borderRadius: 10,
  textAlign: "center",
  fontWeight: "bold",
};

const actionsRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 10,
  marginTop: 15,
};

const saveButton: CSSProperties = {
  padding: "12px",
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const obsButton: CSSProperties = {
  padding: "12px",
  background: "#7c3aed",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const goalButton: CSSProperties = {
  padding: "12px",
  background: "#f97316",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const primaryButton: CSSProperties = {
  padding: "12px 18px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const secondaryButton: CSSProperties = {
  padding: "12px 18px",
  background: "#334155",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const dangerButton: CSSProperties = {
  padding: "12px 18px",
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
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
  width: "min(1100px, 95vw)",
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

const scoreSummary: CSSProperties = {
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

const modalTeamSide: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 10,
};

const goalGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 18,
};

const modalActions: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  marginTop: 20,
  flexWrap: "wrap",
};

const goalPlayerRow: CSSProperties = {
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

const goalInput: CSSProperties = {
  width: "100%",
  padding: 10,
  textAlign: "center",
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#020617",
  color: "white",
  fontWeight: "bold",
  fontSize: 18,
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: CSSProperties = {
  background: "#111827",
  border: "1px solid #334155",
  padding: 9,
  textAlign: "left",
  color: "#e5e7eb",
};

const tdStyle: CSSProperties = {
  border: "1px solid #334155",
  padding: 9,
};