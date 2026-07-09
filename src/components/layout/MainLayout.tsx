import type {
  CSSProperties,
  ReactNode,
} from "react";

import {
  useApp,
  type Page,
} from "../../store/appStore";

interface Props {
  children: ReactNode;
}

interface MenuItem {
  page: Page;
  label: string;
  icon: string;
}

const menuItems: MenuItem[] = [
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
    page: "players",
    label: "Jugadores",
    icon: "📝",
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
    icon: "⚙️",
  },
];

export default function MainLayout({
  children,
}: Props) {
  const {
    page,
    setPage,
  } = useApp();

  return (
    <div style={layoutStyle}>
      <aside style={sidebarStyle}>
        <div style={brandBox}>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
            }}
          >
            TEAMCR7
          </h2>

          <p
            style={{
              margin: 0,
              marginTop: 4,
              color: "#94a3b8",
              fontSize: 13,
            }}
          >
            STUDIO
          </p>
        </div>

        <nav style={navStyle}>
          {menuItems.map((item) => {
            const active =
              page === item.page;

            return (
              <button
                key={item.page}
                onClick={() =>
                  setPage(item.page)
                }
                style={{
                  ...menuButton,
                  background: active
                    ? "#2563eb"
                    : "transparent",
                  color: active
                    ? "white"
                    : "#cbd5e1",
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main style={contentStyle}>
        {children}
      </main>
    </div>
  );
}

const layoutStyle: CSSProperties = {
  display: "flex",
  minHeight: "100vh",
  background: "#020617",
  color: "white",
};

const sidebarStyle: CSSProperties = {
  width: 260,
  minHeight: "100vh",
  background: "#020617",
  borderRight: "1px solid #1e293b",
  padding: 20,
  boxSizing: "border-box",
  position: "sticky",
  top: 0,
  alignSelf: "flex-start",
};

const brandBox: CSSProperties = {
  padding: 18,
  borderRadius: 14,
  background: "#0f172a",
  border: "1px solid #1e293b",
  marginBottom: 25,
};

const navStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const menuButton: CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "13px 14px",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
  textAlign: "left",
};

const contentStyle: CSSProperties = {
  flex: 1,
  padding: 30,
  overflowX: "auto",
};