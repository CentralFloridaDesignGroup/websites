import {
  COMMENT_STATUSES,
  REVIEW_PACKAGE_STATUSES,
  mapCommentRecordRow,
  mapReviewPackageRow,
  type CommentRecordRow,
  type ReviewPackageRow,
  type CommentStatus,
  type ReviewPackageStatus,
} from "@wps/scripts"
import { Hono } from 'hono'
import { jsonHeaders, requireAuthMode, type ApiHonoEnv } from './apiTypes'

/**
 * Environment variables expected by the Comments API. The `DB` variable is a D1Database instance provided by Cloudflare Workers, and `COMMENTS_API_KEY` is a string used to authenticate incoming requests.
 * @property {D1Database} DB - The D1 database instance for storing review packages and comments.
 * @property {string} COMMENTS_API_KEY - The API key required for authenticating requests to the Comments API.
 */
export interface CommentsApiEnv {
  DB: D1Database
}

/**
 * Ensures that a specific column exists in a given table. If the column already exists, the function will catch the error and ignore it. If any other error occurs, it will be thrown to be handled by the caller. Used to verify that the database schema is up to date with the expected structure for review packages and comments.
 * @param {D1Database} db - The D1 database instance to operate on.
 * @param {'review_package' | 'comments'} tableName - The name of the table to check for the column.
 * @param {string} columnDefinitionSql - The SQL definition of the column to add (e.g., "status TEXT").
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 * @throws Will throw an error if the ALTER TABLE operation fails for reasons other than the column already existing.
 */
