import "server-only";
import ExcelJS from "exceljs";

/** Fila de cliente extraída de un archivo de importación. */
export type ParsedClient = {
  first_name: string;
  last_name: string;
  email?: string;
  mobile_phone?: string;
};

export type ParseResult = { rows: ParsedClient[]; skipped: number };

const NAME_KEYS = ["nombre completo", "nombre", "nombres", "cliente", "name"];
const LAST_KEYS = ["apellidos", "apellido", "apellido paterno", "apellidos paterno"];
const EMAIL_KEYS = ["email", "correo", "correo electronico", "e-mail", "mail"];
const PHONE_KEYS = ["telefono", "celular", "movil", "phone", "tel", "whatsapp"];

/** Normaliza un encabezado: sin acentos, minúsculas, sin espacios sobrantes. */
function norm(s: string): string {
  // ̀-ͯ = marcas diacríticas combinantes (los acentos tras NFD).
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Divide un nombre completo en nombre(s) y apellidos. Heurística simple: la
 * primera palabra es el nombre y el resto los apellidos (los nombres mexicanos
 * suelen llevar 1–2 apellidos al final). Un solo término deja apellidos vacío.
 * El staff puede afinar cada ficha después.
 */
export function splitFullName(full: string): {
  first_name: string;
  last_name: string;
} {
  const cleaned = full.replace(/\s+/g, " ").trim();
  if (!cleaned) return { first_name: "", last_name: "" };
  const parts = cleaned.split(" ");
  if (parts.length === 1) return { first_name: parts[0] ?? "", last_name: "" };
  return { first_name: parts[0] ?? "", last_name: parts.slice(1).join(" ") };
}

/** Índice de la primera columna cuyo encabezado coincide con alguna clave. */
function findColumn(headers: string[], keys: string[]): number {
  // Coincidencia exacta primero; luego "empieza con" (p. ej. "nombre del socio").
  const exact = headers.findIndex((h) => keys.includes(h));
  if (exact !== -1) return exact;
  return headers.findIndex((h) => keys.some((k) => h.startsWith(k)));
}

function cell(row: string[], idx: number): string {
  if (idx < 0) return "";
  return (row[idx] ?? "").toString().replace(/\s+/g, " ").trim();
}

/** Construye las filas de cliente a partir de una matriz (primera fila = encabezados). */
function rowsFromMatrix(matrix: string[][]): ParseResult {
  if (matrix.length < 2) {
    throw new Error(
      "El archivo no tiene datos. Se espera una fila de encabezados y al menos un cliente.",
    );
  }
  const headers = (matrix[0] ?? []).map((h) => norm(String(h)));
  const fullIdx = findColumn(headers, NAME_KEYS);
  const lastIdx = findColumn(headers, LAST_KEYS);
  const emailIdx = findColumn(headers, EMAIL_KEYS);
  const phoneIdx = findColumn(headers, PHONE_KEYS);

  if (fullIdx < 0) {
    throw new Error(
      'No encontré una columna de nombre. Añade un encabezado "Nombre" (o "Nombre" y "Apellidos").',
    );
  }
  // ¿Columnas separadas de nombre y apellidos, o un solo nombre completo?
  const separate = lastIdx >= 0 && lastIdx !== fullIdx;

  const rows: ParsedClient[] = [];
  let skipped = 0;

  for (let i = 1; i < matrix.length; i++) {
    const raw = matrix[i] ?? [];
    const nameCell = cell(raw, fullIdx);

    let first_name = "";
    let last_name = "";
    if (separate) {
      first_name = nameCell;
      last_name = cell(raw, lastIdx);
    } else {
      const split = splitFullName(nameCell);
      first_name = split.first_name;
      last_name = split.last_name;
    }

    if (!first_name) {
      skipped++;
      continue;
    }

    const email = cell(raw, emailIdx);
    const phone = cell(raw, phoneIdx);
    rows.push({
      first_name,
      last_name,
      ...(email ? { email } : {}),
      ...(phone ? { mobile_phone: phone } : {}),
    });
  }

  return { rows, skipped };
}

/** Parsea un XLSX (primera hoja) a una matriz de celdas string. */
async function parseXlsx(buf: Buffer): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  // @types/node tipa Buffer como Buffer<ArrayBufferLike>; exceljs espera el
  // Buffer «clásico». El cast puentea ese desfase de tipos (mismo valor en runtime).
  await wb.xlsx.load(buf as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("El libro de Excel no tiene hojas.");

  const matrix: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const values = (row.values as unknown[]) ?? [];
    // exceljs indexa desde 1; el índice 0 va vacío.
    const cells = values.slice(1).map((v) => cellToString(v));
    matrix.push(cells);
  });
  return matrix;
}

function cellToString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.text === "string") return o.text;
    if (o.result != null) return String(o.result);
    if (Array.isArray(o.richText)) {
      return (o.richText as { text: string }[]).map((t) => t.text).join("");
    }
    return "";
  }
  return String(v);
}

/** Parser CSV mínimo con soporte de comillas dobles y saltos internos. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/\r\n?/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Punto de entrada: extrae clientes de un archivo .xlsx o .csv subido. */
export async function parseClientsFromFile(file: File): Promise<ParseResult> {
  const buf = Buffer.from(await file.arrayBuffer());
  const lower = file.name.toLowerCase();
  const matrix = lower.endsWith(".csv")
    ? parseCsv(buf.toString("utf8"))
    : await parseXlsx(buf);
  return rowsFromMatrix(matrix);
}
