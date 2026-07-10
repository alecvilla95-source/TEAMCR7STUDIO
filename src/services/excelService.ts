import * as XLSX from "xlsx";

import type { Team } from "../types/team";
import type { Player } from "../types/player";

export interface ImportedPlayerSheet {
  team: Team;
  players: Player[];
  delegate1: string;
  delegate2: string;
}

export interface ImportedTeamPlayers {
  team: Team;
  players: Player[];
  sheetName: string;
  delegate1: string;
  delegate2: string;
}

export interface ImportedRegistrationSheet {
  team: Team;
  players: Player[];
  sheetName: string;
  delegate1: string;
  delegate2: string;
  isNewTeam: boolean;
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[:.]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "_")
    .trim();
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

function getNextTeamId(teams: Team[]) {
  const maxId = teams.reduce(
    (max, team) => Math.max(max, team.id),
    0
  );

  return maxId + 1;
}

function getFootballCategoryLabel(team?: Partial<Team> | null) {
  if (team?.category === "WOMEN") {
    return "FÚTBOL FEMENINO";
  }

  return "FÚTBOL MASCULINO";
}

function getCourtLabel(team?: Partial<Team> | null) {
  if (!team?.assignedCourt) {
    return "";
  }

  if (team.category === "WOMEN") {
    return `C. Mujer ${team.assignedCourt}`;
  }

  return `Cancha ${team.assignedCourt}`;
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
  team?: Partial<Team> | null;
  maxPlayers?: number;
}) {
  const rows: Array<Array<string | number>> = [
    [
      "LOGO TEAMCR7STUDIO",
      `"${tournamentName}"`,
      "",
      "LOGO CAMPEONATO",
      "",
    ],
    [],
    [
      "EQUIPO:",
      team?.name ?? "",
      "",
      "LOGO DE EQUIPO",
      "",
    ],
    [
      "DELEGADO 1:",
      team?.delegate1 ?? "",
      "",
      "",
      "",
    ],
    [
      "DELEGADO 2:",
      team?.delegate2 ?? "",
      "",
      "",
      "",
    ],
    [
      "CATEGORIA:",
      team?.category
        ? getFootballCategoryLabel(team)
        : "FÚTBOL MASCULINO",
      "",
      "",
      "",
    ],
    [
      "CANCHA:",
      team?.assignedCourt
        ? getCourtLabel(team)
        : "",
      "",
      "",
      "",
    ],
    [],
    [
      "N°",
      "NOMBRE Y APELLIDOS",
      "D.N.I.",
      "FIRMA",
      "DORSAL",
    ],
  ];

  for (
    let index = 1;
    index <= maxPlayers;
    index++
  ) {
    rows.push([
      index.toString().padStart(2, "0"),
      "",
      "",
      "",
      "",
    ]);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  worksheet["!cols"] = [
    {
      wch: 8,
    },
    {
      wch: 44,
    },
    {
      wch: 20,
    },
    {
      wch: 22,
    },
    {
      wch: 12,
    },
  ];

  worksheet["!rows"] = [
    {
      hpt: 95,
    },
    {
      hpt: 8,
    },
    {
      hpt: 45,
    },
    {
      hpt: 28,
    },
    {
      hpt: 28,
    },
    {
      hpt: 28,
    },
    {
      hpt: 28,
    },
    {
      hpt: 12,
    },
    {
      hpt: 30,
    },
    ...Array.from({
      length: maxPlayers,
    }).map(() => ({
      hpt: 28,
    })),
  ];

  worksheet["!merges"] = [
    {
      s: { r: 0, c: 1 },
      e: { r: 0, c: 2 },
    },
    {
      s: { r: 0, c: 3 },
      e: { r: 0, c: 4 },
    },
    {
      s: { r: 2, c: 1 },
      e: { r: 2, c: 2 },
    },
    {
      s: { r: 2, c: 3 },
      e: { r: 4, c: 4 },
    },
    {
      s: { r: 3, c: 1 },
      e: { r: 3, c: 2 },
    },
    {
      s: { r: 4, c: 1 },
      e: { r: 4, c: 2 },
    },
    {
      s: { r: 5, c: 1 },
      e: { r: 5, c: 4 },
    },
    {
      s: { r: 6, c: 1 },
      e: { r: 6, c: 4 },
    },
  ];

  return worksheet;
}

function getRowsFromSheet(sheet: XLSX.WorkSheet) {
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  }) as Array<Array<string | number>>;
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

