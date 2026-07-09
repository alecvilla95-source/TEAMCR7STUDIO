import {
  useRef,
  useState,
  type CSSProperties,
} from "react";

import type { Team } from "../../types/team";
import type { Player } from "../../types/player";

import { useTournament } from "../../store/tournamentStore";
import { useTeams } from "../../store/teamStore";
import { usePlayers } from "../../store/playerStore";

import {
  exportPlayerTemplate,
  exportAllPlayerTemplates,
  importPlayersFromExcel,
  importAllPlayersFromExcel,
} from "../../services/excelService";

function getCategoryColor(team: Team) {
  if (team.category === "WOMEN") {
    return "#f9a8d4";
  }

  return "#93c5fd";
}

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

function renderPlayerRows(players: Player[]) {
  const rows =
    players.length > 0
      ? players
      : Array.from({
          length: 10,
        }).map(() => null);

  return rows
    .map((player, index) => {
      return `
        <tr>
          <td>${String(index + 1).padStart(2, "0")}</td>
          <td>${player ? escapeHtml(player.name) : ""}</td>
          <td>${player ? escapeHtml(player.documentId) : ""}</td>
          <td>${player ? escapeHtml(player.jerseyNumber) : ""}</td>
          <td></td>
        </tr>
      `;
    })
    .join("");
}

