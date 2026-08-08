// Plantillas de los recordatorios de vencimiento (compartidas por la Edge
// Function y, en el futuro, un preview en la app). Español, tono cercano.

export type OffsetKey = "minus_7" | "minus_3" | "day_0" | "plus_7" | "plus_30";

/**
 * El asunto se redacta con los días REALES que faltan (o pasaron) al momento de
 * enviar, no con los del `offset_key`. La cola tiene una ventana de recuperación
 * (migración 0018): si el envío sale con un día de retraso, un texto fijo de
 * «vence en 7 días» mentiría. El `offset_key` sólo elige el tono de la llamada
 * a la acción, que sí es estable.
 */
const CTA: Record<OffsetKey, string> = {
  minus_7: "Renueva a tiempo y no pierdas tu acceso.",
  minus_3: "Pasa a renovar para seguir entrenando sin interrupciones.",
  day_0: "Renueva hoy mismo para mantener tu acceso activo.",
  plus_7: "Aún estás a tiempo de reactivarla. ¡Te esperamos!",
  plus_30: "Vuelve cuando quieras: reactiva tu membresía en recepción.",
};

/** Días de calendario entre dos fechas ISO (b − a), sin que la hora estorbe. */
function dayDiff(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const ms =
    Date.UTC(by!, bm! - 1, bd!) - Date.UTC(ay!, am! - 1, ad!);
  return Math.round(ms / 86_400_000);
}

export function headlineFor(endDate: string, sentOn: string): string {
  const days = dayDiff(sentOn, endDate);
  if (days > 1) return `Tu membresía vence en ${days} días`;
  if (days === 1) return "Tu membresía vence mañana";
  if (days === 0) return "Tu membresía vence hoy";
  if (days === -1) return "Tu membresía venció ayer";
  return `Tu membresía venció hace ${Math.abs(days)} días`;
}

export type ReminderInput = {
  offsetKey: OffsetKey;
  clientName: string;
  planName: string;
  endDate: string; // ISO yyyy-mm-dd
  orgName: string;
  /** Día del envío (ISO). Por defecto, hoy. */
  sentOn?: string;
  locale?: string;
};

export type RenderedEmail = { subject: string; text: string; html: string };

export function renderReminder(input: ReminderInput): RenderedEmail {
  const { offsetKey, clientName, planName, endDate, orgName } = input;
  const locale = input.locale ?? "es-MX";
  const sentOn = input.sentOn ?? new Date().toISOString().slice(0, 10);
  const copy = { cta: CTA[offsetKey] };
  const headline = headlineFor(endDate, sentOn);

  const venceFmt = new Date(endDate + "T00:00:00").toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const subject = `${headline} · ${orgName}`;

  const text = [
    `Hola ${clientName},`,
    "",
    `${headline}.`,
    `Plan: ${planName}. Fecha de vencimiento: ${venceFmt}.`,
    "",
    copy.cta,
    "",
    `— ${orgName}`,
    "",
    "Si ya no deseas recibir estos recordatorios, pídelo en recepción.",
  ].join("\n");

  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f4f4f5;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#18181b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7">
      <tr><td style="background:#4f46e5;color:#ffffff;padding:20px 24px;font-size:18px;font-weight:bold">${escapeHtml(orgName)}</td></tr>
      <tr><td style="padding:24px">
        <p style="margin:0 0 8px;font-size:16px">Hola ${escapeHtml(clientName)},</p>
        <h1 style="margin:8px 0;font-size:20px;color:#4f46e5">${escapeHtml(headline)}</h1>
        <p style="margin:8px 0;font-size:14px;color:#3f3f46">Plan: <strong>${escapeHtml(planName)}</strong><br>Vence: <strong>${escapeHtml(venceFmt)}</strong></p>
        <p style="margin:16px 0;font-size:14px">${escapeHtml(copy.cta)}</p>
      </td></tr>
      <tr><td style="padding:16px 24px;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a">— ${escapeHtml(orgName)}. Si ya no deseas recibir estos recordatorios, pídelo en recepción.</td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
