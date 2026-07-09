import { useFixture } from "../../store/fixtureStore";
import { useTournament } from "../../store/tournamentStore";
import { useTeams } from "../../store/teamStore";
import { useApp } from "../../store/appStore";

import { groupMatches } from "../../utils/groupMatches";

import MatchCard from "../../components/match/MatchCard";

export default function FixtureView() {
  const { fixture } = useFixture();

  const { tournament } = useTournament();

  const { teams } = useTeams();

  const { setPage } = useApp();

  const rounds = groupMatches(fixture);

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

      {rounds.length === 0 && (
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

      {rounds.map((round) => (
        <div
          key={round.id}
          style={{
            marginBottom: 40,
            breakInside: "avoid",
          }}
        >
          <h3
            style={{
              borderBottom: "2px solid #334155",
              paddingBottom: 10,
              marginBottom: 20,
              color: "#60a5fa",
            }}
          >
            {round.name}
          </h3>

          {round.matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
            />
          ))}
        </div>
      ))}
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