import * as XLSX from "xlsx";

export function importTeamsFromExcel(
  file: File
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;

        const workbook = XLSX.read(data, {
          type: "binary",
        });

        const sheet =
          workbook.Sheets[workbook.SheetNames[0]];

        const rows: any[][] =
          XLSX.utils.sheet_to_json(sheet, {
            header: 1,
          });

        const teams = rows
          .slice(1)
          .map((row) => String(row[0] ?? "").trim())
          .filter((name) => name !== "");

        resolve(teams);
      } catch (error) {
        reject(error);
      }
    };

    reader.readAsBinaryString(file);
  });
}