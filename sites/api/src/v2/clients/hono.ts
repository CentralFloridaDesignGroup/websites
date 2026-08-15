import { Hono } from "hono";
import { badRequest, requireAuthMode, serverError, type HonoEnv } from "../../apiTypes";
import { buildPagination, parseNorthstarListQuery } from "../pagination";
import { mapClientContact, mapClientExtraData, mapClientListRow, mapClientProjectRow, mapClientRow } from "./internal";
import { countClients, createClientContact, getClient, getClientExtraData, listClientContacts, listClientProjects, listClients, updateClientContact, updateClientStatus } from "./db";

function contactPayload(body: Record<string, unknown>) {
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!name) return "name is required";
  if (!/^\S+@\S+\.\S+$/.test(email)) return "A valid email is required";
  return { name, email, phone: String(body.phone ?? "").trim(), title: String(body.title ?? "").trim(), pointOfContact: body.pointOfContact === true, receiveInvoices: body.receiveInvoices === true, active: body.active !== false };
}

/** Creates v2 client routes for Northstar. */
export function clientsApi() {
  const app = new Hono<HonoEnv>();

  // GET: /v2/clients - Returns a paginated list of top-level clients with extra-data fields.
  app.get("/v2/clients", async (c) => {
    try {
      const authError = requireAuthMode(c, "microsoft");
      if (authError) return authError;
      const parsed = parseNorthstarListQuery(c.req.query());
      if (typeof parsed === "string") return badRequest(parsed);
      const total = await countClients(c.env.DB_NORTHSTAR);
      const rows = await listClients(c.env.DB_NORTHSTAR, parsed);
      return c.json({ clients: rows.map(mapClientListRow), pagination: buildPagination(parsed.page, parsed.pageSize, total) });
    } catch (error: unknown) {
      console.error("Error listing V2 clients:", error);
      return serverError(String(error instanceof Error ? error.message : error));
    }
  });

  app.get("/v2/clients/:id", async (c) => {
    try {
      const authError = requireAuthMode(c, "microsoft");
      if (authError) return authError;
      const client = await getClient(c.env.DB_NORTHSTAR, c.req.param("id"));
      if (!client) return c.json({ error: "Client not found" }, 404);
      return c.json({ client: mapClientRow(client) });
    } catch (error: unknown) {
      console.error("Error reading V2 client:", error);
      return serverError(String(error instanceof Error ? error.message : error));
    }
  });

  app.get("/v2/clients/:id/extra-data", async (c) => {
    try {
      const authError = requireAuthMode(c, "microsoft");
      if (authError) return authError;
      if (!await getClient(c.env.DB_NORTHSTAR, c.req.param("id"))) return c.json({ error: "Client not found" }, 404);
      return c.json({ extraData: mapClientExtraData(await getClientExtraData(c.env.DB_NORTHSTAR, c.req.param("id")), c.req.param("id")) });
    } catch (error: unknown) {
      console.error("Error reading V2 client extra data:", error);
      return serverError(String(error instanceof Error ? error.message : error));
    }
  });

  app.get("/v2/clients/:id/projects", async (c) => {
    try {
      const authError = requireAuthMode(c, "microsoft");
      if (authError) return authError;
      if (!await getClient(c.env.DB_NORTHSTAR, c.req.param("id"))) return c.json({ error: "Client not found" }, 404);
      return c.json({ projects: (await listClientProjects(c.env.DB_NORTHSTAR, c.req.param("id"))).map(mapClientProjectRow) });
    } catch (error: unknown) {
      console.error("Error reading V2 client projects:", error);
      return serverError(String(error instanceof Error ? error.message : error));
    }
  });

  app.get("/v2/clients/:id/contacts", async (c) => {
    try {
      const authError = requireAuthMode(c, "microsoft");
      if (authError) return authError;
      if (!await getClient(c.env.DB_NORTHSTAR, c.req.param("id"))) return c.json({ error: "Client not found" }, 404);
      return c.json({ contacts: (await listClientContacts(c.env.DB_NORTHSTAR, c.req.param("id"))).map(mapClientContact) });
    } catch (error: unknown) { console.error("Error listing V2 client contacts:", error); return serverError(String(error instanceof Error ? error.message : error)); }
  });

  app.post("/v2/clients/:id/contacts", async (c) => {
    try {
      const authError = requireAuthMode(c, "microsoft");
      if (authError) return authError;
      const id = c.req.param("id");
      if (!await getClient(c.env.DB_NORTHSTAR, id)) return c.json({ error: "Client not found" }, 404);
      const payload = contactPayload(await c.req.json<Record<string, unknown>>().catch(() => ({})));
      if (typeof payload === "string") return badRequest(payload);
      return c.json({ contact: mapClientContact(await createClientContact(c.env.DB_NORTHSTAR, id, payload, new Date().toISOString())) }, 201);
    } catch (error: unknown) { console.error("Error creating V2 client contact:", error); return serverError(String(error instanceof Error ? error.message : error)); }
  });

  app.put("/v2/clients/:id/contacts/:contactId", async (c) => {
    try {
      const authError = requireAuthMode(c, "microsoft");
      if (authError) return authError;
      const id = c.req.param("id");
      if (!await getClient(c.env.DB_NORTHSTAR, id)) return c.json({ error: "Client not found" }, 404);
      const payload = contactPayload(await c.req.json<Record<string, unknown>>().catch(() => ({})));
      if (typeof payload === "string") return badRequest(payload);
      const contact = await updateClientContact(c.env.DB_NORTHSTAR, id, c.req.param("contactId"), payload, new Date().toISOString());
      return contact ? c.json({ contact: mapClientContact(contact) }) : c.json({ error: "Contact not found" }, 404);
    } catch (error: unknown) { console.error("Error updating V2 client contact:", error); return serverError(String(error instanceof Error ? error.message : error)); }
  });

  app.put("/v2/clients/:id/status", async (c) => {
    try {
      const authError = requireAuthMode(c, "microsoft");
      if (authError) return authError;
      if (!await getClient(c.env.DB_NORTHSTAR, c.req.param("id"))) return c.json({ error: "Client not found" }, 404);
      const body = await c.req.json<{ status?: unknown }>().catch(() => ({ status: undefined }));
      const status = String(body.status ?? "").trim().toLowerCase();
      if (status !== "active" && status !== "inactive") return badRequest("status must be active or inactive");
      return c.json({ extraData: mapClientExtraData(await updateClientStatus(c.env.DB_NORTHSTAR, c.req.param("id"), status), c.req.param("id")) });
    } catch (error: unknown) {
      console.error("Error updating V2 client status:", error);
      return serverError(String(error instanceof Error ? error.message : error));
    }
  });

  return app;
}
