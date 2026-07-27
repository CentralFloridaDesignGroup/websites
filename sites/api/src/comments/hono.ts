import { Hono } from 'hono'
import type { ReviewPackage, CommentRecord } from 'cfdg/types'
import { badRequest, jsonResponse, noContent, requireAuthMode, serverError, type HonoEnv } from '../apiTypes'
import { normalizeString, parseJsonBody } from 'cfdg/scripts'
import { deleteCommentById, deleteReviewPackageById, getCommentIdsByReviewPackageId, getCommentsByReviewPackageId, getReviewPackageById, getReviewPackages, upsertComment, upsertReviewPackage } from './methods'



/**
 * Registers the routes for the Comments API.
 * @param {any} router - The router object to register the routes on.
 * @param {Record<string, string>} jsonHeaders - The headers to include in the responses.
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

      const comments = await getCommentsByReviewPackageId(env.DB, parseInt(id));

      if (!comments) {
        return serverError('Failed to fetch comments for the review package.')
      }

      return jsonResponse({ comments })
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

      const reviewPackage = body.package as ReviewPackage;
      if (!reviewPackage) return badRequest('package is required in the request body')
      
        // Validate required fields for creating or updating a review package
      const {id, projectNumber, reviewNumber, createdDate, createdBy} = reviewPackage;
      if (!id) return badRequest('id is required in the review package.')
      if (!projectNumber) return badRequest('projectNumber is required in the review package.')
      if (!reviewNumber) return badRequest('reviewNumber is required in the review package.')
      if (!createdDate) return badRequest('createdDate is required in the review package.')
      if (!createdBy) return badRequest('createdBy is required in the review package.')

      await upsertReviewPackage(env.DB, reviewPackage);
      const updatedPackage = await getReviewPackageById(env.DB, parseInt(id)); //easier to get the updated package after upsert

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

      const comments = body.comments as CommentRecord[];
      if (!comments || !Array.isArray(comments)) return badRequest('comments array is required in the request body')

      const id = normalizeString(context.req.param('id'))
      if (!id) return badRequest('id is required')


        // Get the current list of comments for the review package to determine which comments need to be deleted
      const existingCommentIds = await getCommentIdsByReviewPackageId(env.DB, parseInt(id));
      const incomingCommentIds = comments.map(comment => comment.commentId);

      // Determine which comments need to be deleted
      const commentIdsToDelete = existingCommentIds.filter(id => !incomingCommentIds.includes(id));

      // Delete comments that are no longer present in the incoming request
      for (const commentId of commentIdsToDelete) {
        try {
          await deleteCommentById(env.DB, commentId);
        } catch (error: any) {
          return serverError(`Failed to delete comment with ID ${commentId}: ${error?.message || error}`);
        }
      }

      // Upsert the incoming comments
      for (const comment of comments) {
        try {
          await upsertComment(env.DB, comment);
        } catch (error: any) {
          return serverError(`Failed to upsert comment with ID ${comment.commentId}: ${error?.message || error}`);
        }
      }

      // Fetch the updated list of comments for the review package after upserting
      const updatedComments = await getCommentsByReviewPackageId(env.DB, parseInt(id));
      return jsonResponse({ comments: updatedComments });
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