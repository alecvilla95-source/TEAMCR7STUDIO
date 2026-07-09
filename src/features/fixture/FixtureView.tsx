import {
  type CSSProperties,
} from "react";

import MatchCard from "../../components/match/MatchCard";

import type { Match } from "../../types/match";
import type { TeamCategory } from "../../types/team";

import { useFixture } from "../../store/fixtureStore";
import { useTournament } from "../../store/tournamentStore";
import { useTeams } from "../../store/teamStore";
import { useApp } from "../../store/appStore";

import { getRoundName } from "../../utils/tournamentUtils";

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

function getSmartRoundName(
  matches: Match[],
  round: number
) {
  const first = matches[0];

  if (first?.groupName) {
    return first.groupName;
  }

  const hasFinalLabel = matches.some((match) =>
    (match.courtLabel ?? "")
      .toUpperCase()
      .includes("FINAL")
  );

  if (hasFinalLabel) {
    return "FINALES GENERALES";
  }

  const hasCourtLabels = matches.some(
    (match) => match.courtLabel
  );

  if (hasCourtLabels) {
    return `RONDA ${round}`;
  }

  return getRoundName(matches.length * 2);
}

function groupByRoundOrGroup(
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
        name: getSmartRoundName(
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

  const categoryOrder: Record<
    VenueCategory,
    number
  > = {
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
      if (
        categoryOrder[a.category] !==
        categoryOrder[b.category]
      ) {
        return (
          categoryOrder[a.category] -
          categoryOrder[b.category]
        );
      }

      if (a.court !== b.court) {
        return a.court - b.court;
      }

      return a.label.localeCompare(b.label);
    });
}

export default function FixtureView() {
  const { fixture } = useFixture();

  const { tournament } = useTournament();

  const { teams } = useTeams();

  const { setPage } = useApp();

  const rounds =
    groupByRoundOrGroup(fixture);

  const finishedMatches = fixture.filter(
    (match) => match.status === "FINISHED"
  ).length;

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
              📅 Fixture del Campeonato
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
              Modalidad:{" "}
              <strong>
                {tournament?.mode === "GROUPS"
                  ? "Fase de Grupos"
                  : "Eliminación Directa"}
              </strong>
              {" | "}
              Sistema:{" "}
              <strong>
                {tournament?.courtMode === "SEPARATE_BRACKETS"
                  ? "Llaves separadas por cancha"
                  : "Reparto por horario"}
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
              onClick={() => setPage("results")}
              style={secondaryButton}
            >
              📊 Resultados
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

          <InfoBox
            label="Inicio"
            value={tournament?.startTime ?? "--:--"}
          />

          <InfoBox
            label="Duración"
            value={`${tournament?.duration ?? 0} min`}
          />
        </div>
      </div>

      {fixture.length === 0 && (
        <div style={emptyBox}>
          Todavía no hay fixture generado.
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
                  gridTemplateColumns: `repeat(${venues.length}, minmax(320px, 1fr))`,
                  minWidth:
                    venues.length > 3
                      ? venues.length * 340
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

                    <h4
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
                    </h4>

                    {venue.matches.map(
                      (match, index) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          displayLabel={`Partido ${
                            index + 1
                          }`}
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

const emptyBox: CSSProperties = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 25,
  color: "#94a3b8",
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