import { Hono } from "hono";
import type { PhaseCreatePayload, PhaseUpdatePayload } from "cfdg/types";
import { badRequest, requireAuthMode, serverError, type HonoEnv } from "../../apiTypes";
import { createPhase, deletePhase, getNorthstarProject, getPhase, listPhases, updatePhase } from "./db";
import { buildPhaseTree, parsePhasePayload, toCents } from "./internal";

/** Creates Northstar phase summary and management routes. */
export function phasesApi() {
  const app = new Hono<HonoEnv>();

  app.use("/v2/projects/:id/phases", async (c, next) => {
    const authError = requireAuthMode(c, "microsoft");
    if (authError) return authError;
    return next();
  });
  app.use("/v2/projects/:id/phases/:phaseId", async (c, next) => {
    const authError = requireAuthMode(c, "microsoft");
    if (authError) return authError;
    return next();
  });

  app.get("/v2/projects/:id/phases", async (c) => {
    try {
      const projectId = c.req.param("id");
      if (!await getNorthstarProject(c.env.DB_NORTHSTAR, projectId)) return c.json({ error: "Project not found" }, 404);
      return c.json({ phases: buildPhaseTree(await listPhases(c.env.DB_NORTHSTAR, projectId)) });
    } catch (error: unknown) {
      console.error("Error listing V2 project phases:", error);
      return serverError(String(error instanceof Error ? error.message : error));
    }
  });

  app.post("/v2/projects/:id/phases", async (c) => {
    try {
      const projectId = c.req.param("id");
      if (!await getNorthstarProject(c.env.DB_NORTHSTAR, projectId)) return c.json({ error: "Project not found" }, 404);
      const parsed = parsePhasePayload(await c.req.json().catch(() => null), "create");
      if (typeof parsed === "string") return badRequest(parsed);
      const payload = parsed as PhaseCreatePayload;
      if (!payload.parentId && payload.contractCost <= 0) return badRequest("Top-level phases require a contract amount greater than zero");
      if (payload.parentId) {
        const parent = await getPhase(c.env.DB_NORTHSTAR, projectId, payload.parentId);
        if (!parent || Number(parent.deleted) === 1) return badRequest("Parent phase not found in this project");
        if (Number(parent.billed_cents || 0) !== 0 || Number(parent.income_cents || 0) !== 0) return badRequest("A phase with billed or received income cannot receive a child phase");
      }
      const now = new Date().toISOString();
      const created = await createPhase(c.env.DB_NORTHSTAR, projectId, payload, {
        contractCents: toCents(payload.contractCost),
        retainerCents: toCents(payload.retainerCost),
        createdTime: now,
        createdId: c.get("auth").subject || "unknown-user",
      });
      return c.json({ phase: buildPhaseTree([created])[0] }, 201);
    } catch (error: unknown) {
      if (isConstraintError(error)) return badRequest("A phase with that identifier already exists under this parent");
      console.error("Error creating V2 project phase:", error);
      return serverError(String(error instanceof Error ? error.message : error));
    }
  });

  app.put("/v2/projects/:id/phases/:phaseId", async (c) => {
    try {
      const projectId = c.req.param("id");
      const id = c.req.param("phaseId");
      if (!await getNorthstarProject(c.env.DB_NORTHSTAR, projectId)) return c.json({ error: "Project not found" }, 404);
      const existing = await getPhase(c.env.DB_NORTHSTAR, projectId, id);
      if (!existing || Number(existing.deleted) === 1) return c.json({ error: "Phase not found" }, 404);
      const parsed = parsePhasePayload(await c.req.json().catch(() => null), "update");
      if (typeof parsed === "string") return badRequest(parsed);
      const payload = parsed as PhaseUpdatePayload;
      const hasChildren = Boolean((await c.env.DB_NORTHSTAR.prepare("SELECT 1 FROM phases WHERE qbo_id = ? AND parent_id = ? LIMIT 1").bind(projectId, id).first()));
      if (hasChildren && payload.contractCost !== 0) return badRequest("A parent phase with children must have a zero contract amount");
      if (!hasChildren && payload.contractCost <= 0) return badRequest("A phase without children requires a contract amount greater than zero");
      const statusChanged = payload.active !== (Number(existing.active) === 1) || payload.billable !== (Number(existing.billable) === 1);
      const now = new Date().toISOString();
      const updated = await updatePhase(c.env.DB_NORTHSTAR, projectId, id, payload, {
        contractCents: toCents(payload.contractCost),
        retainerCents: toCents(payload.retainerCost),
        updatedTime: now,
        updatedId: c.get("auth").subject || "unknown-user",
      }, statusChanged);
      return c.json({ phase: buildPhaseTree([updated])[0] });
    } catch (error: unknown) {
      if (isConstraintError(error)) return badRequest("A phase with that identifier already exists under this parent");
      console.error("Error updating V2 project phase:", error);
      return serverError(String(error instanceof Error ? error.message : error));
    }
  });

  app.delete("/v2/projects/:id/phases/:phaseId", async (c) => {
    try {
      const projectId = c.req.param("id");
      const id = c.req.param("phaseId");
      if (!await getNorthstarProject(c.env.DB_NORTHSTAR, projectId)) return c.json({ error: "Project not found" }, 404);
      const existing = await getPhase(c.env.DB_NORTHSTAR, projectId, id);
      if (!existing || Number(existing.deleted) === 1) return c.json({ error: "Phase not found" }, 404);
      const phase = await deletePhase(c.env.DB_NORTHSTAR, projectId, id, new Date().toISOString(), c.get("auth").subject || "unknown-user");
      return c.json({ phase: buildPhaseTree([phase])[0] });
    } catch (error: unknown) {
      console.error("Error deleting V2 project phase:", error);
      return serverError(String(error instanceof Error ? error.message : error));
    }
  });

  return app;
}

function isConstraintError(error: unknown): boolean {
  return /constraint|unique/i.test(String(error instanceof Error ? error.message : error));
}
