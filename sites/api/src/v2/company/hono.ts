import { Hono } from "hono";
import {
  badRequest,
  requireAuthMode,
  serverError,
  type HonoEnv,
} from "../../apiTypes";
import type { CompanySettings } from "cfdg/types/v2";
import { upsertCompanySettings } from "./db";
import { getCompanySettings } from "./internal";
import { convertBodyToObject } from "cfdg/scripts";
import { mapCompanySettingsDbToObject } from "cfdg/types/mappers";

/** Creates the V2 company settings routes. */
export function companyApi() {
  const app = new Hono<HonoEnv>();

  // GET: /v2/company - Gets the company settings from the Northstar database.
  app.get("/v2/company", async (c) => {
    try {
      const authError = requireAuthMode(c, "microsoft");
      if (authError) return authError;

      const settings = await getCompanySettings(c.env.DB_NORTHSTAR);
      if (typeof settings === "string") return badRequest(settings);
      return c.json({ settings }, 200);
    } catch (error: unknown) {
      console.error("Error reading V2 company settings:", error);
      return serverError(
        String(error instanceof Error ? error.message : error),
      );
    }
  });

  // POST: /v2/company - Upserts the general company settings.
  app.post("/v2/company", async (c) => {
    try {
      const authError = requireAuthMode(c, "microsoft");
      if (authError) return authError;

      const body = (await c.req.json().catch(() => null)) as unknown;
      if (!body || typeof body !== "object")
        return badRequest("Invalid request body");

      const settings = convertBodyToObject<CompanySettings>(c.req.raw);
      if (!settings) return badRequest("Invalid request body");

      await upsertCompanySettings(c.env.DB_NORTHSTAR, settings);
      if (!settings) return badRequest("Company settings are not configured");
      return c.json(
        { status: "ok", settings: mapCompanySettingsDbToObject(settings) },
        200,
      ); // Return the updated settings in the response.
    } catch (error: unknown) {
      console.error("Error updating V2 company settings:", error);
      return serverError(
        String(error instanceof Error ? error.message : error),
      );
    }
  });

  return app;
}
