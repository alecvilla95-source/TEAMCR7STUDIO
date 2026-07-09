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
import { usePlayers } from "../../store/playerStore";
import { useGoals } from "../../store/goalStore";

import type {
  TournamentMode,
  TournamentCourtMode,
  TournamentBreaks,
} from "../../types/tournament";

const breakOptions = [
  0,
  3,
  5,
  10,
  15,
  20,
  30,
  45,
  60,
];

export default function TournamentForm() {
  const { setPage } = useApp();

  const { createTournament } = useTournament();

  const { setTeams } = useTeams();

  const { setFixture } = useFixture();

  const { setChampion } = useChampion();

  const { setActiveMatchId } = useOverlay();

  const { resetTimer } = useTimer();

  const { clearPlayers } = usePlayers();

  const { clearGoals } = useGoals();

  const [name, setName] = useState("");

  const [mode, setMode] =
    useState<TournamentMode>("ELIMINATION");

  const [courtMode, setCourtMode] =
    useState<TournamentCourtMode>("SHARED");

  const [teams, setTeamsCount] = useState(16);

  const [courts, setCourts] = useState(2);

  const [womenCourts, setWomenCourts] =
    useState(0);

  const [startTime, setStartTime] =
    useState("09:00");

  const [duration, setDuration] =
    useState(20);

  const [defaultBreak, setDefaultBreak] =
    useState(10);

  const [groupBreak, setGroupBreak] =
    useState(10);

  const [quarterBreak, setQuarterBreak] =
    useState(15);

  const [semifinalBreak, setSemifinalBreak] =
    useState(20);

  const [finalBreak, setFinalBreak] =
    useState(30);

  const totalCourts =
    courts + womenCourts;

  function create() {
    if (!name.trim()) {
      alert("Ingrese el nombre del campeonato.");
      return;
    }

    const breaks: TournamentBreaks = {
      default: defaultBreak,
      group: groupBreak,
      quarterFinal: quarterBreak,
      semifinal: semifinalBreak,
      final: finalBreak,
    };

    createTournament({
      name,
      mode,
      courtMode:
        mode === "ELIMINATION" &&
        totalCourts > 1
          ? courtMode
          : "SHARED",
      teams,
      courts,
      womenCourts,
      startTime,
      duration,
      breaks,
    });

    setTeams([]);

    setFixture([]);

    setChampion(null);

    setActiveMatchId(null);

    clearPlayers();

    clearGoals();

    resetTimer(duration * 60);

    setPage("teams");
  }

  return (
    <div style={{ maxWidth: 850 }}>
      <h2>Nuevo Campeonato</h2>

      <p
        style={{
          color: "#94a3b8",
          marginTop: 10,
          marginBottom: 30,
        }}
      >
        Define modalidad, canchas de varones, canchas de mujeres,
        duración y descansos.
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

        <label>Cantidad de Plazas por Categoría</label>

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
          <option value={128}>128 Plazas</option>
        </select>

        <div style={sectionBox}>
          <h3
            style={{
              marginTop: 0,
            }}
          >
            🏟 Canchas del campeonato
          </h3>

          <p
            style={{
              color: "#94a3b8",
            }}
          >
            Puedes organizar varones y mujeres dentro del mismo campeonato,
            pero con llaves separadas.
          </p>

          <label>Canchas Varones</label>

          <select
            value={courts}
            onChange={(e) =>
              setCourts(Number(e.target.value))
            }
            style={inputStyle}
          >
            <option value={1}>1 Cancha Varones</option>
            <option value={2}>2 Canchas Varones</option>
            <option value={3}>3 Canchas Varones</option>
            <option value={4}>4 Canchas Varones</option>
          </select>

          <label
            style={{
              marginTop: 12,
            }}
          >
            Canchas Mujeres
          </label>

          <select
            value={womenCourts}
            onChange={(e) =>
              setWomenCourts(Number(e.target.value))
            }
            style={inputStyle}
          >
            <option value={0}>Sin Canchas Mujeres</option>
            <option value={1}>C. Mujer 1</option>
            <option value={2}>C. Mujer 1 y 2</option>
            <option value={3}>C. Mujer 1, 2 y 3</option>
            <option value={4}>C. Mujer 1, 2, 3 y 4</option>
          </select>
        </div>

        {mode === "ELIMINATION" && totalCourts > 1 && (
          <div style={sectionBox}>
            <h3
              style={{
                marginTop: 0,
              }}
            >
              ⚽ Sistema relámpago
            </h3>

            <p
              style={{
                color: "#94a3b8",
              }}
            >
              En relámpagos puedes separar los equipos por cancha.
              Cada cancha tendrá su propia llave. Los varones sacarán su
              campeón y las mujeres su campeona.
            </p>

            <select
              value={courtMode}
              onChange={(e) =>
                setCourtMode(
                  e.target.value as TournamentCourtMode
                )
              }
              style={inputStyle}
            >
              <option value="SHARED">
                Repartir partidos por horario
              </option>

              <option value="SEPARATE_BRACKETS">
                Llaves separadas por cancha
              </option>
            </select>
          </div>
        )}

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

        <div style={sectionBox}>
          <h3
            style={{
              marginTop: 0,
            }}
          >
            ⏱ Tiempo de organización / descanso
          </h3>

          <p
            style={{
              color: "#94a3b8",
            }}
          >
            Estos minutos se suman después de cada partido para organizar
            el siguiente encuentro, descansos, penales o retrasos.
          </p>

          <BreakSelect
            label="Fase de grupos"
            value={groupBreak}
            onChange={setGroupBreak}
          />

          <BreakSelect
            label="Rondas iniciales"
            value={defaultBreak}
            onChange={setDefaultBreak}
          />

          <BreakSelect
            label="Cuartos de final"
            value={quarterBreak}
            onChange={setQuarterBreak}
          />

          <BreakSelect
            label="Semifinal"
            value={semifinalBreak}
            onChange={setSemifinalBreak}
          />

          <BreakSelect
            label="Final"
            value={finalBreak}
            onChange={setFinalBreak}
          />
        </div>

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

function BreakSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 180px",
        gap: 15,
        alignItems: "center",
        marginTop: 12,
      }}
    >
      <label>{label}</label>

      <select
        value={value}
        onChange={(e) =>
          onChange(Number(e.target.value))
        }
        style={inputStyle}
      >
        {breakOptions.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option} min
          </option>
        ))}
      </select>
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

const sectionBox: CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: 20,
  marginTop: 10,
  display: "flex",
  flexDirection: "column",
  gap: 10,
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