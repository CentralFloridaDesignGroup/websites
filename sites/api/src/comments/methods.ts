import {
  CommentRecord,
  CommentRecordRow,
  ReviewPackage,
  ReviewPackageRow,
} from "cfdg/types";
import {
  mapCommentRecord,
  mapReviewPackage,
  mapReviewPackageRow,
} from "cfdg/types/mappers";

/**
 * Fetches all review packages from the database.
 * @param db The D1 database connection.
 * @returns A promise that resolves to an array of review packages.
 * @throws Will throw an error if the database query fails.
 */
export async function getReviewPackages(
  db: D1Database,
): Promise<ReviewPackage[]> {
  const result = await db
    .prepare(
      "SELECT id, created_date, updated_date, created_by, updated_by, project_number, municipal_number, review_number, review_date, project_name, status, comment, completed_by FROM review_package ORDER BY created_date DESC",
    )
    .all<ReviewPackageRow>();
  if (!result.success) {
    throw new Error("Failed to fetch review packages from the database.");
  }
  const reviewPackages = result.results.map(mapReviewPackageRow);
  return reviewPackages;
}

/**
 * Fetches a review package by its ID from the database.
 * @param db The D1 database connection.
 * @param id The ID of the review package to fetch.
 * @returns A promise that resolves to the review package if found, or null if not found.
 * @throws Will throw an error if the database query fails.
 */
export async function getReviewPackageById(
  db: D1Database,
  id: number,
): Promise<ReviewPackage | null> {
  const result = await db
    .prepare(
      "SELECT id, created_date, updated_date, created_by, updated_by, project_number, municipal_number, review_number, review_date, project_name, status, comment, completed_by FROM review_package WHERE id = ?",
    )
    .bind(id)
    .first<ReviewPackageRow>();
  if (!result) {
    return null;
  }
  return mapReviewPackageRow(result);
}

/**
 * Retrieves all comments associated with a specific review package ID from the database.
 * @param db - The D1 database connection.
 * @param reviewPackageId - The ID of the review package for which to fetch comments.
 * @returns A promise that resolves to an array of CommentRecordRow objects.
 * @throws Will throw an error if the database query fails.
 */
export async function getCommentsByReviewPackageId(
  db: D1Database,
  reviewPackageId: number,
): Promise<CommentRecordRow[]> {
  const result = await db
    .prepare(
      "SELECT id, package, created_date, updated_date, created_by, updated_by, comment_id, comment_text, response_text, department, status FROM comments WHERE package = ? ORDER BY comment_id ASC",
    )
    .bind(reviewPackageId)
    .all<CommentRecordRow>();
  if (!result.success) {
    throw new Error("Failed to fetch comments from the database.");
  }
  return result.results;
}

/**
 * Creates or updates a review package in the database. If the review package already exists (based on its ID), it will be updated; otherwise, a new record will be inserted.
 * @param db - The D1 database connection.
 * @param reviewPackage - The ReviewPackage object to be inserted or updated.
 * @returns A promise that resolves when the operation is complete.
 * @throws Will throw an error if the database operation fails.
 */
export async function upsertReviewPackage(
  db: D1Database,
  reviewPackage: ReviewPackage,
): Promise<void> {
  const dbRow = mapReviewPackage(reviewPackage);
  const result = await db
    .prepare(
      "INSERT INTO review_package (id, created_date, updated_date, created_by, updated_by, project_number, municipal_number, review_number, review_date, project_name, status, comment, completed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET updated_date = excluded.updated_date, updated_by = excluded.updated_by, project_number = excluded.project_number, municipal_number = excluded.municipal_number, review_number = excluded.review_number, review_date = excluded.review_date, project_name = excluded.project_name, status = excluded.status, comment = excluded.comment, completed_by = excluded.completed_by",
    )
    .bind(
      dbRow.id,
      dbRow.created_date,
      dbRow.updated_date,
      dbRow.created_by,
      dbRow.updated_by,
      dbRow.project_number,
      dbRow.municipal_number,
      dbRow.review_number,
      dbRow.review_date,
      dbRow.project_name,
      dbRow.status,
      dbRow.comment,
      dbRow.completed_by,
    )
    .run();
  if (!result.success) {
    throw new Error(
      `Failed to upsert review package with ID ${reviewPackage.id} in the database.`,
    );
  }
}

