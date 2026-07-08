function Card({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div
      style={{
        background: "#1e293b",
        borderRadius: 12,
        padding: 20,
        boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
      }}
    >
      <h3
        style={{
          fontSize: 16,
          marginBottom: 10,
        }}
      >
        {titulo}
      </h3>

      <div
        style={{
          fontSize: 34,
          fontWeight: "bold",
        }}
      >
        {valor}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div>
      <h2>Bienvenido a TEAMCR7STUDIO</h2>

      <p
        style={{
          marginTop: 15,
          color: "#cbd5e1",
        }}
      >
        Administrador Profesional de Campeonatos Relámpago
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 20,
          marginTop: 40,
        }}
      >
        <Card titulo="🏆 Campeonatos" valor="0" />
        <Card titulo="👥 Equipos" valor="0" />
        <Card titulo="🏟 Partidos" valor="0" />
        <Card titulo="📺 Overlay" valor="Activo" />
      </div>
    </div>
  );
}