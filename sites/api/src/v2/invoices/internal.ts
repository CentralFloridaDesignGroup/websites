import { normalizeNumber, normalizeString } from "cfdg/scripts";
import type {
  InvoiceAddressSnapshot,
  InvoiceBrandingSnapshot,
  InvoiceBundle,
  InvoiceLineItemV2,
  InvoiceNumberingSettings,
  InvoiceV2,
  InvoiceV2DueType,
  InvoiceV2LineType,
  InvoiceV2QboSyncStatus,
  InvoiceV2Status,
} from "cfdg/types";

export type DbRow = Record<string, unknown>;

export const DEFAULT_NUMBERING: InvoiceNumberingSettings = {
  invoiceTemplate: "WPS-YYYY-####",
  bundleTemplate: "WPS-B-YYYY-####",
  resetEachYear: true,
  startingSequence: 1,
};

const DUE_TYPES = new Set(["dueOnReceipt", "net30", "net45", "net60", "payWhenPaid"]);
const STATUSES = new Set(["draft", "active", "paid", "void", "refunded"]);
const LINE_TYPES = new Set(["billable", "informational"]);

export function normalizeDueType(value: unknown): InvoiceV2DueType | null {
  const normalized = normalizeString(value);
  return DUE_TYPES.has(normalized) ? normalized as InvoiceV2DueType : null;
}

export function normalizeStatus(value: unknown): InvoiceV2Status {
  const normalized = normalizeString(value);
  return STATUSES.has(normalized) ? normalized as InvoiceV2Status : "draft";
}

export function normalizeLineType(value: unknown): InvoiceV2LineType | null {
  const normalized = normalizeString(value);
  return LINE_TYPES.has(normalized) ? normalized as InvoiceV2LineType : null;
}

export function normalizeSyncStatus(value: unknown): InvoiceV2QboSyncStatus {
  const normalized = normalizeString(value);
  return ["notSynced", "pending", "synced", "failed", "voidSynced"].includes(normalized)
    ? normalized as InvoiceV2QboSyncStatus
    : "notSynced";
}

