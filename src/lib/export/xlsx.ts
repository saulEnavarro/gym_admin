import ExcelJS from "exceljs";
import { sanitizeCell, type Column } from "./csv";

/**
 * Libro de Excel de una hoja a partir de filas tipadas.
 *
 * El saneo anti-inyección de fórmulas es el mismo que en CSV: aunque ExcelJS
 * escribe la celda como texto y no como fórmula, basta con que el usuario
 * reexporte o copie el valor para que la hoja lo reinterprete. Se sanea a la
 * salida y punto. Los números se escriben como número (no como texto) para que
 * sigan siendo sumables, con formato de moneda cuando la columna lo pide.
 */
export async function toXlsx<T>(
  rows: T[],
  columns: (Column<T> & { width?: number; money?: boolean })[],
  options: { sheetName?: string; title?: string } = {},
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Administrador de Gimnasio";
  wb.created = new Date();

  const ws = wb.addWorksheet(options.sheetName ?? "Reporte", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = columns.map((c) => ({
    header: sanitizeCell(c.header),
    key: c.header,
    width: c.width ?? 18,
  }));

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).alignment = { vertical: "middle" };

  for (const row of rows) {
    ws.addRow(
      columns.map((c) => {
        const v = c.value(row);
        return typeof v === "number" ? v : sanitizeCell(v);
      }),
    );
  }

  columns.forEach((c, i) => {
    if (c.money) ws.getColumn(i + 1).numFmt = '"$"#,##0.00';
  });

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  // ExcelJS declara su propio `Buffer`, que en realidad extiende ArrayBuffer;
  // devolverlo así lo hace un `BodyInit` válido para la Response.
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}
