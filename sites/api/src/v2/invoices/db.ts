import type { CompanySettings, InvoiceBundleCreatePayload, InvoiceBundleUpdatePayload, InvoiceNumberingSettings, InvoiceV2CreatePayload, InvoiceV2DueType, InvoiceV2LineItemInput, InvoiceV2UpdatePayload } from "cfdg/types";
import { getCompanySettings } from "../company/internal";
import { getProjectExtraData } from "../projects/db";
import { dueDateFor, renderNumber, sequenceKey, templateFor, validateNumberingSettings, type DbRow } from "./internal";

type InvoiceContext = {
  project: DbRow;
  client: DbRow;
  extra: DbRow;
  company: CompanySettings;
};

export async function getInvoiceRow(db: D1Database, id: string): Promise<DbRow | null> {
  return db.prepare("SELECT * FROM invoices WHERE id = ?").bind(id).first<DbRow>();
}

export async function getInvoiceLineRows(db: D1Database, invoiceId: string): Promise<DbRow[]> {
  const result = await db.prepare("SELECT * FROM invoice_line_items WHERE invoice_id = ? ORDER BY sort_order, id").bind(invoiceId).all<DbRow>();
  return result.results || [];
}

export async function getInvoiceAggregate(db: D1Database, invoiceId: string): Promise<{ row: DbRow; lines: DbRow[] } | null> {
  const row = await getInvoiceRow(db, invoiceId);
  if (!row) return null;
  return { row, lines: await getInvoiceLineRows(db, invoiceId) };
}

export async function listInvoiceRows(db: D1Database, options: { page: number; pageSize: number; status?: string; projectId?: string; customerId?: string; search?: string }): Promise<DbRow[]> {
  const conditions = ["1 = 1"];
  const bindings: Array<string | number> = [];
  if (options.status) { conditions.push("invoice.status = ?"); bindings.push(options.status); }
  if (options.projectId) { conditions.push("invoice.qbo_project_id = ?"); bindings.push(options.projectId); }
  if (options.customerId) { conditions.push("invoice.qbo_customer_id = ?"); bindings.push(options.customerId); }
  if (options.search) { conditions.push("invoice.invoice_number LIKE ?"); bindings.push(`%${options.search}%`); }
  bindings.push(options.pageSize, (options.page - 1) * options.pageSize);
  const result = await db.prepare(`SELECT invoice.* FROM invoices invoice WHERE ${conditions.join(" AND ")} ORDER BY invoice.created_time DESC, invoice.id DESC LIMIT ? OFFSET ?`).bind(...bindings).all<DbRow>();
  return result.results || [];
}

export async function countInvoiceRows(db: D1Database, options: { status?: string; projectId?: string; customerId?: string; search?: string }): Promise<number> {
  const conditions = ["1 = 1"];
  const bindings: string[] = [];
  if (options.status) { conditions.push("status = ?"); bindings.push(options.status); }
  if (options.projectId) { conditions.push("qbo_project_id = ?"); bindings.push(options.projectId); }
  if (options.customerId) { conditions.push("qbo_customer_id = ?"); bindings.push(options.customerId); }
  if (options.search) { conditions.push("invoice_number LIKE ?"); bindings.push(`%${options.search}%`); }
  const row = await db.prepare(`SELECT COUNT(*) AS total FROM invoices WHERE ${conditions.join(" AND ")}`).bind(...bindings).first<{ total?: unknown }>();
  return Number(row?.total || 0);
}

export async function listBundleRows(db: D1Database, options: { page: number; pageSize: number; status?: string; customerId?: string; search?: string }): Promise<DbRow[]> {
  const conditions = ["1 = 1"];
  const bindings: Array<string | number> = [];
  if (options.status) { conditions.push("bundle.status = ?"); bindings.push(options.status); }
  if (options.customerId) { conditions.push("bundle.qbo_customer_id = ?"); bindings.push(options.customerId); }
  if (options.search) { conditions.push("bundle.bundle_number LIKE ?"); bindings.push(`%${options.search}%`); }
  bindings.push(options.pageSize, (options.page - 1) * options.pageSize);
  const result = await db.prepare(`SELECT bundle.* FROM invoice_bundles bundle WHERE ${conditions.join(" AND ")} ORDER BY bundle.created_time DESC, bundle.id DESC LIMIT ? OFFSET ?`).bind(...bindings).all<DbRow>();
  return result.results || [];
}

