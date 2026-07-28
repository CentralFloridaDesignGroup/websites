import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createAuthMiddleware } from './auth/authPolicy'
import { CORS_HEADERS, CORS_HEADERS_V2, JSON_HEADERS, JSON_HEADERS_V2 } from 'cfdg/types/constants'
import { serverError, type HonoEnv } from './apiTypes'
import { createCommentsApi } from './comments/hono'
import { createGisPointsApi } from './gisPointsApi'
import { handleTransactionEmail } from './transactionEmail'
import { createInvoicesApi } from './invoicesApi'
import { createQboApi } from './qboApi'
import { createUserFavoritesApi } from './userFavoritesApi'
import { createProjectManagementApi } from './projectManagementApi'

const app = new Hono<HonoEnv>()

// V1 original routes. To be deprecated.
app.use(
  '/api/*',
  cors({
    origin: CORS_HEADERS['Access-Control-Allow-Origin'],
    allowMethods: CORS_HEADERS['Access-Control-Allow-Methods'].split(', '),
    allowHeaders: CORS_HEADERS['Access-Control-Allow-Headers'].split(', '),
  })
)

app.use(
  '/api/v2/*',
  cors({
    origin: CORS_HEADERS_V2['Access-Control-Allow-Origin'],
    allowMethods: CORS_HEADERS_V2['Access-Control-Allow-Methods'].split(', '),
    allowHeaders: CORS_HEADERS_V2['Access-Control-Allow-Headers'].split(', '),
  })
)

app.use('*', createAuthMiddleware())

app.get('/api/health', () => {
  return new Response(JSON.stringify({ status: 'ok' }), {
    headers: JSON_HEADERS,
  })
})

app.route('/', createCommentsApi())
app.route('/', createGisPointsApi())
app.route('/', createInvoicesApi())
app.route('/', createQboApi())
app.route('/', createUserFavoritesApi())
app.route('/', createProjectManagementApi())

app.post('/api/email/transactionEmail', async (context) => {
  return handleTransactionEmail(context.req.raw, context.env)
})

app.notFound(() => {
  return new Response('Not Found', { status: 404, headers: JSON_HEADERS })
})

app.onError((error) => {
  console.error('Unhandled API error:', error)
  return serverError(String(error?.message || error));
})

export default app