async function ensureColumn(
  db: D1Database,
  tableName: 'review_package' | 'comments',
  columnDefinitionSql: string
): Promise<void> {
  try {
    await db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinitionSql}`).run()
  } catch (error: any) {
    const message = String(error?.message || error).toLowerCase()
    if (!message.includes('duplicate column name')) {
      throw error
    }
  }
}

/**
 * Ensures that the necessary database schema for storing review packages and comments exists. This includes creating the `review_package` and `comments` tables if they do not already exist, as well as adding any missing columns that are required by the application. The function is designed to be idempotent, meaning it can be safely called multiple times without causing errors or duplications in the database schema.
 * @param {D1Database} db - The D1 database instance to operate on.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
async function ensureCommentsSchema(db: D1Database): Promise<void> {
  const createTableStatements = [
    `CREATE TABLE IF NOT EXISTS review_package (
      id INTEGER PRIMARY KEY,
      created_date DATETIME NOT NULL,
      updated_date DATETIME,
      created_by TEXT NOT NULL,
      updated_by TEXT,
      completed_by TEXT,
      project_number TEXT,
      municipal_number TEXT,
      review_number INTEGER,
      review_date DATE,
      project_name TEXT,
      comment TEXT,
      status TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY,
      package INTEGER,
      created_date DATETIME NOT NULL,
      updated_date DATETIME,
      created_by TEXT NOT NULL,
      updated_by TEXT,
      comment_id TEXT,
      comment_text TEXT,
      response_text TEXT,
      department TEXT,
      status TEXT,
      FOREIGN KEY (package) REFERENCES review_package(id)
    )`,
  ]

  for (const statement of createTableStatements) {
    await db.prepare(statement).run()
  }

  const createIndexStatements = [
    `CREATE INDEX IF NOT EXISTS idx_review_package_id ON review_package(id)`,
    `CREATE INDEX IF NOT EXISTS idx_comments_package ON comments(package)`,
  ]

  for (const statement of createIndexStatements) {
    await db.prepare(statement).run()
  }

  const requiredColumns: Array<{ table: 'review_package' | 'comments'; column: string }> = [
    { table: 'comments', column: 'department TEXT' },
    { table: 'comments', column: 'status TEXT' },
    { table: 'review_package', column: 'comment TEXT' },
    { table: 'review_package', column: 'status TEXT' },
    { table: 'review_package', column: 'completed_by TEXT' },
  ]

  for (const { table, column } of requiredColumns) {
    await ensureColumn(db, table, column)
  }
}

/**
 * Creates a 400 Bad Request response with a JSON error message.
 * @param {string} message - The error message to include in the response.
 * @param {Record<string, string>} jsonHeaders - The headers to include in the response.
 * @returns {Response} A Response object representing the 400 Bad Request.
 */
function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: jsonHeaders,
  })
}

/**
 * Creates a 500 Internal Server Error response with a JSON error message.
 * @param {string} message - The error message to include in the response.
 * @param {Record<string, string>} jsonHeaders - The headers to include in the response.
 * @returns {Response} A Response object representing the 500 Internal Server Error.
 */
function serverError(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: jsonHeaders,
  })
}

/**
 * Normalizes a value to a string by trimming whitespace and converting null or undefined to an empty string.
 * @param {unknown} value - The value to normalize.
 * @returns {string} The normalized string.
 */
function normalizeString(value: unknown): string {
  return String(value ?? '').trim()
}

/**
 * Normalizes a value to a valid status by checking against allowed values and providing a fallback if necessary.
 * @param {unknown} value - The value to normalize.
 * @param {readonly string[]} allowedValues - An array of allowed status values.
 * @param {string} fallback - The fallback value to use if the input value is not allowed.
 * @returns {string} The normalized status value.
 */
function normalizeStatus<T extends readonly string[]>(
  value: unknown,
  allowedValues: T,
  fallback: T[number]
): T[number] {
  const normalized = normalizeString(value).toLowerCase()
  const match = allowedValues.find((candidate) => candidate === normalized)
  return (match ?? fallback) as T[number]
}

/**
 * Parses the JSON body of a request, ensuring the Content-Type is application/json.
 * @param {Request} request - The incoming request object.
 * @returns {Promise<any>} A promise that resolves to the parsed JSON body.
 * @throws {Error} If the Content-Type is not application/json.
 */
async function parseJsonBody(request: Request): Promise<any> {
  const contentType = request.headers.get('Content-Type') || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error('Content-Type must be application/json')
  }
  return request.json()
}

/**
 * Registers the routes for the Comments API.
 * @param {any} router - The router object to register the routes on.
 * @param {Record<string, string>} jsonHeaders - The headers to include in the responses.
 */
export function createCommentsApi() {
  const app = new Hono<ApiHonoEnv>()
  // 1. Get all review packages
  app.get('/api/reviews', async (context) => {
    try {
      const env = context.env
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureCommentsSchema(env.DB)

      const rows = await env.DB.prepare(
        `SELECT id, created_date, updated_date, created_by, updated_by,
                completed_by, project_name, project_number, municipal_number, review_number, review_date, comment, status
         FROM review_package
         ORDER BY created_date DESC`
      ).all()

      return new Response(
        JSON.stringify({ packages: (rows.results || []).map((row) => mapReviewPackageRow(row as ReviewPackageRow)) }),
        { headers: jsonHeaders }
      )
    } catch (error: any) {
      console.error('Error listing review packages:', error)
      return serverError(String(error?.message || error))
    }
  })

  // 2. Get all comments for a review package
  app.get('/api/reviews/:id/comments', async (context) => {
    try {
      const env = context.env
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureCommentsSchema(env.DB)

      const id = normalizeString(context.req.param('id'))
      if (!id) return badRequest('id is required')

      const pkg = await env.DB.prepare(
        `SELECT id, created_date, updated_date, created_by, updated_by,
                completed_by, project_name, project_number, municipal_number, review_number, review_date, comment, status
         FROM review_package WHERE id = ?`
      ).bind(id).first()

      if (!pkg) {
        return new Response(JSON.stringify({ error: 'Review package not found' }), {
          status: 404,
          headers: jsonHeaders,
        })
      }

      const comments = await env.DB.prepare(
        `SELECT id, package, created_date, updated_date, created_by, updated_by,
                comment_id, comment_text, response_text, department, status
         FROM comments
         WHERE package = ?
         ORDER BY created_date ASC`
      ).bind(id).all()

      return new Response(
        JSON.stringify({
          package: mapReviewPackageRow(pkg as ReviewPackageRow),
          comments: (comments.results || []).map((row) => mapCommentRecordRow(row as CommentRecordRow)),
        }),
        { headers: jsonHeaders }
      )
    } catch (error: any) {
      console.error('Error fetching comments for package:', error)
      return serverError(String(error?.message || error))
    }
  })

  // 3. Upsert a review package — provide `id` in the body to update, omit to create
  app.post('/api/reviews', async (context) => {
    try {
      const env = context.env
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureCommentsSchema(env.DB)

      const body = await parseJsonBody(context.req.raw)
      const id = normalizeString(body.id) || null
      const projectName = normalizeString(body.projectName)
      const projectNumber = normalizeString(body.projectNumber)
      const municipalNumber = normalizeString(body.municipalNumber)
      const reviewNumber = normalizeString(body.reviewNumber)
      const reviewDate = normalizeString(body.reviewDate)
      const comment = normalizeString(body.comment)
      const completedBy = normalizeString(body.completedBy)
      const createdBy = normalizeString(body.createdBy)
      const updatedBy = normalizeString(body.updatedBy)
      const status: ReviewPackageStatus = normalizeStatus(body.status, REVIEW_PACKAGE_STATUSES, 'open')

      if (!projectNumber) return badRequest('projectNumber is required')
      if (!reviewNumber) return badRequest('reviewNumber is required')

      const duplicatePackage = await env.DB.prepare(
        `SELECT id
         FROM review_package
         WHERE LOWER(TRIM(project_number)) = LOWER(TRIM(?))
           AND LOWER(TRIM(CAST(review_number AS TEXT))) = LOWER(TRIM(?))
           AND (? IS NULL OR id <> ?)
         LIMIT 1`
      ).bind(projectNumber, reviewNumber, id, id).first()

      if (duplicatePackage) {
        return new Response(
          JSON.stringify({ error: 'A review package with this project number and review number already exists.' }),
          {
            status: 409,
            headers: jsonHeaders,
          }
        )
      }

      const now = new Date().toISOString()

      if (id) {
        // Update existing package
        const existing = await env.DB.prepare(
          `SELECT id FROM review_package WHERE id = ?`
        ).bind(id).first()

        if (!existing) {
          return new Response(JSON.stringify({ error: 'Review package not found' }), {
            status: 404,
            headers: jsonHeaders,
          })
        }

        await env.DB.prepare(
          `UPDATE review_package
           SET updated_date = ?, updated_by = ?, project_name = ?, project_number = ?,
               municipal_number = ?, review_number = ?, review_date = ?, comment = ?, status = ?, completed_by = ?
           WHERE id = ?`
        ).bind(now, updatedBy, projectName, projectNumber, municipalNumber, reviewNumber, reviewDate, comment, status, completedBy, id).run()

        const row = await env.DB.prepare(
          `SELECT id, created_date, updated_date, created_by, updated_by,
                  completed_by, project_name, project_number, municipal_number, review_number, review_date, comment, status
           FROM review_package WHERE id = ?`
        ).bind(id).first()

        return new Response(JSON.stringify({ package: mapReviewPackageRow(row as ReviewPackageRow) }), { headers: jsonHeaders })
      } else {
        // Create new package
        if (!createdBy) return badRequest('createdBy is required when creating a new package')

        const result = await env.DB.prepare(
          `INSERT INTO review_package
             (created_date, updated_date, created_by, updated_by,
              completed_by, project_name, project_number, municipal_number, review_number, review_date, comment, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(now, now, createdBy, updatedBy, completedBy, projectName, projectNumber, municipalNumber, reviewNumber, reviewDate, comment, status).run()

        const newId = result.meta?.last_row_id
        const row = await env.DB.prepare(
          `SELECT id, created_date, updated_date, created_by, updated_by,
                completed_by, project_name, project_number, municipal_number, review_number, review_date, comment, status
           FROM review_package WHERE id = ?`
        ).bind(newId).first()

        return new Response(JSON.stringify({ package: mapReviewPackageRow(row as ReviewPackageRow) }), {
          status: 201,
          headers: jsonHeaders,
        })
      }
    } catch (error: any) {
      console.error('Error saving review package:', error)
      return serverError(String(error?.message || error))
    }
  })

  // 4. Upsert a comment — provide `id` in the body to update, omit to create
  app.post('/api/comments', async (context) => {
    try {
      const env = context.env
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureCommentsSchema(env.DB)

      const body = await parseJsonBody(context.req.raw)
      const id = normalizeString(body.id) || null
      const packageId = normalizeString(body.packageId)
      const commentId = normalizeString(body.commentId)
      const comment = normalizeString(body.comment)
      const response = normalizeString(body.response)
      const createdBy = normalizeString(body.createdBy)
      const updatedBy = normalizeString(body.updatedBy)
      const department = normalizeString(body.department)
      const status: CommentStatus = normalizeStatus(body.status, COMMENT_STATUSES, 'open')

      const now = new Date().toISOString()

      if (id) {
        // Update existing comment
        const existing = await env.DB.prepare(
          `SELECT id FROM comments WHERE id = ?`
        ).bind(id).first()

        if (!existing) {
          return new Response(JSON.stringify({ error: 'Comment not found' }), {
            status: 404,
            headers: jsonHeaders,
          })
        }

        await env.DB.prepare(
          `UPDATE comments
           SET updated_date = ?, updated_by = ?, comment_id = ?,
               comment_text = ?, response_text = ?, department = ?, status = ?
           WHERE id = ?`
        ).bind(now, updatedBy, commentId, comment, response, department, status, id).run()

        const row = await env.DB.prepare(
          `SELECT id, package, created_date, updated_date, created_by, updated_by,
                  comment_id, comment_text, response_text, department, status
           FROM comments WHERE id = ?`
        ).bind(id).first()

        return new Response(JSON.stringify({ comment: mapCommentRecordRow(row as CommentRecordRow) }), { headers: jsonHeaders })
      } else {
        // Create new comment
        if (!packageId) return badRequest('packageId is required when creating a new comment')
        if (!createdBy) return badRequest('createdBy is required when creating a new comment')

        const pkg = await env.DB.prepare(
          `SELECT id FROM review_package WHERE id = ?`
        ).bind(packageId).first()

        if (!pkg) {
          return new Response(JSON.stringify({ error: 'Review package not found' }), {
            status: 404,
            headers: jsonHeaders,
          })
        }

        const result = await env.DB.prepare(
          `INSERT INTO comments
             (package, created_date, updated_date, created_by, updated_by,
              comment_id, comment_text, response_text, department, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(packageId, now, now, createdBy, updatedBy, commentId, comment, response, department, status).run()

        const newId = result.meta?.last_row_id
        const row = await env.DB.prepare(
          `SELECT id, package, created_date, updated_date, created_by, updated_by,
                  comment_id, comment_text, response_text, department, status
           FROM comments WHERE id = ?`
        ).bind(newId).first()

        return new Response(JSON.stringify({ comment: mapCommentRecordRow(row as CommentRecordRow) }), {
          status: 201,
          headers: jsonHeaders,
        })
      }
    } catch (error: any) {
      console.error('Error saving comment:', error)
      return serverError(String(error?.message || error))
    }
  })

  // 5. Delete a review package and all associated comments
  app.delete('/api/reviews/:id', async (context) => {
    try {
      const env = context.env
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureCommentsSchema(env.DB)

      const id = normalizeString(context.req.param('id'))
      if (!id) return badRequest('id is required')

      const existing = await env.DB.prepare(
        `SELECT id FROM review_package WHERE id = ?`
      ).bind(id).first()

      if (!existing) {
        return new Response(JSON.stringify({ error: 'Review package not found' }), {
          status: 404,
          headers: jsonHeaders,
        })
      }

      // Delete child comments before the package (respects FK constraint)
      await env.DB.prepare(`DELETE FROM comments WHERE package = ?`).bind(id).run()
      await env.DB.prepare(`DELETE FROM review_package WHERE id = ?`).bind(id).run()

      return new Response(null, { status: 204, headers: jsonHeaders })
    } catch (error: any) {
      console.error('Error deleting review package:', error)
      return serverError(String(error?.message || error))
    }
  })

  // 6. Delete a single comment (does not affect the parent package)
  app.delete('/api/comments/:id', async (context) => {
    try {
      const env = context.env
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureCommentsSchema(env.DB)

      const id = normalizeString(context.req.param('id'))
      if (!id) return badRequest('id is required')

      const result = await env.DB.prepare(`DELETE FROM comments WHERE id = ?`).bind(id).run()

      if (!result.success || (result.meta?.changes ?? 0) === 0) {
        return new Response(JSON.stringify({ error: 'Comment not found' }), {
          status: 404,
          headers: jsonHeaders,
        })
      }

      return new Response(null, { status: 204, headers: jsonHeaders })
    } catch (error: any) {
      console.error('Error deleting comment:', error)
      return serverError(String(error?.message || error))
    }
  })

  return app
}