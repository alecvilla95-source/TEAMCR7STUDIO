import {
  type CSSProperties,
} from "react";

import type { Match } from "../../types/match";
import type { TeamCategory } from "../../types/team";

import { useFixture } from "../../store/fixtureStore";
import { useTournament } from "../../store/tournamentStore";
import { useTeams } from "../../store/teamStore";
import { useChampion } from "../../store/championStore";
import { useOverlay } from "../../store/overlayStore";
import { useApp } from "../../store/appStore";

import { applyResult } from "../../engine/resultEngine";

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

export default function ResultsView() {
  const { fixture, setFixture } = useFixture();

  const { tournament } = useTournament();

  const { teams } = useTeams();

  const { champions, setChampion } =
    useChampion();

  const { setActiveMatchId } = useOverlay();

  const { setPage } = useApp();

  const rounds = groupByRound(fixture);

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
                  gridTemplateColumns: `repeat(${venues.length}, minmax(340px, 1fr))`,
                  minWidth:
                    venues.length > 3
                      ? venues.length * 360
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
          📺 MOSTRAR EN OBS
        </button>

        <button
          onClick={() => onSave(match)}
          style={saveButton}
        >
          💾 GUARDAR
        </button>
      </div>
    </div>
  );
}

function TeamScoreRow({
  name,
  value,
  onChange,
  onMinus,
  onPlus,
}: {
  name: string;
  value: number;
  onChange: (value: number) => void;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div style={teamRow}>
      <div style={teamName}>
        {name}
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

const teamName: CSSProperties = {
  fontSize: 17,
  fontWeight: "bold",
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
  gridTemplateColumns: "1fr 1fr",
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