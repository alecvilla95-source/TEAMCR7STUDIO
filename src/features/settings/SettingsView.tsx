import {
  useRef,
  useState,
  type CSSProperties,
} from "react";

const STORAGE_PREFIX = "teamcr7studio_";

interface BackupFile {
  app: "TEAMCR7STUDIO";
  version: number;
  exportedAt: string;
  data: Record<string, string>;
}

function getAllStoredData() {
  const data: Record<string, string> = {};

  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith(STORAGE_PREFIX)) {
      const value = localStorage.getItem(key);

      if (value !== null) {
        data[key] = value;
      }
    }
  });

  return data;
}

function downloadJson(
  filename: string,
  data: unknown
) {
  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    {
      type: "application/json",
    }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download = filename;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function clearTeamCR7Data() {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith(STORAGE_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
}

export default function SettingsView() {
  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [lastAction, setLastAction] =
    useState("");

  function exportBackup() {
    const backup: BackupFile = {
      app: "TEAMCR7STUDIO",
      version: 2,
      exportedAt: new Date().toISOString(),
      data: getAllStoredData(),
    };

    const date = new Date()
      .toISOString()
      .slice(0, 10);

    downloadJson(
      `TEAMCR7STUDIO_BACKUP_${date}.json`,
      backup
    );

    setLastAction(
      "Backup exportado correctamente."
    );
  }

  async function importBackup(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const text = await file.text();

      const backup =
        JSON.parse(text) as BackupFile;

      if (
        backup.app !== "TEAMCR7STUDIO" ||
        !backup.data
      ) {
        alert(
          "El archivo no parece ser un backup válido de TEAMCR7STUDIO."
        );

        return;
      }

      const confirmRestore = window.confirm(
        "Esto reemplazará el campeonato actual, equipos, fixture, jugadores y goleadores. ¿Deseas continuar?"
      );

      if (!confirmRestore) return;

      clearTeamCR7Data();

      Object.entries(backup.data).forEach(
        ([key, value]) => {
          localStorage.setItem(key, value);
        }
      );

      alert(
        "Backup restaurado correctamente. La página se recargará."
      );

      window.location.reload();
    } catch {
      alert(
        "No se pudo restaurar el backup. Verifica que el archivo sea correcto."
      );
    } finally {
      event.target.value = "";
    }
  }

  function clearAll() {
    const confirmClear = window.confirm(
      "Esto borrará campeonato, equipos, fixture, jugadores, goleadores y configuración guardada. ¿Deseas continuar?"
    );

    if (!confirmClear) return;

    clearTeamCR7Data();

    alert(
      "Datos eliminados correctamente. La página se recargará."
    );

    window.location.reload();
  }

  return (
    <div>
      <div style={headerBox}>
        <h2
          style={{
            marginTop: 0,
          }}
        >
          ⚙️ Configuración
        </h2>

        <h1
          style={{
            marginTop: 0,
            fontSize: 34,
          }}
        >
          Backup y Restauración
        </h1>

        <p
          style={{
            color: "#94a3b8",
            marginBottom: 0,
          }}
        >
          Guarda una copia completa del campeonato, incluyendo equipos,
          fixture, resultados, jugadores y goleadores.
        </p>
      </div>

      <div style={grid}>
        <div style={card}>
          <h2
            style={{
              marginTop: 0,
            }}
          >
            💾 Exportar Backup
          </h2>

          <p style={mutedText}>
            Descarga un archivo JSON con todos los datos guardados del
            campeonato actual.
          </p>

          <ul style={list}>
            <li>Campeonato</li>
            <li>Equipos varones y mujeres</li>
            <li>Fixture y resultados</li>
            <li>Jugadores registrados</li>
            <li>Goleadores y goleadoras</li>
            <li>Campeones</li>
          </ul>

          <button
            onClick={exportBackup}
            style={primaryButton}
          >
            📥 EXPORTAR BACKUP
          </button>
        </div>

        <div style={card}>
          <h2
            style={{
              marginTop: 0,
            }}
          >
            📤 Restaurar Backup
          </h2>

          <p style={mutedText}>
            Sube un backup anterior para recuperar todo el campeonato.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{
              display: "none",
            }}
            onChange={importBackup}
          />

          <button
            onClick={() =>
              fileInputRef.current?.click()
            }
            style={restoreButton}
          >
            📤 RESTAURAR BACKUP
          </button>
        </div>

        <div style={dangerCard}>
          <h2
            style={{
              marginTop: 0,
            }}
          >
            🧹 Limpiar Datos
          </h2>

          <p style={mutedText}>
            Borra todos los datos guardados en este navegador.
          </p>

          <button
            onClick={clearAll}
            style={dangerButton}
          >
            BORRAR TODO
          </button>
        </div>
      </div>

      {lastAction && (
        <div style={successBox}>
          {lastAction}
        </div>
      )}
    </div>
  );
}

const headerBox: CSSProperties = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 25,
  marginBottom: 25,
};

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(300px, 1fr))",
  gap: 20,
};

const card: CSSProperties = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 22,
};

const dangerCard: CSSProperties = {
  background: "#1e293b",
  border: "1px solid #dc2626",
  borderRadius: 14,
  padding: 22,
};

const mutedText: CSSProperties = {
  color: "#94a3b8",
};

const list: CSSProperties = {
  color: "#cbd5e1",
  lineHeight: 1.8,
};

const primaryButton: CSSProperties = {
  width: "100%",
  padding: 14,
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const restoreButton: CSSProperties = {
  width: "100%",
  padding: 14,
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const dangerButton: CSSProperties = {
  width: "100%",
  padding: 14,
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const successBox: CSSProperties = {
  marginTop: 20,
  background: "#064e3b",
  border: "1px solid #16a34a",
  color: "#bbf7d0",
  borderRadius: 12,
  padding: 15,
  fontWeight: "bold",
};