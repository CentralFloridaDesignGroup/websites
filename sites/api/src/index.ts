import { Router } from 'itty-router'
import { handleTransactionEmail } from './transactionEmail'
import { registerCommentsApiRoutes } from './commentsApi'
import { registerGisPointsApiRoutes } from './gisPointsApi'
import { registerUserFavoritesApiRoutes } from './userFavoritesApi'
import { authorizeApiRequest, type ApiAuthEnv } from './authPolicy'

interface Env extends ApiAuthEnv {
  DB: D1Database
  WPS_KV_BINDING: KVNamespace
  BREVO_API_KEY: string
  SENDER_EMAIL: string
  BREVO_SANDBOX?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key, X-Company',
}

const jsonHeaders = {
  'Content-Type': 'application/json',
  ...corsHeaders,
}

const router = Router()

// Middleware to attach env to request
const withEnv = (env: Env) => (request: Request) => {
  (request as any).env = env
  return request
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers)

  for (const [key, value] of Object.entries(corsHeaders)) {
    if (!headers.has(key)) {
      headers.set(key, value)
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

// CORS handler
router.options('*', () => {
  return new Response(null, {
    headers: jsonHeaders,
  })
})

// Health check endpoint
router.get('/api/health', () => {
  return new Response(JSON.stringify({ status: 'ok' }), {
    headers: jsonHeaders,
  })
})
registerCommentsApiRoutes(router, jsonHeaders)
registerGisPointsApiRoutes(router, jsonHeaders)
registerUserFavoritesApiRoutes(router, jsonHeaders)

/* Example endpoint
router.get('/api/example', () => {
  return new Response(JSON.stringify({ message: 'Hello from SWP API' }), {
    headers: { 'Content-Type': 'application/json' },
  })
}) */

// Transactional email endpoint
router.post('/api/email/transactionEmail', async (request: Request) => {
  const env = (request as any).env as Env
  return handleTransactionEmail(request, env)
})

// 404 handler
router.all('*', () => {
  return new Response('Not Found', { status: 404, headers: jsonHeaders })
})

export default {
  fetch: async (request: Request, env: Env, ctx: ExecutionContext) => {
    const req = withEnv(env)(request)

    try {
      const authError = await authorizeApiRequest(req, env, jsonHeaders)
      if (authError) {
        return withCors(authError)
      }

      const routerWithMethods = router as unknown as {
        fetch?: (request: Request, env?: Env, ctx?: ExecutionContext) => Promise<Response | undefined> | Response | undefined
        handle?: (request: Request) => Promise<Response | undefined> | Response | undefined
      }

      const response = routerWithMethods.fetch
        ? await routerWithMethods.fetch(req, env, ctx)
        : await routerWithMethods.handle?.(req)

      if (!(response instanceof Response)) {
        return withCors(
          new Response(JSON.stringify({ error: 'Route did not return a response' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      }

      return withCors(response)
    } catch (error) {
      console.error('Unhandled API error:', error)
      return withCors(
        new Response(JSON.stringify({ error: 'Internal server error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    }
  },
}
