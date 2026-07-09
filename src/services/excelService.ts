import * as XLSX from "xlsx";

import type { Team } from "../types/team";
import type { Player } from "../types/player";

export interface ImportedTeamPlayers {
  team: Team;
  players: Player[];
  sheetName: string;
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "_");
}

function sanitizeSheetName(value: string) {
  return (
    value
      .replace(/[\\/?*[\]:]/g, "")
      .substring(0, 25)
      .trim() || "Equipo"
  );
}

function getUniqueSheetName(
  baseName: string,
  usedNames: Set<string>
) {
  let name = sanitizeSheetName(baseName);
  let counter = 1;

  while (usedNames.has(name)) {
    const suffix = `_${counter}`;

    name = `${sanitizeSheetName(baseName).substring(
      0,
      31 - suffix.length
    )}${suffix}`;

    counter++;
  }

  usedNames.add(name);

  return name;
}

function generateId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

function getCategoryLabel(team: Team) {
  if (team.category === "WOMEN") {
    return "MUJERES";
  }

  return "VARONES";
}

function getCourtLabel(team: Team) {
  if (team.category === "WOMEN") {
    return `C. Mujer ${team.assignedCourt ?? "-"}`;
  }

  return `Cancha ${team.assignedCourt ?? "-"}`;
}

function downloadWorkbook(
  workbook: XLSX.WorkBook,
  filename: string
) {
  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const blob = new Blob([excelBuffer], {
    type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download = filename;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function createPlayerTemplateSheet({
  tournamentName,
  team,
  maxPlayers = 25,
}: {
  tournamentName: string;
  team: Team;
  maxPlayers?: number;
}) {
  const rows: Array<Array<string | number>> = [
    ["FICHA OFICIAL DE JUGADORES", "", "", "", ""],
    [],
    ["Campeonato", tournamentName, "", "", ""],
    ["Equipo", team.name, "", "", ""],
    ["Categoría", getCategoryLabel(team), "", "", ""],
    ["Cancha", getCourtLabel(team), "", "", ""],
    [],
    [
      "N°",
      "APELLIDOS Y NOMBRES",
      "DOCUMENTO DE IDENTIDAD",
      "DORSAL",
      "FIRMA",
    ],
  ];

  for (let index = 1; index <= maxPlayers; index++) {
    rows.push([index, "", "", "", ""]);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 35 },
    { wch: 24 },
    { wch: 10 },
    { wch: 24 },
  ];

  worksheet["!merges"] = [
    {
      s: {
        r: 0,
        c: 0,
      },
      e: {
        r: 0,
        c: 4,
      },
    },
  ];

  return worksheet;
}

function getMetaValue(
  rows: Array<Array<string | number>>,
  label: string
) {
  const target = normalizeText(label);

  const row = rows.find((item) => {
    return normalizeText(cleanText(item[0])) === target;
  });

  return cleanText(row?.[1]);
}

function getCategoryFromMeta(value: string) {
  const normalized = normalizeText(value);

  if (normalized.includes("MUJER")) {
    return "WOMEN";
  }

  if (
    normalized.includes("VARON") ||
    normalized.includes("HOMBRE")
  ) {
    return "MEN";
  }

  return undefined;
}

function getCourtNumberFromMeta(value: string) {
  const match = value.match(/\d+/);

  if (!match) return undefined;

  return Number(match[0]);
}

function findTeamForSheet(
  rows: Array<Array<string | number>>,
  teams: Team[]
) {
  const teamName = getMetaValue(rows, "Equipo");

  const categoryText = getMetaValue(rows, "Categoría");

  const courtText = getMetaValue(rows, "Cancha");

  const category = getCategoryFromMeta(categoryText);

  const courtNumber = getCourtNumberFromMeta(courtText);

  if (!teamName) return null;

  let candidates = teams.filter(
    (team) =>
      normalizeText(team.name) === normalizeText(teamName)
  );

  if (category) {
    candidates = candidates.filter(
      (team) => (team.category ?? "MEN") === category
    );
  }

  if (courtNumber) {
    candidates = candidates.filter(
      (team) => team.assignedCourt === courtNumber
    );
  }

  return candidates[0] ?? null;
}

function getRowsFromSheet(sheet: XLSX.WorkSheet) {
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  }) as Array<Array<string | number>>;
}

