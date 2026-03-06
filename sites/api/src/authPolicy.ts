import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import { setRequestAuthContext, type RequestAuthContext, unauthorizedResponse } from './authContext'

export interface ApiAuthEnv {
  COMMENTS_API_KEY?: string
  COMMENTS_API_KEY_LOCAL?: string
  COMMENTS_API_KEY_PROD?: string
  GIS_API_KEY?: string
  GIS_API_KEY_LOCAL?: string
  GIS_API_KEY_PROD?: string
  TRANSACTION_EMAIL_API_KEY?: string
  TRANSACTION_EMAIL_API_KEY_LOCAL?: string
  TRANSACTION_EMAIL_API_KEY_PROD?: string
  MICROSOFT_TENANT_ID?: string
  MICROSOFT_CLIENT_ID?: string
  MICROSOFT_ALLOWED_AUDIENCES?: string
}

type RouteAuthMode = 'public' | 'key' | 'microsoft'
type ApiKeyName = 'comments' | 'gis' | 'transactionEmail'

type RoutePolicy = {
  method: '*' | 'GET' | 'POST' | 'PUT' | 'DELETE'
  pattern: RegExp
  mode: RouteAuthMode
  apiKeys?: ApiKeyName[]
}

const routePolicies: RoutePolicy[] = [
  { method: 'GET', pattern: /^\/api\/health$/, mode: 'public' },

  { method: 'POST', pattern: /^\/api\/email\/transactionEmail$/, mode: 'key', apiKeys: ['transactionEmail'] },

  { method: '*', pattern: /^\/api\/reviews(?:\/[^/]+(?:\/comments)?)?$/, mode: 'microsoft' },
  { method: '*', pattern: /^\/api\/comments(?:\/[^/]+)?$/, mode: 'microsoft' },

  { method: 'GET', pattern: /^\/api\/gis\/points$/, mode: 'key', apiKeys: ['gis'] },
  { method: 'GET', pattern: /^\/api\/gis\/points\/[^/]+$/, mode: 'key', apiKeys: ['gis'] },
  { method: 'POST', pattern: /^\/api\/gis\/points$/, mode: 'microsoft' },
  { method: 'POST', pattern: /^\/api\/gis\/points\/import$/, mode: 'microsoft' },
  { method: 'DELETE', pattern: /^\/api\/gis\/points\/[^/]+$/, mode: 'microsoft' },

  { method: 'GET', pattern: /^\/api\/users\/[^/]+\/favorites$/, mode: 'microsoft' },
  { method: 'PUT', pattern: /^\/api\/users\/[^/]+\/favorites$/, mode: 'microsoft' },
]

const jwksByTenant = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

function normalizeString(value: unknown): string {
  return String(value ?? '').trim()
}

