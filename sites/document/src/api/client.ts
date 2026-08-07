import { normalizeString } from "cfdg/scripts";
import { acquireApiAccessToken } from "./microsoftAuth";
import { AuthMode } from "cfdg/types";

type ApiRequestOptions = Omit<RequestInit, "headers"> & {
  authMode: AuthMode;
  headers?: Record<string, string>;
};

function isAbsoluteUrl(pathOrUrl: string): boolean {
  return /^https?:\/\//i.test(pathOrUrl);
}

function getApiBaseUrl(): string {
  return (
    normalizeString(import.meta.env.VITE_API_BASE_URL) ||
    "https://api.whitepointsurvey.com"
  );
}

function getApiUrl(pathOrUrl: string): string {
  return isAbsoluteUrl(pathOrUrl)
    ? pathOrUrl
    : `${getApiBaseUrl()}${pathOrUrl}`;
}


function getApiKey(): string {
  const apiKey = normalizeString(import.meta.env.VITE_API_KEY);
  if (!apiKey) {
    throw new Error("Missing VITE_API_KEY configuration for key-authenticated API route.");
  }

  return apiKey;
}

async function buildAuthHeaders(
  authMode: AuthMode,
): Promise<Record<string, string>> {
  if (authMode === "public") {
    return {};
  }

  if (authMode === "key") {
    return {
      "X-Api-Key": getApiKey(),
    };
  }

  const accessToken = await acquireApiAccessToken();
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

function shouldAttachJsonHeader(body: BodyInit | null | undefined): boolean {
  if (!body) {
    return false;
  }

  return typeof body === "string";
}

export async function requestJson<T>(
  pathOrUrl: string,
  options: ApiRequestOptions,
): Promise<T> {
  const {
    authMode,
    headers,
    ...init
  } = options;

  const authHeaders = await buildAuthHeaders(authMode);
  const outboundHeaders: Record<string, string> = {
    ...authHeaders,
    ...(shouldAttachJsonHeader(init.body)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(headers || {}),
  };

  const response = await fetch(getApiUrl(pathOrUrl), {
    ...init,
    headers: outboundHeaders,
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(
      bodyText || `Request failed with status ${response.status}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function requestBlob(
  pathOrUrl: string,
  options: ApiRequestOptions,
): Promise<Blob> {
  const {
    authMode,
    headers,
    ...init
  } = options;
  const authHeaders = await buildAuthHeaders(authMode);
  const response = await fetch(getApiUrl(pathOrUrl), {
    ...init,
    headers: {
      ...authHeaders,
      ...(headers || {}),
    },
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(
      bodyText || `Request failed with status ${response.status}`,
    );
  }

  return response.blob();
}
