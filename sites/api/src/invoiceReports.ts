import { Hono } from "hono";
import {
  badRequest,
  jsonResponse,
  requireAuthMode,
  serverError,
  type HonoEnv,
} from "./apiTypes";

export type AgingBucket =
  | "current"
  | "1-30"
  | "31-60"
  | "61-90"
  | "91-120"
  | "121+";
type InvoiceReportLine = {
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  projectReference: string;
  issueDate: string;
  dueDate: string;
  amountDueCents: number;
  daysPastDue: number;
  agingBucket: AgingBucket;
  paymentUrl: string;
};
type InvoiceReport = {
  generatedDate: string;
  clientId: string;
  clientName: string;
  openInvoiceCount: number;
  openBalanceCents: number;
  pastDueCount: number;
  pastDueBalanceCents: number;
  aging: Record<AgingBucket, number>;
  invoices: InvoiceReportLine[];
};

const EASTERN = "America/New_York";
const BUCKETS: AgingBucket[] = [
  "current",
  "1-30",
  "31-60",
  "61-90",
  "91-120",
  "121+",
];

function text(value: unknown): string {
  return String(value ?? "").trim();
}
function cents(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}
function easternDate(value = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EASTERN,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Number.isFinite(start) && Number.isFinite(end)
    ? Math.max(0, Math.floor((end - start) / 86_400_000))
    : 0;
}
function bucket(daysPastDue: number, dueDate: string): AgingBucket {
  if (!dueDate || daysPastDue === 0) return "current";
  if (daysPastDue <= 30) return "1-30";
  if (daysPastDue <= 60) return "31-60";
  if (daysPastDue <= 90) return "61-90";
  if (daysPastDue <= 120) return "91-120";
  return "121+";
}
function publicBase(env: HonoEnv["Bindings"]): string {
  return text(env.INVOICE_PUBLIC_BASE_URL).replace(/\/+$/g, "");
}

/** Builds all open accounts-receivable report lines using the same payment ledger used by the invoice workflow. */
export async function buildInvoiceReport(
  env: HonoEnv["Bindings"],
  clientId = "",
): Promise<InvoiceReport> {
  const today = easternDate();
  const base = publicBase(env);
  const conditions = ["i.status = 'sent'"] as string[];
  const bindings: string[] = [];
  if (clientId) {
    conditions.push("i.qbo_customer_id = ?");
    bindings.push(clientId);
  }
  const rows = await env.DB.prepare(
    `SELECT i.id, i.invoice_number, i.qbo_customer_id, i.client_name, i.project_reference, i.issue_date, i.due_date, i.public_token, i.total_cents, COALESCE(SUM(CASE WHEN p.status = 'succeeded' THEN p.gross_cents ELSE 0 END), 0) AS paid_cents FROM invoices i LEFT JOIN invoice_payments p ON p.invoice_id = i.id WHERE ${conditions.join(" AND ")} GROUP BY i.id HAVING i.total_cents > COALESCE(SUM(CASE WHEN p.status = 'succeeded' THEN p.gross_cents ELSE 0 END), 0) ORDER BY i.due_date ASC, i.invoice_number ASC`,
  )
    .bind(...bindings)
    .all<Record<string, unknown>>();
  const aging = Object.fromEntries(BUCKETS.map((key) => [key, 0])) as Record<
    AgingBucket,
    number
  >;
  const invoices = (rows.results || []).map((row): InvoiceReportLine => {
    const dueDate = text(row.due_date);
    const daysPastDue =
      dueDate && dueDate < today ? daysBetween(dueDate, today) : 0;
    const agingBucket = bucket(daysPastDue, dueDate);
    const amountDueCents = Math.max(
      0,
      cents(row.total_cents) - cents(row.paid_cents),
    );
    aging[agingBucket] += amountDueCents;
    return {
      invoiceId: text(row.id),
      invoiceNumber: text(row.invoice_number),
      clientId: text(row.qbo_customer_id),
      clientName: text(row.client_name),
      projectReference: text(row.project_reference),
      issueDate: text(row.issue_date),
      dueDate,
      amountDueCents,
      daysPastDue,
      agingBucket,
      paymentUrl: `${base}/pay/${encodeURIComponent(text(row.public_token))}`,
    };
  });
  const clientRow =
    !invoices.length && clientId
      ? await env.DB.prepare(
          "SELECT display_name FROM qbo_customers WHERE qbo_id = ?",
        )
          .bind(clientId)
          .first<{ display_name?: unknown }>()
      : null;
  const clientName = invoices[0]?.clientName || text(clientRow?.display_name);
  const pastDue = invoices.filter((invoice) => invoice.daysPastDue > 0);
  return {
    generatedDate: today,
    clientId,
    clientName,
    openInvoiceCount: invoices.length,
    openBalanceCents: invoices.reduce(
      (sum, invoice) => sum + invoice.amountDueCents,
      0,
    ),
    pastDueCount: pastDue.length,
    pastDueBalanceCents: pastDue.reduce(
      (sum, invoice) => sum + invoice.amountDueCents,
      0,
    ),
    aging,
    invoices,
  };
}