function parsePlayersFromRows(
  rows: Array<Array<string | number>>,
  team: Team
): Player[] {
  const headerIndex = rows.findIndex((row) => {
    const secondColumn = normalizeText(cleanText(row[1]));

    const thirdColumn = normalizeText(cleanText(row[2]));

    return (
      secondColumn.includes("NOMBRES") ||
      secondColumn.includes("JUGADOR") ||
      thirdColumn.includes("DOCUMENTO")
    );
  });

  const startIndex = headerIndex >= 0 ? headerIndex + 1 : 8;

  return rows
    .slice(startIndex)
    .map((row) => {
      const name = cleanText(row[1]);

      const documentId = cleanText(row[2]);

      const jerseyNumber = cleanText(row[3]);

      return {
        id: generateId(),

        teamId: team.id,

        teamName: team.name,

        category: team.category ?? "MEN",

        name,

        documentId,

        jerseyNumber,
      };
    })
    .filter(
      (player) =>
        player.name ||
        player.documentId ||
        player.jerseyNumber
    );
}

export async function importTeamsFromExcel(
  file: File
): Promise<string[]> {
  const data = await file.arrayBuffer();

  const workbook = XLSX.read(data);

  const sheetName = workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];

  const rows = getRowsFromSheet(sheet);

  return rows
    .map((row) => cleanText(row[0]))
    .filter((name) => {
      const upper = normalizeText(name);

      if (!name) return false;

      if (
        upper === "EQUIPO" ||
        upper === "EQUIPOS" ||
        upper === "NOMBRE" ||
        upper === "NOMBRE DEL EQUIPO"
      ) {
        return false;
      }

      return true;
    });
}

export function exportPlayerTemplate({
  tournamentName,
  team,
  maxPlayers = 25,
}: {
  tournamentName: string;
  team: Team;
  maxPlayers?: number;
}) {
  const workbook = XLSX.utils.book_new();

  const worksheet = createPlayerTemplateSheet({
    tournamentName,
    team,
    maxPlayers,
  });

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Ficha Jugadores"
  );

  const filename = `Ficha_Jugadores_${sanitizeFileName(
    team.name
  )}.xlsx`;

  downloadWorkbook(workbook, filename);
}

export function exportAllPlayerTemplates({
  tournamentName,
  teams,
  maxPlayers = 25,
}: {
  tournamentName: string;
  teams: Team[];
  maxPlayers?: number;
}) {
  const workbook = XLSX.utils.book_new();

  const usedNames = new Set<string>();

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

  orderedTeams.forEach((team) => {
    const worksheet = createPlayerTemplateSheet({
      tournamentName,
      team,
      maxPlayers,
    });

    const prefix = team.category === "WOMEN" ? "M" : "V";

    const court = team.assignedCourt ?? 0;

    const sheetName = getUniqueSheetName(
      `${prefix}${court}_${team.name}`,
      usedNames
    );

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      sheetName
    );
  });

  const filename = `Fichas_Jugadores_${sanitizeFileName(
    tournamentName
  )}.xlsx`;

  downloadWorkbook(workbook, filename);
}

export async function importPlayersFromExcel(
  file: File,
  team: Team
): Promise<Player[]> {
  const data = await file.arrayBuffer();

  const workbook = XLSX.read(data);

  const sheetName = workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];

  const rows = getRowsFromSheet(sheet);

  return parsePlayersFromRows(rows, team);
}

export async function importAllPlayersFromExcel(
  file: File,
  teams: Team[]
): Promise<ImportedTeamPlayers[]> {
  const data = await file.arrayBuffer();

  const workbook = XLSX.read(data);

  const imported: ImportedTeamPlayers[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];

    const rows = getRowsFromSheet(sheet);

    const team = findTeamForSheet(rows, teams);

    if (!team) return;

    const players = parsePlayersFromRows(rows, team);

    imported.push({
      team,
      players,
      sheetName,
    });
  });

  return imported;
}