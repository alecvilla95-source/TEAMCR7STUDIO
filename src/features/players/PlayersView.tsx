import {
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type MutableRefObject,
} from "react";

import type { Match } from "../../types/match";
import type { Team } from "../../types/team";
import type { Player } from "../../types/player";

import { useTournament } from "../../store/tournamentStore";
import { useTeams } from "../../store/teamStore";
import { usePlayers } from "../../store/playerStore";
import { useLogo } from "../../store/logoStore";
import { useFixture } from "../../store/fixtureStore";

import {
  exportBlankPlayerRegistrationTemplate,
  exportPlayerTemplate,
  exportAllPlayerTemplates,
  importPlayersFromExcel,
  importAllPlayersFromExcel,
  importRegistrationSheetsFromExcel,
} from "../../services/excelService";

function getCategoryLabel(team: Team) {
  if (team.category === "WOMEN") {
    return "FÚTBOL FEMENINO";
  }

  return "FÚTBOL MASCULINO";
}

function getCourtLabel(team: Team) {
  if (team.category === "WOMEN") {
    return `C. Mujer ${team.assignedCourt ?? "-"}`;
  }

  return `Cancha ${team.assignedCourt ?? "-"}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readImageAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(String(reader.result ?? ""));
    };

    reader.onerror = () => {
      reject(new Error("No se pudo leer la imagen."));
    };

    reader.readAsDataURL(file);
  });
}

function printHtml(html: string) {
  const printWindow = window.open(
    "",
    "_blank",
    "width=1000,height=800"
  );

  if (!printWindow) {
    alert(
      "No se pudo abrir la ventana de impresión. Revisa si el navegador bloqueó ventanas emergentes."
    );

    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

function renderTeamCr7Logo() {
  return `
    <img
      src="/teamcr7studio-logo.png"
      class="main-logo-img"
      alt="TEAMCR7STUDIO"
      onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
    />

    <div class="logo-fallback">
      TEAM CR7<br />STUDIO
    </div>
  `;
}

function renderChampionshipLogo(logoDataUrl: string | null) {
  if (!logoDataUrl) {
    return `
      <div class="logo-text-placeholder">
        “LOGO CAMPEONATO”
      </div>
    `;
  }

  return `
    <img
      src="${logoDataUrl}"
      class="side-logo-img"
      alt="Logo campeonato"
    />
  `;
}

function renderTeamLogo(team: Team) {
  if (!team.logoDataUrl) {
    return `
      <div class="logo-text-placeholder">
        “LOGO DE EQUIPO”
      </div>
    `;
  }

  return `
    <img
      src="${team.logoDataUrl}"
      class="team-logo-img"
      alt="${escapeHtml(team.name)}"
    />
  `;
}

function renderPlayerRows(players: Player[]) {
  const totalRows = Math.max(players.length, 25);

  const rows = Array.from(
    {
      length: totalRows,
    },
    (_, index) => players[index] ?? null
  );

  return rows
    .map((player, index) => {
      return `
        <tr>
          <td>${String(index + 1).padStart(2, "0")}</td>
          <td>${player ? escapeHtml(player.name) : ""}</td>
          <td>${player ? escapeHtml(player.documentId) : ""}</td>
          <td></td>
          <td>${player ? escapeHtml(player.jerseyNumber) : ""}</td>
        </tr>
      `;
    })
    .join("");
}

function buildRosterStyles() {
  return `
    @page {
      size: A4 portrait;
      margin: 5mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: Arial, sans-serif;
      margin: 0;
      color: #111827;
    }

    .sheet {
      width: 100%;
      page-break-after: always;
    }

    .sheet:last-child {
      page-break-after: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    .header-table td,
    .info-table td,
    .players-table th,
    .players-table td {
      border: 1.6px solid #111827;
    }

    .header-table td {
      height: 38mm;
      text-align: center;
      vertical-align: middle;
    }

    .main-logo-cell {
      width: 24%;
      padding: 3mm;
    }

    .title-cell {
      width: 52%;
      padding: 3mm;
    }

    .championship-logo-cell {
      width: 24%;
      padding: 3mm;
    }

    .main-logo-img {
      width: 36mm;
      height: 32mm;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .side-logo-img {
      width: 34mm;
      height: 30mm;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .logo-fallback {
      display: none;
      width: 100%;
      height: 32mm;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 18px;
      line-height: 1.1;
    }

    .logo-text-placeholder {
      font-weight: 900;
      font-size: 12px;
      line-height: 1.2;
      text-transform: uppercase;
    }

    .tournament-name {
      font-size: 26px;
      font-weight: 900;
      text-transform: uppercase;
      line-height: 1.05;
      text-align: center;
    }

    .info-table td {
      height: 8.6mm;
      padding: 2mm;
      vertical-align: middle;
      font-size: 11.5px;
    }

    .label-cell {
      width: 24%;
      font-weight: 900;
      text-transform: uppercase;
      background: #f9fafb;
    }

    .value-cell {
      width: 52%;
      font-weight: 700;
    }

    .team-name-big {
      font-size: 24px !important;
      font-weight: 900 !important;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      line-height: 1;
    }

    .team-logo-cell {
      width: 24%;
      text-align: center;
      vertical-align: middle;
      padding: 2mm;
    }

    .team-logo-img {
      width: 32mm;
      height: 25mm;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .category-value {
      text-align: center;
      font-size: 13px !important;
      font-weight: 900 !important;
      text-transform: uppercase;
    }

    .court-value {
      text-align: center;
      font-size: 11.5px !important;
      font-weight: 800 !important;
    }

    .spacer {
      height: 3mm;
    }

    .players-table th {
      height: 7mm;
      padding: 1mm;
      font-size: 10px;
      text-align: center;
      font-weight: 900;
      background: #f9fafb;
    }

    .players-table td {
      height: 6.45mm;
      padding: 1mm;
      font-size: 10px;
      line-height: 1;
    }

    .players-table td:first-child,
    .players-table td:nth-child(5) {
      text-align: center;
      font-weight: 800;
    }

    .footer {
      margin-top: 7mm;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 22mm;
      text-align: center;
      font-size: 10px;
    }

    .signature {
      border-top: 1px solid #111827;
      padding-top: 2mm;
    }

    @media print {
      body {
        margin: 0;
      }

      .sheet {
        page-break-inside: avoid;
      }
    }
  `;
}

function buildTeamRosterHtml({
  tournamentName,
  team,
  players,
  logoDataUrl,
  autoPrint = true,
}: {
  tournamentName: string;
  team: Team;
  players: Player[];
  logoDataUrl: string | null;
  autoPrint?: boolean;
}) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />

        <title>Ficha de Jugadores</title>

        <style>
          ${buildRosterStyles()}
        </style>
      </head>

      <body>
        <div class="sheet">
          <table class="header-table">
            <tbody>
              <tr>
                <td class="main-logo-cell">
                  ${renderTeamCr7Logo()}
                </td>

                <td class="title-cell">
                  <div class="tournament-name">
                    “${escapeHtml(tournamentName)}”
                  </div>
                </td>

                <td class="championship-logo-cell">
                  ${renderChampionshipLogo(logoDataUrl)}
                </td>
              </tr>
            </tbody>
          </table>

          <table class="info-table">
            <tbody>
              <tr>
                <td class="label-cell">EQUIPO:</td>
                <td class="value-cell team-name-big">
                  “${escapeHtml(team.name)}”
                </td>
                <td
                  class="team-logo-cell"
                  rowspan="3"
                >
                  ${renderTeamLogo(team)}
                </td>
              </tr>

              <tr>
                <td class="label-cell">DELEGADO 1:</td>
                <td class="value-cell">
                  ${escapeHtml(team.delegate1 ?? "")}
                </td>
              </tr>

              <tr>
                <td class="label-cell">DELEGADO 2:</td>
                <td class="value-cell">
                  ${escapeHtml(team.delegate2 ?? "")}
                </td>
              </tr>

              <tr>
                <td class="label-cell">CATEGORIA:</td>
                <td
                  class="category-value"
                  colspan="2"
                >
                  ${escapeHtml(getCategoryLabel(team))}
                </td>
              </tr>

              <tr>
                <td class="label-cell">CANCHA:</td>
                <td
                  class="court-value"
                  colspan="2"
                >
                  ${escapeHtml(getCourtLabel(team))}
                </td>
              </tr>
            </tbody>
          </table>

          <div class="spacer"></div>

          <table class="players-table">
            <thead>
              <tr>
                <th style="width: 6%;">N°</th>
                <th style="width: 48%;">NOMBRE Y APELLIDOS</th>
                <th style="width: 18%;">D.N.I.</th>
                <th style="width: 17%;">FIRMA</th>
                <th style="width: 11%;">DORSAL</th>
              </tr>
            </thead>

            <tbody>
              ${renderPlayerRows(players)}
            </tbody>
          </table>

          <div class="footer">
            <div class="signature">
              Firma del Delegado
            </div>

            <div class="signature">
              Firma de Organización
            </div>
          </div>
        </div>

        ${
          autoPrint
            ? `
              <script>
                window.onload = function () {
                  window.focus();
                  setTimeout(function () {
                    window.print();
                  }, 300);
                };
              </script>
            `
            : ""
        }
      </body>
    </html>
  `;
}

function buildAllRostersHtml({
  tournamentName,
  teams,
  players,
  logoDataUrl,
}: {
  tournamentName: string;
  teams: Team[];
  players: Player[];
  logoDataUrl: string | null;
}) {
  const orderedTeams = sortTeams(teams);

  const sheets = orderedTeams
    .map((team) => {
      const teamPlayers = players.filter(
        (player) => player.teamId === team.id
      );

      return buildTeamRosterHtml({
        tournamentName,
        team,
        players: teamPlayers,
        logoDataUrl,
        autoPrint: false,
      })
        .replace(/<!doctype html>[\s\S]*?<body>/, "")
        .replace("</body>", "")
        .replace("</html>", "");
    })
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />

        <title>Fichas de Jugadores</title>

        <style>
          ${buildRosterStyles()}
        </style>
      </head>

      <body>
        ${sheets}

        <script>
          window.onload = function () {
            window.focus();
            setTimeout(function () {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;
}

function sortTeams(teams: Team[]) {
  return [...teams].sort((a, b) => {
    const categoryA = a.category === "WOMEN" ? 2 : 1;
    const categoryB = b.category === "WOMEN" ? 2 : 1;

    if (categoryA !== categoryB) {
      return categoryA - categoryB;
    }

    if ((a.assignedCourt ?? 0) !== (b.assignedCourt ?? 0)) {
      return (a.assignedCourt ?? 0) - (b.assignedCourt ?? 0);
    }

    return a.name.localeCompare(b.name);
  });
}

function updateTeamInsideMatch(
  match: Match,
  teamId: number,
  patch: Partial<Team>
): Match {
  return {
    ...match,

    teamA:
      match.teamA?.id === teamId
        ? {
            ...match.teamA,
            ...patch,
          }
        : match.teamA,

    teamB:
      match.teamB?.id === teamId
        ? {
            ...match.teamB,
            ...patch,
          }
        : match.teamB,

    winner:
      match.winner?.id === teamId
        ? {
            ...match.winner,
            ...patch,
          }
        : match.winner,
  };
}

function mergeImportedTeams(
  currentTeams: Team[],
  importedTeams: Team[]
) {
  const teamMap = new Map<number, Team>();

  currentTeams.forEach((team) => {
    teamMap.set(team.id, team);
  });

  importedTeams.forEach((team) => {
    const current = teamMap.get(team.id);

    if (current) {
      teamMap.set(team.id, {
        ...current,
        ...team,
        logoDataUrl:
          team.logoDataUrl ??
          current.logoDataUrl,
      });

      return;
    }

    teamMap.set(team.id, team);
  });

  return sortTeams(Array.from(teamMap.values()));
}

export default function PlayersView() {
  const { tournament } = useTournament();

  const { teams, setTeams } = useTeams();

  const {
    players,
    setPlayers,
    getPlayersByTeam,
    setPlayersForTeam,
  } = usePlayers();

  const {
    fixture,
    setFixture,
  } = useFixture();

  const { logoDataUrl } = useLogo();

  const [expandedTeamId, setExpandedTeamId] =
    useState<number | null>(null);

  const fileRefs =
    useRef<Record<number, HTMLInputElement | null>>({});

  const logoFileRefs =
    useRef<Record<number, HTMLInputElement | null>>({});

  const allUploadRef =
    useRef<HTMLInputElement | null>(null);

  const registrationUploadRef =
    useRef<HTMLInputElement | null>(null);

  const menTeams = teams.filter(
    (team) => team.category !== "WOMEN"
  );

  const womenTeams = teams.filter(
    (team) => team.category === "WOMEN"
  );

  function updateFixtureWithTeams(updatedTeams: Team[]) {
    const teamMap = new Map<number, Team>();

    updatedTeams.forEach((team) => {
      teamMap.set(team.id, team);
    });

    const nextFixture = fixture.map((match) => {
      let updatedMatch = match;

      if (match.teamA && teamMap.has(match.teamA.id)) {
        updatedMatch = updateTeamInsideMatch(
          updatedMatch,
          match.teamA.id,
          teamMap.get(match.teamA.id)!
        );
      }

      if (match.teamB && teamMap.has(match.teamB.id)) {
        updatedMatch = updateTeamInsideMatch(
          updatedMatch,
          match.teamB.id,
          teamMap.get(match.teamB.id)!
        );
      }

      if (match.winner && teamMap.has(match.winner.id)) {
        updatedMatch = updateTeamInsideMatch(
          updatedMatch,
          match.winner.id,
          teamMap.get(match.winner.id)!
        );
      }

      return updatedMatch;
    });

    setFixture(nextFixture);
  }

  function updateTeamEverywhere(
    teamId: number,
    patch: Partial<Team>
  ) {
    const nextTeams = teams.map((team) => {
      if (team.id !== teamId) {
        return team;
      }

      return {
        ...team,
        ...patch,
      };
    });

    setTeams(nextTeams);

    const nextFixture = fixture.map((match) =>
      updateTeamInsideMatch(
        match,
        teamId,
        patch
      )
    );

    setFixture(nextFixture);
  }

  function updateTeamDelegates(
    teamId: number,
    delegate1: string,
    delegate2: string
  ) {
    updateTeamEverywhere(
      teamId,
      {
        delegate1,
        delegate2,
      }
    );
  }

  function updateManyTeamDelegates(
    data: Array<{
      teamId: number;
      delegate1: string;
      delegate2: string;
    }>
  ) {
    const delegateMap = new Map(
      data.map((item) => [
        item.teamId,
        item,
      ])
    );

    const nextTeams = teams.map((team) => {
      const item =
        delegateMap.get(team.id);

      if (!item) {
        return team;
      }

      return {
        ...team,
        delegate1: item.delegate1,
        delegate2: item.delegate2,
      };
    });

    setTeams(nextTeams);

    const nextFixture = fixture.map((match) => {
      const patchedA =
        match.teamA &&
        delegateMap.has(match.teamA.id)
          ? {
              ...match.teamA,
              delegate1:
                delegateMap.get(match.teamA.id)!.delegate1,
              delegate2:
                delegateMap.get(match.teamA.id)!.delegate2,
            }
          : match.teamA;

      const patchedB =
        match.teamB &&
        delegateMap.has(match.teamB.id)
          ? {
              ...match.teamB,
              delegate1:
                delegateMap.get(match.teamB.id)!.delegate1,
              delegate2:
                delegateMap.get(match.teamB.id)!.delegate2,
            }
          : match.teamB;

      const patchedWinner =
        match.winner &&
        delegateMap.has(match.winner.id)
          ? {
              ...match.winner,
              delegate1:
                delegateMap.get(match.winner.id)!.delegate1,
              delegate2:
                delegateMap.get(match.winner.id)!.delegate2,
            }
          : match.winner;

      return {
        ...match,
        teamA: patchedA,
        teamB: patchedB,
        winner: patchedWinner,
      };
    });

    setFixture(nextFixture);
  }

  async function uploadTeamLogo(
    event: ChangeEvent<HTMLInputElement>,
    team: Team
  ) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    try {
      if (!file.type.startsWith("image/")) {
        alert("Debes seleccionar una imagen.");
        return;
      }

      const maxSizeMb = 1.5;

      if (file.size > maxSizeMb * 1024 * 1024) {
        alert(
          `El logo pesa demasiado. Usa una imagen menor a ${maxSizeMb} MB.`
        );

        return;
      }

      const logoDataUrl =
        await readImageAsDataUrl(file);

      updateTeamEverywhere(
        team.id,
        {
          logoDataUrl,
        }
      );
    } catch {
      alert("No se pudo cargar el logo del equipo.");
    } finally {
      event.target.value = "";
    }
  }

  function removeTeamLogo(team: Team) {
    const confirmRemove = window.confirm(
      `¿Quitar logo de ${team.name}?`
    );

    if (!confirmRemove) return;

    updateTeamEverywhere(
      team.id,
      {
        logoDataUrl: undefined,
      }
    );
  }

  function downloadBlankRegistrationTemplate() {
    exportBlankPlayerRegistrationTemplate({
      tournamentName: tournament?.name ?? "Campeonato",
      maxPlayers: 25,
    });
  }

  async function uploadRegistrationSheets(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files =
      Array.from(event.target.files ?? []);

    if (files.length === 0) return;

    try {
      let workingTeams = teams;

      const importedTeamMap =
        new Map<number, Team>();

      const playersByTeam =
        new Map<number, Player[]>();

      let totalSheets = 0;
      let newTeams = 0;
      let updatedTeams = 0;

      for (const file of files) {
        const imported =
          await importRegistrationSheetsFromExcel(
            file,
            workingTeams
          );

        imported.forEach((item) => {
          totalSheets++;

          importedTeamMap.set(
            item.team.id,
            item.team
          );

          playersByTeam.set(
            item.team.id,
            item.players
          );

          if (item.isNewTeam) {
            newTeams++;
          } else {
            updatedTeams++;
          }
        });

        workingTeams = mergeImportedTeams(
          workingTeams,
          imported.map((item) => item.team)
        );
      }

      if (totalSheets === 0) {
        alert(
          "No se encontró ninguna ficha válida. Revisa que el Excel tenga Equipo, Delegado, Categoría, Cancha y jugadores."
        );

        return;
      }

      const finalTeams =
        mergeImportedTeams(
          teams,
          Array.from(importedTeamMap.values())
        );

      setTeams(finalTeams);

      updateFixtureWithTeams(
        Array.from(importedTeamMap.values())
      );

      const importedTeamIds =
        new Set(playersByTeam.keys());

      const remainingPlayers =
        players.filter(
          (player) => !importedTeamIds.has(player.teamId)
        );

      const importedPlayers =
        Array.from(playersByTeam.values()).flat();

      setPlayers([
        ...remainingPlayers,
        ...importedPlayers,
      ]);

      alert(
        `Fichas importadas correctamente.\n\nEquipos nuevos: ${newTeams}\nEquipos actualizados: ${updatedTeams}\nJugadores importados: ${importedPlayers.length}`
      );
    } catch {
      alert(
        "No se pudo importar la ficha de inscripción. Revisa que sea un Excel válido."
      );
    } finally {
      event.target.value = "";
    }
  }

  function downloadTemplate(team: Team) {
    exportPlayerTemplate({
      tournamentName: tournament?.name ?? "Campeonato",
      team,
      maxPlayers: 25,
    });
  }

  function downloadAllTemplates() {
    if (teams.length === 0) {
      alert("No hay equipos registrados.");
      return;
    }

    exportAllPlayerTemplates({
      tournamentName: tournament?.name ?? "Campeonato",
      teams,
      maxPlayers: 25,
    });
  }

  function printTeamRoster(team: Team) {
    const teamPlayers = getPlayersByTeam(team.id);

    const html = buildTeamRosterHtml({
      tournamentName: tournament?.name ?? "Campeonato",
      team,
      players: teamPlayers,
      logoDataUrl,
    });

    printHtml(html);
  }

  function printAllRosters() {
    if (teams.length === 0) {
      alert("No hay equipos registrados.");
      return;
    }

    const html = buildAllRostersHtml({
      tournamentName: tournament?.name ?? "Campeonato",
      teams,
      players,
      logoDataUrl,
    });

    printHtml(html);
  }

  async function uploadAllTemplates(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    try {
      const imported =
        await importAllPlayersFromExcel(
          file,
          teams
        );

      if (imported.length === 0) {
        alert(
          "No se encontró ninguna ficha válida. Asegúrate de no borrar las filas de Equipo, Delegados, Categoría y Cancha."
        );

        return;
      }

      const importedTeamIds = new Set(
        imported.map((item) => item.team.id)
      );

      const newPlayers = imported.flatMap(
        (item) => item.players
      );

      const remainingPlayers = players.filter(
        (player) => !importedTeamIds.has(player.teamId)
      );

      setPlayers([
        ...remainingPlayers,
        ...newPlayers,
      ]);

      updateManyTeamDelegates(
        imported.map((item) => ({
          teamId: item.team.id,
          delegate1: item.delegate1,
          delegate2: item.delegate2,
        }))
      );

      alert(
        `${newPlayers.length} jugadores importados en ${imported.length} equipos.`
      );
    } catch {
      alert(
        "No se pudo leer el Excel con todas las fichas."
      );
    } finally {
      event.target.value = "";
    }
  }

  async function uploadTemplate(
    event: ChangeEvent<HTMLInputElement>,
    team: Team
  ) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    try {
      const result =
        await importPlayersFromExcel(
          file,
          team
        );

      setPlayersForTeam(
        team.id,
        result.players
      );

      updateTeamDelegates(
        team.id,
        result.delegate1,
        result.delegate2
      );

      alert(
        `${result.players.length} jugadores importados para ${team.name}.`
      );
    } catch {
      alert(
        "No se pudo leer la ficha Excel de jugadores."
      );
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div>
      <div style={headerBox}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                marginTop: 0,
              }}
            >
              👥 Registro de Jugadores
            </h2>

            <h1
              style={{
                marginTop: 0,
                fontSize: 34,
              }}
            >
              {tournament?.name ?? "TEAMCR7STUDIO"}
            </h1>

            <p
              style={{
                color: "#94a3b8",
                marginBottom: 0,
              }}
            >
              Descarga la ficha general, envíala a los equipos,
              recibe sus Excel llenos y súbelos para registrar
              equipos y jugadores.
            </p>

            {logoDataUrl && (
              <div style={logoNotice}>
                🖼 Logo del campeonato activo para fichas impresas/PDF
              </div>
            )}
          </div>

          <div style={headerActions}>
            <button
              onClick={downloadBlankRegistrationTemplate}
              style={registrationDownloadButton}
            >
              📥 Descargar ficha general para equipos
            </button>

            <input
              ref={registrationUploadRef}
              type="file"
              accept=".xlsx,.xls"
              multiple
              style={{
                display: "none",
              }}
              onChange={uploadRegistrationSheets}
            />

            <button
              onClick={() =>
                registrationUploadRef.current?.click()
              }
              style={registrationUploadButton}
            >
              📤 Subir fichas llenas y registrar equipos
            </button>

            <button
              onClick={downloadAllTemplates}
              style={allDownloadButton}
            >
              📥 Descargar fichas de equipos registrados
            </button>

            <input
              ref={allUploadRef}
              type="file"
              accept=".xlsx,.xls"
              style={{
                display: "none",
              }}
              onChange={uploadAllTemplates}
            />

            <button
              onClick={() => allUploadRef.current?.click()}
              style={allUploadButton}
            >
              📤 Subir fichas de equipos registrados
            </button>

            <button
              onClick={printAllRosters}
              style={allPrintButton}
            >
              📄 Imprimir todas las fichas
            </button>
          </div>
        </div>

        <div style={workflowBox}>
          <strong>Flujo recomendado:</strong>{" "}
          Descargar ficha general → enviarla a equipos → recibir Excel llenos →
          subir fichas → generar fixture.
        </div>
      </div>

      <div style={summaryGrid}>
        <SummaryBox
          title="Equipos Varones"
          value={menTeams.length}
          color="#93c5fd"
        />

        <SummaryBox
          title="Equipos Mujeres"
          value={womenTeams.length}
          color="#f9a8d4"
        />

        <SummaryBox
          title="Equipos Totales"
          value={teams.length}
          color="#facc15"
        />

        <SummaryBox
          title="Jugadores"
          value={players.length}
          color="#22c55e"
        />
      </div>

      {teams.length === 0 && (
        <div style={emptyIntroBox}>
          Todavía no hay equipos registrados. Descarga la ficha general,
          entrégala a los equipos y luego súbela para crear el registro
          automáticamente.
        </div>
      )}

      <TeamSection
        title="⚽ VARONES"
        teams={menTeams}
        color="#93c5fd"
        expandedTeamId={expandedTeamId}
        setExpandedTeamId={setExpandedTeamId}
        fileRefs={fileRefs}
        logoFileRefs={logoFileRefs}
        getPlayersByTeam={getPlayersByTeam}
        onDownload={downloadTemplate}
        onUpload={uploadTemplate}
        onPrint={printTeamRoster}
        onLogoUpload={uploadTeamLogo}
        onLogoRemove={removeTeamLogo}
      />

      {womenTeams.length > 0 && (
        <TeamSection
          title="👩 MUJERES"
          teams={womenTeams}
          color="#f9a8d4"
          expandedTeamId={expandedTeamId}
          setExpandedTeamId={setExpandedTeamId}
          fileRefs={fileRefs}
          logoFileRefs={logoFileRefs}
          getPlayersByTeam={getPlayersByTeam}
          onDownload={downloadTemplate}
          onUpload={uploadTemplate}
          onPrint={printTeamRoster}
          onLogoUpload={uploadTeamLogo}
          onLogoRemove={removeTeamLogo}
        />
      )}
    </div>
  );
}

function TeamSection({
  title,
  teams,
  color,
  expandedTeamId,
  setExpandedTeamId,
  fileRefs,
  logoFileRefs,
  getPlayersByTeam,
  onDownload,
  onUpload,
  onPrint,
  onLogoUpload,
  onLogoRemove,
}: {
  title: string;
  teams: Team[];
  color: string;
  expandedTeamId: number | null;
  setExpandedTeamId: (teamId: number | null) => void;
  fileRefs: MutableRefObject<
    Record<number, HTMLInputElement | null>
  >;
  logoFileRefs: MutableRefObject<
    Record<number, HTMLInputElement | null>
  >;
  getPlayersByTeam: (teamId: number) => Player[];
  onDownload: (team: Team) => void;
  onUpload: (
    event: ChangeEvent<HTMLInputElement>,
    team: Team
  ) => void;
  onPrint: (team: Team) => void;
  onLogoUpload: (
    event: ChangeEvent<HTMLInputElement>,
    team: Team
  ) => void;
  onLogoRemove: (team: Team) => void;
}) {
  const grouped =
    groupTeamsByCourt(teams);

  return (
    <section
      style={{
        marginTop: 30,
      }}
    >
      <h2
        style={{
          color,
          borderBottom: "3px solid #334155",
          paddingBottom: 12,
        }}
      >
        {title}
      </h2>

      {grouped.map((group) => (
        <div
          key={group.label}
          style={{
            marginTop: 25,
          }}
        >
          <h3
            style={{
              color,
            }}
          >
            🏟 {group.label}
          </h3>

          <div style={teamGrid}>
            {group.teams.map((team) => {
              const teamPlayers =
                getPlayersByTeam(team.id);

              const expanded =
                expandedTeamId === team.id;

              return (
                <TeamPlayerCard
                  key={team.id}
                  team={team}
                  players={teamPlayers}
                  color={color}
                  expanded={expanded}
                  onToggle={() =>
                    setExpandedTeamId(
                      expanded ? null : team.id
                    )
                  }
                  fileInputRef={(element) => {
                    fileRefs.current[team.id] = element;
                  }}
                  logoInputRef={(element) => {
                    logoFileRefs.current[team.id] = element;
                  }}
                  onDownload={() => onDownload(team)}
                  onUploadClick={() =>
                    fileRefs.current[team.id]?.click()
                  }
                  onUpload={(event) =>
                    onUpload(event, team)
                  }
                  onPrint={() => onPrint(team)}
                  onLogoUploadClick={() =>
                    logoFileRefs.current[team.id]?.click()
                  }
                  onLogoUpload={(event) =>
                    onLogoUpload(event, team)
                  }
                  onLogoRemove={() =>
                    onLogoRemove(team)
                  }
                />
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

function TeamPlayerCard({
  team,
  players,
  color,
  expanded,
  onToggle,
  fileInputRef,
  logoInputRef,
  onDownload,
  onUploadClick,
  onUpload,
  onPrint,
  onLogoUploadClick,
  onLogoUpload,
  onLogoRemove,
}: {
  team: Team;
  players: Player[];
  color: string;
  expanded: boolean;
  onToggle: () => void;
  fileInputRef: (
    element: HTMLInputElement | null
  ) => void;
  logoInputRef: (
    element: HTMLInputElement | null
  ) => void;
  onDownload: () => void;
  onUploadClick: () => void;
  onUpload: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;
  onPrint: () => void;
  onLogoUploadClick: () => void;
  onLogoUpload: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;
  onLogoRemove: () => void;
}) {
  return (
    <div
      style={{
        background: "#1e293b",
        border: `1px solid ${color}`,
        borderRadius: 14,
        padding: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 14,
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <TeamLogoBox team={team} />

        <div>
          <div
            style={{
              color,
              fontWeight: "bold",
              marginBottom: 6,
            }}
          >
            {getCategoryLabel(team)} | {getCourtLabel(team)}
          </div>

          <h3
            style={{
              margin: 0,
              fontSize: 24,
            }}
          >
            {team.name}
          </h3>
        </div>
      </div>

      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        style={{
          display: "none",
        }}
        onChange={onLogoUpload}
      />

      <div style={logoActions}>
        <button
          onClick={onLogoUploadClick}
          style={logoButton}
        >
          🖼 Subir logo equipo
        </button>

        {team.logoDataUrl && (
          <button
            onClick={onLogoRemove}
            style={removeLogoButton}
          >
            Quitar logo
          </button>
        )}
      </div>

      <p
        style={{
          color: "#94a3b8",
          marginBottom: 8,
        }}
      >
        Delegado 1:{" "}
        <strong>{team.delegate1 || "Sin registrar"}</strong>
      </p>

      <p
        style={{
          color: "#94a3b8",
        }}
      >
        Delegado 2:{" "}
        <strong>{team.delegate2 || "Sin registrar"}</strong>
      </p>

      <p
        style={{
          color: "#94a3b8",
        }}
      >
        Jugadores registrados:{" "}
        <strong>{players.length}</strong>
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{
          display: "none",
        }}
        onChange={onUpload}
      />

      <div style={buttonGrid}>
        <button
          onClick={onDownload}
          style={downloadButton}
        >
          📥 Descargar Excel
        </button>

        <button
          onClick={onUploadClick}
          style={uploadButton}
        >
          📤 Subir ficha
        </button>

        <button
          onClick={onPrint}
          style={printButton}
        >
          📄 Imprimir ficha
        </button>

        <button
          onClick={onToggle}
          style={secondaryButton}
        >
          {expanded
            ? "Ocultar jugadores"
            : "Ver jugadores"}
        </button>
      </div>

      {expanded && (
        <PlayersTable players={players} />
      )}
    </div>
  );
}

function TeamLogoBox({
  team,
}: {
  team: Team;
}) {
  if (!team.logoDataUrl) {
    return (
      <div style={teamLogoEmpty}>
        ⚽
      </div>
    );
  }

  return (
    <img
      src={team.logoDataUrl}
      alt={team.name}
      style={teamLogoPreview}
    />
  );
}

function PlayersTable({
  players,
}: {
  players: Player[];
}) {
  if (players.length === 0) {
    return (
      <div style={emptyBox}>
        Todavía no hay jugadores cargados para este equipo.
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 18,
        overflowX: "auto",
      }}
    >
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>N°</th>
            <th style={thStyle}>Jugador</th>
            <th style={thStyle}>DNI</th>
            <th style={thStyle}>Dorsal</th>
          </tr>
        </thead>

        <tbody>
          {players.map((player, index) => (
            <tr key={player.id}>
              <td style={tdStyle}>
                {String(index + 1).padStart(2, "0")}
              </td>

              <td style={tdStyle}>
                {player.name}
              </td>

              <td style={tdStyle}>
                {player.documentId}
              </td>

              <td style={tdStyle}>
                {player.jerseyNumber}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SummaryBox({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        background: "#1e293b",
        border: `1px solid ${color}`,
        borderRadius: 14,
        padding: 18,
      }}
    >
      <div
        style={{
          color,
          fontWeight: "bold",
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 30,
          fontWeight: "bold",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function groupTeamsByCourt(teams: Team[]) {
  const map = new Map<number, Team[]>();

  teams.forEach((team) => {
    const court = team.assignedCourt ?? 0;

    if (!map.has(court)) {
      map.set(court, []);
    }

    map.get(court)!.push(team);
  });

  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([court, list]) => {
      const firstTeam = list[0];

      const label =
        court === 0
          ? "Sin cancha"
          : firstTeam?.category === "WOMEN"
          ? `C. Mujer ${court}`
          : `Cancha ${court}`;

      return {
        label,
        teams: sortTeams(list),
      };
    });
}

const headerBox: CSSProperties = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 25,
  marginBottom: 25,
};

const headerActions: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(230px, 1fr))",
  gap: 12,
  width: "min(760px, 100%)",
};

const logoNotice: CSSProperties = {
  marginTop: 12,
  background: "#064e3b",
  border: "1px solid #16a34a",
  color: "#bbf7d0",
  borderRadius: 10,
  padding: 10,
  fontWeight: "bold",
  display: "inline-block",
};

const workflowBox: CSSProperties = {
  marginTop: 18,
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: 14,
  color: "#cbd5e1",
};

const summaryGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 15,
};

const teamGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(340px, 1fr))",
  gap: 18,
};

const teamLogoPreview: CSSProperties = {
  width: 72,
  height: 72,
  objectFit: "contain",
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 6,
  flexShrink: 0,
};

const teamLogoEmpty: CSSProperties = {
  width: 72,
  height: 72,
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 30,
  flexShrink: 0,
};

const logoActions: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(130px, 1fr))",
  gap: 10,
  marginBottom: 15,
};

const logoButton: CSSProperties = {
  padding: "10px",
  background: "#0ea5e9",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const removeLogoButton: CSSProperties = {
  padding: "10px",
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const buttonGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
};

const registrationDownloadButton: CSSProperties = {
  padding: "14px 18px",
  background: "#facc15",
  color: "#111827",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const registrationUploadButton: CSSProperties = {
  padding: "14px 18px",
  background: "#0ea5e9",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const allDownloadButton: CSSProperties = {
  padding: "14px 18px",
  background: "#f97316",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const allUploadButton: CSSProperties = {
  padding: "14px 18px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const allPrintButton: CSSProperties = {
  padding: "14px 18px",
  background: "#7c3aed",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const downloadButton: CSSProperties = {
  padding: "12px",
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const uploadButton: CSSProperties = {
  padding: "12px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const printButton: CSSProperties = {
  padding: "12px",
  background: "#7c3aed",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const secondaryButton: CSSProperties = {
  padding: "12px",
  background: "#334155",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const emptyBox: CSSProperties = {
  marginTop: 18,
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: 14,
  color: "#94a3b8",
};

const emptyIntroBox: CSSProperties = {
  marginTop: 25,
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 14,
  padding: 22,
  color: "#cbd5e1",
  textAlign: "center",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  padding: 10,
  textAlign: "left",
  color: "#93c5fd",
};

const tdStyle: CSSProperties = {
  border: "1px solid #334155",
  padding: 10,
};