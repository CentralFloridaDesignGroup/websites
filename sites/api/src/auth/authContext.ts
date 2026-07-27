import type { AuthContext } from 'cfdg/types'
import { REQUEST_AUTH_CONTEXT_KEY } from 'cfdg/types/constants'

/**
 * Sets the authentication context for a request.
 * @param request - The request object to set the authentication context for.
 * @param context - The authentication context to set.
 * @abstract This allows a request to carry authentication information through the request lifecycle, enabling middleware and handlers to access user-specific data. For instance, it can be used to determine if a user is authenticated and to retrieve the user's ID for authorization checks or groups membership verification.
 * @example
 * ```ts
 * const request = new Request('https://example.com/api/data');
 * const authContext: AuthContext = { mode: 'user', subject: '12345' };
 * setRequestAuthContext(request, authContext);
 * ```
 */
export function setRequestAuthContext(request: Request, context: AuthContext): void {
  ;((request as unknown) as Record<string, unknown>)[REQUEST_AUTH_CONTEXT_KEY] = context
}

/**
 * Gets the {@link AuthContext} context from a request.
 * @param request - The request object to get the authentication context from.
 * @returns The authentication context if it exists, otherwise null.
 * @abstract This allows middleware and handlers to access user-specific data from the request, enabling authorization checks and other user-specific logic.
 * @example
 * ```ts
 * const request = new Request('https://example.com/api/data');
 * const authContext = getRequestAuthContext(request);
 * if (authContext) {
 *   console.log(`User ID: ${authContext.subject}`);
 * } else {
 *   console.log('No authentication context found.');
 * }
 * ```
 */
export function getRequestAuthContext(request: Request): AuthContext | null {
  const context = ((request as unknown) as Record<string, unknown>)[REQUEST_AUTH_CONTEXT_KEY]
  if (!context || typeof context !== 'object') {
    return null
  }

  const typedContext = context as AuthContext
  if (!typedContext.mode) {
    return null
  }

  return typedContext
}

/**
 * Creates an unauthorized response.
 * @param jsonHeaders - The headers to include in the response.
 * @param reason - The reason for the unauthorized response.
 * @returns A Response object with a 401 status code and the specified reason.
 */
export function unauthorizedResponse(jsonHeaders: Record<string, string>, reason = 'Unauthorized'): Response {
  return new Response(JSON.stringify({ error: reason }), {
    status: 401,
    headers: jsonHeaders,
  })
}