function splitCsv(value: unknown): string[] {
  return normalizeString(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function findRoutePolicy(method: string, pathname: string): RoutePolicy | null {
  const normalizedMethod = method.toUpperCase()

  for (const policy of routePolicies) {
    if (policy.method !== '*' && policy.method !== normalizedMethod) {
      continue
    }

    if (policy.pattern.test(pathname)) {
      return policy
    }
  }

  return null
}

function getApiKeyCandidates(env: ApiAuthEnv, keyNames: ApiKeyName[]): string[] {
  const candidates: string[] = []
  const addCandidate = (value: unknown) => {
    const normalized = normalizeString(value)
    if (normalized && !candidates.includes(normalized)) {
      candidates.push(normalized)
    }
  }

  for (const keyName of keyNames) {
    if (keyName === 'comments') {
      addCandidate(env.COMMENTS_API_KEY)
      addCandidate(env.COMMENTS_API_KEY_LOCAL)
      addCandidate(env.COMMENTS_API_KEY_PROD)
    }
    if (keyName === 'gis') {
      addCandidate(env.GIS_API_KEY)
      addCandidate(env.GIS_API_KEY_LOCAL)
      addCandidate(env.GIS_API_KEY_PROD)
    }
    if (keyName === 'transactionEmail') {
      addCandidate(env.TRANSACTION_EMAIL_API_KEY)
      addCandidate(env.TRANSACTION_EMAIL_API_KEY_LOCAL)
      addCandidate(env.TRANSACTION_EMAIL_API_KEY_PROD)
    }
  }

  return candidates
}

function buildAudienceList(env: ApiAuthEnv): string[] {
  const configured = splitCsv(env.MICROSOFT_ALLOWED_AUDIENCES)
  if (configured.length > 0) {
    return configured
  }

  const clientId = normalizeString(env.MICROSOFT_CLIENT_ID)
  if (!clientId) {
    return []
  }

  return [clientId, `api://${clientId}`]
}

function getTenantId(env: ApiAuthEnv): string {
  const tenantId = normalizeString(env.MICROSOFT_TENANT_ID)
  if (!tenantId) {
    throw new Error('Server configuration error: Missing MICROSOFT_TENANT_ID')
  }
  return tenantId
}

function getJwksForTenant(tenantId: string) {
  const existing = jwksByTenant.get(tenantId)
  if (existing) {
    return existing
  }

  const issuerBaseUrl = `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`
  const jwks = createRemoteJWKSet(new URL(issuerBaseUrl))
  jwksByTenant.set(tenantId, jwks)
  return jwks
}

function getSubjectFromPayload(payload: JWTPayload): string {
  const oid = normalizeString(payload.oid)
  if (oid) {
    return oid
  }

  const sub = normalizeString(payload.sub)
  if (sub) {
    return sub
  }

  return 'unknown'
}

async function verifyMicrosoftToken(token: string, env: ApiAuthEnv): Promise<RequestAuthContext> {
  const tenantId = getTenantId(env)
  const audiences = buildAudienceList(env)

  if (audiences.length === 0) {
    throw new Error('Server configuration error: Missing MICROSOFT_ALLOWED_AUDIENCES or MICROSOFT_CLIENT_ID')
  }

  // Azure AD can issue both v2 tokens (login.microsoftonline.com/.../v2.0)
  // and v1 tokens (sts.windows.net/<tenant>/). Accept both for this tenant.
  const validIssuers = [
    `https://login.microsoftonline.com/${tenantId}/v2.0`,
    `https://sts.windows.net/${tenantId}/`,
  ]
  const jwks = getJwksForTenant(tenantId)

  const { payload } = await jwtVerify(token, jwks, {
    issuer: validIssuers,
    audience: audiences,
  })

  const payloadTenantId = normalizeString(payload.tid)
  if (payloadTenantId !== tenantId) {
    throw new Error('Token tenant mismatch')
  }

  return {
    mode: 'microsoft',
    subject: getSubjectFromPayload(payload),
    tenantId,
  }
}

function getBearerToken(request: Request): string {
  const authorizationHeader = normalizeString(request.headers.get('Authorization'))
  if (!authorizationHeader.toLowerCase().startsWith('bearer ')) {
    return ''
  }

  return authorizationHeader.slice(7).trim()
}

function buildRequestLogContext(request: Request): string {
  const requestId = request.headers.get('CF-Ray') || request.headers.get('X-Request-Id') || 'n/a'
  return `[auth] method=${request.method} path=${new URL(request.url).pathname} requestId=${requestId}`
}

export async function authorizeApiRequest(
  request: Request,
  env: ApiAuthEnv,
  jsonHeaders: Record<string, string>
): Promise<Response | null> {
  if (request.method === 'OPTIONS') {
    setRequestAuthContext(request, { mode: 'public' })
    return null
  }

  const pathname = new URL(request.url).pathname
  const policy = findRoutePolicy(request.method, pathname)

  if (!policy) {
    if (pathname.startsWith('/api/')) {
      return unauthorizedResponse(jsonHeaders)
    }
    return unauthorizedResponse(jsonHeaders)
  }

  if (policy.mode === 'public') {
    setRequestAuthContext(request, { mode: 'public' })
    return null
  }

  if (policy.mode === 'key') {
    const inboundApiKey = normalizeString(request.headers.get('X-Api-Key'))
    const expectedApiKeys = getApiKeyCandidates(env, policy.apiKeys ?? [])

    if (!inboundApiKey || expectedApiKeys.length === 0 || !expectedApiKeys.includes(inboundApiKey)) {
      console.warn(`${buildRequestLogContext(request)} unauthorized key request`)
      return unauthorizedResponse(jsonHeaders)
    }

    setRequestAuthContext(request, { mode: 'key' })
    return null
  }

  const bearerToken = getBearerToken(request)
  if (!bearerToken) {
    console.warn(`${buildRequestLogContext(request)} missing bearer token`)
    return unauthorizedResponse(jsonHeaders)
  }

  try {
    const authContext = await verifyMicrosoftToken(bearerToken, env)
    setRequestAuthContext(request, authContext)
    return null
  } catch (error) {
    console.warn(`${buildRequestLogContext(request)} invalid bearer token`, error)
    return unauthorizedResponse(jsonHeaders)
  }
}
