import { Hono } from "hono";
import {
  badRequest,
  requireAuthMode,
  serverError,
  type HonoEnv,
} from "../../apiTypes";
import { clearQboSettings, getQboSettings, upsertQboSettings } from "./db";
import {
  exchangeToken,
  getQboConfig,
  getQboEnvironment,
  qboFetch,
} from "./internal";
import {
  generateRandomString,
  getIsoStringNow,
  normalizeString,
} from "cfdg/scripts";
import type {
  QboAccount,
  QboAccountResponse,
  QboItemResponse,
  QboOptionsResponse,
  QboServiceItem,
  QboSettings,
  QboStatusResponse,
} from "cfdg/types";
import { mapQboAppSettings } from "cfdg/types/mappers";

const QBO_STATE_PREFIX = "qbo_oauth_state:";

type QboQueryResponse = {
  QueryResponse?: {
    Item?: QboItemResponse[];
    Account?: QboAccountResponse[];
  };
};

function isConnected(settings: QboSettings | null): boolean {
  return Boolean(
    settings?.connection?.realmId &&
    settings.oauth?.accessToken &&
    settings.oauth?.refreshToken,
  );
}

function qboSqlString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function mapQboServiceItem(
  item: QboItemResponse,
  selectedDate = "",
): QboServiceItem | null {
  const id = normalizeString(item.Id);
  const name = normalizeString(item.Name || item.FullyQualifiedName);
  if (!id || !name) return null;
  return {
    id,
    name,
    fullyQualifiedName: normalizeString(item.FullyQualifiedName || name),
    active: item.Active !== false,
    selectedDate,
    description: normalizeString(item.Description),
  };
}

function mapQboAccount(
  account: QboAccountResponse,
  selectedDate = "",
): QboAccount | null {
  const id = normalizeString(account.Id);
  const name = normalizeString(account.Name || account.FullyQualifiedName);
  if (!id || !name) return null;
  return {
    id,
    name,
    fullyQualifiedName: normalizeString(account.FullyQualifiedName || name),
    active: account.Active !== false,
    selectedDate,
    accountType: normalizeString(account.AccountType),
    accountSubType: normalizeString(account.AccountSubType),
    classification: normalizeString(account.Classification),
  };
}

function normalizeServiceItem(
  value: unknown,
  selectedDate: string,
): QboServiceItem | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = normalizeString(record.id);
  const name = normalizeString(record.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    fullyQualifiedName: normalizeString(record.fullyQualifiedName || name),
    active: record.active !== false,
    selectedDate,
    description: normalizeString(record.description),
  };
}

function normalizeAccount(
  value: unknown,
  selectedDate: string,
): QboAccount | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = normalizeString(record.id);
  const name = normalizeString(record.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    fullyQualifiedName: normalizeString(record.fullyQualifiedName || name),
    active: record.active !== false,
    selectedDate,
    accountType: normalizeString(record.accountType),
    accountSubType: normalizeString(record.accountSubType),
    classification: normalizeString(record.classification),
  };
}

function getAccountingDefaultsInput(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const defaults = body.accountingDefaults;
  return defaults && typeof defaults === "object"
    ? (defaults as Record<string, unknown>)
    : body;
}