/**
 * Either inserts a new comment or updates an existing comment in the database based on the provided CommentRecord array.
 * @param db - The D1 database connection.
 * @param comments - An array of CommentRecord objects to be inserted or updated.
 * @returns A promise that resolves when the operation is complete.
 * @throws Will throw an error if the database operation fails.
 * @summary This function assumes that the CommentRecord objects have valid data and that the database schema supports the operations. It is recommended to validate the input data before calling this function to avoid potential errors.
 */
export async function upsertComment(
  db: D1Database,
  comment: CommentRecord,
): Promise<void> {
  const dbRow = mapCommentRecord(comment);
  const result = await db
    .prepare(
      "INSERT INTO comments (id, package, created_date, updated_date, created_by, updated_by, comment_id, comment_text, response_text, department, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET package = excluded.package, updated_date = excluded.updated_date, updated_by = excluded.updated_by, comment_id = excluded.comment_id, comment_text = excluded.comment_text, response_text = excluded.response_text, department = excluded.department, status = excluded.status",
    )
    .bind(
      dbRow.id,
      dbRow.package,
      dbRow.created_date,
      dbRow.updated_date,
      dbRow.created_by,
      dbRow.updated_by,
      dbRow.comment_id,
      dbRow.comment_text,
      dbRow.response_text,
      dbRow.department,
      dbRow.status,
    )
    .run();

  if (!result.success) {
    throw new Error(
      `Failed to upsert comment with ID ${comment.id} in the database.`,
    );
  }
}

/**
 * Deletes a review package from the database based on its ID. If the review package does not exist, no action is taken.
 * @param db - The D1 database connection.
 * @param id - The ID of the review package to be deleted.
 * @returns A promise that resolves when the operation is complete.
 * @throws Will throw an error if the database operation fails.
 */
export async function deleteReviewPackageById(db: D1Database, id: number): Promise<void> {
  const result = await db.batch([
    db.prepare("DELETE FROM comments WHERE package = ?").bind(id),
    db.prepare("DELETE FROM review_package WHERE id = ?").bind(id),
  ]);

  const failed = result.find((res) => !res.success);
  if (failed) {
    throw new Error(`Failed to delete review package with ID ${id} from the database.`);
  }
}

/**
 * Deletes a comment from the database based on its ID. If the comment does not exist, no action is taken.
 * @param db - The D1 database connection.
 * @param id - The ID of the comment to be deleted.
 * @returns A promise that resolves when the operation is complete.
 * @throws Will throw an error if the database operation fails.
 */
export async function deleteCommentById(db: D1Database, id: string): Promise<void> {
  const result = await db
    .prepare("DELETE FROM comments WHERE id = ?")
    .bind(id)
    .run();
  if (!result.success) {
    throw new Error(`Failed to delete comment with ID ${id} from the database.`);
  }
}

/**
 * Retrieves the IDs of comments associated with a specific review package.
 * @param db - The D1 database connection.
 * @param reviewPackageId - The ID of the review package.
 * @returns A promise that resolves to an array of comment IDs.
 * @throws Will throw an error if the database operation fails.
 */
export async function getCommentIdsByReviewPackageId(
  db: D1Database,
  reviewPackageId: number,
): Promise<string[]> {
  const result = await db
    .prepare(
      "SELECT id FROM comments WHERE package = ? ORDER BY id ASC",
    )
    .bind(reviewPackageId)
    .all<{ id: string }>();

    return result.results.map((row) => row.id);
}