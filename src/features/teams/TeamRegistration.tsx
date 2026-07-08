import { useEffect, useState, useRef } from "react";

import { useTournament } from "../../store/tournamentStore";
import { useTeams } from "../../store/teamStore";
import { useFixture } from "../../store/fixtureStore";
import { useApp } from "../../store/appStore";

import type { Team } from "../../types/team";

import { buildTournament } from "../../engine/tournamentEngine";
import { importTeamsFromExcel } from "../../services/excelService";

export default function TeamRegistration() {
  const { tournament } = useTournament();

  const { setTeams } = useTeams();

  const { setFixture } = useFixture();

  const { setPage } = useApp();

  const totalTeams = tournament?.teams ?? 16;

  const [teamNames, setTeamNames] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTeamNames(Array(totalTeams).fill(""));
  }, [totalTeams]);

  function updateTeam(index: number, value: string) {
    const copy = [...teamNames];
    copy[index] = value;
    setTeamNames(copy);
  }

  async function importExcel(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const teams = await importTeamsFromExcel(file);

      const copy = Array(totalTeams).fill("");

      teams
        .slice(0, totalTeams)
        .forEach((name, index) => {
          copy[index] = name;
        });

      setTeamNames(copy);

      alert(`${teams.length} equipos importados.`);
    } catch {
      alert("No se pudo leer el archivo Excel.");
    }
  }

  function generateTournament() {
    if (!tournament) return;

    // Solo conservar equipos con nombre
    const validNames = teamNames
      .map((team) => team.trim())
      .filter((team) => team !== "");

    if (validNames.length < 2) {
      alert("Debe registrar al menos 2 equipos.");
      return;
    }

    const teams: Team[] = validNames.map((name, index) => ({
      id: index + 1,
      name,
    }));

    setTeams(teams);

    const fixture = buildTournament(
      tournament,
      teams
    );

    setFixture(fixture);

    setPage("fixture");
  }

  const columns =
    totalTeams <= 8
      ? 2
      : totalTeams <= 16
      ? 2
      : totalTeams <= 32
      ? 3
      : 4;

  return (
    <div>

      <h2>Registro de Equipos</h2>

      <p
        style={{
          marginTop: 10,
          color: "#cbd5e1",
        }}
      >
        Total de plazas: <strong>{totalTeams}</strong>
      </p>

      <p
        style={{
          color: "#60a5fa",
          marginBottom: 20,
        }}
      >
        Puedes dejar plazas vacías. El sistema asignará automáticamente los
        clasificados (BYE) cuando corresponda.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns},1fr)`,
          gap: 15,
          marginTop: 30,
        }}
      >
        {teamNames.map((team, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <strong
              style={{
                width: 30,
              }}
            >
              {index + 1}
            </strong>

            <input
              value={team}
              onChange={(e) =>
                updateTeam(index, e.target.value)
              }
              placeholder={`Equipo ${index + 1}`}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 8,
                border: "1px solid #334155",
                background: "#1e293b",
                color: "white",
              }}
            />
          </div>
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: "none" }}
        onChange={importExcel}
      />

      <div
        style={{
          display: "flex",
          gap: 15,
          marginTop: 30,
        }}
      >
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: "14px 22px",
            background: "#16a34a",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          📥 IMPORTAR EXCEL
        </button>

        <button
          onClick={generateTournament}
          style={{
            padding: "14px 22px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          ⚽ GENERAR FIXTURE
        </button>
      </div>

    </div>
  );
}