export async function countBundleRows(db: D1Database, options: { status?: string; customerId?: string; search?: string }): Promise<number> {
  const conditions = ["1 = 1"];
  const bindings: string[] = [];
  if (options.status) { conditions.push("status = ?"); bindings.push(options.status); }
  if (options.customerId) { conditions.push("qbo_customer_id = ?"); bindings.push(options.customerId); }
  if (options.search) { conditions.push("bundle_number LIKE ?"); bindings.push(`%${options.search}%`); }
  const row = await db.prepare(`SELECT COUNT(*) AS total FROM invoice_bundles WHERE ${conditions.join(" AND ")}`).bind(...bindings).first<{ total?: unknown }>();
  return Number(row?.total || 0);
}

export async function getInvoiceBundleRow(db: D1Database, id: string): Promise<DbRow | null> {
  return db.prepare("SELECT * FROM invoice_bundles WHERE id = ?").bind(id).first<DbRow>();
}

export async function getBundleInvoiceRows(db: D1Database, bundleId: string): Promise<DbRow[]> {
  const result = await db.prepare(`
    SELECT invoice.*
    FROM invoices invoice
    JOIN invoice_bundle_items item ON item.invoice_id = invoice.id
    WHERE item.bundle_id = ?
    ORDER BY invoice.id
  `).bind(bundleId).all<DbRow>();
  return result.results || [];
}

export async function getInvoiceBundleAggregate(db: D1Database, id: string): Promise<{ row: DbRow; invoices: DbRow[]; lines: Map<string, DbRow[]> } | null> {
  const row = await getInvoiceBundleRow(db, id);
  if (!row) return null;
  const invoices = await getBundleInvoiceRows(db, id);
  const lines = new Map<string, DbRow[]>();
  for (const invoice of invoices) lines.set(String(invoice.id), await getInvoiceLineRows(db, String(invoice.id)));
  return { row, invoices, lines };
}

export async function getProjectInvoiceContext(db: D1Database, projectId: string): Promise<InvoiceContext | null> {
  const project = await db.prepare(`
    SELECT * FROM qbo_customers_projects
    WHERE qbo_id = ? AND parent_id IS NOT NULL AND TRIM(parent_id) <> ''
  `).bind(projectId).first<DbRow>();
  if (!project) return null;
  const client = await db.prepare("SELECT * FROM qbo_customers_projects WHERE qbo_id = ? AND (parent_id IS NULL OR TRIM(parent_id) = '')").bind(project.parent_id).first<DbRow>();
  if (!client) return null;
  const extra = await getProjectExtraData(db, projectId);
  const company = await getCompanySettings(db);
  if (!company) return null;
  return { project, client, extra, company };
}

export async function allocateNumber(
  db: D1Database,
  kind: "invoice" | "bundle",
  settings: InvoiceNumberingSettings,
  date: Date,
): Promise<string> {
  const validation = validateNumberingSettings(settings);
  if (validation.error || !validation.settings) throw new Error(validation.error || "Invalid invoice numbering settings");
  const key = sequenceKey(kind, settings, date);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    await db.prepare("INSERT INTO invoice_number_sequences (sequence_key, next_value) VALUES (?, ?) ON CONFLICT(sequence_key) DO NOTHING")
      .bind(key, settings.startingSequence).run();
    const allocated = await db.prepare("UPDATE invoice_number_sequences SET next_value = next_value + 1 WHERE sequence_key = ? RETURNING next_value - 1 AS value")
      .bind(key).first<{ value?: number }>();
    const value = Number(allocated?.value || 0);
    if (!value) continue;
    const number = renderNumber(templateFor(kind, settings), date, value);
    if (number.length > 15) throw new Error("Generated invoice number exceeds 15 characters");
    const exists = await db.prepare("SELECT 1 FROM invoices WHERE invoice_number = ? UNION ALL SELECT 1 FROM invoice_bundles WHERE bundle_number = ? LIMIT 1")
      .bind(number, number).first();
    if (!exists) return number;
  }
  throw new Error("Unable to allocate a unique invoice number");
}

