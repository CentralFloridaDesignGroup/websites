import { Hono } from 'hono'
import type { ReviewPackage, CommentRecord } from 'cfdg/types'
import { badRequest, jsonResponse, noContent, requireAuthMode, serverError, type HonoEnv } from '../apiTypes'
import { normalizeString, parseJsonBody } from 'cfdg/scripts'
import { createComment, createReviewPackage, deleteCommentById, deleteReviewPackageById, getCommentById, getCommentsByReviewPackageId, getReviewPackageById, getReviewPackages, upsertComment, upsertReviewPackage } from './methods'



/**
 * Registers the routes for the Comments API.
 */
export function createCommentsApi() {
  const app = new Hono<HonoEnv>()
  // GET: /api/reviews - Gets all review packages
  app.get('/api/reviews', async (context) => {
    try {
      // Validate the current authentication mode; if it doesn't match the expected mode, return an error response.
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      
      // Get all review packages from the database using the getReviewPackages function.
      const packages = await getReviewPackages(context.env.DB);

      // Return the list of review packages in the response
      return jsonResponse({ packages })
      
    } catch (error: any) {
      console.error('Error listing review packages:', error)
      return serverError(error?.message || error)
    }
  })

  // GET: /api/reviews/:id/comments - Gets all comments for a specific review package
  app.get('/api/reviews/:id/comments', async (context) => {
    try {
      const env = context.env
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError

      const id = normalizeString(context.req.param('id'))
      if (!id || isNaN(Number(id))) return badRequest('id is required')

      const [reviewPackage, comments] = await Promise.all([
        getReviewPackageById(env.DB, parseInt(id)),
        getCommentsByReviewPackageId(env.DB, parseInt(id)),
      ])

      if (!reviewPackage) {
        return badRequest('Review package not found')
      }

      return jsonResponse({ package: reviewPackage, comments })
    } catch (error: any) {
      console.error('Error fetching comments for package:', error)
      return serverError(String(error?.message || error))
    }
  })

  // POST: /api/reviews - Create or update a review package
  app.post('/api/reviews', async (context) => {
    try {
      const env = context.env
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError

      const body = await parseJsonBody(context.req.raw)
      if (!body) return badRequest('Request body is required')

      const requestPackage = body.package as Partial<ReviewPackage>
      if (!requestPackage) return badRequest('package is required in the request body')

      const now = new Date().toISOString()
      const id = normalizeString(requestPackage.id)
      const existingPackage = id && !isNaN(Number(id))
        ? await getReviewPackageById(env.DB, parseInt(id))
        : null
      const reviewPackage = {
        id,
        createdDate: existingPackage?.createdDate || now,
        updatedDate: now,
        createdBy: existingPackage?.createdBy || normalizeString(requestPackage.createdBy),
        updatedBy: normalizeString(requestPackage.updatedBy) || normalizeString(requestPackage.createdBy),
        completedBy: normalizeString(requestPackage.completedBy),
        projectNumber: normalizeString(requestPackage.projectNumber),
        municipalNumber: normalizeString(requestPackage.municipalNumber),
        reviewNumber: normalizeString(requestPackage.reviewNumber),
        reviewDate: normalizeString(requestPackage.reviewDate),
        projectName: normalizeString(requestPackage.projectName),
        comment: normalizeString(requestPackage.comment),
        status: requestPackage.status || 'open',
      }
      
        // Validate required fields for creating or updating a review package
      const { projectNumber, reviewNumber, createdDate, createdBy } = reviewPackage;
      if (!projectNumber) return badRequest('projectNumber is required in the review package.')
      if (!reviewNumber) return badRequest('reviewNumber is required in the review package.')
      if (!createdDate) return badRequest('createdDate is required in the review package.')
      if (!createdBy) return badRequest('createdBy is required in the review package.')

      const updatedPackage = existingPackage
        ? (await upsertReviewPackage(env.DB, reviewPackage), reviewPackage)
        : await createReviewPackage(env.DB, reviewPackage)

      return jsonResponse({ package: updatedPackage })

    } catch (error: any) {
      console.error('Error saving review package:', error)
      return serverError(String(error?.message || error))
    }
  })

  // POST: /api/comments - Create or update a group of comments
  app.post('/api/comments', async (context) => {
    try {
      const env = context.env
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError

      const body = await parseJsonBody(context.req.raw)
      if (!body) return badRequest('Request body is required')

      const requestComment = body as Partial<CommentRecord>
      const id = normalizeString(requestComment.id)
      const packageId = normalizeString(requestComment.packageId)
      if (!packageId || isNaN(Number(packageId))) return badRequest('packageId is required')

      const existingComment = id && !isNaN(Number(id))
        ? await getCommentById(env.DB, parseInt(id))
        : null
      const now = new Date().toISOString()
      const comment = {
        id,
        packageId,
        createdDate: existingComment?.createdDate || now,
        updatedDate: now,
        createdBy: existingComment?.createdBy || normalizeString(requestComment.createdBy) || normalizeString(requestComment.updatedBy),
        updatedBy: normalizeString(requestComment.updatedBy) || normalizeString(requestComment.createdBy),
        commentId: normalizeString(requestComment.commentId),
        comment: normalizeString(requestComment.comment),
        response: normalizeString(requestComment.response),
        department: normalizeString(requestComment.department),
        status: requestComment.status || 'open',
      }
      if (!comment.comment) return badRequest('comment is required')
      if (!comment.createdBy) return badRequest('createdBy is required')

      const savedComment = existingComment
        ? (await upsertComment(env.DB, comment), comment)
        : await createComment(env.DB, comment)
      return jsonResponse({ comment: savedComment })
    } catch (error: any) {
      console.error('Error saving comment:', error)
      return serverError(String(error?.message || error))
    }
  })

  // 5. DELETE: /api/reviews/:id - Delete a review package and its associated comments
  app.delete('/api/reviews/:id', async (context) => {
    try {
      const env = context.env
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError

      const id = normalizeString(context.req.param('id'))
      if (!id || isNaN(parseInt(id))) return badRequest('id is required')

      await deleteReviewPackageById(env.DB, parseInt(id));

      return noContent();
    } catch (error: any) {
      console.error('Error deleting review package:', error)
      return serverError(String(error?.message || error))
    }
  })

  // 6. DELETE: /api/comments/:id - Delete a specific comment by its ID
  app.delete('/api/comments/:id', async (context) => {
    try {
      const env = context.env
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError

      const id = normalizeString(context.req.param('id'))
      if (!id || isNaN(parseInt(id))) return badRequest('id is required')

      await deleteCommentById(env.DB, id);

      return noContent();
    } catch (error: any) {
      console.error('Error deleting comment:', error)
      return serverError(String(error?.message || error))
    }
  })

  return app
}
