import * as XLSX from "xlsx";

import type { TeamCategory } from "../types/team";

export interface TopScorerExcelRow {
  playerName: string;
  teamName: string;
  category: TeamCategory;
  goals: number;
}

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "_");
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

function createSheet(
  title: string,
  rows: TopScorerExcelRow[]
) {
  const data: Array<Array<string | number>> = [
    [title],
    [],
    ["Pos", "Jugador/a", "Equipo", "Categoría", "Goles"],
  ];

  if (rows.length === 0) {
    data.push(["", "Sin goles registrados", "", "", ""]);
  } else {
    rows.forEach((row, index) => {
      data.push([
        index + 1,
        row.playerName,
        row.teamName,
        row.category === "WOMEN" ? "Mujeres" : "Varones",
        row.goals,
      ]);
    });
  }

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  worksheet["!cols"] = [
    { wch: 8 },
    { wch: 35 },
    { wch: 30 },
    { wch: 16 },
    { wch: 10 },
  ];

  worksheet["!merges"] = [
    {
      s: { r: 0, c: 0 },
      e: { r: 0, c: 4 },
    },
  ];

  return worksheet;
}

export function exportTopScorersToExcel({
  tournamentName,
  rows,
  showWomen,
}: {
  tournamentName: string;
  rows: TopScorerExcelRow[];
  showWomen: boolean;
}) {
  const workbook = XLSX.utils.book_new();

  const menRows = rows.filter(
    (row) => row.category !== "WOMEN"
  );

  const womenRows = rows.filter(
    (row) => row.category === "WOMEN"
  );

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["TABLA DE GOLEADORES"],
    [],
    ["Campeonato", tournamentName],
    ["Generado", new Date().toLocaleString()],
    [],
    ["Total goles varones", menRows.reduce((sum, row) => sum + row.goals, 0)],
    ["Total goles mujeres", womenRows.reduce((sum, row) => sum + row.goals, 0)],
    ["Total general", rows.reduce((sum, row) => sum + row.goals, 0)],
  ]);

  summarySheet["!cols"] = [
    { wch: 24 },
    { wch: 35 },
  ];

  XLSX.utils.book_append_sheet(
    workbook,
    summarySheet,
    "Resumen"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    createSheet("GOLEADORES VARONES", menRows),
    "Goleadores Varones"
  );

  if (showWomen) {
    XLSX.utils.book_append_sheet(
      workbook,
      createSheet("GOLEADORAS MUJERES", womenRows),
      "Goleadoras Mujeres"
    );
  }

  const filename = `Goleadores_${sanitizeFileName(
    tournamentName
  )}.xlsx`;

  downloadWorkbook(workbook, filename);
}