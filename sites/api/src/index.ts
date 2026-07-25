import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createAuthMiddleware } from './authPolicy'
import { corsHeaders, jsonHeaders, type ApiHonoEnv } from './apiTypes'
import { createCommentsApi } from './commentsApi'
import { createGisPointsApi } from './gisPointsApi'
import { handleTransactionEmail } from './transactionEmail'
import { createInvoicesApi } from './invoicesApi'
import { createQboApi } from './qboApi'
import { createUserFavoritesApi } from './userFavoritesApi'
import { createProjectManagementApi } from './projectManagementApi'

const app = new Hono<ApiHonoEnv>()

app.use(
  '/api/*',
  cors({
    origin: corsHeaders['Access-Control-Allow-Origin'],
    allowMethods: corsHeaders['Access-Control-Allow-Methods'].split(', '),
    allowHeaders: corsHeaders['Access-Control-Allow-Headers'].split(', '),
  })
)

app.use('*', createAuthMiddleware())

app.get('/api/health', () => {
  return new Response(JSON.stringify({ status: 'ok' }), {
    headers: jsonHeaders,
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
  return new Response('Not Found', { status: 404, headers: jsonHeaders })
})

app.onError((error) => {
  console.error('Unhandled API error:', error)
  return new Response(JSON.stringify({ error: 'Internal server error' }), {
    status: 500,
    headers: jsonHeaders,
  })
})

export default app
