import type { Context } from 'hono'
import type { ApiAuthEnv } from './authPolicy'
import type { RequestAuthContext, RequestAuthMode } from './authContext'

export interface ApiEnv extends ApiAuthEnv {
  DB: D1Database
  WPS_KV_BINDING: KVNamespace
  BREVO_API_KEY: string
  SENDER_EMAIL: string
  BREVO_SANDBOX?: string
}

export type ApiVariables = {
  auth: RequestAuthContext
}

export type ApiHonoEnv = {
  Bindings: ApiEnv
  Variables: ApiVariables
}

export type ApiContext = Context<ApiHonoEnv>

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key, X-Company',
}

export const jsonHeaders = {
  'Content-Type': 'application/json',
  ...corsHeaders,
}

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...(init.headers ? Object.fromEntries(new Headers(init.headers).entries()) : {}),
    },
  })
}

export function badRequest(message: string): Response {
  return jsonResponse({ error: message }, { status: 400 })
}

export function serverError(message: string): Response {
  return jsonResponse({ error: message }, { status: 500 })
}

export function noContent(): Response {
  return new Response(null, { status: 204, headers: jsonHeaders })
}

export function requireAuthMode(context: ApiContext, expectedMode: RequestAuthMode): Response | null {
  const auth = context.get('auth')
  if (!auth || auth.mode !== expectedMode) {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}