export function createInvoiceReportsApi() {
  const app = new Hono<HonoEnv>();
  app.get("/api/invoice-reports/client", async (context) => {
    const authError = requireAuthMode(context, "microsoft");
    if (authError) return authError;
    const clientId = text(context.req.query("qboCustomerId"));
    if (!clientId) return badRequest("qboCustomerId is required");
    try {
      return jsonResponse({
        report: await buildInvoiceReport(context.env, clientId),
      });
    } catch (error) {
      console.error("Error building client invoice report:", error);
      return serverError(String(error));
    }
  });
  return app;
}

function currency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value / 100);
}
function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ] || character,
  );
}
function reportHtml(
  reports: InvoiceReport[],
  statusCounts: Record<string, number>,
): string {
  const combined = reports.flatMap((report) => report.invoices);
  const open = combined.reduce((sum, line) => sum + line.amountDueCents, 0);
  const overdue = combined.filter((line) => line.daysPastDue > 0);
  const rows =
    reports
      .filter((report) => report.pastDueCount > 0)
      .map(
        (report) =>
          `<tr><td style="text-align: center; font-family: Arial, Helvetica, sans-serif;">${escapeHtml(report.clientName || report.clientId)}</td><td style="text-align: center; font-family: Arial, Helvetica, sans-serif;">${report.pastDueCount}</td><td style="text-align: center; font-family: Arial, Helvetica, sans-serif;">${currency(report.pastDueBalanceCents)}</td><td style="text-align: center; font-family: Arial, Helvetica, sans-serif;">${report.invoices
            .filter((line) => line.daysPastDue > 0)
            .map(
              (line) =>
                `${escapeHtml(line.invoiceNumber)} (${line.daysPastDue}d)`,
            )
            .join("<br />")}</td></tr>`,
      )
      .join("\n") || '<tr><td colspan="4">No past-due invoices.</td></tr>';
  const aging = BUCKETS.map(
    (key) =>
      [
        key.charAt(0).toUpperCase() + key.slice(1), // Capitalized aging bucket name
        combined
          .filter((line) => line.agingBucket === key)
          .reduce((sum, line) => sum + line.amountDueCents, 0),
      ] as const,
  );
  return `<div style=padding:20px><h1 style=text-align:center;font-family:Arial,sans-serif;color:#333;padding:10px;margin:0;line-height:1.2;text-transform:uppercase>Weekly Invoice Summary</h1><p style=text-align:center;font-family:Arial,sans-serif;color:#555;margin-top:2px>Report generated on: ${escapeHtml(reports[0]?.generatedDate || easternDate())}<h2 style=text-align:center;font-family:Arial,sans-serif;color:#333;padding:10px;margin:0;margin-top:20px;line-height:1.2;text-transform:uppercase>All invoice statuses</h2><table border=0 cellpadding=6 cellspacing=0 style=width:100%;border-collapse:collapse><tr><td style=width:25%;font-family:Arial,Helvetica,sans-serif;text-align:center>Draft: <span style=font-weight:700>${statusCounts.draft || 0}</span><td style=width:25%;font-family:Arial,Helvetica,sans-serif;text-align:center>Open: <span style=font-weight:700>${statusCounts.sent || 0}</span><tr><td style=width:25%;font-family:Arial,Helvetica,sans-serif;text-align:center>Paid: <span style=font-weight:700>${statusCounts.paid || 0}</span><td style=width:25%;font-family:Arial,Helvetica,sans-serif;text-align:center>Void: <span style=font-weight:700>${statusCounts.void || 0}</span></table><h2 style=text-align:center;font-family:Arial,sans-serif;color:#333;padding:10px;margin:0;margin-top:20px;line-height:1.2;text-transform:uppercase>Accounts Receivable Summary</h2><p><strong>${combined.length}</strong> open invoices totaling <strong>${currency(open)}</strong>.<br><strong>${overdue.length}</strong> past due totaling <strong>${currency(overdue.reduce((sum, line) => sum + line.amountDueCents, 0))}</strong>.<h2 style=text-align:center;font-family:Arial,sans-serif;color:#333;padding:10px;margin:0;margin-top:20px;line-height:1.2;text-transform:uppercase>Accounts Receivable Aging</h2><table border=1 cellpadding=6 cellspacing=0 style=width:100%><tr>${aging.map(([key]) => `<th style=text-align:center;width:16.6667%;font-family:Arial,Helvetica,sans-serif>${key}</th>`).join("")}<tr>${aging.map(([, value]) => `<td style=text-align:center;font-family:Arial,Helvetica,sans-serif>${currency(value)}</td>`).join("")}</table><h2 style=text-align:center;font-family:Arial,sans-serif;color:#333;padding:10px;margin:0;margin-top:20px;line-height:1.2;text-transform:uppercase>Past-due clients</h2><table border=1 cellpadding=6 cellspacing=0 style=width:100%><tr><th style=text-align:center;font-family:Arial,Helvetica,sans-serif;width:25%>Client<th style=text-align:center;font-family:Arial,Helvetica,sans-serif;width:10%>Invoices<th style=text-align:center;font-family:Arial,Helvetica,sans-serif;width:10%>Past due<th style=text-align:center;font-family:Arial,Helvetica,sans-serif;width:55%>Invoice list</tr>${rows}</table></div>`;
}