function buildTeamRosterHtml({
  tournamentName,
  team,
  players,
  autoPrint = true,
}: {
  tournamentName: string;
  team: Team;
  players: Player[];
  autoPrint?: boolean;
}) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />

        <title>Ficha de Jugadores</title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, sans-serif;
            margin: 25px;
            color: #111827;
          }

          .sheet {
            page-break-after: always;
          }

          .sheet:last-child {
            page-break-after: auto;
          }

          .top {
            display: grid;
            grid-template-columns: 1fr 2fr 1fr;
            border: 1px solid #111827;
            margin-bottom: 0;
          }

          .logo-box,
          .title-box,
          .blank-box {
            min-height: 115px;
            border-right: 1px solid #111827;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 10px;
          }

          .blank-box {
            border-right: none;
          }

          .logo-placeholder {
            font-weight: bold;
            font-size: 13px;
            color: #6b7280;
          }

          .title-box h1 {
            margin: 0;
            font-size: 22px;
            text-transform: uppercase;
          }

          .title-box h2 {
            margin: 8px 0 0;
            font-size: 26px;
            text-transform: uppercase;
          }

          table.info {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
          }

          table.info td {
            border: 1px solid #111827;
            padding: 10px;
            font-size: 14px;
            height: 36px;
          }

          table.info td:first-child {
            width: 190px;
            font-weight: bold;
            background: #f3f4f6;
          }

          table.info td:nth-child(2) {
            font-weight: bold;
          }

          .category {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            text-transform: uppercase;
          }

          table.players {
            width: 100%;
            border-collapse: collapse;
          }

          table.players th,
          table.players td {
            border: 1px solid #111827;
            padding: 8px;
            font-size: 13px;
            height: 42px;
          }

          table.players th {
            background: #f3f4f6;
            text-align: center;
            font-weight: bold;
          }

          table.players td:first-child,
          table.players td:nth-child(4) {
            text-align: center;
            font-weight: bold;
          }

          .footer {
            margin-top: 28px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 50px;
            text-align: center;
            font-size: 13px;
          }

          .signature {
            border-top: 1px solid #111827;
            padding-top: 8px;
            margin-top: 55px;
          }

          @media print {
            body {
              margin: 14mm;
            }
          }
        </style>
      </head>

      <body>
        <div class="sheet">
          <div class="top">
            <div class="logo-box">
              <div class="logo-placeholder">
                LOGO<br />ORGANIZADOR
              </div>
            </div>

            <div class="title-box">
              <div>
                <h1>${escapeHtml(tournamentName)}</h1>
                <h2>Ficha de jugadores</h2>
              </div>
            </div>

            <div class="blank-box"></div>
          </div>

          <table class="info">
            <tbody>
              <tr>
                <td>EQUIPO:</td>
                <td>${escapeHtml(team.name)}</td>
              </tr>

              <tr>
                <td>DELEGADO 1:</td>
                <td>${escapeHtml(team.delegate1 ?? "")}</td>
              </tr>

              <tr>
                <td>DELEGADO 2:</td>
                <td>${escapeHtml(team.delegate2 ?? "")}</td>
              </tr>

              <tr>
                <td>CATEGORIA:</td>
                <td class="category">${escapeHtml(getCategoryLabel(team))}</td>
              </tr>

              <tr>
                <td>CANCHA:</td>
                <td>${escapeHtml(getCourtLabel(team))}</td>
              </tr>
            </tbody>
          </table>

          <table class="players">
            <thead>
              <tr>
                <th style="width: 55px;">N°</th>
                <th>APELLIDOS Y NOMBRES</th>
                <th style="width: 170px;">DNI</th>
                <th style="width: 85px;">DORSAL</th>
                <th style="width: 150px;">FIRMA</th>
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
}: {
  tournamentName: string;
  teams: Team[];
  players: Player[];
}) {
  const orderedTeams = [...teams].sort((a, b) => {
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

  const sheets = orderedTeams
    .map((team) => {
      const teamPlayers = players.filter(
        (player) => player.teamId === team.id
      );

      return buildTeamRosterHtml({
        tournamentName,
        team,
        players: teamPlayers,
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
          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, sans-serif;
            margin: 25px;
            color: #111827;
          }

          .sheet {
            page-break-after: always;
          }

          .sheet:last-child {
            page-break-after: auto;
          }

          .top {
            display: grid;
            grid-template-columns: 1fr 2fr 1fr;
            border: 1px solid #111827;
            margin-bottom: 0;
          }

          .logo-box,
          .title-box,
          .blank-box {
            min-height: 115px;
            border-right: 1px solid #111827;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 10px;
          }

          .blank-box {
            border-right: none;
          }

          .logo-placeholder {
            font-weight: bold;
            font-size: 13px;
            color: #6b7280;
          }

          .title-box h1 {
            margin: 0;
            font-size: 22px;
            text-transform: uppercase;
          }

          .title-box h2 {
            margin: 8px 0 0;
            font-size: 26px;
            text-transform: uppercase;
          }

          table.info {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
          }

          table.info td {
            border: 1px solid #111827;
            padding: 10px;
            font-size: 14px;
            height: 36px;
          }

          table.info td:first-child {
            width: 190px;
            font-weight: bold;
            background: #f3f4f6;
          }

          table.info td:nth-child(2) {
            font-weight: bold;
          }

          .category {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            text-transform: uppercase;
          }

          table.players {
            width: 100%;
            border-collapse: collapse;
          }

          table.players th,
          table.players td {
            border: 1px solid #111827;
            padding: 8px;
            font-size: 13px;
            height: 42px;
          }

          table.players th {
            background: #f3f4f6;
            text-align: center;
            font-weight: bold;
          }

          table.players td:first-child,
          table.players td:nth-child(4) {
            text-align: center;
            font-weight: bold;
          }

          .footer {
            margin-top: 28px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 50px;
            text-align: center;
            font-size: 13px;
          }

          .signature {
            border-top: 1px solid #111827;
            padding-top: 8px;
            margin-top: 55px;
          }

          @media print {
            body {
              margin: 14mm;
            }
          }
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

export default function PlayersView() {
  const { tournament } = useTournament();

  const { teams, setTeams } = useTeams();

  const {
    players,
    setPlayers,
    getPlayersByTeam,
    setPlayersForTeam,
  } = usePlayers();

  const [expandedTeamId, setExpandedTeamId] =
    useState<number | null>(null);

  const fileRefs =
    useRef<Record<number, HTMLInputElement | null>>({});

  const allUploadRef =
    useRef<HTMLInputElement | null>(null);

  const menTeams = teams.filter(
    (team) => team.category !== "WOMEN"
  );

  const womenTeams = teams.filter(
    (team) => team.category === "WOMEN"
  );

  function updateTeamDelegates(
    teamId: number,
    delegate1: string,
    delegate2: string
  ) {
    const nextTeams = teams.map((team) => {
      if (team.id !== teamId) {
        return team;
      }

      return {
        ...team,
        delegate1,
        delegate2,
      };
    });

    setTeams(nextTeams);
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
  }

  function downloadTemplate(team: Team) {
    exportPlayerTemplate({
      tournamentName: tournament?.name ?? "Campeonato",
      team,
      maxPlayers: 10,
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
      maxPlayers: 10,
    });
  }

  function printTeamRoster(team: Team) {
    const teamPlayers = getPlayersByTeam(team.id);

    const html = buildTeamRosterHtml({
      tournamentName: tournament?.name ?? "Campeonato",
      team,
      players: teamPlayers,
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
    });

    printHtml(html);
  }

  async function uploadAllTemplates(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

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
    event: React.ChangeEvent<HTMLInputElement>,
    team: Team
  ) {
    const file = event.target.files?.[0];

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
              Descarga las fichas Excel, entrégalas para que las rellenen y
              luego súbelas al sistema.
            </p>
          </div>

          <div style={headerActions}>
            <button
              onClick={downloadAllTemplates}
              style={allDownloadButton}
            >
              📥 Descargar todas las fichas Excel
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
              📤 Subir todas las fichas llenas
            </button>

            <button
              onClick={printAllRosters}
              style={allPrintButton}
            >
              📄 Imprimir todas las fichas
            </button>
          </div>
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
      </div>

      <TeamSection
        title="⚽ VARONES"
        teams={menTeams}
        color="#93c5fd"
        expandedTeamId={expandedTeamId}
        setExpandedTeamId={setExpandedTeamId}
        fileRefs={fileRefs}
        getPlayersByTeam={getPlayersByTeam}
        onDownload={downloadTemplate}
        onUpload={uploadTemplate}
        onPrint={printTeamRoster}
      />

      {womenTeams.length > 0 && (
        <TeamSection
          title="👩 MUJERES"
          teams={womenTeams}
          color="#f9a8d4"
          expandedTeamId={expandedTeamId}
          setExpandedTeamId={setExpandedTeamId}
          fileRefs={fileRefs}
          getPlayersByTeam={getPlayersByTeam}
          onDownload={downloadTemplate}
          onUpload={uploadTemplate}
          onPrint={printTeamRoster}
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
  getPlayersByTeam,
  onDownload,
  onUpload,
  onPrint,
}: {
  title: string;
  teams: Team[];
  color: string;
  expandedTeamId: number | null;
  setExpandedTeamId: (teamId: number | null) => void;
  fileRefs: React.MutableRefObject<
    Record<number, HTMLInputElement | null>
  >;
  getPlayersByTeam: (teamId: number) => Player[];
  onDownload: (team: Team) => void;
  onUpload: (
    event: React.ChangeEvent<HTMLInputElement>,
    team: Team
  ) => void;
  onPrint: (team: Team) => void;
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
              const players =
                getPlayersByTeam(team.id);

              const expanded =
                expandedTeamId === team.id;

              return (
                <TeamPlayerCard
                  key={team.id}
                  team={team}
                  players={players}
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
                  onDownload={() => onDownload(team)}
                  onUploadClick={() =>
                    fileRefs.current[team.id]?.click()
                  }
                  onUpload={(event) =>
                    onUpload(event, team)
                  }
                  onPrint={() => onPrint(team)}
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
  onDownload,
  onUploadClick,
  onUpload,
  onPrint,
}: {
  team: Team;
  players: Player[];
  color: string;
  expanded: boolean;
  onToggle: () => void;
  fileInputRef: (
    element: HTMLInputElement | null
  ) => void;
  onDownload: () => void;
  onUploadClick: () => void;
  onUpload: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
  onPrint: () => void;
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
        {getCategoryLabel(team)} | {getCourtLabel(team)}
      </div>

      <h3
        style={{
          marginTop: 0,
          fontSize: 24,
        }}
      >
        {team.name}
      </h3>

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
        teams: list,
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
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
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

const buttonGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
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