export function parseMoneyCents(value: unknown): number | null {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

export function parsePercent(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 100 ? number : null;
}

export function validateNumberingSettings(value: unknown): { settings: InvoiceNumberingSettings | null; error: string | null } {
  if (!value || typeof value !== "object") return { settings: null, error: "Invoice numbering settings are required" };
  const record = value as Record<string, unknown>;
  const invoiceTemplate = normalizeString(record.invoiceTemplate);
  const bundleTemplate = normalizeString(record.bundleTemplate);
  const resetEachYear = record.resetEachYear === true;
  const startingSequence = Number(record.startingSequence);
  if (!invoiceTemplate || !bundleTemplate) return { settings: null, error: "Invoice and bundle numbering templates are required" };
  if (!Number.isInteger(startingSequence) || startingSequence < 1) return { settings: null, error: "Starting sequence must be a positive integer" };
  for (const template of [invoiceTemplate, bundleTemplate]) {
    if (!template.includes("#")) return { settings: null, error: "Each numbering template must contain a # sequence" };
    if ((template.match(/YYYY/g) || []).length > 1 || (template.match(/YY/g) || []).length > 1) return { settings: null, error: "Each numbering template may contain one year token" };
    if (template.includes("YYYY") && template.includes("YY")) return { settings: null, error: "A numbering template cannot contain both YY and YYYY" };
    if (resetEachYear && !template.includes("YY") && !template.includes("YYYY")) return { settings: null, error: "Yearly reset requires a YY or YYYY token in each template" };

    const tokenized = template.replace(/YYYY|YY|MM|#+/g, "");
    if (/[^\w\s./:-]/.test(tokenized)) return { settings: null, error: "A numbering template contains unsupported tokens" };
    const renderedLength = renderNumber(template, new Date("2026-01-01T00:00:00.000Z"), startingSequence).length;
    if (renderedLength > 15) return { settings: null, error: "Rendered invoice and bundle numbers must be 15 characters or fewer" };
  }
  return { settings: { invoiceTemplate, bundleTemplate, resetEachYear, startingSequence }, error: null };
}

export function renderNumber(template: string, date: Date, sequence: number): string {
  const year = String(date.getUTCFullYear());
  return template
    .replace(/YYYY/g, year)
    .replace(/YY/g, year.slice(-2))
    .replace(/MM/g, String(date.getUTCMonth() + 1).padStart(2, "0"))
    .replace(/#+/g, (match) => String(sequence).padStart(match.length, "0"));
}

export function sequenceKey(kind: "invoice" | "bundle", settings: InvoiceNumberingSettings, date: Date): string {
  return `${kind}:${settings.resetEachYear ? date.getUTCFullYear() : "all"}`;
}

export function templateFor(kind: "invoice" | "bundle", settings: InvoiceNumberingSettings): string {
  return kind === "invoice" ? settings.invoiceTemplate : settings.bundleTemplate;
}

export function addDays(date: Date, days: number): string {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString();
}

export function dueDateFor(type: InvoiceV2DueType, date: Date): string | null {
  if (type === "payWhenPaid") return null;
  if (type === "dueOnReceipt") return date.toISOString();
  if (type === "net30") return addDays(date, 30);
  if (type === "net45") return addDays(date, 45);
  return addDays(date, 60);
}

function address(row: DbRow, prefix: string): InvoiceAddressSnapshot {
  return {
    line1: normalizeString(row[`${prefix}_line1`]),
    line2: normalizeString(row[`${prefix}_line2`]),
    city: normalizeString(row[`${prefix}_city`]),
    state: normalizeString(row[`${prefix}_state`]),
    postalCode: normalizeString(row[`${prefix}_postal_code`]),
  };
}

function company(row: DbRow): InvoiceBrandingSnapshot {
  return {
    name: normalizeString(row.company_name),
    logo: normalizeString(row.company_logo),
    address: address(row, "company_address"),
    phone: normalizeString(row.company_phone),
  };
}

export function mapInvoiceLineItem(row: DbRow): InvoiceLineItemV2 {
  return {
    id: normalizeString(row.id),
    invoiceId: normalizeString(row.invoice_id),
    qboId: normalizeString(row.qbo_id),
    phaseId: normalizeString(row.phase_id),
    lineType: normalizeLineType(row.line_type) || "billable",
    phasePath: normalizeString(row.phase_path),
    phaseIdentifier: normalizeString(row.phase_identifier),
    phaseName: normalizeString(row.phase_name),
    description: normalizeString(row.description),
    contractCents: normalizeNumber(row.contract_cents),
    priorBilledCents: normalizeNumber(row.prior_billed_cents),
    cumulativeBilledCents: normalizeNumber(row.cumulative_billed_cents),
    percentComplete: normalizeNumber(row.percent_complete),
    amountCents: normalizeNumber(row.amount_cents),
    sourcePhaseUpdatedTime: normalizeString(row.source_phase_updated_time),
    sortOrder: normalizeNumber(row.sort_order),
  };
}

export function mapInvoice(row: DbRow, lineItems: DbRow[]): InvoiceV2 {
  return {
    id: normalizeString(row.id),
    invoiceNumber: normalizeString(row.invoice_number),
    status: normalizeStatus(row.status),
    dueType: normalizeDueType(row.due_type) || "dueOnReceipt",
    dueDate: normalizeString(row.due_date),
    qboCustomerId: normalizeString(row.qbo_customer_id),
    qboProjectId: normalizeString(row.qbo_project_id),
    bundleId: normalizeString(row.bundle_id),
    purchaseOrder: normalizeString(row.purchase_order),
    client: {
      name: normalizeString(row.client_name),
      email: normalizeString(row.client_email),
      address: address(row, "client_address"),
    },
    project: {
      name: normalizeString(row.project_name),
      reference: normalizeString(row.project_reference),
      address: address(row, "project_address"),
      managerId: normalizeString(row.project_manager_id),
      managerName: normalizeString(row.project_manager_name),
    },
    company: company(row),
    notes: normalizeString(row.notes),
    internalNotes: normalizeString(row.internal_notes),
    subtotalCents: normalizeNumber(row.subtotal_cents),
    totalCents: normalizeNumber(row.total_cents),
    created: { date: normalizeString(row.created_time), id: normalizeString(row.created_id) },
    activated: normalizeString(row.activated_time) ? { date: normalizeString(row.activated_time), id: normalizeString(row.updated_id) } : null,
    voided: normalizeString(row.void_time) ? { date: normalizeString(row.void_time), id: normalizeString(row.updated_id) } : null,
    qbo: {
      invoiceId: normalizeString(row.qbo_invoice_id),
      syncToken: normalizeString(row.qbo_invoice_sync_token),
      status: normalizeSyncStatus(row.qbo_sync_status),
      message: normalizeString(row.qbo_sync_message),
      lastSyncDate: normalizeString(row.qbo_last_sync_time),
    },
    lineItems: lineItems.map(mapInvoiceLineItem),
  };
}

export function mapBundle(row: DbRow, invoices: InvoiceV2[]): InvoiceBundle {
  return {
    id: normalizeString(row.id),
    bundleNumber: normalizeString(row.bundle_number),
    status: normalizeStatus(row.status),
    dueType: normalizeDueType(row.due_type) || "dueOnReceipt",
    dueDate: normalizeString(row.due_date),
    qboCustomerId: normalizeString(row.qbo_customer_id),
    client: { name: normalizeString(row.client_name), email: normalizeString(row.client_email), address: address(row, "client_address") },
    company: company(row),
    subtotalCents: normalizeNumber(row.subtotal_cents),
    totalCents: normalizeNumber(row.total_cents),
    created: { date: normalizeString(row.created_time), id: normalizeString(row.created_id) },
    activated: normalizeString(row.activated_time) ? { date: normalizeString(row.activated_time), id: normalizeString(row.updated_id) } : null,
    voided: normalizeString(row.void_time) ? { date: normalizeString(row.void_time), id: normalizeString(row.updated_id) } : null,
    invoiceIds: invoices.map((invoice) => invoice.id),
    invoices,
  };
}

export function normalizeBooleanInput(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === 0 || value === 1) return Boolean(value);
  return null;
}
