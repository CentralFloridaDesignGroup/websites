import { Hono } from "hono";
import { badRequest, requireAuthMode, serverError, type HonoEnv } from "../../apiTypes";
import { PROJECT_STATUSES } from "cfdg/types/constants";
import { buildPagination, parseNorthstarListQuery } from "../pagination";
import { mapProjectExtraData, mapProjectListRow, mapProjectRow } from "./internal";
import { countProjects, getProject, getProjectClient, getProjectExtraData, listProjects, updateProjectStatus } from "./db";

/** Creates v2 project routes for Northstar. */
export function projectsApi() {
  const app = new Hono<HonoEnv>();

  app.get("/v2/projects", async (c) => {
    try {
      const authError = requireAuthMode(c, "microsoft");
      if (authError) return authError;
      const parsed = parseNorthstarListQuery(c.req.query());
      if (typeof parsed === "string") return badRequest(parsed);
      const clientId = c.req.query("clientId")?.trim() || undefined;
      const total = await countProjects(c.env.DB_NORTHSTAR, clientId);
      const rows = await listProjects(c.env.DB_NORTHSTAR, { ...parsed, clientId });
      return c.json({ projects: rows.map(mapProjectListRow), pagination: buildPagination(parsed.page, parsed.pageSize, total) });
    } catch (error: unknown) {
      console.error("Error listing V2 projects:", error);
      return serverError(String(error instanceof Error ? error.message : error));
    }
  });

  app.get("/v2/projects/:id", async (c) => {
    try {
      const authError = requireAuthMode(c, "microsoft");
      if (authError) return authError;
      const project = await getProject(c.env.DB_NORTHSTAR, c.req.param("id"));
      if (!project) return c.json({ error: "Project not found" }, 404);
      return c.json({ project: mapProjectRow(project) });
    } catch (error: unknown) {
      console.error("Error reading V2 project:", error);
      return serverError(String(error instanceof Error ? error.message : error));
    }
  });

  app.get("/v2/projects/:id/extra-data", async (c) => {
    try {
      const authError = requireAuthMode(c, "microsoft");
      if (authError) return authError;
      if (!await getProject(c.env.DB_NORTHSTAR, c.req.param("id"))) return c.json({ error: "Project not found" }, 404);
      return c.json({ extraData: mapProjectExtraData(await getProjectExtraData(c.env.DB_NORTHSTAR, c.req.param("id")), c.req.param("id")) });
    } catch (error: unknown) {
      console.error("Error reading V2 project extra data:", error);
      return serverError(String(error instanceof Error ? error.message : error));
    }
  });

  app.get("/v2/projects/:id/client", async (c) => {
    try {
      const authError = requireAuthMode(c, "microsoft");
      if (authError) return authError;
      const project = await getProject(c.env.DB_NORTHSTAR, c.req.param("id"));
      if (!project) return c.json({ error: "Project not found" }, 404);
      const client = await getProjectClient(c.env.DB_NORTHSTAR, String(project.parent_id ?? ""));
      return c.json({ client: client ? mapProjectRow(client) : null });
    } catch (error: unknown) {
      console.error("Error reading V2 project client:", error);
      return serverError(String(error instanceof Error ? error.message : error));
    }
  });

  app.put("/v2/projects/:id/status", async (c) => {
    try {
      const authError = requireAuthMode(c, "microsoft");
      if (authError) return authError;
      if (!await getProject(c.env.DB_NORTHSTAR, c.req.param("id"))) return c.json({ error: "Project not found" }, 404);
      const body = await c.req.json<{ status?: unknown }>().catch(() => ({ status: undefined }));
      const status = String(body.status ?? "").trim().toLowerCase();
      if (!(PROJECT_STATUSES as readonly string[]).includes(status)) return badRequest("Invalid project status");
      return c.json({ extraData: mapProjectExtraData(await updateProjectStatus(c.env.DB_NORTHSTAR, c.req.param("id"), status as typeof PROJECT_STATUSES[number]), c.req.param("id")) });
    } catch (error: unknown) {
      console.error("Error updating V2 project status:", error);
      return serverError(String(error instanceof Error ? error.message : error));
    }
  });

  return app;
}
