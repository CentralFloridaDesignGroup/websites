import type { MiddlewareHandler } from 'hono'
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import { JSON_HEADERS, PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS } from 'cfdg/types/constants'
import type { AuthContext, AuthEnv, BaseApiEnv, RoutePolicy } from 'cfdg/types'
import { getRequestAuthContext, setRequestAuthContext, unauthorizedResponse } from './authContext'
import type { HonoEnv } from '../apiTypes'
import { normalizeString } from 'cfdg/scripts'



// TODO: Consider moving this to a separate config file or environment variable for easier management and updates.
// TODO: Review the route policies to ensure they align with the current API structure and access requirements. Remove any deprecated or unused routes to maintain clarity and security.
const routePolicies: RoutePolicy[] = [
  { method: 'GET', route: '/api/health', mode: 'public' }, // Health check endpoint. Returns 200 if the service is running.
  // Wrangler's local scheduled-event bridge. The route itself also rejects non-local hosts.
  { method: 'GET', route: '/__scheduled', mode: 'public' },

  { method: 'POST', route: '/api/email/transactionEmail', mode: 'key' }, // Send an email using the Transaction Email API.
  { method: 'GET', route: '/api/invoices/public/:token', mode: 'public' }, // Get invoice details for a public invoice link.
  { method: 'POST', route: '/api/invoices/public/:token/checkout', mode: 'public' }, // Checkout a public invoice link. Creates a payment intent and returns the client secret.
  { method: 'POST', route: '/api/stripe/webhook', mode: 'public' }, // Stripe webhook endpoint. Receives events from Stripe and processes them.
  { method: 'POST', route: '/api/brevo/webhook', mode: 'public' }, // Brevo webhook endpoint. Receives events from Brevo and processes them.
  { method: 'GET', route: '/api/qbo/callback', mode: 'public' }, // QuickBooks Online OAuth callback endpoint. Receives the authorization code and exchanges it for an access token.

  // Invoices
  // Routes relating to the invoice list
  { method: '*', route: '/api/invoices', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  // Routes relating to a specific invoice
  { method: '*', route: '/api/invoices/:id', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  { method: 'GET', route: '/api/invoice-reports/client', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  // Create a new invoice based on the referenced invoice.
  { method: 'POST', route: '/api/invoices/:id/copy', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  // Mark an invoice as sent. This will update the invoice status and send an email to the client.
  { method: 'POST', route: '/api/invoices/:id/send', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  // Mark an invoice as void. This will update the invoice status and prevent further payments.
  { method: 'POST', route: '/api/invoices/:id/void', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  // Pulls the project address from QuickBooks Online and updates the invoice with the new address.
  { method: 'POST', route: '/api/invoices/:id/refresh-project-address', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  // Mark an invoice as paid. This will update the invoice status and prevent further payments.
  { method: 'POST', route: '/api/invoices/:id/mark-paid', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  // Sync payments for an invoice. pushes updates to QuickBooks if information failed to sync previously.
  { method: 'POST', route: '/api/invoices/:id/sync-payments', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  // Retry a payment for an invoice. This will attempt to retrieve the payment details from the payment provider and update the invoice accordingly. This does not attempt to charge the payment again, but will update the invoice with the latest payment information.
  { method: 'POST', route: '/api/invoices/:id/payments/:paymentId/retry-stripe-details', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  // Retry creating a 'payment' in QuickBooks Online for an invoice for the specified payment ID.
  { method: 'POST', route: '/api/invoices/:id/payments/:paymentId/retry-qbo-payment', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  // Retry creating a 'deposit' in QuickBooks Online for an invoice for the specified payment ID.
  { method: 'POST', route: '/api/invoices/:id/payments/:paymentId/retry-qbo-deposit', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  // Retry syncing a payout for an invoice for the specified payment ID. This will attempt to retrieve the payout details from Stripe and update the deposit in Quickbooks accordingly.
  { method: 'POST', route: '/api/invoices/:id/payments/:paymentId/retry-payout-sync', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },

  // Allows multiple methods for setting, reading, and updating the QuickBooks Online connection status and settings.
  { method: '*', route: '/api/qbo/status', mode: 'microsoft' },
  // Allows multiple methods for connecting to QuickBooks Online and retrieving the connection status.
  { method: '*', route: '/api/qbo/connect', mode: 'microsoft' },
  // Allows multiple methods for syncing customers.
  { method: '*', route: '/api/qbo/customers/sync', mode: 'microsoft' },
  // Allows multiple methods for retrieving customers.
  { method: '*', route: '/api/qbo/customers', mode: 'microsoft' },
  // Allows multiple methods for retrieving projects for a specific customer.
  { method: '*', route: '/api/qbo/customers/:id/projects', mode: 'microsoft' },
  // Allows multiple methods for syncing items.
  { method: '*', route: '/api/qbo/items/sync', mode: 'microsoft' },
  // Allows multiple methods for retrieving items.
  { method: '*', route: '/api/qbo/items', mode: 'microsoft' },
  // Allows multiple methods for syncing accounts.
  { method: '*', route: '/api/qbo/accounts/sync', mode: 'microsoft' },
  // Allows multiple methods for retrieving accounts.
  { method: '*', route: '/api/qbo/accounts', mode: 'microsoft' },
  // Allows multiple methods for retrieving QuickBooks Online settings.
  { method: '*', route: '/api/qbo/settings', mode: 'microsoft' },
  // Allows multiple methods for handling QB clients.
  { method: '*', route: '/api/clients', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  // Allows multiple methods for handling QB client details.
  { method: '*', route: '/api/clients/:id', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  // Allows changing a QuickBooks client's active state.
  { method: '*', route: '/api/clients/:id/status', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  // Allows multiple methods for handling QB client contacts.
  { method: '*', route: '/api/clients/:id/contacts', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  // Allows multiple methods for handling QB client contact details.
  { method: '*', route: '/api/clients/:id/contacts/:contactId', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  // Allows multiple methods for handling QB sub-customer / projects.
  { method: '*', route: '/api/projects', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  { method: 'GET', route: '/api/projects/next-number', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  // Allows multiple methods for handling QB sub-customer / project details.
  { method: '*', route: '/api/projects/:id', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  { method: '*', route: '/api/projects/:id/tasks', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  { method: '*', route: '/api/projects/:id/tasks/:taskId', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  // Allows changing Compass project lifecycle status.
  { method: '*', route: '/api/projects/:id/status', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  // Allows multiple methods for handling QB sub-customer / project billing details.
  { method: '*', route: '/api/projects/:id/billing', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  // Allows multiple methods for handling QB sub-customer / project documents.
  { method: '*', route: '/api/projects/:id/documents', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  // Allows multiple methods for handling QB sub-customer / project document details.
  { method: '*', route: '/api/projects/:id/documents/:documentId', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  // Allows multiple methods for handling QB sub-customer / project document downloads.
  { method: '*', route: '/api/projects/:id/documents/:documentId/download', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  // Allows multiple methods for handling QB sub-customer / project master client.
  { method: '*', route: '/api/projects/:id/client', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },
  // Allows multiple methods for handling QB sub-customer / project manager.
  { method: '*', route: '/api/projects/:id/manager', mode: 'microsoft', allowedGroupIds: PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS },

  // Reviews and comments
  // Allows multiple methods for handling reviews.
  { method: '*', route: '/api/reviews', mode: 'microsoft' },
  // Allows multiple methods for handling review details.
  { method: '*', route: '/api/reviews/:id', mode: 'microsoft' },
  // Allows multiple methods for handling review comments.
  { method: '*', route: '/api/reviews/:id/comments', mode: 'microsoft' },
  // Allows multiple methods for handling comments.
  { method: '*', route: '/api/comments', mode: 'microsoft' },
  // Allows multiple methods for handling comment details.
  { method: '*', route: '/api/comments/:id', mode: 'microsoft' },

  // GIS
  // Gets all points from the GIS database. The API key ensures that only authorized sites can access this data.
  { method: 'GET', route: '/api/gis/points', mode: 'key' },
  // Create a group of new points in the GIS database. Microsoft mode ensures that only authorized users can create new points.
  { method: 'POST', route: '/api/gis/points/import', mode: 'microsoft' },
  // Gets a specific point from the GIS database by ID. The API key ensures that only authorized sites can access this data.
  { method: 'GET', route: '/api/gis/points/:id', mode: 'key' },
  // Create or update a specific point in the GIS database by ID. Microsoft mode ensures that only authorized users can create or update points.
  { method: 'POST', route: '/api/gis/points', mode: 'microsoft' },
  // Delete a specific point from the GIS database by ID. Microsoft mode ensures that only authorized users can delete points.
  { method: 'DELETE', route: '/api/gis/points/:id', mode: 'microsoft' },

  // User favorites
  // Gets the list of favorite items for a specific user. Microsoft mode ensures that only authorized users can access their favorites.
  { method: 'GET', route: '/api/users/:userId/favorites', mode: 'microsoft' },
  // Updates the list of favorite items for a specific user. Microsoft mode ensures that only authorized users can update their favorites.
  { method: 'PUT', route: '/api/users/:userId/favorites', mode: 'microsoft' },
]

// Cache for JWK sets by tenant ID to avoid repeated network requests for the same tenant.
const jwksByTenant = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

/**
 * Splits a comma-separated string into an array of trimmed, non-empty strings.
 * @param value - The comma-separated string to split.
 * @returns An array of trimmed, non-empty strings.
 */
function splitCsv(value: unknown): string[] {
  return normalizeString(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

/**
 * Splits a pathname into an array of non-empty path segments.
 * @param pathname - The pathname to split.
 * @returns An array of non-empty path segments.
 */
function getPathSegments(pathname: string): string[] {
  return pathname.split('/').filter(Boolean)
}

/** 
 * Determines if a given pathname matches a policy path, considering dynamic segments.
 * @param policyPath - The policy path, which may contain dynamic segments (e.g., /api/items/:id).
 * @param pathname - The actual pathname to check against the policy path.
 * @returns True if the pathname matches the policy path; otherwise, false.
 * @example
 * ```ts
 * routeMatches('/api/items/:id', '/api/items/123') // returns true
 * routeMatches('/api/items/:id', '/api/items') // returns false
 * routeMatches('/api/items/:id', '/api/items/123/details') // returns false
 * ```
 */
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

/**
 * Finds the applicable route policy for a given HTTP method and pathname.
 * @param method - The HTTP method of the request (e.g., GET, POST).
 * @param route - The pathname of the request (e.g., /api/items/123).
 * @returns - {@link RoutePolicy} if a matching policy is found; otherwise, null.
 * @example
 * ```ts
 * const policy = findRoutePolicy('GET', '/api/items/123')
 * if (policy) {
 *   console.log(`Found policy for route: ${policy.route}`)
 * }
 * ```
 */
function findRoutePolicy(method: string, route: string): RoutePolicy | null {
  const normalizedMethod = method.toUpperCase()

  for (const policy of routePolicies) {
    if (policy.method !== '*' && policy.method !== normalizedMethod) {
      continue
    }

    if (routeMatches(policy.route, route)) {
      return policy
    }
  }

  return null
}

/**
 * Builds a list of allowed audiences for Microsoft token verification based on the provided environment variables.
 * @param env - The environment variables containing the Microsoft client ID and allowed audiences.
 * @returns An array of allowed audiences for token verification.
 * @example
 * ```ts
 * const audiences = buildAudienceList(env)
 * ```
 */
function buildAudienceList(env: AuthEnv): string[] {
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

/**
 * Retrieves the Microsoft tenant ID from the environment variables, ensuring it is present and valid.
 * @param env - The environment variables containing the Microsoft tenant ID.
 * @returns The normalized Microsoft tenant ID.
 */
function getTenantId(env: AuthEnv): string {
  const tenantId = normalizeString(env.MICROSOFT_TENANT_ID)
  if (!tenantId) {
    throw new Error('Server configuration error: Missing MICROSOFT_TENANT_ID')
  }
  return tenantId
}

/**
 * Retrieves the JSON Web Key Set (JWKS) for a specific Microsoft tenant, caching the result to avoid repeated network requests.
 * @param tenantId - The Microsoft tenant ID.
 * @returns The JSON Web Key Set (JWKS) for the specified tenant.
 */
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

/**
 * Retrieves the subject (user identifier) from the JWT payload, preferring the 'oid' claim and falling back to the 'sub' claim.
 * @param payload - The JWT payload.
 * @returns The subject identifier.
 */
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

/** 
 * Retrieves the groups from the JWT payload, normalizing each group to a string and filtering out any empty values.
 * @param payload - The JWT payload.
 * @returns An array of normalized group strings.
 */
function getGroupsFromPayload(payload: JWTPayload): string[] {
  const groups = Array.isArray(payload.groups) ? payload.groups : []
  return groups.map((group) => normalizeString(group)).filter(Boolean)
}

/**
 * Retrieves the email address from the JWT payload, checking multiple claims in order of preference and normalizing the result to lowercase.
 * @param payload - The JWT payload.
 * @returns The normalized email address, or an empty string if no email is found.
 */
function getEmailFromPayload(payload: JWTPayload): string {
  return normalizeString(payload.preferred_username || payload.email || payload.upn).toLowerCase()
}

/**
 * Checks if the authenticated user belongs to any of the allowed groups.
 * @param authContext - The authentication context containing the user's group memberships.
 * @param allowedGroupIds - An array of allowed group IDs.
 * @returns True if the user belongs to any of the allowed groups, false otherwise.
 */
function hasAllowedGroup(authContext: AuthContext, allowedGroupIds?: string[]): boolean {
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

/**
 * Verifies a Microsoft JWT token using the provided environment configuration, ensuring that the token is valid, issued by the correct tenant, and intended for the allowed audiences.
 * @param token - The Microsoft JWT token to verify.
 * @param env - The environment configuration containing tenant and audience information.
 * @returns The authentication context derived from the verified token.
 */
async function verifyMicrosoftToken(token: string, env: AuthEnv): Promise<AuthContext> {
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

/**
 * Retrieves the bearer token from the Authorization header of the request, ensuring it is in the correct format.
 * @param request - The incoming HTTP request object.
 * @returns The extracted bearer token, or an empty string if the header is missing or malformed.
 * @example
 * ```ts
 * const token = getBearerToken(request)
 * if (!token) {
 *   // Handle missing or invalid token
 * }
 * ```
 */
function getBearerToken(request: Request): string {
  const authorizationHeader = normalizeString(request.headers.get('Authorization'))
  if (!authorizationHeader.toLowerCase().startsWith('bearer ')) {
    return ''
  }

  return authorizationHeader.slice(7).trim()
}

/** 
 * Builds a log context string for an incoming request, including the HTTP method, request path, and request ID from headers.
 * @param request - The incoming HTTP request object.
 * @returns A formatted string containing the request method, path, and request ID for logging purposes.
 */
function buildRequestLogContext(request: Request): string {
  const requestId = request.headers.get('CF-Ray') || request.headers.get('X-Request-Id') || 'n/a'
  return `[auth] method=${request.method} path=${new URL(request.url).pathname} requestId=${requestId}`
}

/**
 * Authorizes an API request based on the defined authentication policies, handling public, key, and Microsoft token-based authentication.
 * @param request - The incoming HTTP request object.
 * @param env - The environment configuration containing authentication information.
 * @param jsonHeaders - The headers to include in JSON responses.
 * @returns A Response object if the request is unauthorized, or null if the request is authorized.
 * @example
 * ```ts
 * const authError = await authorizeApiRequest(request, env, jsonHeaders)
 * if (authError) {
 *   return authError
 * }
 * // Proceed with handling the authorized request
 * ```
 */
export async function authorizeApiRequest(
  request: Request,
  env: BaseApiEnv,
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
    const expectedApiKey = normalizeString(env.API_KEY)

    if (!inboundApiKey || !expectedApiKey || inboundApiKey !== expectedApiKey) {
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

/**
 * Creates a middleware handler for authenticating API requests based on the defined authentication policies. The middleware checks the request method and path against the route policies, verifies API keys or Microsoft tokens as needed, and sets the authentication context for downstream handlers.
 * @returns A middleware handler function that processes incoming requests and enforces authentication policies. 
 * @example
 * ```ts
 * import { createAuthMiddleware } from './authPolicy'
 * // ...
 * const authMiddleware = createAuthMiddleware()
 * app.use(authMiddleware)
 * ```
 */
export function createAuthMiddleware(): MiddlewareHandler<HonoEnv> {
  return async (context, next) => {
    const authError = await authorizeApiRequest(context.req.raw, context.env, JSON_HEADERS)
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
