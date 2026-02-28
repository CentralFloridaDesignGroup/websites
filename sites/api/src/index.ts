import { Router } from 'itty-router'

const router = Router()

// Health check endpoint
router.get('/api/health', () => {
  return new Response(JSON.stringify({ status: 'ok' }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

// Example endpoint
router.get('/api/example', () => {
  return new Response(JSON.stringify({ message: 'Hello from SWP API' }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

// 404 handler
router.all('*', () => {
  return new Response('Not Found', { status: 404 })
})

export default {
  fetch: router.handle,
}
