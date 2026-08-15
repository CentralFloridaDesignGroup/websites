import { Hono } from "hono";
import type { InvoiceBundleCreatePayload, InvoiceBundleUpdatePayload, InvoiceV2CreatePayload, InvoiceV2LineItemInput, InvoiceV2UpdatePayload } from "cfdg/types";
import { badRequest, noContent, requireAuthMode, serverError, type HonoEnv } from "../../apiTypes";
import { buildPagination, parseNorthstarListQuery } from "../pagination";
import { activateBundle, activateInvoice, countBundleRows, countInvoiceRows, createBundle, createDraftInvoice, deleteDraftBundle, getBundleInvoiceRows, getInvoiceAggregate, getInvoiceBundleAggregate, getInvoiceRow, listBundleRows, listInvoiceRows, updateBundle, updateDraftInvoice, voidBundle, voidInvoice } from "./db";
import { mapBundle, mapInvoice, normalizeDueType, normalizeLineType, parseMoneyCents, parsePercent } from "./internal";
import { syncInvoiceToQbo, voidInvoiceInQbo } from "./qbo";

function constraintMessage(error: unknown): string {
  return /unique|constraint/i.test(String(error instanceof Error ? error.message : error)) ? "The invoice data conflicts with an existing record" : String(error instanceof Error ? error.message : error);
}

async function invoiceView(db: D1Database, id: string) {
  const aggregate = await getInvoiceAggregate(db, id);
  return aggregate ? mapInvoice(aggregate.row, aggregate.lines) : null;
}

async function bundleView(db: D1Database, id: string) {
  const aggregate = await getInvoiceBundleAggregate(db, id);
  if (!aggregate) return null;
  const invoices = aggregate.invoices.map((row) => mapInvoice(row, aggregate.lines.get(String(row.id)) || []));
  return mapBundle(aggregate.row, invoices);
}

function parseLineItems(value: unknown): InvoiceV2LineItemInput[] | string {
  if (!Array.isArray(value) || value.length > 200) return "lineItems must be an array with no more than 200 entries";
  const lines: InvoiceV2LineItemInput[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return "Each line item must be an object";
    const record = entry as Record<string, unknown>;
    const lineType = normalizeLineType(record.lineType);
    const amountCents = parseMoneyCents(record.amountCents);
    const percentComplete = parsePercent(record.percentComplete ?? 0);
    if (!lineType) return "Invalid line item type";
    if (amountCents === null) return "Line item amount must be nonnegative integer cents";
    if (percentComplete === null) return "Line item percentage must be between 0 and 100";
    lines.push({
      phaseId: typeof record.phaseId === "string" ? record.phaseId : null,
      qboId: typeof record.qboId === "string" ? record.qboId : null,
      lineType,
      phasePath: typeof record.phasePath === "string" ? record.phasePath : "",
      phaseIdentifier: typeof record.phaseIdentifier === "string" ? record.phaseIdentifier : "",
      phaseName: typeof record.phaseName === "string" ? record.phaseName : "",
      description: String(record.description ?? "").trim(),
      percentComplete,
      amountCents,
      sortOrder: Number.isInteger(record.sortOrder) ? Number(record.sortOrder) : lines.length,
    });
  }
  return lines;
}

function parseInvoicePayload(value: unknown): InvoiceV2CreatePayload | string {
  if (!value || typeof value !== "object") return "Request body must be an object";
  const record = value as Record<string, unknown>;
  const dueType = normalizeDueType(record.dueType);
  const lineItems = parseLineItems(record.lineItems);
  if (!dueType) return "Invalid due type";
  if (typeof lineItems === "string") return lineItems;
  return { dueType, notes: String(record.notes ?? "").trim(), internalNotes: String(record.internalNotes ?? "").trim(), lineItems };
}