function dateAddress(row: DbRow, prefix: "bill" | "ship"): Record<string, string> {
  return {
    line1: String(row[`${prefix}_addr_line1`] || "").trim(),
    line2: String(row[`${prefix}_addr_line2`] || "").trim(),
    city: String(row[`${prefix}_addr_city`] || "").trim(),
    state: String(row[`${prefix}_addr_state`] || "").trim(),
    postalCode: String(row[`${prefix}_addr_postal_code`] || "").trim(),
  };
}

function brandingColumns(company: CompanySettings): Record<string, string> {
  const branding = company.general.invoiceBranding;
  return {
    company_name: branding.name || company.general.fullName,
    company_logo: branding.logo,
    company_address_line1: branding.address.line1,
    company_address_line2: branding.address.line2,
    company_address_city: branding.address.city,
    company_address_state: branding.address.state,
    company_address_postal_code: branding.address.postalCode,
    company_phone: branding.phone,
  };
}

function projectName(project: DbRow): string {
  return String(project.display_name || project.fully_qualified_name || "").trim();
}

async function phaseRows(db: D1Database, projectId: string): Promise<DbRow[]> {
  const result = await db.prepare("SELECT * FROM phases WHERE qbo_id = ? AND deleted = 0 ORDER BY COALESCE(parent_id, 0), lower(trim(phase_id)), id").bind(projectId).all<DbRow>();
  return result.results || [];
}

function phasePath(phase: DbRow, byId: Map<string, DbRow>): string {
  const parts: string[] = [];
  let current: DbRow | undefined = phase;
  const seen = new Set<string>();
  while (current) {
    const id = String(current.id);
    if (seen.has(id)) break;
    seen.add(id);
    parts.unshift(String(current.phase_id || "").trim());
    current = current.parent_id ? byId.get(String(current.parent_id)) : undefined;
  }
  return parts.filter(Boolean).join(".");
}

async function buildLineRows(db: D1Database, projectId: string, input: InvoiceV2LineItemInput[], now: string, userId: string): Promise<{ rows: Array<Record<string, unknown>>; totalCents: number }> {
  const phases = await phaseRows(db, projectId);
  const byId = new Map(phases.map((phase) => [String(phase.id), phase]));
  const childIds = new Set(phases.filter((phase) => phase.parent_id !== null && phase.parent_id !== undefined).map((phase) => String(phase.parent_id)));
  const rows: Array<Record<string, unknown>> = [];
  const linkedBillable = new Set<string>();
  let totalCents = 0;

  for (const item of input) {
    const lineType = item.lineType;
    if (lineType !== "billable" && lineType !== "informational") throw new Error("Invalid invoice line type");
    const amountCents = Number(item.amountCents);
    const percentComplete = Number(item.percentComplete);
    if (!Number.isInteger(amountCents) || amountCents < 0) throw new Error("Line item amount must be nonnegative cents");
    if (!Number.isFinite(percentComplete) || percentComplete < 0 || percentComplete > 100) throw new Error("Line item percentage must be between 0 and 100");

    const phaseId = String(item.phaseId || "").trim();
    const phase = phaseId ? byId.get(phaseId) : undefined;
    if (lineType === "billable" && !phase && !String(item.qboId || "").trim()) throw new Error("Billable line items require a phase or project reference");
    if (lineType === "informational" && !phase) throw new Error("Informational line items require a phase");
    if (phase && String(phase.qbo_id) !== projectId) throw new Error("Phase does not belong to the project");
    if (phase && lineType === "billable") {
      if (childIds.has(String(phase.id))) throw new Error("Parent phases with children cannot be billed directly");
      if (Number(phase.active) !== 1 || Number(phase.billable) !== 1) throw new Error("Phase is not active and billable");
      if (linkedBillable.has(String(phase.id))) throw new Error("A phase can only appear once on an invoice");
      linkedBillable.add(String(phase.id));
    }
    const prior = phase ? Number(phase.billed_cents || 0) : 0;
    const contract = phase ? Number(phase.contract_cents || 0) : 0;
    const billed = lineType === "informational" ? prior : prior + amountCents;
    if (phase && lineType === "billable" && phase.bill_type === "fixed-fee" && billed > contract) throw new Error("Invoice exceeds the fixed-fee phase contract amount");
    const billableAmount = lineType === "billable" ? amountCents : 0;
    totalCents += billableAmount;
    rows.push({
      qbo_id: projectId,
      phase_id: phase ? phase.id : null,
      line_type: lineType,
      phase_path: phase ? phasePath(phase, byId) : "",
      phase_identifier: phase ? String(phase.phase_id || "").trim() : "",
      phase_name: phase ? String(phase.name || "").trim() : "",
      description: String(item.description || phase?.description || phase?.name || "").trim(),
      contract_cents: contract,
      prior_billed_cents: prior,
      cumulative_billed_cents: billed,
      percent_complete: lineType === "informational" ? 0 : percentComplete,
      amount_cents: billableAmount,
      source_phase_updated_time: phase ? phase.updated_time || null : null,
      sort_order: Number.isInteger(item.sortOrder) ? item.sortOrder : rows.length,
      created_time: now,
      created_id: userId,
    });
  }
  return { rows, totalCents };
}

