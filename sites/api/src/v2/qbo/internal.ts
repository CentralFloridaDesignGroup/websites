import { normalizeString } from "cfdg/scripts";
import type { HonoEnv } from "../../apiTypes";
import { QboTokenResponse } from "cfdg/types/v2";
import { getQboSettings, upsertQboSettings } from "./db";

/**
 * Gets the current QBO environment from the Hono environment bindings.
 * - `production` for production environment.
 * - `sandbox` for sandbox (testing) environment.
 * @param env The Hono environment bindings.
 * @returns The current QBO environment.
 * @throws Error if the QBO environment is invalid.
 */
export function getQboEnvironment(
  env: HonoEnv["Bindings"],
): "production" | "sandbox" {
  const mode = env.QBO_ENVIRONMENT;
  if (mode === "production" || mode === "sandbox") {
    return mode;
  }
  throw new Error("Invalid QBO environment");
}

/**
 * Gets the base URL for the QBO API based on the current environment.
 * @param env The Hono environment bindings.
 * @returns The base URL for the QBO API.
 */
export function getQboApiBaseUrl(env: HonoEnv["Bindings"]): string {
  return getQboEnvironment(env) === "sandbox"
    ? "https://sandbox-quickbooks.api.intuit.com"
    : "https://quickbooks.api.intuit.com";
}

/**
 * Gets the minor version of the QBO API from the Hono environment bindings.
 * If the minor version is not set, it defaults to '75'.
 * @param env The Hono environment bindings
 * @returns the string of the minor version of the QBO API.
 */
export function getQboMinorVersion(env: HonoEnv["Bindings"]): string {
  return normalizeString(env.QBO_MINOR_VERSION) || "75";
}

/**
 * Gets the QBO OAuth configuration from the Hono environment bindings.
 * @param env The Hono environment bindings.
 * @returns An object containing the clientId, clientSecret, and redirectUri.
 * @throws Error if any of the required configuration values are missing.
 */
export function getQboConfig(env: HonoEnv["Bindings"]): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} {
  const clientId = normalizeString(env.QBO_CLIENT_ID);
  const clientSecret = normalizeString(env.QBO_CLIENT_SECRET);
  const redirectUri = normalizeString(env.QBO_REDIRECT_URI);
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Server configuration error: Missing QuickBooks OAuth configuration",
    );
  }
  return { clientId, clientSecret, redirectUri };
}

/**
 * Exchanges an authorization code or refresh token for an access token from QuickBooks Online.
 * @param env The Hono environment bindings.
 * @param body The URLSearchParams containing the request body for the token exchange.
 * @returns A promise that resolves to a QboTokenResponse containing the access token and related information.
 * @throws Error if the token exchange fails or the response is not OK.
 */
export async function exchangeToken(
  env: HonoEnv["Bindings"],
  body: URLSearchParams,
): Promise<QboTokenResponse> {
  const { clientId, clientSecret } = getQboConfig(env);
  const response = await fetch(
    "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        "x-include-refresh-token-hard-expires-in": "true",
      },
      body: body.toString(),
    },
  );
  const data = (await response.json().catch(() => null)) as
    | (QboTokenResponse & {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        x_refresh_token_expires_in?: number;
      })
    | { error_description?: string }
    | null;
  if (!response.ok) {
    const message =
      data && "error_description" in data
        ? data.error_description
        : response.statusText;
    throw new Error(
      `QuickBooks OAuth failed: ${message || response.statusText}`,
    );
  }
  const tokenData = data as QboTokenResponse & {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    x_refresh_token_expires_in?: number;
  };
  return {
    accessToken: normalizeString(tokenData.accessToken || tokenData.access_token),
    refreshToken: normalizeString(tokenData.refreshToken || tokenData.refresh_token),
    tokenExpiresTime: Number(tokenData.tokenExpiresTime ?? tokenData.expires_in ?? 0),
    xRefreshTokenExpiresTime: Number(tokenData.xRefreshTokenExpiresTime ?? tokenData.x_refresh_token_expires_in ?? 0),
  };
}

/** 
 * Gets a valid access token for QuickBooks Online, refreshing it if necessary.
 * @param db The D1Database instance.
 * @param env The Hono environment bindings.
 * @returns A promise that resolves to an object containing the realmId and accessToken.
 * @throws Error if QuickBooks is not connected or if the token refresh fails.
 */
export async function getAccessToken(
  db: D1Database,
  env: HonoEnv["Bindings"],
): Promise<{ realmId: string; accessToken: string }> {
  const settings = await getQboSettings(db);
  if (!settings) {
    throw new Error("QuickBooks is not connected");
  }
  const realmId = normalizeString(settings.connection.realmId);
  const accessToken = normalizeString(settings.oauth.accessToken);
  const refreshToken = normalizeString(settings.oauth.refreshToken);
  if (!realmId || !accessToken || !refreshToken) {
    throw new Error("QuickBooks is not connected");
  }

  // Check if the access token is still valid (with a 1-minute buffer)
  const expires = new Date(normalizeString(settings.oauth.tokenExpiresDate)).getTime();
  if (Number.isFinite(expires) && expires > Date.now() + 60_000) {
    return { realmId, accessToken };
  }

  const body = new URLSearchParams();
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", refreshToken);
  const token = await exchangeToken(env, body);
  if (!token.accessToken || !token.refreshToken || !token.tokenExpiresTime) {
    throw new Error("Failed to refresh QuickBooks access token");
  }
  settings.oauth.accessToken = normalizeString(token.accessToken);
  settings.oauth.refreshToken = normalizeString(token.refreshToken);
  settings.oauth.tokenExpiresDate = new Date(Date.now() + token.tokenExpiresTime * 1000).toISOString();
  if (token.xRefreshTokenExpiresTime) {
    settings.oauth.refreshExpiresDate = new Date(Date.now() + token.xRefreshTokenExpiresTime * 1000).toISOString();
  }
  settings.connection.updatedDate = new Date().toISOString();
  await upsertQboSettings(db, settings);
  return { realmId, accessToken: normalizeString(token.accessToken) };
}

/**
 * Fetches data from the QuickBooks Online API, automatically handling access token retrieval and refresh.
 * @param db The D1Database instance.
 * @param env The Hono environment bindings.
 * @param path The API path to fetch, relative to the QuickBooks Online API base URL.
 * @param init Optional RequestInit object to customize the fetch request.
 * @returns A promise that resolves to the fetched data of type T.
 */
export async function qboFetch<T>(db: D1Database, env: HonoEnv['Bindings'], path: string, init: RequestInit = {}): Promise<T> {
  const { realmId, accessToken } = await getAccessToken(db, env)
  const separator = path.includes('?') ? '&' : '?'
  const response = await fetch(`${getQboApiBaseUrl(env)}/v3/company/${realmId}${path}${separator}minorversion=${encodeURIComponent(getQboMinorVersion(env))}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers || {}),
    },
  })
  const data = await response.json().catch(() => null) as T | { Fault?: { Error?: Array<{ Message?: string; Detail?: string }> } } | null
  if (!response.ok) {
    const error = data && typeof data === 'object' && 'Fault' in data ? data.Fault?.Error?.[0] : null
    throw new Error(`QuickBooks API failed: ${error?.Detail || error?.Message || response.statusText}`)
  }
  return data as T
}
