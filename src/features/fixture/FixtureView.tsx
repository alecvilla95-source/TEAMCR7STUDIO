import MatchCard from "../../components/match/MatchCard";

import type { Match } from "../../types/match";

import { useFixture } from "../../store/fixtureStore";
import { useTournament } from "../../store/tournamentStore";
import { useTeams } from "../../store/teamStore";
import { useApp } from "../../store/appStore";

import { getRoundName } from "../../utils/tournamentUtils";

interface RoundGroup {
  key: string;
  round: number;
  name: string;
  matches: Match[];
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

        return a.order - b.order;
      });

      const first = sorted[0];

      return {
        key,
        round: first?.round ?? 1,
        name:
          first?.groupName ??
          getRoundName(sorted.length * 2),
        matches: sorted,
      };
    })
    .sort((a, b) => a.round - b.round);
}

function groupByCourt(matches: Match[]) {
  const map = new Map<number, Match[]>();

  matches.forEach((match) => {
    const court = match.court || 1;

    if (!map.has(court)) {
      map.set(court, []);
    }

    map.get(court)!.push(match);
  });

  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([court, list]) => ({
      court,
      matches: [...list].sort((a, b) => {
        if (a.time !== b.time) {
          return a.time.localeCompare(b.time);
        }

        return a.order - b.order;
      }),
    }));
}

export default function FixtureView() {
  const { fixture } = useFixture();

  const { tournament } = useTournament();

  const { teams } = useTeams();

  const { setPage } = useApp();

  const rounds = groupByRoundOrGroup(fixture);

  const finishedMatches = fixture.filter(
    (match) => match.status === "FINISHED"
  ).length;

  function exportPDF() {
    window.print();
  }

  return (
    <div>
      <div
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 14,
          padding: 25,
          marginBottom: 30,
        }}
      >
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 15,
            marginTop: 25,
          }}
        >
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
            label="Canchas"
            value={tournament?.courts ?? 0}
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
        <div
          style={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 14,
            padding: 25,
            color: "#94a3b8",
          }}
        >
          Todavía no hay fixture generado.
        </div>
      )}

      {rounds.map((roundGroup) => {
        const courts = groupByCourt(
          roundGroup.matches
        );

        return (
          <div
            key={roundGroup.key}
            style={{
              marginBottom: 45,
              breakInside: "avoid",
            }}
          >
            <h3
              style={{
                borderBottom: "2px solid #334155",
                paddingBottom: 10,
                marginBottom: 20,
                color: "#60a5fa",
                fontSize: 24,
              }}
            >
              {roundGroup.name}
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${courts.length}, minmax(330px, 1fr))`,
                gap: 22,
                alignItems: "start",
                overflowX: "auto",
              }}
            >
              {courts.map((courtGroup) => (
                <div
                  key={courtGroup.court}
                  style={{
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: 14,
                    padding: 16,
                  }}
                >
                  <h4
                    style={{
                      marginTop: 0,
                      marginBottom: 16,
                      color: "#f8fafc",
                      textAlign: "center",
                      fontSize: 22,
                      borderBottom: "1px solid #334155",
                      paddingBottom: 12,
                    }}
                  >
                    🏟 Cancha {courtGroup.court}
                  </h4>

                  {courtGroup.matches.map((match, index) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      displayLabel={`Partido ${index + 1}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
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
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #334155",
        borderRadius: 10,
        padding: 14,
      }}
    >
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

const primaryButton: React.CSSProperties = {
  padding: "12px 18px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const secondaryButton: React.CSSProperties = {
  padding: "12px 18px",
  background: "#334155",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};