function invoiceInsertValues(context: InvoiceContext, projectId: string, invoiceNumber: string, payload: InvoiceV2CreatePayload, now: string, userId: string): Record<string, unknown> {
  const project = context.project;
  const client = context.client;
  const clientAddress = dateAddress(client, "bill");
  const projectAddress = dateAddress(project, "ship");
  const fallbackProjectAddress = Object.values(projectAddress).some(Boolean) ? projectAddress : dateAddress(project, "bill");
  const branding = brandingColumns(context.company);
  return {
    qbo_customer_id: String(project.parent_id),
    qbo_project_id: projectId,
    bundle_id: null,
    invoice_number: invoiceNumber,
    status: "draft",
    due_type: payload.dueType,
    due_date: null,
    purchase_order: String(context.extra.purchase_order || "").trim(),
    client_name: String(client.display_name || client.company_name || "").trim(),
    client_email: String(client.primary_email || "").trim(),
    client_address_line1: clientAddress.line1,
    client_address_line2: clientAddress.line2,
    client_address_city: clientAddress.city,
    client_address_state: clientAddress.state,
    client_address_postal_code: clientAddress.postalCode,
    project_name: projectName(project),
    project_reference: String(project.fully_qualified_name || projectName(project)).trim(),
    project_address_line1: fallbackProjectAddress.line1,
    project_address_line2: fallbackProjectAddress.line2,
    project_address_city: fallbackProjectAddress.city,
    project_address_state: fallbackProjectAddress.state,
    project_address_postal_code: fallbackProjectAddress.postalCode,
    project_manager_id: String(context.extra.project_manager || "").trim(),
    project_manager_name: String(context.extra.project_manager || "").trim(),
    ...branding,
    notes: String(payload.notes || "").trim(),
    internal_notes: String(payload.internalNotes || "").trim(),
    subtotal_cents: 0,
    total_cents: 0,
    created_time: now,
    created_id: userId,
    activated_time: null,
    void_time: null,
    paid_time: null,
    refunded_time: null,
    updated_time: null,
    updated_id: null,
    qbo_invoice_id: null,
    qbo_invoice_sync_token: null,
    qbo_sync_status: "notSynced",
    qbo_sync_message: "",
    qbo_last_sync_time: null,
  };
}

const INVOICE_COLUMNS = [
  "qbo_customer_id", "qbo_project_id", "bundle_id", "invoice_number", "status", "due_type", "due_date", "purchase_order",
  "client_name", "client_email", "client_address_line1", "client_address_line2", "client_address_city", "client_address_state", "client_address_postal_code",
  "project_name", "project_reference", "project_address_line1", "project_address_line2", "project_address_city", "project_address_state", "project_address_postal_code",
  "project_manager_id", "project_manager_name", "company_name", "company_logo", "company_address_line1", "company_address_line2", "company_address_city", "company_address_state", "company_address_postal_code", "company_phone",
  "notes", "internal_notes", "subtotal_cents", "total_cents", "created_time", "created_id", "activated_time", "void_time", "paid_time", "refunded_time", "updated_time", "updated_id", "qbo_invoice_id", "qbo_invoice_sync_token", "qbo_sync_status", "qbo_sync_message", "qbo_last_sync_time",
] as const;

function insertInvoice(db: D1Database, values: Record<string, unknown>): D1PreparedStatement {
  return db.prepare(`INSERT INTO invoices (${INVOICE_COLUMNS.join(", ")}) VALUES (${INVOICE_COLUMNS.map(() => "?").join(", ")})`)
    .bind(...INVOICE_COLUMNS.map((column) => values[column] ?? null));
}

