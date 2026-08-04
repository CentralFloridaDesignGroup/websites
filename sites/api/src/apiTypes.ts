import type { Context } from 'hono'
import type { AuthContext, AuthMode, BaseApiEnv } from 'cfdg/types'
import { JSON_HEADERS_V2 } from 'cfdg/types/constants'

// The following types are used in the API context and environment, and are 
// not exported from the package due to site-specific requirements. They are 
// defined here for internal use only.
// #region Type Definitions

/** API environment variables, including database and storage bindings. */
export type ApiEnv = BaseApiEnv & {
  DB: D1Database
  WPS_KV_BINDING: KVNamespace
  INVOICE_DOCUMENTS: R2Bucket
}

/** API variables available in the context. */
export type ApiVariables = {
  auth: AuthContext
}

/** Hono environment type, including bindings and variables. */
export type HonoEnv = {
  Bindings: ApiEnv
  Variables: ApiVariables
}

/** API context type, including Hono environment. */
export type ApiContext = Context<HonoEnv>

// #endregion

// #region Response Helper Functions

/**
 * Creates a JSON response with the specified body and optional initialization parameters.
 * @param body - The body of the response, which will be serialized to JSON.
 * @param init - Optional initialization parameters for the response.
 * @returns A Response object with the specified body and headers.
 */
export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...JSON_HEADERS_V2,
      ...(init.headers ? Object.fromEntries(new Headers(init.headers).entries()) : {}),
    },
  })
}

/**
 * Creates a 400 Bad Request response with the specified error message.
 * @param message - The error message to include in the response.
 * @returns A Response object with a 400 status code and the specified error message.
 */
export function badRequest(message: string): Response {
  return jsonResponse({ error: message }, { status: 400 })
}

/**
 * Creates a 500 Server Error response with the specified error message.
 * @param message - The error message to include in the response.
 * @returns A Response object with a 500 status code and the specified error message.
 */
export function serverError(message: string): Response {
  return jsonResponse({ error: message }, { status: 500 })
}

/** 
 * Creates a 204 No Content response with the appropriate headers.
 * @returns A Response object with a 204 status code and no content.
 */
export function noContent(): Response {
  return new Response(null, { status: 204, headers: JSON_HEADERS_V2 })
}

/** 
 * Checks if the authentication mode in the context matches the expected mode.
 * If the modes do not match, returns a 401 Unauthorized response.
 * @param context - The API context containing authentication information.
 * @param expectedMode - The expected authentication mode to check against.
 * @returns A Response object with a 401 status code if the modes do not match, or null if they do match.
 * @example
 * ```ts
 * const response = requireAuthMode(context, 'key');
 * if (response) {
 *   return response; // Return the 401 Unauthorized response if the modes do not match.
 * }
 * ```
 */
export function requireAuthMode(context: ApiContext, expectedMode: AuthMode): Response | null {
  const auth = context.get('auth')
  if (!auth || auth.mode !== expectedMode) {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}

// #endregion