// Edge Function · process-reminders
//
// Drena la cola public.reminder_outbox (status='pending', due_on<=hoy) y envía
// cada recordatorio por SMTP. En local el SMTP apunta a Mailpit; en producción
// se cambian las variables SMTP_* (o se apunta a un relay del proveedor).
//
// Seguridad: se protege con la cabecera `x-reminder-secret` (verify_jwt=false en
// config.toml). El disparo lo hace pg_cron → pg_net con ese secreto.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { renderReminder, type OffsetKey } from "../_shared/reminder-template.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INVOKE_SECRET = Deno.env.get("REMINDER_INVOKE_SECRET") ?? "";

const SMTP_HOST = Deno.env.get("SMTP_HOST") ?? "host.docker.internal";
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") ?? "54325");
const SMTP_FROM =
  Deno.env.get("SMTP_FROM") ?? "Registro Gym <no-reply@registro-gym.test>";

const BATCH = 100;

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!INVOKE_SECRET || req.headers.get("x-reminder-secret") !== INVOKE_SECRET) {
    return json({ error: "unauthorized" }, 401);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const today = new Date().toISOString().slice(0, 10);

  // Pendientes cuyo momento ya llegó y que además están listas para intentarse
  // (next_attempt_at gobierna el retroceso de los reintentos, migración 0018).
  const { data: rows, error } = await supabase
    .from("reminder_outbox")
    .select(
      "id, offset_key, due_on, email, org_id, " +
        "clients(first_name,last_name), " +
        "client_memberships(plan_name,end_date), " +
        "organizations(name)",
    )
    .eq("status", "pending")
    .lte("due_on", today)
    .lte("next_attempt_at", new Date().toISOString())
    .order("due_on", { ascending: true })
    .limit(BATCH);

  if (error) return json({ error: error.message }, 500);
  if (!rows || rows.length === 0) return json({ processed: 0, sent: 0, failed: 0 });

  const orgIds = [...new Set(rows.map((r) => r.org_id))];
  const { data: brandings } = await supabase
    .from("org_branding")
    .select("org_id, display_name")
    .in("org_id", orgIds);
  const displayName = new Map(
    (brandings ?? []).map((b) => [b.org_id, b.display_name]),
  );

  let sent = 0;
  let failed = 0;

  for (const r of rows) {
    const client = pickOne(r.clients);
    const membership = pickOne(r.client_memberships);
    const org = pickOne(r.organizations);
    const orgName = displayName.get(r.org_id) ?? org?.name ?? "Tu gimnasio";
    const clientName = client
      ? `${client.first_name} ${client.last_name}`.trim()
      : "cliente";

    try {
      const mail = renderReminder({
        offsetKey: r.offset_key as OffsetKey,
        clientName,
        planName: membership?.plan_name ?? "tu membresía",
        endDate: membership?.end_date ?? r.due_on,
        orgName,
        sentOn: today, // los días del asunto se cuentan al ENVIAR, no al encolar
      });

      await sendMail({
        host: SMTP_HOST,
        port: SMTP_PORT,
        from: SMTP_FROM,
        to: r.email,
        subject: mail.subject,
        html: mail.html,
      });

      // Las transiciones viven en la base: la política de reintentos es una
      // sola y no depende de quién drene la cola.
      await supabase.rpc("mark_reminder_sent", { p_id: r.id });
      sent++;
    } catch (e) {
      await supabase.rpc("mark_reminder_failed", {
        p_id: r.id,
        p_error: String(e instanceof Error ? e.message : e),
      });
      failed++;
    }
  }

  return json({ processed: rows.length, sent, failed });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cliente SMTP mínimo (texto plano, sin TLS/auth) para Mailpit en local.
// Encapsulado aquí: para un proveedor de producción (Resend/SMTP con TLS+auth)
// se sustituye esta función por un transporte con STARTTLS y AUTH.
// ─────────────────────────────────────────────────────────────────────────────
async function sendMail(opts: {
  host: string;
  port: number;
  from: string;
  to: string;
  subject: string;
  html: string;
}) {
  const addr = (s: string) => {
    const m = s.match(/<([^>]+)>/);
    return m ? m[1] : s.trim();
  };

  const conn = await Deno.connect({ hostname: opts.host, port: opts.port });
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const buf = new Uint8Array(4096);

  async function read(expect: number) {
    const n = await conn.read(buf);
    const line = n ? dec.decode(buf.subarray(0, n)) : "";
    const code = parseInt(line.slice(0, 3), 10);
    if (code !== expect) throw new Error(`SMTP ${code}: ${line.trim()}`);
  }
  async function cmd(text: string, expect: number) {
    await conn.write(enc.encode(text + "\r\n"));
    await read(expect);
  }

  try {
    await read(220);
    await cmd(`EHLO registro-gym`, 250);
    await cmd(`MAIL FROM:<${addr(opts.from)}>`, 250);
    await cmd(`RCPT TO:<${addr(opts.to)}>`, 250);
    await cmd(`DATA`, 354);

    const subjectMime = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(opts.subject)))}?=`;
    const body = opts.html.replace(/\r?\n/g, "\r\n").replace(/\r\n\./g, "\r\n..");
    const message =
      `From: ${opts.from}\r\n` +
      `To: ${opts.to}\r\n` +
      `Subject: ${subjectMime}\r\n` +
      `MIME-Version: 1.0\r\n` +
      `Content-Type: text/html; charset=UTF-8\r\n` +
      `\r\n` +
      body +
      `\r\n.\r\n`;
    await conn.write(enc.encode(message));
    await read(250);
    await cmd(`QUIT`, 221);
  } finally {
    conn.close();
  }
}

function pickOne<T>(v: T | T[] | null): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
