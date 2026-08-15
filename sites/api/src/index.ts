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
import { qboConnectionApi } from './v2/qbo/hono'
import { createUserFavoritesApi } from './userFavoritesApi'
import { createProjectManagementApi } from './projectManagementApi'
import { companyApi } from './v2/company/hono'
import { customersApi } from './v2/customers/hono'
import { clientsApi } from './v2/clients/hono'
import { projectsApi } from './v2/projects/hono'
import { phasesApi } from './v2/phases/hono'
import { invoicesApi } from './v2/invoices/hono'

const app = new Hono<HonoEnv>()

// For reference, the base URL is 'https://api.whitepointsurvey.com'. You do not need to include 'api' in the route.

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
  '/v2/*',
  cors({
    origin: CORS_HEADERS_V2['Access-Control-Allow-Origin'],
    allowMethods: CORS_HEADERS_V2['Access-Control-Allow-Methods'].split(', '),
    allowHeaders: CORS_HEADERS_V2['Access-Control-Allow-Headers'].split(', '),
  })
)

// Auth middleware for all routes
app.use('*', createAuthMiddleware())

// Health check endpoint for V1 (and technically V2 as well)
app.get('/api/health', () => {
  return new Response(JSON.stringify({ status: 'ok' }), {
    headers: JSON_HEADERS,
  })
});

// Health check endpoint for V2
app.get('/v2/health', () => {
  return new Response(JSON.stringify({ status: 'ok' }), {
    headers: JSON_HEADERS_V2,
  })
});


// V1 API routes
app.route('/', createCommentsApi())
app.route('/', createGisPointsApi())
app.route('/', createInvoicesApi())
app.route('/', createQboApi())
app.route('/', createUserFavoritesApi())
app.route('/', createProjectManagementApi())

// V2 API routes
app.route('/', qboConnectionApi())
app.route('/', companyApi())
app.route('/', customersApi())
app.route('/', clientsApi())
app.route('/', projectsApi())
app.route('/', phasesApi())
app.route('/', invoicesApi())

app.post('/api/email/transactionEmail', async (context) => {
  return handleTransactionEmail(context.req.raw, context.env)
})

// Catch-all for 404 Not Found - updated to V2 response headers
app.notFound(() => {
  return new Response('Not Found', { status: 404, headers: JSON_HEADERS_V2 })
})

// Catch-all for unhandled errors - updated to V2 response headers
app.onError((error) => {
  console.error('Unhandled API error:', error)
  return serverError(String(error?.message || error));
})

export default app
