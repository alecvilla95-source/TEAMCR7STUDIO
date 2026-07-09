import { useRef } from "react";

import {
  clearAllData,
  loadData,
  saveData,
} from "../../services/storageService";

export default function SettingsView() {
  const fileInputRef =
    useRef<HTMLInputElement>(null);

  function exportData() {
    const data = {
      tournament: loadData("tournament", null),
      teams: loadData("teams", []),
      fixture: loadData("fixture", []),
      champion: loadData("champion", null),
      activeMatchId: loadData("activeMatchId", null),
      timer: loadData("timer", null),
      exportedAt: new Date().toISOString(),
      app: "TEAMCR7STUDIO",
      version: "0.1",
    };

    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      {
        type: "application/json",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `TEAMCR7STUDIO_BACKUP_${Date.now()}.json`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  async function importData(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    try {
      const text =
        await file.text();

      const data =
        JSON.parse(text);

      if (data.app !== "TEAMCR7STUDIO") {
        alert("Este archivo no pertenece a TEAMCR7STUDIO.");
        return;
      }

      saveData(
        "tournament",
        data.tournament ?? null
      );

      saveData(
        "teams",
        data.teams ?? []
      );

      saveData(
        "fixture",
        data.fixture ?? []
      );

      saveData(
        "champion",
        data.champion ?? null
      );

      saveData(
        "activeMatchId",
        data.activeMatchId ?? null
      );

      saveData(
        "timer",
        data.timer ?? null
      );

      alert("Campeonato restaurado correctamente.");

      window.location.reload();
    } catch {
      alert("No se pudo restaurar el archivo.");
    }
  }

  function clearData() {
    const confirmClear =
      confirm(
        "¿Seguro que desea borrar todos los datos guardados?"
      );

    if (!confirmClear) return;

    clearAllData();

    window.location.reload();
  }

  return (
    <div>
      <h2>Configuración</h2>

      <p
        style={{
          color: "#94a3b8",
          marginBottom: 30,
        }}
      >
        Administra los datos guardados de TEAMCR7STUDIO.
      </p>

      <div
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 14,
          padding: 25,
          marginBottom: 25,
        }}
      >
        <h3>
          💾 Respaldo del campeonato
        </h3>

        <p
          style={{
            color: "#94a3b8",
          }}
        >
          Exporta todo el campeonato actual en un archivo JSON.
          Podrás restaurarlo más adelante.
        </p>

        <button
          onClick={exportData}
          style={primaryButton}
        >
          💾 EXPORTAR CAMPEONATO
        </button>
      </div>

      <div
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 14,
          padding: 25,
          marginBottom: 25,
        }}
      >
        <h3>
          📂 Restaurar campeonato
        </h3>

        <p
          style={{
            color: "#94a3b8",
          }}
        >
          Importa un archivo de respaldo generado por TEAMCR7STUDIO.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{
            display: "none",
          }}
          onChange={importData}
        />

        <button
          onClick={() =>
            fileInputRef.current?.click()
          }
          style={secondaryButton}
        >
          📂 IMPORTAR RESPALDO
        </button>
      </div>

      <div
        style={{
          background: "#1e293b",
          border: "1px solid #7f1d1d",
          borderRadius: 14,
          padding: 25,
        }}
      >
        <h3>
          🗑 Borrar datos
        </h3>

        <p
          style={{
            color: "#fca5a5",
          }}
        >
          Esto eliminará campeonato, equipos, fixture, resultados,
          campeón, OBS y cronómetro guardados.
        </p>

        <button
          onClick={clearData}
          style={dangerButton}
        >
          🗑 BORRAR TODO
        </button>
      </div>
    </div>
  );
}

const primaryButton: React.CSSProperties = {
  padding: "12px 20px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const secondaryButton: React.CSSProperties = {
  padding: "12px 20px",
  background: "#334155",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const dangerButton: React.CSSProperties = {
  padding: "12px 20px",
  background: "#991b1b",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};