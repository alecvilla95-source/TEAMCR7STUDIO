import * as XLSX from "xlsx";

import type { TeamCategory } from "../types/team";

interface TopScorerExcelRow {
  key?: string;
  teamId?: number;
  playerId?: string;
  playerName: string;
  teamName: string;
  teamLogoDataUrl?: string;
  category: TeamCategory;
  goals: number;
}

interface ExportTopScorersOptions {
  tournamentName: string;
  rows: TopScorerExcelRow[];
  showWomen: boolean;
}

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "_")
    .trim();
}

function getCategoryLabel(category: TeamCategory) {
  if (category === "WOMEN") {
    return "MUJERES";
  }

  return "VARONES";
}

function getCategoryTitle(category: TeamCategory) {
  if (category === "WOMEN") {
    return "GOLEADORAS MUJERES";
  }

  return "GOLEADORES VARONES";
}

function sortRows(rows: TopScorerExcelRow[]) {
  return [...rows].sort((a, b) => {
    if (b.goals !== a.goals) {
      return b.goals - a.goals;
    }

    if (a.teamName !== b.teamName) {
      return a.teamName.localeCompare(b.teamName);
    }

    return a.playerName.localeCompare(b.playerName);
  });
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

function setSheetLayout(
  worksheet: XLSX.WorkSheet,
  totalRows: number
) {
  worksheet["!cols"] = [
    {
      wch: 8,
    },
    {
      wch: 34,
    },
    {
      wch: 30,
    },
    {
      wch: 18,
    },
    {
      wch: 12,
    },
    {
      wch: 16,
    },
  ];

  worksheet["!rows"] = Array.from({
    length: totalRows,
  }).map((_, index) => {
    if (index === 0) {
      return {
        hpt: 32,
      };
    }

    if (index === 4) {
      return {
        hpt: 24,
      };
    }

    return {
      hpt: 21,
    };
  });

  worksheet["!merges"] = [
    {
      s: {
        r: 0,
        c: 0,
      },
      e: {
        r: 0,
        c: 5,
      },
    },
  ];

  if (totalRows >= 6) {
    worksheet["!autofilter"] = {
      ref: `A5:F${totalRows}`,
    };
  }
}

function createScorersSheet({
  title,
  tournamentName,
  rows,
}: {
  title: string;
  tournamentName: string;
  rows: TopScorerExcelRow[];
}) {
  const sortedRows = sortRows(rows);

  const sheetRows: Array<Array<string | number>> = [
    [title],
    ["Campeonato:", tournamentName],
    ["Generado:", new Date().toLocaleString()],
    [],
    [
      "POS",
      "JUGADOR/A",
      "EQUIPO",
      "CATEGORÍA",
      "GOLES",
      "LOGO",
    ],
  ];

  if (sortedRows.length === 0) {
    sheetRows.push([
      "-",
      "Sin goles registrados",
      "-",
      "-",
      0,
      "-",
    ]);
  } else {
    sortedRows.forEach((row, index) => {
      sheetRows.push([
        index + 1,
        row.playerName,
        row.teamName,
        getCategoryLabel(row.category),
        row.goals,
        row.teamLogoDataUrl ? "CON LOGO" : "SIN LOGO",
      ]);
    });
  }

  sheetRows.push([]);
  sheetRows.push([
    "",
    "",
    "",
    "TOTAL GOLES:",
    sortedRows.reduce(
      (total, row) => total + row.goals,
      0
    ),
    "",
  ]);

  const worksheet =
    XLSX.utils.aoa_to_sheet(sheetRows);

  setSheetLayout(
    worksheet,
    sheetRows.length
  );

  return worksheet;
}

function createSummarySheet({
  tournamentName,
  rows,
  showWomen,
}: {
  tournamentName: string;
  rows: TopScorerExcelRow[];
  showWomen: boolean;
}) {
  const menRows = rows.filter(
    (row) => row.category !== "WOMEN"
  );

  const womenRows = rows.filter(
    (row) => row.category === "WOMEN"
  );

  const sortedAll = sortRows(rows);

  const topPlayer =
    sortedAll[0] ?? null;

  const totalGoals = rows.reduce(
    (total, row) => total + row.goals,
    0
  );

  const totalMenGoals = menRows.reduce(
    (total, row) => total + row.goals,
    0
  );

  const totalWomenGoals = womenRows.reduce(
    (total, row) => total + row.goals,
    0
  );

  const summaryRows: Array<Array<string | number>> = [
    ["RESUMEN DE GOLEADORES"],
    ["Campeonato:", tournamentName],
    ["Generado:", new Date().toLocaleString()],
    [],
    ["RESUMEN GENERAL", "", "", "", "", ""],
    ["Total jugadores con goles", rows.length],
    ["Total goles", totalGoals],
    [
      "Máximo goleador/a",
      topPlayer
        ? `${topPlayer.playerName} - ${topPlayer.teamName}`
        : "Sin registros",
    ],
    [
      "Goles del máximo goleador/a",
      topPlayer ? topPlayer.goals : 0,
    ],
    [],
    ["CATEGORÍA", "JUGADORES", "GOLES", "PROMEDIO", "", ""],
    [
      "VARONES",
      menRows.length,
      totalMenGoals,
      menRows.length > 0
        ? Number((totalMenGoals / menRows.length).toFixed(2))
        : 0,
      "",
      "",
    ],
  ];

  if (showWomen) {
    summaryRows.push([
      "MUJERES",
      womenRows.length,
      totalWomenGoals,
      womenRows.length > 0
        ? Number((totalWomenGoals / womenRows.length).toFixed(2))
        : 0,
      "",
      "",
    ]);
  }

  summaryRows.push([]);
  summaryRows.push([
    "TOP 10 GENERAL",
    "",
    "",
    "",
    "",
    "",
  ]);
  summaryRows.push([
    "POS",
    "JUGADOR/A",
    "EQUIPO",
    "CATEGORÍA",
    "GOLES",
    "LOGO",
  ]);

  if (sortedAll.length === 0) {
    summaryRows.push([
      "-",
      "Sin goles registrados",
      "-",
      "-",
      0,
      "-",
    ]);
  } else {
    sortedAll.slice(0, 10).forEach((row, index) => {
      summaryRows.push([
        index + 1,
        row.playerName,
        row.teamName,
        getCategoryLabel(row.category),
        row.goals,
        row.teamLogoDataUrl ? "CON LOGO" : "SIN LOGO",
      ]);
    });
  }

  const worksheet =
    XLSX.utils.aoa_to_sheet(summaryRows);

  worksheet["!cols"] = [
    {
      wch: 14,
    },
    {
      wch: 34,
    },
    {
      wch: 30,
    },
    {
      wch: 18,
    },
    {
      wch: 12,
    },
    {
      wch: 16,
    },
  ];

  worksheet["!rows"] = Array.from({
    length: summaryRows.length,
  }).map((_, index) => {
    if (index === 0) {
      return {
        hpt: 32,
      };
    }

    return {
      hpt: 22,
    };
  });

  worksheet["!merges"] = [
    {
      s: {
        r: 0,
        c: 0,
      },
      e: {
        r: 0,
        c: 5,
      },
    },
    {
      s: {
        r: 4,
        c: 0,
      },
      e: {
        r: 4,
        c: 5,
      },
    },
  ];

  return worksheet;
}

function createAllSheet({
  tournamentName,
  rows,
}: {
  tournamentName: string;
  rows: TopScorerExcelRow[];
}) {
  const sortedRows = sortRows(rows);

  const sheetRows: Array<Array<string | number>> = [
    ["TODOS LOS GOLEADORES"],
    ["Campeonato:", tournamentName],
    ["Generado:", new Date().toLocaleString()],
    [],
    [
      "POS",
      "JUGADOR/A",
      "EQUIPO",
      "CATEGORÍA",
      "GOLES",
      "LOGO",
    ],
  ];

  if (sortedRows.length === 0) {
    sheetRows.push([
      "-",
      "Sin goles registrados",
      "-",
      "-",
      0,
      "-",
    ]);
  } else {
    sortedRows.forEach((row, index) => {
      sheetRows.push([
        index + 1,
        row.playerName,
        row.teamName,
        getCategoryLabel(row.category),
        row.goals,
        row.teamLogoDataUrl ? "CON LOGO" : "SIN LOGO",
      ]);
    });
  }

  const worksheet =
    XLSX.utils.aoa_to_sheet(sheetRows);

  setSheetLayout(
    worksheet,
    sheetRows.length
  );

  return worksheet;
}

export function exportTopScorersToExcel({
  tournamentName,
  rows,
  showWomen,
}: ExportTopScorersOptions) {
  const workbook =
    XLSX.utils.book_new();

  const menRows = rows.filter(
    (row) => row.category !== "WOMEN"
  );

  const womenRows = rows.filter(
    (row) => row.category === "WOMEN"
  );

  const summarySheet =
    createSummarySheet({
      tournamentName,
      rows,
      showWomen,
    });

  XLSX.utils.book_append_sheet(
    workbook,
    summarySheet,
    "Resumen"
  );

  const menSheet =
    createScorersSheet({
      title: getCategoryTitle("MEN"),
      tournamentName,
      rows: menRows,
    });

  XLSX.utils.book_append_sheet(
    workbook,
    menSheet,
    "Goleadores Varones"
  );

  if (showWomen) {
    const womenSheet =
      createScorersSheet({
        title: getCategoryTitle("WOMEN"),
        tournamentName,
        rows: womenRows,
      });

    XLSX.utils.book_append_sheet(
      workbook,
      womenSheet,
      "Goleadoras Mujeres"
    );
  }

  const allSheet =
    createAllSheet({
      tournamentName,
      rows,
    });

  XLSX.utils.book_append_sheet(
    workbook,
    allSheet,
    "Todos"
  );

  const filename =
    `Goleadores_${sanitizeFileName(
      tournamentName || "TEAMCR7STUDIO"
    )}.xlsx`;

  downloadWorkbook(
    workbook,
    filename
  );
}