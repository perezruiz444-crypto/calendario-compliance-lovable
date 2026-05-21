import ExcelJS from 'exceljs';

export async function exportToExcel(
  rows: Record<string, string | number | null | undefined>[],
  sheetName: string,
  fileName: string,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  if (rows.length === 0) {
    sheet.addRow([]);
  } else {
    const keys = Object.keys(rows[0]);
    sheet.columns = keys.map((key) => ({
      header: key,
      key,
      width: Math.max(
        key.length + 2,
        ...rows.map((r) => String(r[key] ?? '').length + 2),
      ),
    }));
    sheet.getRow(1).font = { bold: true };
    rows.forEach((row) => sheet.addRow(row));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