function getCategoryFromMeta(value: string): Team["category"] {
  const normalized = normalizeText(value);

  if (
    normalized.includes("MUJER") ||
    normalized.includes("FEMENINO") ||
    normalized.includes("WOMEN")
  ) {
    return "WOMEN";
  }

  if (
    normalized.includes("VARON") ||
    normalized.includes("HOMBRE") ||
    normalized.includes("MASCULINO") ||
    normalized.includes("MEN")
  ) {
    return "MEN";
  }

  return "MEN";
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
  const teamName =
    getMetaValue(rows, "Equipo");

  const categoryText =
    getMetaValue(rows, "Categoria");

  const courtText =
    getMetaValue(rows, "Cancha");

  const category =
    getCategoryFromMeta(categoryText);

  const courtNumber =
    getCourtNumberFromMeta(courtText);

  if (!teamName) return null;

  const cleanTeamName =
    teamName.replaceAll('"', "").trim();

  let candidates = teams.filter(
    (team) =>
      normalizeText(team.name) ===
      normalizeText(cleanTeamName)
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

function parsePlayersFromRows(
  rows: Array<Array<string | number>>,
  team: Team
): Player[] {
  const headerIndex = rows.findIndex((row) => {
    const secondColumn =
      normalizeText(cleanText(row[1]));

    const thirdColumn =
      normalizeText(cleanText(row[2]));

    const fourthColumn =
      normalizeText(cleanText(row[3]));

    const fifthColumn =
      normalizeText(cleanText(row[4]));

    return (
      secondColumn.includes("NOMBRE") ||
      secondColumn.includes("APELLIDO") ||
      thirdColumn.includes("DNI") ||
      thirdColumn.includes("DOCUMENTO") ||
      fourthColumn.includes("FIRMA") ||
      fifthColumn.includes("DORSAL")
    );
  });

  const startIndex =
    headerIndex >= 0
      ? headerIndex + 1
      : 9;

  return rows
    .slice(startIndex)
    .map((row) => {
      const name =
        cleanText(row[1]);

      const documentId =
        cleanText(row[2]);

      const jerseyNumber =
        cleanText(row[4]);

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

function parsePlayerSheet(
  rows: Array<Array<string | number>>,
  team: Team
): ImportedPlayerSheet {
  const delegate1 =
    getMetaValue(rows, "Delegado 1");

  const delegate2 =
    getMetaValue(rows, "Delegado 2");

  const players =
    parsePlayersFromRows(rows, team);

  return {
    team,
    players,
    delegate1,
    delegate2,
  };
}

function buildTeamFromRegistrationSheet({
  rows,
  teams,
  nextId,
}: {
  rows: Array<Array<string | number>>;
  teams: Team[];
  nextId: number;
}) {
  const teamName =
    getMetaValue(rows, "Equipo")
      .replaceAll('"', "")
      .trim();

  if (!teamName) {
    return null;
  }

  const delegate1 =
    getMetaValue(rows, "Delegado 1");

  const delegate2 =
    getMetaValue(rows, "Delegado 2");

  const categoryText =
    getMetaValue(rows, "Categoria");

  const courtText =
    getMetaValue(rows, "Cancha");

  const category =
    getCategoryFromMeta(categoryText) ?? "MEN";

  const assignedCourt =
    getCourtNumberFromMeta(courtText);

  const existingTeam = teams.find((team) => {
    const sameName =
      normalizeText(team.name) ===
      normalizeText(teamName);

    const sameCategory =
      (team.category ?? "MEN") === category;

    return sameName && sameCategory;
  });

  if (existingTeam) {
    return {
      team: {
        ...existingTeam,
        delegate1,
        delegate2,
        assignedCourt:
          assignedCourt ?? existingTeam.assignedCourt,
        category,
      },
      isNewTeam: false,
    };
  }

  const newTeam: Team = {
    id: nextId,
    name: teamName,
    category,
    assignedCourt,
    delegate1,
    delegate2,
  };

  return {
    team: newTeam,
    isNewTeam: true,
  };
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

export function exportBlankPlayerRegistrationTemplate({
  tournamentName,
  maxPlayers = 25,
}: {
  tournamentName: string;
  maxPlayers?: number;
}) {
  const workbook = XLSX.utils.book_new();

  const worksheet = createPlayerTemplateSheet({
    tournamentName,
    team: null,
    maxPlayers,
  });

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Ficha Inscripcion"
  );

  const filename =
    `Ficha_Inscripcion_${sanitizeFileName(
      tournamentName || "TEAMCR7STUDIO"
    )}.xlsx`;

  downloadWorkbook(
    workbook,
    filename
  );
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

  const filename =
    `Ficha_Jugadores_${sanitizeFileName(
      team.name
    )}.xlsx`;

  downloadWorkbook(
    workbook,
    filename
  );
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
    const categoryA =
      a.category === "WOMEN" ? 2 : 1;

    const categoryB =
      b.category === "WOMEN" ? 2 : 1;

    if (categoryA !== categoryB) {
      return categoryA - categoryB;
    }

    if (
      (a.assignedCourt ?? 0) !==
      (b.assignedCourt ?? 0)
    ) {
      return (
        (a.assignedCourt ?? 0) -
        (b.assignedCourt ?? 0)
      );
    }

    return a.name.localeCompare(b.name);
  });

  orderedTeams.forEach((team) => {
    const worksheet = createPlayerTemplateSheet({
      tournamentName,
      team,
      maxPlayers,
    });

    const prefix =
      team.category === "WOMEN" ? "M" : "V";

    const court =
      team.assignedCourt ?? 0;

    const sheetName =
      getUniqueSheetName(
        `${prefix}${court}_${team.name}`,
        usedNames
      );

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      sheetName
    );
  });

  const filename =
    `Fichas_Jugadores_${sanitizeFileName(
      tournamentName
    )}.xlsx`;

  downloadWorkbook(
    workbook,
    filename
  );
}

export async function importPlayersFromExcel(
  file: File,
  team: Team
): Promise<ImportedPlayerSheet> {
  const data = await file.arrayBuffer();

  const workbook = XLSX.read(data);

  const sheetName = workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];

  const rows = getRowsFromSheet(sheet);

  return parsePlayerSheet(
    rows,
    team
  );
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

    const team = findTeamForSheet(
      rows,
      teams
    );

    if (!team) return;

    const parsed =
      parsePlayerSheet(
        rows,
        team
      );

    imported.push({
      team,
      players: parsed.players,
      sheetName,
      delegate1: parsed.delegate1,
      delegate2: parsed.delegate2,
    });
  });

  return imported;
}

export async function importRegistrationSheetsFromExcel(
  file: File,
  teams: Team[]
): Promise<ImportedRegistrationSheet[]> {
  const data = await file.arrayBuffer();

  const workbook = XLSX.read(data);

  const imported: ImportedRegistrationSheet[] = [];

  let nextId = getNextTeamId(teams);

  const currentTeams = [...teams];

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];

    const rows = getRowsFromSheet(sheet);

    const builtTeam =
      buildTeamFromRegistrationSheet({
        rows,
        teams: currentTeams,
        nextId,
      });

    if (!builtTeam) return;

    if (builtTeam.isNewTeam) {
      nextId++;
      currentTeams.push(builtTeam.team);
    }

    const players =
      parsePlayersFromRows(
        rows,
        builtTeam.team
      );

    imported.push({
      team: builtTeam.team,
      players,
      sheetName,
      delegate1:
        builtTeam.team.delegate1 ?? "",
      delegate2:
        builtTeam.team.delegate2 ?? "",
      isNewTeam: builtTeam.isNewTeam,
    });
  });

  return imported;
}