/** Sends the weekly report once for the supplied Eastern calendar date. */
export async function runWeeklyInvoiceReport(
  env: HonoEnv["Bindings"],
  scheduledAt = new Date(),
): Promise<void> {
  const recipients = text(env.WEEKLY_INVOICE_REPORT_RECIPIENTS)
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.includes("@"));
  if (!recipients.length)
    throw new Error("Missing WEEKLY_INVOICE_REPORT_RECIPIENTS");
  const date = easternDate(scheduledAt);
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS invoice_report_runs (report_date TEXT PRIMARY KEY, status TEXT NOT NULL, created_date TEXT NOT NULL, sent_date TEXT)",
  ).run();
  const claim = await env.DB.prepare(
    "INSERT OR IGNORE INTO invoice_report_runs (report_date, status, created_date) VALUES (?, 'sending', ?)",
  )
    .bind(date, new Date().toISOString())
    .run();
  if ((claim.meta.changes || 0) === 0) {
    const retry = await env.DB.prepare(
      "UPDATE invoice_report_runs SET status = 'sending' WHERE report_date = ? AND status = 'failed'",
    )
      .bind(date)
      .run();
    if ((retry.meta.changes || 0) === 0) return;
  }
  try {
    const clients = await env.DB.prepare(
      "SELECT DISTINCT qbo_customer_id FROM invoices WHERE status = 'sent' AND qbo_customer_id != ''",
    ).all<{ qbo_customer_id?: unknown }>();
    const reports = await Promise.all(
      (clients.results || []).map((row) =>
        buildInvoiceReport(env, text(row.qbo_customer_id)),
      ),
    );
    const statuses = await env.DB.prepare(
      "SELECT status, COUNT(*) AS count FROM invoices GROUP BY status",
    ).all<{ status?: unknown; count?: unknown }>();
    const statusCounts = Object.fromEntries(
      (statuses.results || []).map((row) => [
        text(row.status),
        cents(row.count),
      ]),
    );
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": text(env.BREVO_API_KEY),
      },
      body: JSON.stringify({
        sender: { email: text(env.SENDER_EMAIL), name: "White Point Survey" },
        to: recipients.map((email) => ({ email })),
        replyTo: { email: text(env.SENDER_EMAIL) },
        subject: `Weekly invoice summary - ${date}`,
        htmlContent: reportHtml(reports, statusCounts),
        ...(text(env.BREVO_SANDBOX).toLowerCase() === "true"
          ? { headers: { "X-Sib-Sandbox": "drop" } }
          : {}),
      }),
    });
    if (!response.ok)
      throw new Error(
        `Brevo weekly invoice report failed: ${(await response.text()) || response.statusText}`,
      );
    await env.DB.prepare(
      "UPDATE invoice_report_runs SET status = 'sent', sent_date = ? WHERE report_date = ?",
    )
      .bind(new Date().toISOString(), date)
      .run();
  } catch (error) {
    await env.DB.prepare(
      "UPDATE invoice_report_runs SET status = 'failed' WHERE report_date = ?",
    )
      .bind(date)
      .run();
    throw error;
  }
}

/** Returns true only at Sunday 8 PM in Eastern time, across EST and EDT. */
export function isWeeklyInvoiceReportTime(value = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN,
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  return (
    parts.find((part) => part.type === "weekday")?.value === "Sun" &&
    parts.find((part) => part.type === "hour")?.value === "20"
  );
}
