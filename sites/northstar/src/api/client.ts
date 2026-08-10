import { msalInstance, getMsalSilentRedirectUri } from "../auth/msalConfig";

function normalizeString(value: unknown): string {
  return String(value ?? "").trim();
}

function getApiBaseUrl(): string {
  return normalizeString(import.meta.env.VITE_API_BASE_URL) || "https://api.whitepointsurvey.com";
}

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

/** Sends an authenticated request to the Northstar API and parses its JSON response. */
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
    throw new Error(message || `Northstar API request failed (${response.status}).`);
  }

  return response.json() as Promise<T>;
}
