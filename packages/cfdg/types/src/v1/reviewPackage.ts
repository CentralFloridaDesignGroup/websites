import { COMMENT_STATUSES, REVIEW_PACKAGE_STATUSES } from "./constants";
import { normalizeString, normalizeType } from "./helpers";

// #region Type Definitions

export type CommentStatus = (typeof COMMENT_STATUSES)[number];

export type ReviewPackageStatus = (typeof REVIEW_PACKAGE_STATUSES)[number];

// #endregion

// #region Review Package types

/** Represents a comment record associated with a review package */
export type CommentRecord = {
    /** Unique identifier for the comment record */
    id: string
    /** Identifier of the review package this comment belongs to */
    packageId: string
    /** Date when the comment record was created */
    createdDate: string
    /** Date when the comment record was last updated */
    updatedDate: string
    /** Identifier of the user who created the comment record */
    createdBy: string
    /** Identifier of the user who last updated the comment record */
    updatedBy: string
    /** Unique identifier for the comment */
    commentId: string
    /** Text content of the comment */
    comment: string
    /** Text content of the response to the comment */
    response: string
    /** Department associated with the comment */
    department: string
    /** Current status of the comment */
    status: CommentStatus
}

/** Represents a review package record */
export type ReviewPackage = {
    /** Unique identifier for the review package record */
    id: string
    /** Date when the review package record was created */
    createdDate: string
    /** Date when the review package record was last updated */
    updatedDate: string
    /** Identifier of the user who created the review package record */
    createdBy: string
    /** Identifier of the user who last updated the review package record */
    updatedBy: string
    /** Identifier of the user who completed the review package */
    completedBy: string
    /** Project number associated with the review package */
    projectNumber: string
    /** Municipal number associated with the review package */
    municipalNumber: string
    /** Review number associated with the review package */
    reviewNumber: string
    /** Review date associated with the review package */
    reviewDate: string
    /** Project name associated with the review package */
    projectName: string
    /** General comment about the review package */
    comment: string
    /** Current status of the review package */
    status: ReviewPackageStatus
}

/** D1 Database row representation of a comment record */
export type CommentRecordRow = {
    /** Unique identifier for the comment record */
    id?: unknown
    /** Identifier of the review package this comment belongs to */
    package?: unknown
    /** Date when the comment record was created */
    created_date?: unknown
    /** Date when the comment record was last updated */
    updated_date?: unknown
    /** Identifier of the user who created the comment record */
    created_by?: unknown
    /** Identifier of the user who last updated the comment record */
    updated_by?: unknown
    /** Unique identifier for the comment */
    comment_id?: unknown
    /** Text content of the comment */
    comment_text?: unknown
    /** Text content of the response to the comment */
    response_text?: unknown
    /** Department associated with the comment */
    department?: unknown
    /** Current status of the comment */
    status?: unknown
}

/** D1 Database row representation of a review package record */
export type ReviewPackageRow = {
    /** Unique identifier for the review package record */
    id?: unknown
    /** Date when the review package record was created */
    created_date?: unknown
    /** Date when the review package record was last updated */
    updated_date?: unknown
    /** Identifier of the user who created the review package record */
    created_by?: unknown
    /** Identifier of the user who last updated the review package record */
    updated_by?: unknown
    /** Identifier of the user who completed the review package */
    completed_by?: unknown
    /** Project number associated with the review package */
    project_number?: unknown
    /** Municipal number associated with the review package */
    municipal_number?: unknown
    /** Review number associated with the review package */
    review_number?: unknown
    /** Review date associated with the review package */
    review_date?: unknown
    /** Project name associated with the review package */
    project_name?: unknown
    /** General comment about the review package */
    comment?: unknown
    /** Current status of the review package */
    status?: unknown
}

// #endregion

// #region Mapping Functions

/**
 * Maps a CommentRecordRow to a CommentRecord, normalizing the data types and values.
 * @param row - D1 Database row representation of a comment record
 * @returns Mapped CommentRecord with normalized values
 */
export function mapCommentRecordRow(row: CommentRecordRow): CommentRecord {
    return {
        id: normalizeString(row.id),
        packageId: normalizeString(row.package),
        createdDate: normalizeString(row.created_date),
        updatedDate: normalizeString(row.updated_date),
        createdBy: normalizeString(row.created_by),
        updatedBy: normalizeString(row.updated_by),
        commentId: normalizeString(row.comment_id),
        comment: normalizeString(row.comment_text),
        response: normalizeString(row.response_text),
        department: normalizeString(row.department),
        status: normalizeType<CommentStatus>(row.status, COMMENT_STATUSES, 'open'),
    };
}

/**
 * Maps a CommentRecord to a CommentRecordRow, preparing it for database insertion or update.
 * @param record - The CommentRecord to be mapped to a database row
 * @returns The corresponding CommentRecordRow
 */
export function mapCommentRecord(record: CommentRecord): CommentRecordRow {
    return {
        id: record.id,
        package: record.packageId,
        created_date: record.createdDate,
        updated_date: record.updatedDate,
        created_by: record.createdBy,
        updated_by: record.updatedBy,
        comment_id: record.commentId,
        comment_text: record.comment,
        response_text: record.response,
        department: record.department,
        status: record.status,
    };
}

/**
 * Maps a ReviewPackageRow to a ReviewPackage, normalizing the data types and values.
 * @param row - D1 Database row representation of a review package record
 * @returns Mapped ReviewPackage with normalized values
 */
export function mapReviewPackageRow(row: ReviewPackageRow): ReviewPackage {
    return {
        id: normalizeString(row.id),
        createdDate: normalizeString(row.created_date),
        updatedDate: normalizeString(row.updated_date),
        createdBy: normalizeString(row.created_by),
        updatedBy: normalizeString(row.updated_by),
        completedBy: normalizeString(row.completed_by),
        projectNumber: normalizeString(row.project_number),
        municipalNumber: normalizeString(row.municipal_number),
        reviewNumber: normalizeString(row.review_number),
        reviewDate: normalizeString(row.review_date),
        projectName: normalizeString(row.project_name),
        comment: normalizeString(row.comment),
        status: normalizeType<ReviewPackageStatus>(row.status, REVIEW_PACKAGE_STATUSES, 'open'),
    };
}

/** 
 * Maps a ReviewPackage to a ReviewPackageRow, preparing it for database insertion or update.
 * @param record - The ReviewPackage to be mapped to a database row
 * @returns The corresponding ReviewPackageRow
 */
export function mapReviewPackage(record: ReviewPackage): ReviewPackageRow {
    return {
        id: record.id,
        created_date: record.createdDate,
        updated_date: record.updatedDate,
        created_by: record.createdBy,
        updated_by: record.updatedBy,
        completed_by: record.completedBy,
        project_number: record.projectNumber,
        municipal_number: record.municipalNumber,
        review_number: record.reviewNumber,
        review_date: record.reviewDate,
        project_name: record.projectName,
        comment: record.comment,
        status: record.status,
    };
}

// #endregion
