import { InteractionRequiredAuthError } from '@azure/msal-browser'
import { getMsalSilentRedirectUri, msalInstance } from '../auth/msalConfig'

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

function getMsalErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return ''
  }

  const candidate = error as { errorCode?: unknown; code?: unknown }
  return normalizeString(candidate.errorCode ?? candidate.code)
}

function isSilentTokenInteractionError(error: unknown): boolean {
  if (error instanceof InteractionRequiredAuthError) {
    return true
  }

  const errorCode = getMsalErrorCode(error)
  return errorCode === 'timed_out' || errorCode === 'monitor_window_timeout'
}

export async function acquireApiAccessToken(): Promise<string> {
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0]
  if (!account) {
    throw new Error('No active Microsoft account. Please sign in again.')
  }

  const request = {
    account,
    scopes: getApiScopes(),
  }

  const result = await msalInstance.acquireTokenSilent({
    ...request,
    redirectUri: getMsalSilentRedirectUri(),
  }).catch(async (error: unknown) => {
    // A cached account can survive a browser restart even when silent renewal
    // cannot. Recover through the interactive flow instead of leaving the UI
    // signed in while protected actions fail with an MSAL timeout.
    if (isSilentTokenInteractionError(error)) {
      return msalInstance.acquireTokenPopup(request)
    }

    throw error
  })

  const token = normalizeString(result.accessToken)
  if (!token) {
    throw new Error('Microsoft token acquisition succeeded but did not return an access token.')
  }

  return token
}
