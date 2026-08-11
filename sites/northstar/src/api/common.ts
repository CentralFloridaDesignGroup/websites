import { normalizeString } from "cfdg/scripts";
import { getMsalSilentRedirectUri, msalInstance } from "../auth/msalConfig";

/** 
 * Gets the base URL for the Northstar API. 
 * @returns The base URL for the Northstar API, or a default value if not configured.
 */
export function getApiBaseUrl(): string {
  return normalizeString(import.meta.env.VITE_API_BASE_URL) || "https://api.whitepointsurvey.com";
}

/** 
 * Gets the authentication scopes for the Northstar API.
 * @returns An array of authentication scopes.
 */
function getApiScopes(): string[] {
  const scopes = normalizeString(import.meta.env.VITE_API_AUTH_SCOPES)
    .split(/[ ,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);

  if (scopes.length === 0) {
    throw new Error("Missing VITE_API_AUTH_SCOPES configuration.");
  }

  return scopes;
}

/** Error raised when a Northstar API request returns a non-success status. */
export class NorthstarApiError extends Error {
  /** The HTTP status code returned by the Northstar API. */
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "NorthstarApiError";
    this.status = status;
  }
}

/** 
 * Gets an access token for the Northstar API using the active Microsoft account. 
 * @returns A promise that resolves to the access token string.
 * @throws An error if no active account is found or if token acquisition fails.
 */
async function getAccessToken(): Promise<string> {
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0];
  if (!account) {
    throw new Error("No active Microsoft account. Please sign in again.");
  }

  const result = await msalInstance.acquireTokenSilent({
    account,
    scopes: getApiScopes(),
    redirectUri: getMsalSilentRedirectUri(),
  });

  const token = normalizeString(result.accessToken);
  if (!token) {
    throw new Error("Microsoft token acquisition did not return an access token.");
  }

  return token;
}

/** 
 * Sends an authenticated request to the Northstar API and parses its JSON response.
 * @param path - The API endpoint path.
 * @param init - The fetch request initialization options.
 * @returns A promise that resolves to the parsed JSON response.
 * @throws NorthstarApiError if the response status is not successful.
 */
export async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new NorthstarApiError(message || `Northstar API request failed (${response.status}).`, response.status);
  }

  return response.json() as Promise<T>;
}