import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type MutableRefObject,
} from "react";

import { useTournament } from "../../store/tournamentStore";
import { useTeams } from "../../store/teamStore";
import { useFixture } from "../../store/fixtureStore";
import { useApp } from "../../store/appStore";

import type {
  Team,
  TeamCategory,
} from "../../types/team";

import { buildTournament } from "../../engine/tournamentEngine";
import { importTeamsFromExcel } from "../../services/excelService";

function splitSlots(
  totalSlots: number,
  courts: number
): number[] {
  if (courts <= 0) return [];

  const base = Math.floor(totalSlots / courts);
  const remainder = totalSlots % courts;

  return Array.from(
    {
      length: courts,
    },
    (_, index) =>
      base + (index < remainder ? 1 : 0)
  );
}

function createEmptyGroups(
  slots: number[]
): string[][] {
  return slots.map((count) =>
    Array(count).fill("")
  );
}

function getWomenFieldLetter(index: number) {
  const letters = ["A", "B", "C", "D"];

  return letters[index - 1] ?? String(index);
}

function getFieldLabel(
  category: TeamCategory,
  courtIndex: number
) {
  const courtNumber = courtIndex + 1;

  if (category === "WOMEN") {
    return `Campo ${getWomenFieldLetter(courtNumber)}`;
  }

  return `Campo ${courtNumber}`;
}

