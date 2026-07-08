import { useState } from "react";

import { useApp } from "../../store/appStore";
import { useTournament } from "../../store/tournamentStore";

import type { TournamentMode } from "../../types/tournament";

export default function TournamentForm() {
  const { setPage } = useApp();

  const { createTournament } = useTournament();

  const [name, setName] = useState("");

  const [mode, setMode] =
    useState<TournamentMode>("ELIMINATION");

  const [teams, setTeams] = useState(16);

  const [courts, setCourts] = useState(1);

  const [startTime, setStartTime] =
    useState("09:00");

  const [duration, setDuration] =
    useState(20);

  function create() {
    if (!name.trim()) {
      alert("Ingrese el nombre del campeonato.");
      return;
    }

    createTournament({
      name,
      mode,
      teams,
      courts,
      startTime,
      duration,
    });

    setPage("teams");
  }

  return (
    <div style={{ maxWidth: 700 }}>

      <h2>Nuevo Campeonato</h2>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 15,
          marginTop: 30,
        }}
      >

        <label>Nombre del Campeonato</label>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />

        <label>Modalidad</label>

        <select
          value={mode}
          onChange={(e) =>
            setMode(
              e.target.value as TournamentMode
            )
          }
          style={inputStyle}
        >
          <option value="ELIMINATION">
            ⚽ Eliminación Directa
          </option>

          <option value="GROUPS">
            👥 Fase de Grupos
          </option>
        </select>

        <label>Cantidad de Equipos</label>

        <select
          value={teams}
          onChange={(e) =>
            setTeams(Number(e.target.value))
          }
          style={inputStyle}
        >
          <option value={4}>4 Equipos</option>
          <option value={8}>8 Equipos</option>
          <option value={16}>16 Equipos</option>
          <option value={32}>32 Equipos</option>
          <option value={64}>64 Equipos</option>
        </select>

        <label>Cantidad de Canchas</label>

        <select
          value={courts}
          onChange={(e) =>
            setCourts(Number(e.target.value))
          }
          style={inputStyle}
        >
          <option value={1}>1 Cancha</option>
          <option value={2}>2 Canchas</option>
          <option value={3}>3 Canchas</option>
          <option value={4}>4 Canchas</option>
        </select>

        <label>Hora de Inicio</label>

        <input
          type="time"
          value={startTime}
          onChange={(e) =>
            setStartTime(e.target.value)
          }
          style={inputStyle}
        />

        <label>Duración por Partido (minutos)</label>

        <input
          type="number"
          value={duration}
          onChange={(e) =>
            setDuration(Number(e.target.value))
          }
          style={inputStyle}
        />

        <button
          onClick={create}
          style={buttonStyle}
        >
          CREAR CAMPEONATO
        </button>

      </div>

    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#1e293b",
  color: "white",
  fontSize: 16,
};

const buttonStyle: React.CSSProperties = {
  marginTop: 20,
  padding: 15,
  border: "none",
  borderRadius: 8,
  background: "#2563eb",
  color: "white",
  fontSize: 16,
  cursor: "pointer",
};