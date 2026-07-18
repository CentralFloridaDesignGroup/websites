import { Hono } from 'hono'
import { jsonHeaders, requireAuthMode, type ApiHonoEnv } from './apiTypes'
const userFavoritesSchemaReadyByDb = new WeakMap<D1Database, Promise<void>>()

export interface UserFavoritesApiEnv {
  DB: D1Database
}

type UserFavoriteRow = {
  user_id: string | null
  favorites_json: string | null
  updated_date: string | null
}

function normalizeString(value: unknown): string {
  return String(value ?? '').trim()
}

function serverError(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: jsonHeaders,
  })
}

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: jsonHeaders,
  })
}

async function ensureUserFavoritesSchema(db: D1Database): Promise<void> {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS user_card_favorites (
      user_id TEXT PRIMARY KEY,
      favorites_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(favorites_json)),
      updated_date DATETIME NOT NULL
    )`
  ).run()

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_user_card_favorites_updated_date ON user_card_favorites(updated_date)`).run()
}

function ensureUserFavoritesSchemaReady(db: D1Database): Promise<void> {
  const existingPromise = userFavoritesSchemaReadyByDb.get(db)
  if (existingPromise) {
    return existingPromise
  }

  const schemaPromise = ensureUserFavoritesSchema(db)
  userFavoritesSchemaReadyByDb.set(db, schemaPromise)
  return schemaPromise
}

function normalizeUserId(value: unknown): string {
  const userId = normalizeString(value)
  if (userId.length > 255) {
    return userId.slice(0, 255)
  }
  return userId
}

function parseFavoritePaths(value: unknown): string[] {
  const items = Array.isArray(value) ? value : []
  const unique = new Set<string>()

  for (const item of items) {
    const text = normalizeString(item)
    if (!text || !text.startsWith('/')) {
      continue
    }
    unique.add(text)
    if (unique.size >= 500) {
      break
    }
  }

  return Array.from(unique)
}

async function parseJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get('Content-Type') || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error('Content-Type must be application/json')
  }
  return request.json()
}

function parseStoredFavorites(rawValue: string | null): string[] {
  if (!rawValue) {
    return []
  }

  try {
    const parsed = JSON.parse(rawValue)
    return parseFavoritePaths(parsed)
  } catch {
    return []
  }
}

export function createUserFavoritesApi() {
  const app = new Hono<ApiHonoEnv>()
  app.get('/api/users/:userId/favorites', async (context) => {
    try {
      const env = context.env
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError

      await ensureUserFavoritesSchemaReady(env.DB)

      const userId = normalizeUserId(context.req.param('userId'))
      if (!userId) {
        return badRequest('userId is required')
      }

      const row = await env.DB.prepare(
        `SELECT user_id, favorites_json, updated_date
         FROM user_card_favorites
         WHERE user_id = ?`
      ).bind(userId).first<UserFavoriteRow>()

      return new Response(JSON.stringify({
        userId,
        favorites: parseStoredFavorites(row?.favorites_json ?? null),
        updatedAt: normalizeString(row?.updated_date),
      }), {
        headers: jsonHeaders,
      })
    } catch (error: any) {
      console.error('Error fetching user favorites:', error)
      return serverError(String(error?.message || error))
    }
  })

  app.put('/api/users/:userId/favorites', async (context) => {
    try {
      const env = context.env
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError

      await ensureUserFavoritesSchemaReady(env.DB)

      const userId = normalizeUserId(context.req.param('userId'))
      if (!userId) {
        return badRequest('userId is required')
      }

      const body = (await parseJsonBody(context.req.raw)) as Record<string, unknown>
      const favorites = parseFavoritePaths(body.favorites)
      const favoritesJson = JSON.stringify(favorites)
      const now = new Date().toISOString()

      await env.DB.prepare(
        `INSERT INTO user_card_favorites (user_id, favorites_json, updated_date)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           favorites_json = excluded.favorites_json,
           updated_date = excluded.updated_date`
      ).bind(userId, favoritesJson, now).run()

      return new Response(JSON.stringify({ userId, favorites, updatedAt: now }), {
        headers: jsonHeaders,
      })
    } catch (error: any) {
      console.error('Error updating user favorites:', error)
      return serverError(String(error?.message || error))
    }
  })

  return app
}