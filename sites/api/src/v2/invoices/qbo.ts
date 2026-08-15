import { normalizeString } from "cfdg/scripts";
import type { QboInvoiceResponse } from "cfdg/types";
import type { HonoEnv } from "../../apiTypes";
import { getQboSettings } from "../qbo/db";
import { qboFetch } from "../qbo/internal";
import { getInvoiceLineRows, getInvoiceRow, setInvoiceQboState } from "./db";

type QboInvoiceQueryResponse = {
  QueryResponse?: {
    Invoice?: Array<{ Id?: string; SyncToken?: string; CustomerRef?: { value?: string } }>;
  };
};

type QboInvoiceDocument = {
  Id?: string;
  SyncToken?: string;
  CustomerRef?: { value: string };
  DocNumber?: string;
  TxnDate?: string;
  DueDate?: string;
  PONumber?: string;
  CustomerMemo?: { value: string };
  Line?: Array<Record<string, unknown>>;
};

function qboString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function qboAmount(cents: number): number {
  return Math.round(cents) / 100;
}

async function findExistingQboInvoice(db: D1Database, env: HonoEnv["Bindings"], invoiceNumber: string, projectId: string): Promise<{ id: string; syncToken: string } | null> {
  const query = `select Id, SyncToken, CustomerRef from Invoice where DocNumber = '${qboString(invoiceNumber)}' maxresults 20`;
  const response = await qboFetch<QboInvoiceQueryResponse>(db, env, `/query?query=${encodeURIComponent(query)}`);
  const match = (response.QueryResponse?.Invoice || []).find((invoice) => normalizeString(invoice.CustomerRef?.value) === projectId);
  if (!match?.Id) return null;
  return { id: normalizeString(match.Id), syncToken: normalizeString(match.SyncToken) };
}

function buildLines(rows: Array<Record<string, unknown>>, serviceItemId: string): Array<Record<string, unknown>> {
  return rows.filter((row) => row.line_type === "billable" && Number(row.amount_cents || 0) > 0).map((row) => ({
    DetailType: "SalesItemLineDetail",
    Amount: qboAmount(Number(row.amount_cents || 0)),
    Description: normalizeString(row.description || row.phase_name),
    SalesItemLineDetail: {
      ItemRef: { value: serviceItemId },
      Qty: 1,
      UnitPrice: qboAmount(Number(row.amount_cents || 0)),
    },
  }));
}

async function fetchExistingDocument(db: D1Database, env: HonoEnv["Bindings"], id: string): Promise<QboInvoiceDocument> {
  const response = await qboFetch<{ Invoice?: QboInvoiceDocument }>(db, env, `/invoice/${encodeURIComponent(id)}`);
  if (!response.Invoice) throw new Error("QuickBooks invoice was not found");
  return response.Invoice;
}

export async function syncInvoiceToQbo(db: D1Database, env: HonoEnv["Bindings"], invoiceId: string): Promise<void> {
  const invoice = await getInvoiceRow(db, invoiceId);
  if (!invoice) throw new Error("Invoice not found");
  const now = new Date().toISOString();
  await setInvoiceQboState(db, invoiceId, { status: "pending", message: "", lastSyncTime: now });
  try {
    const settings = await getQboSettings(db);
    const serviceItemId = normalizeString(settings?.accountingDefaults?.serviceItem?.id);
    if (!settings?.connection?.realmId || !serviceItemId) throw new Error("QuickBooks connection and default service item are required");

    const rows = await getInvoiceLineRows(db, invoiceId);
    let existing = invoice.qbo_invoice_id ? { id: normalizeString(invoice.qbo_invoice_id), syncToken: normalizeString(invoice.qbo_invoice_sync_token) } : null;
    if (!existing) existing = await findExistingQboInvoice(db, env, normalizeString(invoice.invoice_number), normalizeString(invoice.qbo_project_id));

    const document: QboInvoiceDocument = {
      ...(existing?.id ? { Id: existing.id, SyncToken: existing.syncToken } : {}),
      CustomerRef: { value: normalizeString(invoice.qbo_project_id) },
      DocNumber: normalizeString(invoice.invoice_number),
      TxnDate: normalizeString(invoice.activated_time || invoice.created_time).slice(0, 10),
      ...(invoice.due_date ? { DueDate: normalizeString(invoice.due_date).slice(0, 10) } : {}),
      ...(normalizeString(invoice.purchase_order) ? { PONumber: normalizeString(invoice.purchase_order) } : {}),
      ...(normalizeString(invoice.notes) ? { CustomerMemo: { value: normalizeString(invoice.notes) } } : {}),
      Line: buildLines(rows, serviceItemId),
    };
    const response = await qboFetch<QboInvoiceResponse>(db, env, "/invoice", { method: "POST", body: JSON.stringify(document) });
    const qboInvoiceId = normalizeString(response.Invoice?.Id || existing?.id);
    const syncToken = normalizeString(response.Invoice?.SyncToken || existing?.syncToken);
    if (!qboInvoiceId) throw new Error("QuickBooks did not return an invoice ID");
    await setInvoiceQboState(db, invoiceId, { status: "synced", qboInvoiceId, syncToken, lastSyncTime: new Date().toISOString() });
  } catch (error: unknown) {
    await setInvoiceQboState(db, invoiceId, { status: "failed", message: String(error instanceof Error ? error.message : error).slice(0, 1000), lastSyncTime: new Date().toISOString() });
    throw error;
  }
}

export async function voidInvoiceInQbo(db: D1Database, env: HonoEnv["Bindings"], invoiceId: string): Promise<void> {
  const invoice = await getInvoiceRow(db, invoiceId);
  if (!invoice || !normalizeString(invoice.qbo_invoice_id)) return;
  const document = await fetchExistingDocument(db, env, normalizeString(invoice.qbo_invoice_id));
  const response = await qboFetch<QboInvoiceResponse>(db, env, "/invoice?operation=void", { method: "POST", body: JSON.stringify(document) });
  await setInvoiceQboState(db, invoiceId, { status: "voidSynced", syncToken: normalizeString(response.Invoice?.SyncToken), lastSyncTime: new Date().toISOString() });
}