function insertLine(db: D1Database, invoiceId: number, row: Record<string, unknown>): D1PreparedStatement {
  const columns = ["invoice_id", "qbo_id", "phase_id", "line_type", "phase_path", "phase_identifier", "phase_name", "description", "contract_cents", "prior_billed_cents", "cumulative_billed_cents", "percent_complete", "amount_cents", "source_phase_updated_time", "sort_order", "created_time", "created_id"];
  return db.prepare(`INSERT INTO invoice_line_items (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`).bind(invoiceId, ...columns.slice(1).map((column) => row[column] ?? null));
}

export async function createDraftInvoice(db: D1Database, projectId: string, payload: InvoiceV2CreatePayload, now: string, userId: string): Promise<DbRow> {
  const context = await getProjectInvoiceContext(db, projectId);
  if (!context) throw new Error("Project not found");
  const invoiceNumber = await allocateNumber(db, "invoice", context.company.general.invoiceNumbering, new Date(now));
  const built = await buildLineRows(db, projectId, payload.lineItems, now, userId);
  const values = invoiceInsertValues(context, projectId, invoiceNumber, payload, now, userId);
  values.subtotal_cents = built.totalCents;
  values.total_cents = built.totalCents;
  const result = await db.batch([insertInvoice(db, values)]);
  const invoiceId = result[0]?.meta.last_row_id;
  if (invoiceId === undefined || invoiceId === null) throw new Error("Invoice creation did not return an ID");
  if (built.rows.length) await db.batch(built.rows.map((row) => insertLine(db, Number(invoiceId), row)));
  const invoice = await getInvoiceRow(db, String(invoiceId));
  if (!invoice) throw new Error("Created invoice could not be loaded");
  return invoice;
}

export async function updateDraftInvoice(db: D1Database, invoiceId: string, payload: InvoiceV2UpdatePayload, now: string, userId: string): Promise<DbRow> {
  const existing = await getInvoiceRow(db, invoiceId);
  if (!existing) throw new Error("Invoice not found");
  if (existing.status !== "draft") throw new Error("Only draft invoices can be updated");
  const built = await buildLineRows(db, String(existing.qbo_project_id), payload.lineItems, now, userId);
  await db.batch([
    db.prepare(`UPDATE invoices SET due_type = ?, notes = ?, internal_notes = ?, subtotal_cents = ?, total_cents = ?, updated_time = ?, updated_id = ? WHERE id = ? AND status = 'draft'`)
      .bind(payload.dueType, String(payload.notes || "").trim(), String(payload.internalNotes || "").trim(), built.totalCents, built.totalCents, now, userId, invoiceId),
    db.prepare("DELETE FROM invoice_line_items WHERE invoice_id = ?").bind(invoiceId),
  ]);
  if (built.rows.length) await db.batch(built.rows.map((row) => insertLine(db, Number(invoiceId), row)));
  const invoice = await getInvoiceRow(db, invoiceId);
  if (!invoice) throw new Error("Updated invoice could not be loaded");
  return invoice;
}

