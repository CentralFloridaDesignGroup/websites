import { msalInstance } from '../auth/msalConfig'

function normalizeString(value: unknown): string {
  return String(value ?? '').trim()
}

function getApiScopes(): string[] {
  const rawScopes = normalizeString(import.meta.env.VITE_API_AUTH_SCOPES)
  const scopes = rawScopes
    .split(/[ ,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)

  if (scopes.length === 0) {
    throw new Error('Missing VITE_API_AUTH_SCOPES configuration for Microsoft-authenticated API routes.')
  }

  return scopes
}

export async function acquireApiAccessToken(): Promise<string> {
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0]
  if (!account) {
    throw new Error('No active Microsoft account. Please sign in again.')
  }

  const result = await msalInstance.acquireTokenSilent({
    account,
    scopes: getApiScopes(),
  })

  const token = normalizeString(result.accessToken)
  if (!token) {
    throw new Error('Microsoft token acquisition succeeded but did not return an access token.')
  }

  return token
}
