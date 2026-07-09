import type { ReactNode } from "react";

import {
  useApp,
  type Page,
} from "../../store/appStore";

import { useTournament } from "../../store/tournamentStore";
import { useChampion } from "../../store/championStore";
import { useFixture } from "../../store/fixtureStore";

interface Props {
  title: string;
  children: ReactNode;
}

const menuItems: {
  page: Page;
  label: string;
  icon: string;
}[] = [
  {
    page: "dashboard",
    label: "Inicio",
    icon: "🏠",
  },
  {
    page: "tournament",
    label: "Campeonato",
    icon: "🏆",
  },
  {
    page: "teams",
    label: "Equipos",
    icon: "👥",
  },
  {
    page: "fixture",
    label: "Fixture",
    icon: "📅",
  },
  {
    page: "results",
    label: "Resultados",
    icon: "📊",
  },
  {
    page: "overlay",
    label: "Overlay OBS",
    icon: "📺",
  },
  {
    page: "settings",
    label: "Configuración",
    icon: "⚙",
  },
];

export default function MainLayout({
  title,
  children,
}: Props) {
  const { page, setPage } = useApp();

  const { tournament } = useTournament();

  const { champion } = useChampion();

  const { fixture } = useFixture();

  const playingMatch = fixture.find(
    (match) => match.status === "PLAYING"
  );

  const pendingMatches = fixture.filter(
    (match) => match.status !== "FINISHED"
  ).length;

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#0f172a",
      }}
    >
      <aside
        style={{
          width: 260,
          background: "#020617",
          borderRight: "1px solid #1e293b",
          padding: 20,
          color: "white",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            marginBottom: 30,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              color: "#60a5fa",
            }}
          >
            TEAMCR7STUDIO
          </h2>

          <p
            style={{
              marginTop: 6,
              color: "#94a3b8",
              fontSize: 13,
            }}
          >
            Tournament Manager
          </p>
        </div>

        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {menuItems.map((item) => {
            const active =
              page === item.page;

            return (
              <button
                key={item.page}
                onClick={() => setPage(item.page)}
                style={{
                  width: "100%",
                  padding: "13px 14px",
                  background: active
                    ? "#2563eb"
                    : "#111827",
                  border: active
                    ? "1px solid #60a5fa"
                    : "1px solid #1f2937",
                  color: "white",
                  borderRadius: 10,
                  cursor: "pointer",
                  textAlign: "left",
                  fontWeight: active
                    ? "bold"
                    : "normal",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                  }}
                >
                  {item.icon}
                </span>

                <span>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        <div
          style={{
            marginTop: "auto",
            paddingTop: 20,
            borderTop: "1px solid #1e293b",
            color: "#64748b",
            fontSize: 12,
          }}
        >
          <div>
            Versión: 0.3
          </div>

          <div>
            Rama: motor-v2
          </div>
        </div>
      </aside>

      <main
        style={{
          flex: 1,
          padding: 40,
          color: "white",
          overflowX: "hidden",
        }}
      >
        <header
          style={{
            marginBottom: 30,
          }}
        >
          <div
            style={{
              background: "#020617",
              border: "1px solid #1e293b",
              borderRadius: 14,
              padding: "16px 20px",
              marginBottom: 22,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: 13,
                  marginBottom: 4,
                }}
              >
                Campeonato activo
              </div>

              <div
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                }}
              >
                {tournament?.name ?? "Sin campeonato"}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {playingMatch && (
                <Badge
                  color="#22c55e"
                  text={`🟢 En juego: Partido ${playingMatch.id}`}
                />
              )}

              {!playingMatch && pendingMatches > 0 && (
                <Badge
                  color="#facc15"
                  text={`⏳ Pendientes: ${pendingMatches}`}
                />
              )}

              {champion && (
                <Badge
                  color="#facc15"
                  text={`🏆 Campeón: ${champion.name}`}
                />
              )}

              <button
                onClick={() => setPage("overlay")}
                style={{
                  padding: "10px 14px",
                  background: "#7c3aed",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                📺 Overlay
              </button>
            </div>
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 34,
              borderBottom: "1px solid #1e293b",
              paddingBottom: 20,
            }}
          >
            {title}
          </h1>
        </header>

        {children}
      </main>
    </div>
  );
}

function Badge({
  color,
  text,
}: {
  color: string;
  text: string;
}) {
  return (
    <span
      style={{
        background: color,
        color: "#111827",
        padding: "8px 12px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: "bold",
      }}
    >
      {text}
    </span>
  );
}