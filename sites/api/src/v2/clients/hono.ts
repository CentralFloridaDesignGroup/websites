import { Hono } from "hono";
import {
  badRequest,
  requireAuthMode,
  serverError,
  type HonoEnv,
} from "../../apiTypes";
import { buildPagination, parseListQuery } from "../pagination";
import {
  getClient,
  listClientContacts,
  listClientProjects,
  listClients,
  updateClientContact,
  validateClientId,
} from "./db";
import {
  Client,
  ClientContactRequest,
  ClientContactsListResponse,
  ClientListResponse,
  ClientProjectListResponse,
  ClientResponse,
} from "cfdg/types/v2";
import {
  mapClientDbToObject,
  mapClientListItemDbToObject,
  mapContactDbToObject,
  mapProjectListItemDbToObject,
} from "cfdg/types/mappers";
import { convertBodyToObject } from "cfdg/scripts";

/** Creates v2 client routes for Northstar. */
export function clientsApi() {
  const app = new Hono<HonoEnv>();

  // GET: /v2/clients - Returns a paginated list of top-level clients with extra-data fields.
  app.get("/v2/clients", async (c) => {
    try {
      const authError = requireAuthMode(c, "microsoft");
      if (authError) return authError;

      const parsed = parseListQuery(c.req.query());
      if (typeof parsed === "string") return badRequest(parsed);

      const rows = await listClients(c.env.DB_NORTHSTAR, parsed);

      return c.json({
        clients: rows.map(mapClientListItemDbToObject),
        pagination: buildPagination(parsed.page, parsed.pageSize, rows.length),
      } as ClientListResponse);
    } catch (error: unknown) {
      console.error("Error listing clients:", error);
      return serverError(
        String(error instanceof Error ? error.message : error),
      );
    }
  });

  // GET: /v2/clients/:id - Returns a single client with extra-data fields and contacts.
  app.get("/v2/clients/:id", async (c) => {
    try {
      const authError = requireAuthMode(c, "microsoft");
      if (authError) return authError;

      const clientDbRow = await getClient(
        c.env.DB_NORTHSTAR,
        c.req.param("id"),
      );
      if (!clientDbRow) return c.json({ error: "Client ID is not valid" }, 404);

      const contactDbRows = await listClientContacts(
        c.env.DB_NORTHSTAR,
        c.req.param("id"),
      );
      const contacts = contactDbRows.map(mapContactDbToObject);
      const client = mapClientDbToObject(clientDbRow);

      return c.json({
        client: { ...client, contacts: contacts } as Client,
      } as ClientResponse);
    } catch (error: unknown) {
      console.error("Error reading V2 client:", error);
      return serverError(
        String(error instanceof Error ? error.message : error),
      );
    }
  });

  // GET: /v2/clients/:id/projects - Returns a list of projects for a single client.
  app.get("/v2/clients/:id/projects", async (c) => {
    try {
      const authError = requireAuthMode(c, "microsoft");
      if (authError) return authError;

      const parsed = parseListQuery(c.req.query());
      if (typeof parsed === "string") return badRequest(parsed);

      if (!(await validateClientId(c.env.DB_NORTHSTAR, c.req.param("id"))))
        return c.json({ error: "Client not found" }, 404);

      const projectListDbRows = await listClientProjects(
        c.env.DB_NORTHSTAR,
        c.req.param("id"),
        parsed,
      );

      return c.json({
        projects: projectListDbRows.map(mapProjectListItemDbToObject),
        pagination: buildPagination(
          parsed.page,
          parsed.pageSize,
          projectListDbRows.length,
        ),
      } as ClientProjectListResponse);
    } catch (error: unknown) {
      console.error("Error reading V2 client projects:", error);
      return serverError(
        String(error instanceof Error ? error.message : error),
      );
    }
  });

  // GET: /v2/clients/:id/contacts - Returns a list of contacts for a single client.
  app.get("/v2/clients/:id/contacts", async (c) => {
    try {
      const authError = requireAuthMode(c, "microsoft");
      if (authError) return authError;

      if (!(await validateClientId(c.env.DB_NORTHSTAR, c.req.param("id"))))
        return c.json({ error: "Client not found" }, 404);

      const contactDbRows = await listClientContacts(
        c.env.DB_NORTHSTAR,
        c.req.param("id"),
      );
      return c.json({
        contacts: contactDbRows.map(mapContactDbToObject),
      } as ClientContactsListResponse);
    } catch (error: unknown) {
      console.error("Error listing V2 client contacts:", error);
      return serverError(
        String(error instanceof Error ? error.message : error),
      );
    }
  });

  // PUT: /v2/clients/:id/contacts/:contactId - Updates a single contact for a client. Requires ClientContactRequest.
  app.put("/v2/clients/:id/contacts/:contactId", async (c) => {
    try {
      const authError = requireAuthMode(c, "microsoft");
      if (authError) return authError;

      const id = c.req.param("id");
      if (!(await validateClientId(c.env.DB_NORTHSTAR, id)))
        return c.json({ error: "Client not found" }, 404);

      const body = await c.req.parseBody();
      if (!body) return badRequest("Request body is required");

      const payload = convertBodyToObject<ClientContactRequest>(body);
      if (!payload || !payload.contact) return badRequest("Invalid request body");
      
      const contact = await updateClientContact(
        c.env.DB_NORTHSTAR,
        payload.contact
      );
      return contact
        ? c.json({ contact: mapContactDbToObject(contact) })
        : c.json({ error: "Contact not found" }, 404);
    } catch (error: unknown) {
      console.error("Error updating V2 client contact:", error);
      return serverError(
        String(error instanceof Error ? error.message : error),
      );
    }
  });

  return app;
}