export default function TeamRegistration() {
  const { tournament } = useTournament();

  const { setTeams } = useTeams();

  const { setFixture } = useFixture();

  const { setPage } = useApp();

  const totalTeams = tournament?.teams ?? 16;

  const menCourts = tournament?.courts ?? 0;

  const womenCourts =
    tournament?.womenCourts ?? 0;

  const isSeparateCourtMode =
    tournament?.mode === "ELIMINATION" &&
    tournament?.courtMode === "SEPARATE_BRACKETS" &&
    menCourts + womenCourts > 1;

  const menSlots = splitSlots(
    totalTeams,
    menCourts
  );

  const womenSlots = splitSlots(
    womenCourts > 0 ? totalTeams : 0,
    womenCourts
  );

  const [teamNames, setTeamNames] =
    useState<string[]>([]);

  const [menTeamsByCourt, setMenTeamsByCourt] =
    useState<string[][]>([]);

  const [womenTeamsByCourt, setWomenTeamsByCourt] =
    useState<string[][]>([]);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const menFileRefs =
    useRef<Record<number, HTMLInputElement | null>>({});

  const womenFileRefs =
    useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    setTeamNames(
      Array(totalTeams).fill("")
    );

    setMenTeamsByCourt(
      createEmptyGroups(menSlots)
    );

    setWomenTeamsByCourt(
      createEmptyGroups(womenSlots)
    );
  }, [
    totalTeams,
    menCourts,
    womenCourts,
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
    category: TeamCategory,
    courtIndex: number,
    teamIndex: number,
    value: string
  ) {
    const setter =
      category === "MEN"
        ? setMenTeamsByCourt
        : setWomenTeamsByCourt;

    setter((current) => {
      const copy = current.map((court) => [
        ...court,
      ]);

      copy[courtIndex][teamIndex] = value;

      return copy;
    });
  }

  async function importExcel(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const importedTeams =
        await importTeamsFromExcel(file);

      const copy = Array(totalTeams).fill("");

      importedTeams
        .slice(0, totalTeams)
        .forEach((name, index) => {
          copy[index] = name;
        });

      setTeamNames(copy);

      alert(`${importedTeams.length} equipos importados.`);
    } catch {
      alert("No se pudo leer el archivo Excel.");
    } finally {
      event.target.value = "";
    }
  }

  async function importExcelForCourt(
    event: ChangeEvent<HTMLInputElement>,
    category: TeamCategory,
    courtIndex: number
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const importedTeams =
        await importTeamsFromExcel(file);

      const setter =
        category === "MEN"
          ? setMenTeamsByCourt
          : setWomenTeamsByCourt;

      setter((current) => {
        const copy = current.map((court) => [
          ...court,
        ]);

        const limit =
          copy[courtIndex]?.length ?? 0;

        importedTeams
          .slice(0, limit)
          .forEach((name, index) => {
            copy[courtIndex][index] = name;
          });

        return copy;
      });

      alert(
        `${importedTeams.length} equipos importados en ${getFieldLabel(
          category,
          courtIndex
        )}.`
      );
    } catch {
      alert("No se pudo leer el archivo Excel.");
    } finally {
      event.target.value = "";
    }
  }

  function buildTeamsFromCourts(
    groups: string[][],
    category: TeamCategory
  ): Team[] {
    return groups.flatMap(
      (courtTeams, courtIndex) =>
        courtTeams
          .map((name) => name.trim())
          .filter((name) => name !== "")
          .map((name) => ({
            id: 0,
            name,
            category,
            assignedCourt: courtIndex + 1,
          }))
    );
  }

  function validateCourtGroups(
    groups: string[][],
    category: TeamCategory
  ) {
    for (
      let index = 0;
      index < groups.length;
      index++
    ) {
      const count = groups[index].filter(
        (name) => name.trim() !== ""
      ).length;

      if (count < 2) {
        alert(
          `${getFieldLabel(
            category,
            index
          )} debe tener al menos 2 equipos.`
        );

        return false;
      }
    }

    return true;
  }

  function generateTournament() {
    if (!tournament) return;

    let teams: Team[] = [];

    if (isSeparateCourtMode) {
      const menValid =
        validateCourtGroups(
          menTeamsByCourt,
          "MEN"
        );

      if (!menValid) return;

      if (womenCourts > 0) {
        const womenValid =
          validateCourtGroups(
            womenTeamsByCourt,
            "WOMEN"
          );

        if (!womenValid) return;
      }

      const menTeams =
        buildTeamsFromCourts(
          menTeamsByCourt,
          "MEN"
        );

      const womenTeams =
        buildTeamsFromCourts(
          womenTeamsByCourt,
          "WOMEN"
        );

      teams = [
        ...menTeams,
        ...womenTeams,
      ].map((team, index) => ({
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
        category: "MEN",
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
        Total de plazas por categoría:{" "}
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
            Modo relámpago por campos activo. Varones y mujeres
            tendrán llaves separadas dentro del mismo campeonato.
          </p>

          {menCourts > 0 && (
            <>
              <h3
                style={{
                  color: "#93c5fd",
                }}
              >
                VARONES
              </h3>

              <CourtGrid
                category="MEN"
                slots={menSlots}
                teamsByCourt={menTeamsByCourt}
                fileRefs={menFileRefs}
                onImport={importExcelForCourt}
                onUpdate={updateCourtTeam}
              />
            </>
          )}

          {womenCourts > 0 && (
            <>
              <h3
                style={{
                  color: "#f9a8d4",
                  marginTop: 35,
                }}
              >
                MUJERES
              </h3>

              <CourtGrid
                category="WOMEN"
                slots={womenSlots}
                teamsByCourt={womenTeamsByCourt}
                fileRefs={womenFileRefs}
                onImport={importExcelForCourt}
                onUpdate={updateCourtTeam}
              />
            </>
          )}
        </>
      ) : (
        <>
          <p
            style={{
              color: "#60a5fa",
              marginBottom: 20,
            }}
          >
            Puedes dejar plazas vacías. El sistema asignará automáticamente
            los clasificados cuando corresponda.
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

function CourtGrid({
  category,
  slots,
  teamsByCourt,
  fileRefs,
  onImport,
  onUpdate,
}: {
  category: TeamCategory;
  slots: number[];
  teamsByCourt: string[][];
  fileRefs: MutableRefObject<
    Record<number, HTMLInputElement | null>
  >;
  onImport: (
    event: ChangeEvent<HTMLInputElement>,
    category: TeamCategory,
    courtIndex: number
  ) => void;
  onUpdate: (
    category: TeamCategory,
    courtIndex: number,
    teamIndex: number,
    value: string
  ) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          slots.length === 2
            ? "1fr 1fr"
            : "repeat(auto-fit, minmax(330px, 1fr))",
        gap: 25,
        marginTop: 20,
      }}
    >
      {slots.map((slotCount, courtIndex) => {
        const fieldLabel =
          getFieldLabel(
            category,
            courtIndex
          );

        return (
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
                color:
                  category === "MEN"
                    ? "#60a5fa"
                    : "#f9a8d4",
              }}
            >
              🏟 {fieldLabel}
            </h3>

            <p
              style={{
                color: "#94a3b8",
              }}
            >
              Plazas para este campo:{" "}
              <strong>{slotCount}</strong>
            </p>

            <input
              ref={(element) => {
                fileRefs.current[courtIndex] =
                  element;
              }}
              type="file"
              accept=".xlsx,.xls"
              style={{
                display: "none",
              }}
              onChange={(event) =>
                onImport(
                  event,
                  category,
                  courtIndex
                )
              }
            />

            <button
              onClick={() =>
                fileRefs.current[courtIndex]?.click()
              }
              style={importButton}
            >
              📥 IMPORTAR EXCEL {fieldLabel}
            </button>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  slotCount > 8
                    ? "1fr 1fr"
                    : "1fr",
                gap: 12,
                marginTop: 20,
              }}
            >
              {Array.from({
                length: slotCount,
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
                      teamsByCourt[courtIndex]?.[
                        teamIndex
                      ] ?? ""
                    }
                    onChange={(event) =>
                      onUpdate(
                        category,
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
        );
      })}
    </div>
  );
}

const inputStyle: CSSProperties = {
  flex: 1,
  padding: 10,
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "white",
};

const importButton: CSSProperties = {
  padding: "12px 18px",
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const generateButton: CSSProperties = {
  padding: "14px 24px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};