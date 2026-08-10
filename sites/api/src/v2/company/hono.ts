import { Hono } from "hono";
import { badRequest, requireAuthMode, serverError, type HonoEnv } from "../../apiTypes";
import { upsertCompanySettings } from "./db";
import { getCompanySettings, parseGeneralSettings } from "./internal";

/** Creates the V2 company settings routes. */
export function companyApi() {
  const app = new Hono<HonoEnv>();

  // GET: /v2/company - Gets the company settings from the Northstar database.
  app.get("/v2/company", async (c) => {
    try {
      const authError = requireAuthMode(c, "microsoft");
      if (authError) return authError;

      const settings = await getCompanySettings(c.env.DB_NORTHSTAR);
      if (!settings) return badRequest("Company settings are not configured");
      return c.json({ settings }, 200);
    } catch (error: unknown) {
      console.error("Error reading V2 company settings:", error);
      return serverError(String(error instanceof Error ? error.message : error));
    }
  });

  // POST: /v2/company - Upserts the general company settings.
  app.post("/v2/company", async (c) => {
    try {
      const authError = requireAuthMode(c, "microsoft");
      if (authError) return authError;

      const body = (await c.req.json().catch(() => null)) as unknown;
      const input =
        body && typeof body === "object" && "general" in body
          ? (body as Record<string, unknown>).general
          : body;
      const general = parseGeneralSettings(input);
      if (!general) return badRequest("fullName and shortName are required");

      await upsertCompanySettings(c.env.DB_NORTHSTAR, general);
      const settings = await getCompanySettings(c.env.DB_NORTHSTAR);
      if (!settings) return badRequest("Company settings are not configured");
      return c.json({ status: "ok", settings }, 200);
    } catch (error: unknown) {
      console.error("Error updating V2 company settings:", error);
      return serverError(String(error instanceof Error ? error.message : error));
    }
  });

  return app;
}
