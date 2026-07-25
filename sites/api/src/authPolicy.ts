import type { MiddlewareHandler } from 'hono'
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import { PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS } from '@wps/scripts'
import { getRequestAuthContext, setRequestAuthContext, type RequestAuthContext, unauthorizedResponse } from './authContext'
import { jsonHeaders, type ApiHonoEnv } from './apiTypes'

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
  MICROSOFT_CLIENT_SECRET?: string
  MICROSOFT_ALLOWED_AUDIENCES?: string
}

type RouteAuthMode = 'public' | 'key' | 'microsoft'
type ApiKeyName = 'comments' | 'gis' | 'transactionEmail'

type RoutePolicy = {
  method: '*' | 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  mode: RouteAuthMode
  apiKeys?: ApiKeyName[]
  allowedGroupIds?: string[]
}

const routePolicies: RoutePolicy[] = [
  { method: 'GET', path: '/api/health', mode: 'public' },

  { method: 'POST', path: '/api/email/transactionEmail', mode: 'key', apiKeys: ['transactionEmail'] },
  { method: 'GET', path: '/api/invoices/public/:token', mode: 'public' },
  { method: 'POST', path: '/api/invoices/public/:token/checkout', mode: 'public' },
  { method: 'POST', path: '/api/stripe/webhook', mode: 'public' },
  { method: 'POST', path: '/api/brevo/webhook', mode: 'public' },
  { method: 'GET', path: '/api/qbo/callback', mode: 'public' },

  { method: '*', path: '/api/invoices', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  { method: '*', path: '/api/invoices/:id', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  { method: 'POST', path: '/api/invoices/:id/copy', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  { method: 'POST', path: '/api/invoices/:id/send', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  { method: 'POST', path: '/api/invoices/:id/void', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  { method: 'POST', path: '/api/invoices/:id/refresh-project-address', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  { method: 'POST', path: '/api/invoices/:id/mark-paid', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  { method: 'POST', path: '/api/invoices/:id/sync-payments', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  { method: 'POST', path: '/api/invoices/:id/payments/:paymentId/retry-stripe-details', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  { method: 'POST', path: '/api/invoices/:id/payments/:paymentId/retry-qbo-payment', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  { method: 'POST', path: '/api/invoices/:id/payments/:paymentId/retry-qbo-deposit', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  { method: 'POST', path: '/api/invoices/:id/payments/:paymentId/retry-payout-sync', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  { method: '*', path: '/api/qbo/status', mode: 'microsoft' },
  { method: '*', path: '/api/qbo/connect', mode: 'microsoft' },
  { method: '*', path: '/api/qbo/customers/sync', mode: 'microsoft' },
  { method: '*', path: '/api/qbo/customers', mode: 'microsoft' },
  { method: '*', path: '/api/qbo/customers/:id/projects', mode: 'microsoft' },
  { method: '*', path: '/api/qbo/items/sync', mode: 'microsoft' },
  { method: '*', path: '/api/qbo/items', mode: 'microsoft' },
  { method: '*', path: '/api/qbo/accounts/sync', mode: 'microsoft' },
  { method: '*', path: '/api/qbo/accounts', mode: 'microsoft' },
  { method: '*', path: '/api/qbo/settings', mode: 'microsoft' },
  { method: '*', path: '/api/clients', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  { method: '*', path: '/api/clients/:id', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  { method: '*', path: '/api/clients/:id/contacts', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  { method: '*', path: '/api/clients/:id/contacts/:contactId', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  { method: '*', path: '/api/projects', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  { method: '*', path: '/api/projects/:id', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  { method: '*', path: '/api/projects/:id/billing', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  { method: '*', path: '/api/projects/:id/documents', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  { method: '*', path: '/api/projects/:id/documents/:documentId', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  { method: '*', path: '/api/projects/:id/documents/:documentId/download', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  { method: '*', path: '/api/projects/:id/client', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  { method: '*', path: '/api/projects/:id/manager', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },

  { method: '*', path: '/api/reviews', mode: 'microsoft' },
  { method: '*', path: '/api/reviews/:id', mode: 'microsoft' },
  { method: '*', path: '/api/reviews/:id/comments', mode: 'microsoft' },
  { method: '*', path: '/api/comments', mode: 'microsoft' },
  { method: '*', path: '/api/comments/:id', mode: 'microsoft' },

  { method: 'GET', path: '/api/gis/points', mode: 'key', apiKeys: ['gis'] },
  { method: 'POST', path: '/api/gis/points/import', mode: 'microsoft' },
  { method: 'GET', path: '/api/gis/points/:id', mode: 'key', apiKeys: ['gis'] },
  { method: 'POST', path: '/api/gis/points', mode: 'microsoft' },
  { method: 'DELETE', path: '/api/gis/points/:id', mode: 'microsoft' },

  { method: 'GET', path: '/api/users/:userId/favorites', mode: 'microsoft' },
  { method: 'PUT', path: '/api/users/:userId/favorites', mode: 'microsoft' },
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

function getPathSegments(pathname: string): string[] {
  return pathname.split('/').filter(Boolean)
}

function routeMatches(policyPath: string, pathname: string): boolean {
  const policySegments = getPathSegments(policyPath)
  const pathSegments = getPathSegments(pathname)

  if (policySegments.length !== pathSegments.length) {
    return false
  }

  return policySegments.every((segment, index) => {
    return segment.startsWith(':') || segment === pathSegments[index]
  })
}

function findRoutePolicy(method: string, pathname: string): RoutePolicy | null {
  const normalizedMethod = method.toUpperCase()

  for (const policy of routePolicies) {
    if (policy.method !== '*' && policy.method !== normalizedMethod) {
      continue
    }

    if (routeMatches(policy.path, pathname)) {
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

function getGroupsFromPayload(payload: JWTPayload): string[] {
  const groups = Array.isArray(payload.groups) ? payload.groups : []
  return groups.map((group) => normalizeString(group)).filter(Boolean)
}

function getEmailFromPayload(payload: JWTPayload): string {
  return normalizeString(payload.preferred_username || payload.email || payload.upn).toLowerCase()
}

function hasAllowedGroup(authContext: RequestAuthContext, allowedGroupIds?: string[]): boolean {
  if (!allowedGroupIds || allowedGroupIds.length === 0) {
    return true
  }

  // Some Microsoft access tokens do not include group claims unless the app registration
  // is configured for them. The Document app performs a Graph-backed route gate in that
  // case, so do not block API requests solely because the claim is absent.
  if (!authContext.groups || authContext.groups.length === 0) {
    return true
  }

  const userGroupIds = new Set((authContext.groups || []).map((group) => group.toLowerCase()))
  return allowedGroupIds.some((groupId) => userGroupIds.has(groupId.toLowerCase()))
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
    email: getEmailFromPayload(payload),
    tenantId,
    groups: getGroupsFromPayload(payload),
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
    if (!hasAllowedGroup(authContext, policy.allowedGroupIds)) {
      console.warn(`${buildRequestLogContext(request)} missing required group`)
      return unauthorizedResponse(jsonHeaders, 'Forbidden')
    }
    setRequestAuthContext(request, authContext)
    return null
  } catch (error) {
    console.warn(`${buildRequestLogContext(request)} invalid bearer token`, error)
    return unauthorizedResponse(jsonHeaders)
  }
}

export function createAuthMiddleware(): MiddlewareHandler<ApiHonoEnv> {
  return async (context, next) => {
    const authError = await authorizeApiRequest(context.req.raw, context.env, jsonHeaders)
    if (authError) {
      return authError
    }

    const authContext = getRequestAuthContext(context.req.raw)
    if (authContext) {
      context.set('auth', authContext)
    }

    return next()
  }
}