export async function activateInvoice(db: D1Database, invoiceId: string, now: string, userId: string): Promise<DbRow> {
  const invoice = await getInvoiceRow(db, invoiceId);
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status !== "draft") throw new Error("Only draft invoices can be activated");
  if (invoice.bundle_id !== null && invoice.bundle_id !== undefined) throw new Error("Bundled invoices must be activated through the bundle");
  const lines = await getInvoiceLineRows(db, invoiceId);
  const statements: D1PreparedStatement[] = [];
  for (const line of lines) {
    if (line.line_type !== "billable" || line.phase_id === null || line.phase_id === undefined) continue;
    const phase = await db.prepare("SELECT * FROM phases WHERE id = ? AND qbo_id = ? AND deleted = 0").bind(line.phase_id, invoice.qbo_project_id).first<DbRow>();
    if (!phase) throw new Error("A linked invoice phase no longer exists");
    if (Number(phase.billed_cents || 0) !== Number(line.prior_billed_cents || 0)) throw new Error("Phase billing changed since the draft was saved");
    if (Number(phase.contract_cents || 0) !== Number(line.contract_cents || 0)) throw new Error("Phase contract changed since the draft was saved");
    if (String(phase.updated_time || "") !== String(line.source_phase_updated_time || "")) throw new Error("Phase metadata changed since the draft was saved");
    if (Number(phase.active) !== 1 || Number(phase.billable) !== 1) throw new Error("A linked phase is no longer active and billable");
    if (phase.bill_type === "fixed-fee" && Number(line.cumulative_billed_cents || 0) > Number(phase.contract_cents || 0)) throw new Error("Invoice exceeds the fixed-fee phase contract amount");
    statements.push(db.prepare("UPDATE phases SET billed_cents = billed_cents + ?, updated_time = ?, updated_id = ? WHERE id = ? AND qbo_id = ? AND billed_cents = ?")
      .bind(Number(line.amount_cents || 0), now, userId, phase.id, invoice.qbo_project_id, Number(line.prior_billed_cents || 0)));
  }
  const dueType = String(invoice.due_type) as InvoiceV2DueType;
  statements.push(db.prepare("UPDATE invoices SET status = 'active', due_date = ?, activated_time = ?, updated_time = ?, updated_id = ?, qbo_sync_status = 'pending', qbo_sync_message = '' WHERE id = ? AND status = 'draft'")
    .bind(dueDateFor(dueType, new Date(now)), now, now, userId, invoiceId));
  const results = await db.batch(statements);
  if (results.some((result) => Number(result.meta.changes || 0) !== 1)) throw new Error("Invoice activation failed because the source data changed");
  const activated = await getInvoiceRow(db, invoiceId);
  if (!activated || activated.status !== "active") throw new Error("Invoice activation failed");
  return activated;
}

export async function voidInvoice(db: D1Database, invoiceId: string, now: string, userId: string): Promise<DbRow> {
  const existing = await getInvoiceRow(db, invoiceId);
  if (existing?.bundle_id !== null && existing?.bundle_id !== undefined) throw new Error("Bundled invoices must be voided through the bundle");
  const result = await db.prepare("UPDATE invoices SET status = 'void', void_time = ?, updated_time = ?, updated_id = ? WHERE id = ? AND status = 'active'").bind(now, now, userId, invoiceId).run();
  if (!result.meta.changes) throw new Error("Only active invoices can be voided");
  const invoice = await getInvoiceRow(db, invoiceId);
  if (!invoice) throw new Error("Invoice not found");
  return invoice;
}

export async function setInvoiceQboState(db: D1Database, invoiceId: string, values: { status: string; message?: string; qboInvoiceId?: string; syncToken?: string; lastSyncTime?: string }): Promise<void> {
  await db.prepare(`UPDATE invoices SET qbo_sync_status = ?, qbo_sync_message = ?, qbo_invoice_id = COALESCE(?, qbo_invoice_id), qbo_invoice_sync_token = COALESCE(?, qbo_invoice_sync_token), qbo_last_sync_time = COALESCE(?, qbo_last_sync_time) WHERE id = ?`)
    .bind(values.status, values.message || "", values.qboInvoiceId || null, values.syncToken || null, values.lastSyncTime || null, invoiceId).run();
}