function parseBundlePayload(value: unknown): InvoiceBundleCreatePayload | string {
  if (!value || typeof value !== "object") return "Request body must be an object";
  const record = value as Record<string, unknown>;
  const dueType = normalizeDueType(record.dueType);
  const qboCustomerId = String(record.qboCustomerId ?? "").trim();
  const invoiceIds = Array.isArray(record.invoiceIds) ? record.invoiceIds.map(String).map((id) => id.trim()).filter(Boolean) : [];
  if (!dueType) return "Invalid due type";
  if (!qboCustomerId) return "qboCustomerId is required";
  if (!invoiceIds.length) return "At least one invoice is required";
  return { dueType, qboCustomerId, invoiceIds };
}

function parseBundleUpdatePayload(value: unknown): InvoiceBundleUpdatePayload | string {
  const parsed = parseBundlePayload(value);
  return parsed;
}

export function invoicesApi() {
  const app = new Hono<HonoEnv>();
  const requireMicrosoft = async (c: any, next: () => Promise<void>) => {
    const authError = requireAuthMode(c, "microsoft");
    if (authError) return authError;
    return next();
  };

  app.use("/v2/invoices", requireMicrosoft);
  app.use("/v2/invoices/:id", requireMicrosoft);
  app.use("/v2/projects/:projectId/invoices", requireMicrosoft);
  app.use("/v2/invoice-bundles", requireMicrosoft);
  app.use("/v2/invoice-bundles/:id", requireMicrosoft);

  app.get("/v2/invoices", async (c) => {
    try {
      const parsed = parseNorthstarListQuery(c.req.query());
      if (typeof parsed === "string") return badRequest(parsed);
      const filters = { status: c.req.query("status")?.trim() || undefined, projectId: c.req.query("projectId")?.trim() || undefined, customerId: c.req.query("customerId")?.trim() || undefined, search: c.req.query("search")?.trim() || undefined };
      const [rows, total] = await Promise.all([listInvoiceRows(c.env.DB_NORTHSTAR, { ...parsed, ...filters }), countInvoiceRows(c.env.DB_NORTHSTAR, filters)]);
      const invoices = await Promise.all(rows.map(async (row) => (await invoiceView(c.env.DB_NORTHSTAR, String(row.id)))!));
      return c.json({ invoices, pagination: buildPagination(parsed.page, parsed.pageSize, total) });
    } catch (error: unknown) {
      console.error("Error listing V2 invoices:", error);
      return serverError(String(error instanceof Error ? error.message : error));
    }
  });

  app.post("/v2/projects/:projectId/invoices", async (c) => {
    try {
      const payload = parseInvoicePayload(await c.req.json().catch(() => null));
      if (typeof payload === "string") return badRequest(payload);
      const row = await createDraftInvoice(c.env.DB_NORTHSTAR, c.req.param("projectId"), payload, new Date().toISOString(), c.get("auth").subject || "unknown-user");
      const invoice = await invoiceView(c.env.DB_NORTHSTAR, String(row.id));
      return c.json({ invoice }, 201);
    } catch (error: unknown) {
      console.error("Error creating V2 invoice:", error);
      return /not found|requires|must|invalid|exceeds|only|belong|phase|line item/i.test(String(error)) ? badRequest(constraintMessage(error)) : serverError(constraintMessage(error));
    }
  });

  app.get("/v2/invoices/:id", async (c) => {
    try {
      const invoice = await invoiceView(c.env.DB_NORTHSTAR, c.req.param("id"));
      return invoice ? c.json({ invoice }) : c.json({ error: "Invoice not found" }, 404);
    } catch (error: unknown) {
      console.error("Error reading V2 invoice:", error);
      return serverError(String(error instanceof Error ? error.message : error));
    }
  });

  app.put("/v2/invoices/:id", async (c) => {
    try {
      const payload = parseInvoicePayload(await c.req.json().catch(() => null));
      if (typeof payload === "string") return badRequest(payload);
      const row = await updateDraftInvoice(c.env.DB_NORTHSTAR, c.req.param("id"), payload as InvoiceV2UpdatePayload, new Date().toISOString(), c.get("auth").subject || "unknown-user");
      return c.json({ invoice: await invoiceView(c.env.DB_NORTHSTAR, String(row.id)) });
    } catch (error: unknown) {
      console.error("Error updating V2 invoice:", error);
      return /not found|requires|must|invalid|exceeds|only|belong|phase|line item/i.test(String(error)) ? badRequest(constraintMessage(error)) : serverError(constraintMessage(error));
    }
  });

  app.delete("/v2/invoices/:id", async (c) => {
    try {
      const invoice = await getInvoiceRow(c.env.DB_NORTHSTAR, c.req.param("id"));
      if (!invoice) return c.json({ error: "Invoice not found" }, 404);
      if (invoice.status !== "draft") return badRequest("Only draft invoices can be deleted");
      if (invoice.bundle_id !== null && invoice.bundle_id !== undefined) return badRequest("Remove the invoice from its draft bundle before deleting it");
      await c.env.DB_NORTHSTAR.batch([
        c.env.DB_NORTHSTAR.prepare("DELETE FROM invoice_line_items WHERE invoice_id = ?").bind(c.req.param("id")),
        c.env.DB_NORTHSTAR.prepare("DELETE FROM invoices WHERE id = ? AND status = 'draft'").bind(c.req.param("id")),
      ]);
      return noContent();
    } catch (error: unknown) {
      console.error("Error deleting V2 invoice:", error);
      return serverError(String(error instanceof Error ? error.message : error));
    }
  });

  app.post("/v2/invoices/:id/activate", async (c) => {
    try {
      const row = await activateInvoice(c.env.DB_NORTHSTAR, c.req.param("id"), new Date().toISOString(), c.get("auth").subject || "unknown-user");
      c.executionCtx.waitUntil(syncInvoiceToQbo(c.env.DB_NORTHSTAR, c.env, String(row.id)).catch(() => undefined));
      return c.json({ invoice: await invoiceView(c.env.DB_NORTHSTAR, String(row.id)) });
    } catch (error: unknown) {
      console.error("Error activating V2 invoice:", error);
      return badRequest(constraintMessage(error));
    }
  });

  app.post("/v2/invoices/:id/void", async (c) => {
    try {
      const row = await voidInvoice(c.env.DB_NORTHSTAR, c.req.param("id"), new Date().toISOString(), c.get("auth").subject || "unknown-user");
      c.executionCtx.waitUntil(voidInvoiceInQbo(c.env.DB_NORTHSTAR, c.env, String(row.id)).catch(() => undefined));
      return c.json({ invoice: await invoiceView(c.env.DB_NORTHSTAR, String(row.id)) });
    } catch (error: unknown) {
      console.error("Error voiding V2 invoice:", error);
      return badRequest(constraintMessage(error));
    }
  });

  app.post("/v2/invoices/:id/qbo-sync", async (c) => {
    try {
      const invoice = await getInvoiceRow(c.env.DB_NORTHSTAR, c.req.param("id"));
      if (!invoice) return c.json({ error: "Invoice not found" }, 404);
      if (invoice.status !== "active") return badRequest("Only active invoices can synchronize to QuickBooks");
      await syncInvoiceToQbo(c.env.DB_NORTHSTAR, c.env, c.req.param("id"));
      return c.json({ invoice: await invoiceView(c.env.DB_NORTHSTAR, c.req.param("id")) });
    } catch (error: unknown) {
      console.error("Error syncing V2 invoice to QBO:", error);
      return badRequest(constraintMessage(error));
    }
  });

  app.get("/v2/invoice-bundles", async (c) => {
    try {
      const parsed = parseNorthstarListQuery(c.req.query());
      if (typeof parsed === "string") return badRequest(parsed);
      const filters = { status: c.req.query("status")?.trim() || undefined, customerId: c.req.query("customerId")?.trim() || undefined, search: c.req.query("search")?.trim() || undefined };
      const [rows, total] = await Promise.all([listBundleRows(c.env.DB_NORTHSTAR, { ...parsed, ...filters }), countBundleRows(c.env.DB_NORTHSTAR, filters)]);
      const bundles = await Promise.all(rows.map(async (row) => (await bundleView(c.env.DB_NORTHSTAR, String(row.id)))!));
      return c.json({ bundles, pagination: buildPagination(parsed.page, parsed.pageSize, total) });
    } catch (error: unknown) {
      console.error("Error listing V2 invoice bundles:", error);
      return serverError(String(error instanceof Error ? error.message : error));
    }
  });

  app.post("/v2/invoice-bundles", async (c) => {
    try {
      const payload = parseBundlePayload(await c.req.json().catch(() => null));
      if (typeof payload === "string") return badRequest(payload);
      const row = await createBundle(c.env.DB_NORTHSTAR, payload, new Date().toISOString(), c.get("auth").subject || "unknown-user");
      return c.json({ bundle: await bundleView(c.env.DB_NORTHSTAR, String(row.id)) }, 201);
    } catch (error: unknown) {
      console.error("Error creating V2 invoice bundle:", error);
      return badRequest(constraintMessage(error));
    }
  });

  app.get("/v2/invoice-bundles/:id", async (c) => {
    try {
      const bundle = await bundleView(c.env.DB_NORTHSTAR, c.req.param("id"));
      return bundle ? c.json({ bundle }) : c.json({ error: "Invoice bundle not found" }, 404);
    } catch (error: unknown) {
      console.error("Error reading V2 invoice bundle:", error);
      return serverError(String(error instanceof Error ? error.message : error));
    }
  });

  app.put("/v2/invoice-bundles/:id", async (c) => {
    try {
      const payload = parseBundleUpdatePayload(await c.req.json().catch(() => null));
      if (typeof payload === "string") return badRequest(payload);
      const row = await updateBundle(c.env.DB_NORTHSTAR, c.req.param("id"), payload, new Date().toISOString(), c.get("auth").subject || "unknown-user");
      return c.json({ bundle: await bundleView(c.env.DB_NORTHSTAR, String(row.id)) });
    } catch (error: unknown) {
      console.error("Error updating V2 invoice bundle:", error);
      return badRequest(constraintMessage(error));
    }
  });

  app.delete("/v2/invoice-bundles/:id", async (c) => {
    try {
      await deleteDraftBundle(c.env.DB_NORTHSTAR, c.req.param("id"));
      return noContent();
    } catch (error: unknown) {
      console.error("Error deleting V2 invoice bundle:", error);
      return badRequest(constraintMessage(error));
    }
  });

  app.post("/v2/invoice-bundles/:id/activate", async (c) => {
    try {
      const row = await activateBundle(c.env.DB_NORTHSTAR, c.req.param("id"), new Date().toISOString(), c.get("auth").subject || "unknown-user");
      const invoices = await getBundleInvoiceRows(c.env.DB_NORTHSTAR, String(row.id));
      for (const invoice of invoices) c.executionCtx.waitUntil(syncInvoiceToQbo(c.env.DB_NORTHSTAR, c.env, String(invoice.id)).catch(() => undefined));
      return c.json({ bundle: await bundleView(c.env.DB_NORTHSTAR, String(row.id)) });
    } catch (error: unknown) {
      console.error("Error activating V2 invoice bundle:", error);
      return badRequest(constraintMessage(error));
    }
  });

  app.post("/v2/invoice-bundles/:id/void", async (c) => {
    try {
      const row = await voidBundle(c.env.DB_NORTHSTAR, c.req.param("id"), new Date().toISOString(), c.get("auth").subject || "unknown-user");
      const invoices = await getBundleInvoiceRows(c.env.DB_NORTHSTAR, String(row.id));
      for (const invoice of invoices) c.executionCtx.waitUntil(voidInvoiceInQbo(c.env.DB_NORTHSTAR, c.env, String(invoice.id)).catch(() => undefined));
      return c.json({ bundle: await bundleView(c.env.DB_NORTHSTAR, String(row.id)) });
    } catch (error: unknown) {
      console.error("Error voiding V2 invoice bundle:", error);
      return badRequest(constraintMessage(error));
    }
  });

  return app;
}
