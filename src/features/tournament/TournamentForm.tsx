import {
  useState,
  type CSSProperties,
} from "react";

import { useApp } from "../../store/appStore";
import { useTournament } from "../../store/tournamentStore";
import { useTeams } from "../../store/teamStore";
import { useFixture } from "../../store/fixtureStore";
import { useChampion } from "../../store/championStore";
import { useOverlay } from "../../store/overlayStore";
import { useTimer } from "../../store/timerStore";

import type { TournamentMode } from "../../types/tournament";

export default function TournamentForm() {
  const { setPage } = useApp();

  const { createTournament } = useTournament();

  const { setTeams } = useTeams();

  const { setFixture } = useFixture();

  const { setChampion } = useChampion();

  const { setActiveMatchId } = useOverlay();

  const { resetTimer } = useTimer();

  const [name, setName] = useState("");

  const [mode, setMode] =
    useState<TournamentMode>("ELIMINATION");

  const [teams, setTeamsCount] = useState(16);

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

    setTeams([]);

    setFixture([]);

    setChampion(null);

    setActiveMatchId(null);

    resetTimer(duration * 60);

    setPage("teams");
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <h2>Nuevo Campeonato</h2>

      <p
        style={{
          color: "#94a3b8",
          marginTop: 10,
          marginBottom: 30,
        }}
      >
        Al crear un nuevo campeonato se limpiarán los equipos,
        fixture, resultados, campeón, OBS y cronómetro anteriores.
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 15,
        }}
      >
        <label>Nombre del Campeonato</label>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
          placeholder="Ej: Copa Relámpago 2026"
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

        <label>Cantidad de Plazas</label>

        <select
          value={teams}
          onChange={(e) =>
            setTeamsCount(Number(e.target.value))
          }
          style={inputStyle}
        >
          <option value={4}>4 Plazas</option>
          <option value={8}>8 Plazas</option>
          <option value={16}>16 Plazas</option>
          <option value={32}>32 Plazas</option>
          <option value={64}>64 Plazas</option>
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
          min={1}
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

const inputStyle: CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#1e293b",
  color: "white",
  fontSize: 16,
};

const buttonStyle: CSSProperties = {
  marginTop: 20,
  padding: 15,
  border: "none",
  borderRadius: 8,
  background: "#2563eb",
  color: "white",
  fontSize: 16,
  cursor: "pointer",
  fontWeight: "bold",
};