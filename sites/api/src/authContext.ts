export type RequestAuthMode = 'public' | 'key' | 'microsoft'

export interface RequestAuthContext {
  mode: RequestAuthMode
  subject?: string
  email?: string
  tenantId?: string
  groups?: string[]
}

const REQUEST_AUTH_CONTEXT_KEY = '__wpsAuthContext__'

export function setRequestAuthContext(request: Request, context: RequestAuthContext): void {
  ;((request as unknown) as Record<string, unknown>)[REQUEST_AUTH_CONTEXT_KEY] = context
}

export function getRequestAuthContext(request: Request): RequestAuthContext | null {
  const context = ((request as unknown) as Record<string, unknown>)[REQUEST_AUTH_CONTEXT_KEY]
  if (!context || typeof context !== 'object') {
    return null
  }

  const typedContext = context as RequestAuthContext
  if (!typedContext.mode) {
    return null
  }

  return typedContext
}

export function unauthorizedResponse(jsonHeaders: Record<string, string>, reason = 'Unauthorized'): Response {
  return new Response(JSON.stringify({ error: reason }), {
    status: 401,
    headers: jsonHeaders,
  })
}

export function assertRequestAuthMode(
  request: Request,
  expectedMode: RequestAuthMode,
  jsonHeaders: Record<string, string>
): Response | null {
  const context = getRequestAuthContext(request)
  if (!context || context.mode !== expectedMode) {
    return unauthorizedResponse(jsonHeaders)
  }

  return null
}
