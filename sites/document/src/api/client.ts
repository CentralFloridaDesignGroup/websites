import { acquireApiAccessToken } from './microsoftAuth'

export type ApiAuthMode = 'none' | 'key' | 'microsoft'

type ApiKeyPreference = 'comments' | 'gis' | 'any'

type ApiRequestOptions = Omit<RequestInit, 'headers'> & {
  authMode: ApiAuthMode
  headers?: Record<string, string>
  apiKeyPreference?: ApiKeyPreference
}

function normalizeString(value: unknown): string {
  return String(value ?? '').trim()
}

function isAbsoluteUrl(pathOrUrl: string): boolean {
  return /^https?:\/\//i.test(pathOrUrl)
}

function getApiBaseUrl(): string {
  return normalizeString(import.meta.env.VITE_API_BASE_URL) || 'https://api.whitepointsurvey.com'
}

function getApiUrl(pathOrUrl: string): string {
  return isAbsoluteUrl(pathOrUrl) ? pathOrUrl : `${getApiBaseUrl()}${pathOrUrl}`
}

function getApiKeyTarget(): 'local' | 'prod' {
  const configuredTarget = normalizeString(import.meta.env.VITE_API_KEY_TARGET).toLowerCase()
  if (configuredTarget === 'local' || configuredTarget === 'prod') {
    return configuredTarget
  }

  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : ''
  return hostname === 'localhost' || hostname === '127.0.0.1' ? 'local' : 'prod'
}

function getLegacyApiKey(preference: ApiKeyPreference): string {
  const commentsKey = normalizeString(import.meta.env.VITE_COMMENTS_API_KEY)
  const gisKey = normalizeString(import.meta.env.VITE_GIS_API_KEY)

  if (preference === 'comments' && commentsKey) {
    return commentsKey
  }

  if (preference === 'gis' && gisKey) {
    return gisKey
  }

  return preference === 'comments' ? commentsKey || gisKey : gisKey || commentsKey
}

function getKeyForTarget(localKey: string, prodKey: string, legacyKey: string, target: 'local' | 'prod'): string {
  if (target === 'local') {
    return localKey || legacyKey || prodKey
  }

  return prodKey || legacyKey || localKey
}

function getApiKey(preference: ApiKeyPreference): string {
  const target = getApiKeyTarget()

  const commentsLocal = normalizeString(import.meta.env.VITE_COMMENTS_API_KEY_LOCAL)
  const commentsProd = normalizeString(import.meta.env.VITE_COMMENTS_API_KEY_PROD)
  const gisLocal = normalizeString(import.meta.env.VITE_GIS_API_KEY_LOCAL)
  const gisProd = normalizeString(import.meta.env.VITE_GIS_API_KEY_PROD)

  if (preference === 'comments') {
    const resolved = getKeyForTarget(commentsLocal, commentsProd, getLegacyApiKey('comments'), target)
    if (resolved) {
      return resolved
    }
  }

  if (preference === 'gis') {
    const resolved = getKeyForTarget(gisLocal, gisProd, getLegacyApiKey('gis'), target)
    if (resolved) {
      return resolved
    }
  }

  const commentsAny = getKeyForTarget(commentsLocal, commentsProd, '', target)
  const gisAny = getKeyForTarget(gisLocal, gisProd, '', target)
  const resolvedAny = commentsAny || gisAny || getLegacyApiKey('any')
  if (!resolvedAny) {
    throw new Error('Missing API key configuration for key-authenticated API route.')
  }

  return resolvedAny
}

async function buildAuthHeaders(authMode: ApiAuthMode, apiKeyPreference: ApiKeyPreference): Promise<Record<string, string>> {
  if (authMode === 'none') {
    return {}
  }

  if (authMode === 'key') {
    return {
      'X-Api-Key': getApiKey(apiKeyPreference),
    }
  }

  const accessToken = await acquireApiAccessToken()
  return {
    Authorization: `Bearer ${accessToken}`,
  }
}

function shouldAttachJsonHeader(body: BodyInit | null | undefined): boolean {
  if (!body) {
    return false
  }

  return typeof body === 'string'
}

export async function requestJson<T>(pathOrUrl: string, options: ApiRequestOptions): Promise<T> {
  const { authMode, headers, apiKeyPreference = 'any', ...init } = options

  const authHeaders = await buildAuthHeaders(authMode, apiKeyPreference)
  const outboundHeaders: Record<string, string> = {
    ...authHeaders,
    ...(shouldAttachJsonHeader(init.body) ? { 'Content-Type': 'application/json' } : {}),
    ...(headers || {}),
  }

  const response = await fetch(getApiUrl(pathOrUrl), {
    ...init,
    headers: outboundHeaders,
  })

  if (!response.ok) {
    const bodyText = await response.text()
    throw new Error(bodyText || `Request failed with status ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
