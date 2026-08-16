import { Hono } from "hono";
import { getIsoStringNow } from "cfdg/scripts";
import type { QboCustomerResponse } from "cfdg/types/v2";
import { badRequest, requireAuthMode, serverError, type HonoEnv } from "../../apiTypes";
import { getQboSettings, upsertQboSettings } from "../qbo/db";
import { qboFetch } from "../qbo/internal";
import { insertCustomer } from "./db";

type CustomerQueryResponse = {
  QueryResponse?: { Customer?: QboCustomerResponse[] };
};

/** Creates v2 customer synchronization routes for Northstar. */
export function customersApi() {
  const app = new Hono<HonoEnv>();

  // POST: /v2/customers/sync - Retrieves all customers from QBO and upserts them into the Northstar database.
  app.post("/v2/customers/sync", async (c) => {
    try {
      const authError = requireAuthMode(c, "microsoft");
      if (authError) return authError;

      const settings = await getQboSettings(c.env.DB_NORTHSTAR);
      if (!settings?.connection?.realmId) return badRequest("QuickBooks is not connected");

      const syncedDate = getIsoStringNow();
      let startPosition = 1;
      let count = 0;

      while (true) {
        const query = encodeURIComponent(`SELECT * FROM Customer STARTPOSITION ${startPosition} MAXRESULTS 1000`);
        const data = await qboFetch<CustomerQueryResponse>(c.env.DB_NORTHSTAR, c.env, `/query?query=${query}`);
        const customers = data.QueryResponse?.Customer || [];
        for (const customer of customers) {
          if (await insertCustomer(c.env.DB_NORTHSTAR, customer, syncedDate)) count += 1;
        }
        if (customers.length < 1000) break;
        startPosition += 1000;
      }

      const updatedSettings = {
        ...settings,
        lastCustomerPullDate: syncedDate,
        connection: { ...settings.connection, updatedDate: syncedDate },
      };
      await upsertQboSettings(c.env.DB_NORTHSTAR, updatedSettings);

      return c.json({ count, lastCustomerPullDate: syncedDate }, 200);
    } catch (error: unknown) {
      console.error("Error syncing V2 QBO customers:", error);
      return serverError(String(error instanceof Error ? error.message : error));
    }
  });

  return app;
}
