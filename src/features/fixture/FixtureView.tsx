import { useFixture } from "../../store/fixtureStore";
import { useApp } from "../../store/appStore";
import { groupMatches } from "../../utils/groupMatches";

import MatchCard from "../../components/match/MatchCard";

export default function FixtureView() {
  const { fixture } = useFixture();

  const { setPage } = useApp();

  const rounds = groupMatches(fixture);

  function exportPDF() {
    window.print();
  }

  return (
    <div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 25,
          gap: 15,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              marginBottom: 8,
            }}
          >
            Fixture
          </h2>

          <p
            style={{
              color: "#94a3b8",
              margin: 0,
            }}
          >
            Partidos generados:{" "}
            <strong>{fixture.length}</strong>
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

      {rounds.map((round) => (

        <div
          key={round.id}
          style={{
            marginBottom: 40,
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
  background: "#1e293b",
  color: "white",
  border: "1px solid #334155",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};