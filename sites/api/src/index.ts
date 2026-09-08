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
import { createInvoiceReportsApi, isWeeklyInvoiceReportTime, runWeeklyInvoiceReport } from './invoiceReports'

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

// V2 routes. New routes should be added here.
app.use(
  '/api/v2/*',
  cors({
    origin: CORS_HEADERS_V2['Access-Control-Allow-Origin'],
    allowMethods: CORS_HEADERS_V2['Access-Control-Allow-Methods'].split(', '),
    allowHeaders: CORS_HEADERS_V2['Access-Control-Allow-Headers'].split(', '),
  })
)

// Auth middleware for all routes
app.use('*', createAuthMiddleware())

// Wrangler forwards local scheduled-event test requests through fetch in this Worker setup.
// Keep this bridge constrained to localhost so it cannot trigger production email delivery.
app.get('/__scheduled', async (context) => {
  const hostname = new URL(context.req.url).hostname
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return new Response('Not Found', { status: 404 })
  }
  const cron = context.req.query('cron') || ''
  const scheduledTime = Number(context.req.query('scheduledTime') || Date.now())
  if (!['0 0 * * MON', '0 1 * * MON'].includes(cron) || !Number.isFinite(scheduledTime)) {
    return new Response('Invalid scheduled event', { status: 400 })
  }
  const scheduledAt = new Date(scheduledTime)
  if (!isWeeklyInvoiceReportTime(scheduledAt)) {
    return new Response('Scheduled time is not Sunday 8 PM Eastern', { status: 400 })
  }
  await runWeeklyInvoiceReport(context.env, scheduledAt)
  return new Response('Weekly invoice report sent', { status: 200 })
})

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
app.route('/', createInvoiceReportsApi())
app.route('/', createQboApi())
app.route('/', createUserFavoritesApi())
app.route('/', createProjectManagementApi())

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

export default {
  fetch: app.fetch,
  async scheduled(controller: ScheduledController, env: HonoEnv['Bindings'], ctx: ExecutionContext): Promise<void> {
    if (!isWeeklyInvoiceReportTime(new Date(controller.scheduledTime))) return
    ctx.waitUntil(runWeeklyInvoiceReport(env, new Date(controller.scheduledTime)).catch((error) => { console.error('Weekly invoice report failed:', error); throw error }))
  },
}
