import { useEffect, useRef, useState } from "react";

import { useTournament } from "../../store/tournamentStore";
import { useTeams } from "../../store/teamStore";
import { useFixture } from "../../store/fixtureStore";
import { useApp } from "../../store/appStore";

import type { Team } from "../../types/team";

import { buildTournament } from "../../engine/tournamentEngine";
import { importTeamsFromExcel } from "../../services/excelService";

function getCourtSlots(
  totalTeams: number,
  courts: number
): number[] {
  const safeCourts = Math.max(1, courts);

  const base = Math.floor(totalTeams / safeCourts);

  const remainder = totalTeams % safeCourts;

  return Array.from(
    {
      length: safeCourts,
    },
    (_, index) =>
      base + (index < remainder ? 1 : 0)
  );
}

export default function TeamRegistration() {
  const { tournament } = useTournament();

  const { setTeams } = useTeams();

  const { setFixture } = useFixture();

  const { setPage } = useApp();

  const totalTeams = tournament?.teams ?? 16;

  const totalCourts = tournament?.courts ?? 1;

  const isSeparateCourtMode =
    tournament?.mode === "ELIMINATION" &&
    tournament?.courtMode === "SEPARATE_BRACKETS" &&
    totalCourts > 1;

  const courtSlots = getCourtSlots(
    totalTeams,
    totalCourts
  );

  const [teamNames, setTeamNames] = useState<string[]>([]);

  const [courtTeamNames, setCourtTeamNames] =
    useState<string[][]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const courtFileRefs =
    useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    setTeamNames(
      Array(totalTeams).fill("")
    );

    setCourtTeamNames(
      courtSlots.map((slots) =>
        Array(slots).fill("")
      )
    );
  }, [
    totalTeams,
    totalCourts,
    isSeparateCourtMode,
  ]);

  function updateTeam(
    index: number,
    value: string
  ) {
    const copy = [...teamNames];

    copy[index] = value;

    setTeamNames(copy);
  }

  function updateCourtTeam(
    courtIndex: number,
    teamIndex: number,
    value: string
  ) {
    const copy = courtTeamNames.map(
      (courtTeams) => [...courtTeams]
    );

    copy[courtIndex][teamIndex] = value;

    setCourtTeamNames(copy);
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
    } finally {
      event.target.value = "";
    }
  }

  async function importExcelForCourt(
    event: React.ChangeEvent<HTMLInputElement>,
    courtIndex: number
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const teams = await importTeamsFromExcel(file);

      const copy = courtTeamNames.map(
        (courtTeams) => [...courtTeams]
      );

      const limit =
        copy[courtIndex]?.length ?? 0;

      teams
        .slice(0, limit)
        .forEach((name, index) => {
          copy[courtIndex][index] = name;
        });

      setCourtTeamNames(copy);

      alert(
        `${teams.slice(0, limit).length} equipos importados en Cancha ${
          courtIndex + 1
        }.`
      );
    } catch {
      alert("No se pudo leer el archivo Excel.");
    } finally {
      event.target.value = "";
    }
  }

  function generateTournament() {
    if (!tournament) return;

    let teams: Team[] = [];

    if (isSeparateCourtMode) {
      const courtCounts = courtTeamNames.map(
        (courtTeams) =>
          courtTeams.filter(
            (team) => team.trim() !== ""
          ).length
      );

      const invalidCourt = courtCounts.some(
        (count) => count < 2
      );

      if (invalidCourt) {
        alert(
          "Cada cancha debe tener al menos 2 equipos registrados."
        );
        return;
      }

      teams = courtTeamNames.flatMap(
        (courtTeams, courtIndex) =>
          courtTeams
            .map((team) => team.trim())
            .filter((team) => team !== "")
            .map((name) => ({
              id: 0,
              name,
              assignedCourt: courtIndex + 1,
            }))
      );

      teams = teams.map((team, index) => ({
        ...team,
        id: index + 1,
      }));
    } else {
      const validNames = teamNames
        .map((team) => team.trim())
        .filter((team) => team !== "");

      if (validNames.length < 2) {
        alert("Debe registrar al menos 2 equipos.");
        return;
      }

      teams = validNames.map((name, index) => ({
        id: index + 1,
        name,
      }));
    }

    setTeams(teams);

    const fixture = buildTournament(
      tournament,
      teams
    );

    setFixture(fixture);

    setPage("fixture");
  }

  const columns =
    totalTeams <= 16
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
        Total de plazas:{" "}
        <strong>{totalTeams}</strong>
      </p>

      {isSeparateCourtMode ? (
        <>
          <p
            style={{
              color: "#60a5fa",
              marginBottom: 25,
            }}
          >
            Modo relámpago por canchas activo. Los equipos
            registrados en cada cancha no se mezclarán.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                totalCourts === 2
                  ? "1fr 1fr"
                  : "1fr",
              gap: 25,
              marginTop: 25,
            }}
          >
            {courtSlots.map((slots, courtIndex) => (
              <div
                key={courtIndex}
                style={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: 14,
                  padding: 20,
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                    color: "#60a5fa",
                  }}
                >
                  🏟 Cancha {courtIndex + 1}
                </h3>

                <p
                  style={{
                    color: "#94a3b8",
                  }}
                >
                  Plazas para esta cancha:{" "}
                  <strong>{slots}</strong>
                </p>

                <input
                  ref={(element) => {
                    courtFileRefs.current[courtIndex] =
                      element;
                  }}
                  type="file"
                  accept=".xlsx,.xls"
                  style={{
                    display: "none",
                  }}
                  onChange={(event) =>
                    importExcelForCourt(
                      event,
                      courtIndex
                    )
                  }
                />

                <button
                  onClick={() =>
                    courtFileRefs.current[
                      courtIndex
                    ]?.click()
                  }
                  style={importButton}
                >
                  📥 IMPORTAR EXCEL CANCHA {courtIndex + 1}
                </button>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      slots > 8 ? "1fr 1fr" : "1fr",
                    gap: 12,
                    marginTop: 20,
                  }}
                >
                  {Array.from({
                    length: slots,
                  }).map((_, teamIndex) => (
                    <div
                      key={teamIndex}
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
                        {teamIndex + 1}
                      </strong>

                      <input
                        value={
                          courtTeamNames[courtIndex]?.[
                            teamIndex
                          ] ?? ""
                        }
                        onChange={(event) =>
                          updateCourtTeam(
                            courtIndex,
                            teamIndex,
                            event.target.value
                          )
                        }
                        placeholder={`Equipo ${teamIndex + 1}`}
                        style={inputStyle}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <p
            style={{
              color: "#60a5fa",
              marginBottom: 20,
            }}
          >
            Puedes dejar plazas vacías. El sistema asignará
            automáticamente los clasificados cuando corresponda.
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
                  onChange={(event) =>
                    updateTeam(
                      index,
                      event.target.value
                    )
                  }
                  placeholder={`Equipo ${index + 1}`}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{
              display: "none",
            }}
            onChange={importExcel}
          />

          <button
            onClick={() =>
              fileInputRef.current?.click()
            }
            style={importButton}
          >
            📥 IMPORTAR EXCEL
          </button>
        </>
      )}

      <div
        style={{
          display: "flex",
          gap: 15,
          marginTop: 30,
        }}
      >
        <button
          onClick={generateTournament}
          style={generateButton}
        >
          ⚽ GENERAR FIXTURE
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: 10,
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "white",
};

const importButton: React.CSSProperties = {
  padding: "12px 18px",
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const generateButton: React.CSSProperties = {
  padding: "14px 24px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};