export async function createBundle(db: D1Database, payload: InvoiceBundleCreatePayload, now: string, userId: string): Promise<DbRow> {
  const ids = [...new Set(payload.invoiceIds.map(String).filter(Boolean))];
  if (!ids.length) throw new Error("At least one draft invoice is required");
  const placeholders = ids.map(() => "?").join(",");
  const result = await db.prepare(`SELECT * FROM invoices WHERE id IN (${placeholders})`).bind(...ids).all<DbRow>();
  const invoices = result.results || [];
  if (invoices.length !== ids.length) throw new Error("One or more invoices were not found");
  if (invoices.some((invoice) => invoice.status !== "draft" || invoice.bundle_id !== null || String(invoice.qbo_customer_id) !== payload.qboCustomerId)) throw new Error("Only unbundled draft invoices for one client may be bundled");
  const settings = (await getCompanySettings(db))?.general.invoiceNumbering;
  if (!settings) throw new Error("Company invoice numbering settings are unavailable");
  const bundleNumber = await allocateNumber(db, "bundle", settings, new Date(now));
  const first = invoices[0];
  const totalCents = invoices.reduce((sum, invoice) => sum + Number(invoice.total_cents || 0), 0);
  const insert = await db.prepare(`INSERT INTO invoice_bundles (
    qbo_customer_id, bundle_number, status, due_type, due_date, client_name, client_email,
    client_address_line1, client_address_line2, client_address_city, client_address_state, client_address_postal_code,
    company_name, company_logo, company_address_line1, company_address_line2, company_address_city, company_address_state, company_address_postal_code, company_phone,
    subtotal_cents, total_cents, created_time, created_id
  ) VALUES (?, ?, 'draft', ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(payload.qboCustomerId, bundleNumber, payload.dueType, first.client_name, first.client_email, first.client_address_line1, first.client_address_line2, first.client_address_city, first.client_address_state, first.client_address_postal_code, first.company_name, first.company_logo, first.company_address_line1, first.company_address_line2, first.company_address_city, first.company_address_state, first.company_address_postal_code, first.company_phone, totalCents, totalCents, now, userId).run();
  const bundleId = insert.meta.last_row_id;
  if (bundleId === undefined || bundleId === null) throw new Error("Bundle creation did not return an ID");
  await db.batch(ids.flatMap((invoiceId) => [
    db.prepare("INSERT INTO invoice_bundle_items (bundle_id, invoice_id, created_time, created_id) VALUES (?, ?, ?, ?)").bind(bundleId, invoiceId, now, userId),
    db.prepare("UPDATE invoices SET bundle_id = ?, updated_time = ?, updated_id = ? WHERE id = ? AND status = 'draft'").bind(bundleId, now, userId, invoiceId),
  ]));
  const bundle = await getInvoiceBundleRow(db, String(bundleId));
  if (!bundle) throw new Error("Created bundle could not be loaded");
  return bundle;
}

export async function updateBundle(db: D1Database, bundleId: string, payload: InvoiceBundleUpdatePayload, now: string, userId: string): Promise<DbRow> {
  const bundle = await getInvoiceBundleRow(db, bundleId);
  if (!bundle || bundle.status !== "draft") throw new Error("Only draft bundles can be updated");
  const ids = [...new Set(payload.invoiceIds.map(String).filter(Boolean))];
  if (!ids.length) throw new Error("At least one draft invoice is required");
  const placeholders = ids.map(() => "?").join(",");
  const result = await db.prepare(`SELECT * FROM invoices WHERE id IN (${placeholders})`).bind(...ids).all<DbRow>();
  const invoices = result.results || [];
  if (invoices.length !== ids.length || invoices.some((invoice) => invoice.status !== "draft" || (invoice.bundle_id !== null && String(invoice.bundle_id) !== bundleId) || String(invoice.qbo_customer_id) !== String(bundle.qbo_customer_id))) throw new Error("Only draft invoices for one client may be bundled");
  const totalCents = invoices.reduce((sum, invoice) => sum + Number(invoice.total_cents || 0), 0);
  await db.prepare("DELETE FROM invoice_bundle_items WHERE bundle_id = ?").bind(bundleId).run();
  await db.prepare("UPDATE invoices SET bundle_id = NULL, updated_time = ?, updated_id = ? WHERE bundle_id = ?").bind(now, userId, bundleId).run();
  await db.batch(ids.flatMap((invoiceId) => [
    db.prepare("INSERT INTO invoice_bundle_items (bundle_id, invoice_id, created_time, created_id) VALUES (?, ?, ?, ?)").bind(bundleId, invoiceId, now, userId),
    db.prepare("UPDATE invoices SET bundle_id = ?, updated_time = ?, updated_id = ? WHERE id = ?").bind(bundleId, now, userId, invoiceId),
  ]));
  await db.prepare("UPDATE invoice_bundles SET due_type = ?, subtotal_cents = ?, total_cents = ?, updated_time = ?, updated_id = ? WHERE id = ? AND status = 'draft'").bind(payload.dueType, totalCents, totalCents, now, userId, bundleId).run();
  const updated = await getInvoiceBundleRow(db, bundleId);
  if (!updated) throw new Error("Updated bundle could not be loaded");
  return updated;
}

export async function deleteDraftBundle(db: D1Database, bundleId: string): Promise<void> {
  const bundle = await getInvoiceBundleRow(db, bundleId);
  if (!bundle || bundle.status !== "draft") throw new Error("Only draft bundles can be deleted");
  await db.prepare("UPDATE invoices SET bundle_id = NULL WHERE bundle_id = ?").bind(bundleId).run();
  await db.prepare("DELETE FROM invoice_bundle_items WHERE bundle_id = ?").bind(bundleId).run();
  await db.prepare("DELETE FROM invoice_bundles WHERE id = ? AND status = 'draft'").bind(bundleId).run();
}

export async function activateBundle(db: D1Database, bundleId: string, now: string, userId: string): Promise<DbRow> {
  const aggregate = await getInvoiceBundleAggregate(db, bundleId);
  if (!aggregate || aggregate.row.status !== "draft") throw new Error("Only draft bundles can be activated");
  if (!aggregate.invoices.length) throw new Error("Bundle must contain at least one invoice");
  const statements: D1PreparedStatement[] = [];
  for (const invoice of aggregate.invoices) {
    if (invoice.status !== "draft") throw new Error("All bundled invoices must be drafts");
    for (const line of aggregate.lines.get(String(invoice.id)) || []) {
      if (line.line_type !== "billable" || line.phase_id === null || line.phase_id === undefined) continue;
      const phase = await db.prepare("SELECT * FROM phases WHERE id = ? AND qbo_id = ? AND deleted = 0").bind(line.phase_id, invoice.qbo_project_id).first<DbRow>();
      if (!phase || Number(phase.billed_cents || 0) !== Number(line.prior_billed_cents || 0) || Number(phase.contract_cents || 0) !== Number(line.contract_cents || 0) || String(phase.updated_time || "") !== String(line.source_phase_updated_time || "") || Number(phase.active) !== 1 || Number(phase.billable) !== 1) throw new Error("A bundled phase changed since its invoice was saved");
      if (phase.bill_type === "fixed-fee" && Number(line.cumulative_billed_cents || 0) > Number(phase.contract_cents || 0)) throw new Error("A bundled invoice exceeds the fixed-fee phase contract amount");
      statements.push(db.prepare("UPDATE phases SET billed_cents = billed_cents + ?, updated_time = ?, updated_id = ? WHERE id = ? AND qbo_id = ? AND billed_cents = ?").bind(Number(line.amount_cents || 0), now, userId, phase.id, invoice.qbo_project_id, Number(line.prior_billed_cents || 0)));
    }
    statements.push(db.prepare("UPDATE invoices SET status = 'active', due_date = ?, activated_time = ?, updated_time = ?, updated_id = ?, qbo_sync_status = 'pending', qbo_sync_message = '' WHERE id = ? AND status = 'draft'").bind(dueDateFor(String(invoice.due_type) as InvoiceV2DueType, new Date(now)), now, now, userId, invoice.id));
  }
  statements.push(db.prepare("UPDATE invoice_bundles SET status = 'active', due_date = ?, activated_time = ?, updated_time = ?, updated_id = ? WHERE id = ? AND status = 'draft'").bind(dueDateFor(String(aggregate.row.due_type) as InvoiceV2DueType, new Date(now)), now, now, userId, bundleId));
  const results = await db.batch(statements);
  if (results.some((result) => Number(result.meta.changes || 0) !== 1)) throw new Error("Bundle activation failed because the source data changed");
  const updated = await getInvoiceBundleRow(db, bundleId);
  if (!updated || updated.status !== "active") throw new Error("Bundle activation failed");
  return updated;
}

export async function voidBundle(db: D1Database, bundleId: string, now: string, userId: string): Promise<DbRow> {
  const aggregate = await getInvoiceBundleAggregate(db, bundleId);
  if (!aggregate || aggregate.row.status !== "active") throw new Error("Only active bundles can be voided");
  await db.batch([
    db.prepare("UPDATE invoice_bundles SET status = 'void', void_time = ?, updated_time = ?, updated_id = ? WHERE id = ? AND status = 'active'").bind(now, now, userId, bundleId),
    ...aggregate.invoices.map((invoice) => db.prepare("UPDATE invoices SET status = 'void', void_time = ?, updated_time = ?, updated_id = ? WHERE id = ? AND status = 'active'").bind(now, now, userId, invoice.id)),
  ]);
  const updated = await getInvoiceBundleRow(db, bundleId);
  if (!updated) throw new Error("Bundle not found");
  return updated;
}
