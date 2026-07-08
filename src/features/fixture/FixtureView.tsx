import { useFixture } from "../../store/fixtureStore";
import { groupMatches } from "../../utils/groupMatches";

import MatchCard from "../../components/match/MatchCard";

export default function FixtureView() {
  const { fixture } = useFixture();

  const rounds = groupMatches(fixture);

  return (
    <div>

      <h2>Fixture</h2>

      <p
        style={{
          color: "#94a3b8",
          marginBottom: 25,
        }}
      >
        Partidos generados:{" "}
        <strong>{fixture.length}</strong>
      </p>

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