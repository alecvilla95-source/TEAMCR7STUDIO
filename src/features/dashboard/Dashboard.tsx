import { useApp } from "../../store/appStore";
import { useTournament } from "../../store/tournamentStore";
import { useTeams } from "../../store/teamStore";
import { useFixture } from "../../store/fixtureStore";
import { useChampion } from "../../store/championStore";

import { clearAllData } from "../../services/storageService";

export default function Dashboard() {
  const { setPage } = useApp();

  const { tournament } = useTournament();

  const { teams } = useTeams();

  const { fixture } = useFixture();

  const { champion } = useChampion();

  const totalMatches = fixture.length;

  const finishedMatches = fixture.filter(
    (match) => match.status === "FINISHED"
  ).length;

  const pendingMatches =
    totalMatches - finishedMatches;

  const playingMatch = fixture.find(
    (match) => match.status === "PLAYING"
  );

  const nextMatch = fixture.find(
    (match) =>
      match.status !== "FINISHED" &&
      match.teamA &&
      match.teamB
  );

  function resetTournament() {
    const confirmReset = confirm(
      "¿Seguro que desea borrar el campeonato guardado?"
    );

    if (!confirmReset) return;

    clearAllData();

    window.location.reload();
  }

  return (
    <div>
      <h2>Bienvenido a TEAMCR7STUDIO</h2>

      <p
        style={{
          color: "#cbd5e1",
          fontSize: 18,
          marginBottom: 30,
        }}
      >
        Administrador Profesional de Campeonatos Relámpago
      </p>

      {tournament ? (
        <div
          style={{
            background: "#1e293b",
            padding: 25,
            borderRadius: 14,
            marginBottom: 30,
            border: "1px solid #334155",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: 10,
            }}
          >
            🏆 {tournament.name}
          </h2>

          <p
            style={{
              color: "#94a3b8",
              marginBottom: 0,
            }}
          >
            Modalidad:{" "}
            <strong>
              {tournament.mode === "ELIMINATION"
                ? "Eliminación Directa"
                : "Fase de Grupos"}
            </strong>
          </p>
        </div>
      ) : (
        <div
          style={{
            background: "#1e293b",
            padding: 25,
            borderRadius: 14,
            marginBottom: 30,
            border: "1px solid #334155",
          }}
        >
          <h2
            style={{
              marginTop: 0,
            }}
          >
            No hay campeonato activo
          </h2>

          <p
            style={{
              color: "#94a3b8",
            }}
          >
            Crea un campeonato para comenzar.
          </p>

          <button
            onClick={() => setPage("tournament")}
            style={primaryButton}
          >
            🏆 CREAR CAMPEONATO
          </button>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 20,
          marginBottom: 30,
        }}
      >
        <StatCard
          icon="🏆"
          title="Campeonatos"
          value={tournament ? 1 : 0}
        />

        <StatCard
          icon="👥"
          title="Equipos"
          value={teams.length}
        />

        <StatCard
          icon="⚽"
          title="Partidos"
          value={totalMatches}
        />

        <StatCard
          icon="✅"
          title="Jugados"
          value={finishedMatches}
        />

        <StatCard
          icon="⏳"
          title="Pendientes"
          value={pendingMatches}
        />

        <StatCard
          icon="🏟"
          title="Canchas"
          value={tournament?.courts ?? 0}
        />
      </div>

      {playingMatch && (
        <div
          style={{
            background: "#052e16",
            border: "1px solid #22c55e",
            padding: 20,
            borderRadius: 14,
            marginBottom: 30,
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: "#86efac",
            }}
          >
            🟢 Partido en juego
          </h3>

          <p
            style={{
              fontSize: 20,
              fontWeight: "bold",
            }}
          >
            {playingMatch.teamA?.name} VS {playingMatch.teamB?.name}
          </p>

          <p
            style={{
              color: "#bbf7d0",
            }}
          >
            🕒 {playingMatch.time} | 🏟 Cancha {playingMatch.court}
          </p>
        </div>
      )}

      {!playingMatch && nextMatch && (
        <div
          style={{
            background: "#0f172a",
            border: "1px solid #2563eb",
            padding: 20,
            borderRadius: 14,
            marginBottom: 30,
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: "#60a5fa",
            }}
          >
            🔜 Próximo partido
          </h3>

          <p
            style={{
              fontSize: 20,
              fontWeight: "bold",
            }}
          >
            {nextMatch.teamA?.name} VS {nextMatch.teamB?.name}
          </p>

          <p
            style={{
              color: "#94a3b8",
            }}
          >
            🕒 {nextMatch.time} | 🏟 Cancha {nextMatch.court}
          </p>
        </div>
      )}

      {champion && (
        <div
          style={{
            background: "#713f12",
            border: "1px solid #facc15",
            color: "#fef3c7",
            padding: 25,
            borderRadius: 14,
            marginBottom: 30,
            textAlign: "center",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              fontSize: 30,
            }}
          >
            🏆 CAMPEÓN
          </h2>

          <div
            style={{
              fontSize: 34,
              fontWeight: "bold",
            }}
          >
            {champion.name}
          </div>
        </div>
      )}

      <div
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          padding: 25,
          borderRadius: 14,
        }}
      >
        <h3
          style={{
            marginTop: 0,
            marginBottom: 20,
          }}
        >
          Accesos rápidos
        </h3>

        <div
          style={{
            display: "flex",
            gap: 15,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => setPage("fixture")}
            style={primaryButton}
          >
            📅 FIXTURE
          </button>

          <button
            onClick={() => setPage("results")}
            style={secondaryButton}
          >
            📊 RESULTADOS
          </button>

          <button
            onClick={() => setPage("overlay")}
            style={purpleButton}
          >
            📺 OVERLAY OBS
          </button>

          <button
            onClick={() => setPage("settings")}
            style={secondaryButton}
          >
            ⚙ CONFIGURACIÓN
          </button>

          <button
            onClick={() => setPage("tournament")}
            style={secondaryButton}
          >
            🏆 NUEVO CAMPEONATO
          </button>

          <button
            onClick={resetTournament}
            style={dangerButton}
          >
            🗑 BORRAR DATOS
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
}: {
  icon: string;
  title: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        background: "#1e293b",
        padding: 22,
        borderRadius: 14,
        border: "1px solid #334155",
      }}
    >
      <div
        style={{
          fontSize: 26,
          marginBottom: 10,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          color: "#94a3b8",
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 34,
          fontWeight: "bold",
        }}
      >
        {value}
      </div>
    </div>
  );
}

const primaryButton: React.CSSProperties = {
  padding: "14px 22px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const secondaryButton: React.CSSProperties = {
  padding: "14px 22px",
  background: "#1e293b",
  color: "white",
  border: "1px solid #334155",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const purpleButton: React.CSSProperties = {
  padding: "14px 22px",
  background: "#7c3aed",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const dangerButton: React.CSSProperties = {
  padding: "14px 22px",
  background: "#991b1b",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};