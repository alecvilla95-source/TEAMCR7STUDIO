import { useApp } from "../../store/appStore";

interface Props {
  title: string;
  children: React.ReactNode;
}

export default function MainLayout({
  title,
  children,
}: Props) {
  const { setPage } = useApp();

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
          width: 240,
          background: "#111827",
          padding: 20,
          color: "white",
        }}
      >
        <h2
          style={{
            marginBottom: 30,
          }}
        >
          TEAMCR7STUDIO
        </h2>

        <button style={buttonStyle} onClick={() => setPage("dashboard")}>
          🏠 Inicio
        </button>

        <button style={buttonStyle} onClick={() => setPage("tournament")}>
          🏆 Campeonato
        </button>

        <button style={buttonStyle} onClick={() => setPage("teams")}>
  👥 Equipos
</button>

<button style={buttonStyle} onClick={() => setPage("fixture")}>
  🏟 Fixture
</button>

<button
  style={buttonStyle}
  onClick={() => setPage("results")}
>
  📊 Resultados
</button>

<button style={buttonStyle} onClick={() => setPage("overlay")}>
  📺 Overlay
</button>

<button style={buttonStyle} onClick={() => setPage("settings")}>
  ⚙ Configuración
</button>
      </aside>

      <main
        style={{
          flex: 1,
          padding: 40,
          color: "white",
        }}
      >
        <h1
          style={{
            marginBottom: 25,
          }}
        >
          {title}
        </h1>

        {children}
      </main>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  marginBottom: "10px",
  background: "#1f2937",
  border: "none",
  color: "white",
  borderRadius: "8px",
  cursor: "pointer",
  textAlign: "left",
};