export function qboConnectionApi() {
  const app = new Hono<HonoEnv>();

  // GET: /v2/qbo/status - Gets the status of the QBO connection
  app.get("/v2/qbo/status", async (c) => {
    try {
      const env = c.env;

      if (
        !env.QBO_CLIENT_ID ||
        !env.QBO_CLIENT_SECRET ||
        !env.QBO_REDIRECT_URI
      ) {
        return c.json(
          {
            connected: false,
            message: "QBO environment variables are missing",
          } as QboStatusResponse,
          400,
        );
      }

      const settings = await getQboSettings(env.DB_NORTHSTAR);
      if (!settings || !isConnected(settings)) {
        return c.json(
          {
            connected: false,
            message: "QBO is not connected",
          } as QboStatusResponse,
          200,
        );
      }

      return c.json(
        {
          connected: true,
          message: "QBO is connected",
          settings: mapQboAppSettings(settings),
        },
        200,
      );
    } catch (error: unknown) {
      console.error("Error reading V2 QBO status:", error);
      return serverError(
        String(error instanceof Error ? error.message : error),
      );
    }
  });

  // GET: /v2/qbo/connect - Initiates the QBO OAuth connection process
  app.get("/v2/qbo/connect", async (c) => {
    try {
      const authError = requireAuthMode(c, "microsoft");
      if (authError) return authError;

      const { clientId, redirectUri } = getQboConfig(c.env);
      const state = generateRandomString(24);
      await c.env.WPS_KV_BINDING.put(`${QBO_STATE_PREFIX}${state}`, "1", {
        expirationTtl: 600,
      });

      const params = new URLSearchParams();
      params.set("client_id", clientId);
      params.set("response_type", "code");
      params.set("scope", "com.intuit.quickbooks.accounting");
      params.set("redirect_uri", redirectUri);
      params.set("state", state);

      return c.json({
        authorizationUrl: `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`,
      });
    } catch (error: unknown) {
      console.error("Error starting V2 QBO connection:", error);
      return serverError(
        String(error instanceof Error ? error.message : error),
      );
    }
  });

  // GET: /v2/qbo/callback - Handles the QBO OAuth callback
  app.get("/v2/qbo/callback", async (c) => {
    const northstarUrl = c.env.NORTHSTAR_PUBLIC_BASE_URL || "https://northstar.whitepointsurvey.com";
    const fallbackRedirect = `${northstarUrl}/company-settings?section=qbo`;
    try {
      const state = normalizeString(c.req.query("state"));
      const code = normalizeString(c.req.query("code"));
      const realmId = normalizeString(c.req.query("realmId"));
      if (!state || !code || !realmId) {
        return badRequest("Missing QuickBooks OAuth callback parameters");
      }

      const stateKey = `${QBO_STATE_PREFIX}${state}`;
      const stateExists = await c.env.WPS_KV_BINDING.get(stateKey);
      if (!stateExists) {
        return c.json({ error: "Invalid QuickBooks OAuth state" }, 400);
      }
      await c.env.WPS_KV_BINDING.delete(stateKey);

      const { redirectUri } = getQboConfig(c.env);
      const tokenBody = new URLSearchParams();
      tokenBody.set("grant_type", "authorization_code");
      tokenBody.set("code", code);
      tokenBody.set("redirect_uri", redirectUri);

      const token = await exchangeToken(c.env, tokenBody);
      if (
        !token.accessToken ||
        !token.refreshToken ||
        !token.tokenExpiresTime
      ) {
        throw new Error(
          "QuickBooks OAuth did not return access and refresh tokens",
        );
      }

      const existing = await getQboSettings(c.env.DB_NORTHSTAR);
      const now = getIsoStringNow();
      const settings: QboSettings = {
        schemaVersion: 1,
        connection: {
          realmId,
          environment: getQboEnvironment(c.env),
          connectedDate: existing?.connection?.connectedDate || now,
          updatedDate: now,
        },
        oauth: {
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          tokenExpiresDate: new Date(
            Date.now() + token.tokenExpiresTime * 1000,
          ).toISOString(),
          refreshExpiresDate: token.xRefreshTokenExpiresTime
            ? new Date(
                Date.now() + token.xRefreshTokenExpiresTime * 1000,
              ).toISOString()
            : "",
        },
        accountingDefaults: {
          serviceItem: existing?.accountingDefaults?.serviceItem || null,
          depositAccount: existing?.accountingDefaults?.depositAccount || null,
          stripeFeeExpenseAccount:
            existing?.accountingDefaults?.stripeFeeExpenseAccount || null,
        },
        lastCustomerPullDate: existing?.lastCustomerPullDate,
      };
      await upsertQboSettings(c.env.DB_NORTHSTAR, settings);
      return c.redirect(`${northstarUrl}/company-settings?section=qbo`, 302);
    } catch (error: unknown) {
      console.error("Error handling V2 QBO callback:", error);
      return c.redirect(fallbackRedirect, 302);
    }
  });

  // GET: /v2/qbo/options - Gets the QBO accounts and service items for the connected company
  app.get("/v2/qbo/options", async (c) => {
    try {
      const authError = requireAuthMode(c, "microsoft");
      if (authError) return authError;

      const search = normalizeString(c.req.query("search"));
      const accountType = normalizeString(c.req.query("accountType"));
      const searchClause = search
        ? ` AND Name LIKE '%${qboSqlString(search)}%'`
        : "";
      const accountTypeClause = accountType
        ? ` AND AccountType = '${qboSqlString(accountType)}'`
        : "";

      const [itemsData, accountsData] = await Promise.all([
        qboFetch<QboQueryResponse>(
          c.env.DB_NORTHSTAR,
          c.env,
          `/query?query=${encodeURIComponent(`select * from Item where Active = true AND Type = 'Service'${searchClause} maxresults 100`)}`,
        ),
        qboFetch<QboQueryResponse>(
          c.env.DB_NORTHSTAR,
          c.env,
          `/query?query=${encodeURIComponent(`select * from Account where Active = true${accountTypeClause}${searchClause} maxresults 100`)}`,
        ),
      ]);

      return c.json(
        {
          serviceItems: (itemsData.QueryResponse?.Item || [])
            .map((item) => mapQboServiceItem(item))
            .filter((item): item is QboServiceItem => Boolean(item)),
          accounts: (accountsData.QueryResponse?.Account || [])
            .map((account) => mapQboAccount(account))
            .filter((account): account is QboAccount => Boolean(account)),
        } as QboOptionsResponse,
        200,
      );
    } catch (error: unknown) {
      console.error("Error reading V2 QBO options:", error);
      return serverError(
        String(error instanceof Error ? error.message : error),
      );
    }
  });

  // PUT: /v2/qbo/settings - Updates the QBO settings
  // body: { accountingDefaults: { serviceItem: QboServiceItem, depositAccount: QboAccount, stripeFeeExpenseAccount: QboAccount } }
  app.put("/v2/qbo/settings", async (c) => {
    try {
      const authError = requireAuthMode(c, "microsoft");
      if (authError) return authError;

      const existing = await getQboSettings(c.env.DB_NORTHSTAR);
      if (!existing || !isConnected(existing)) {
        return badRequest("QuickBooks is not connected");
      }

      const body = (await c.req.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      const defaultsInput = getAccountingDefaultsInput(body);
      const now = getIsoStringNow();

      const settings: QboSettings = {
        ...existing,
        connection: {
          ...existing.connection,
          updatedDate: now,
        },
        accountingDefaults: {
          serviceItem: Object.prototype.hasOwnProperty.call(
            defaultsInput,
            "serviceItem",
          )
            ? normalizeServiceItem(defaultsInput.serviceItem, now)
            : existing.accountingDefaults?.serviceItem,
          depositAccount: Object.prototype.hasOwnProperty.call(
            defaultsInput,
            "depositAccount",
          )
            ? normalizeAccount(defaultsInput.depositAccount, now)
            : existing.accountingDefaults?.depositAccount,
          stripeFeeExpenseAccount: Object.prototype.hasOwnProperty.call(
            defaultsInput,
            "stripeFeeExpenseAccount",
          )
            ? normalizeAccount(defaultsInput.stripeFeeExpenseAccount, now)
            : existing.accountingDefaults?.stripeFeeExpenseAccount,
        },
      };

      await upsertQboSettings(c.env.DB_NORTHSTAR, settings);
      return c.json(
        {
          status: "ok",
          settings: mapQboAppSettings(settings),
        },
        200,
      );
    } catch (error: unknown) {
      console.error("Error updating V2 QBO settings:", error);
      return serverError(
        String(error instanceof Error ? error.message : error),
      );
    }
  });

  // DELETE: /v2/qbo/settings - Disconnects QBO without deleting cached customers.
  app.delete("/v2/qbo/settings", async (c) => {
    try {
      const authError = requireAuthMode(c, "microsoft");
      if (authError) return authError;

      await clearQboSettings(c.env.DB_NORTHSTAR);
      return c.json({ status: "ok" }, 200);
    } catch (error: unknown) {
      console.error("Error disconnecting V2 QBO:", error);
      return serverError(
        String(error instanceof Error ? error.message : error),
      );
    }
  });

  return app;
}
