// Plantillas de los recordatorios de vencimiento (compartidas por la Edge
// Function y, en el futuro, un preview en la app). Español, tono cercano.

export type OffsetKey = "minus_7" | "minus_3" | "day_0" | "plus_7" | "plus_30";

type Copy = { headline: (n: number) => string; cta: string };

const COPY: Record<OffsetKey, Copy> = {
  minus_7: {
    headline: () => "Tu membresía vence en 7 días",
    cta: "Renueva a tiempo y no pierdas tu acceso.",
  },
  minus_3: {
    headline: () => "Tu membresía vence en 3 días",
    cta: "Pasa a renovar para seguir entrenando sin interrupciones.",
  },
  day_0: {
    headline: () => "Tu membresía vence hoy",
    cta: "Renueva hoy mismo para mantener tu acceso activo.",
  },
  plus_7: {
    headline: () => "Tu membresía venció hace 7 días",
    cta: "Aún estás a tiempo de reactivarla. ¡Te esperamos!",
  },
  plus_30: {
    headline: () => "Tu membresía venció hace 30 días",
    cta: "Vuelve cuando quieras: reactiva tu membresía en recepción.",
  },
};

const OFFSET_DAYS: Record<OffsetKey, number> = {
  minus_7: -7,
  minus_3: -3,
  day_0: 0,
  plus_7: 7,
  plus_30: 30,
};

export type ReminderInput = {
  offsetKey: OffsetKey;
  clientName: string;
  planName: string;
  endDate: string; // ISO yyyy-mm-dd
  orgName: string;
  locale?: string;
};

export type RenderedEmail = { subject: string; text: string; html: string };

export function renderReminder(input: ReminderInput): RenderedEmail {
  const { offsetKey, clientName, planName, endDate, orgName } = input;
  const locale = input.locale ?? "es-MX";
  const copy = COPY[offsetKey];
  const headline = copy.headline(Math.abs(OFFSET_DAYS[offsetKey]));

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
