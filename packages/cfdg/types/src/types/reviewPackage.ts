export const COMMENT_STATUSES = ['open', 'closed', 'answered', 'further information', 'not a comment'] as const;
export type CommentStatus = (typeof COMMENT_STATUSES)[number];

export const REVIEW_PACKAGE_STATUSES = ['open', 'review', 'closed'] as const;
export type ReviewPackageStatus = (typeof REVIEW_PACKAGE_STATUSES)[number];

export type CommentRecord = {
    id: string
    packageId: string
    createdDate: string
    updatedDate: string
    createdBy: string
    updatedBy: string
    commentId: string
    comment: string
    response: string
    department: string
    status: CommentStatus
}

/*export type CommentRecord = {
    id: number;
    packageId: number;
    createdDate: Date;
    updatedDate: Date;
    createdBy: string;
    updatedBy: string;
    commentId: string;
    comment: string;
    response: string;
    department: string;
}*/

export type ReviewPackage = {
    id: string
    createdDate: string
    updatedDate: string
    createdBy: string
    updatedBy: string
    completedBy: string
    projectNumber: string
    municipalNumber: string
    reviewNumber: string
    reviewDate: string
    projectName: string
    comment: string
    status: ReviewPackageStatus
}

export type CommentRecordRow = {
    id?: unknown
    package?: unknown
    created_date?: unknown
    updated_date?: unknown
    created_by?: unknown
    updated_by?: unknown
    comment_id?: unknown
    comment_text?: unknown
    response_text?: unknown
    department?: unknown
    status?: unknown
}

export type ReviewPackageRow = {
    id?: unknown
    created_date?: unknown
    updated_date?: unknown
    created_by?: unknown
    updated_by?: unknown
    completed_by?: unknown
    project_number?: unknown
    municipal_number?: unknown
    review_number?: unknown
    review_date?: unknown
    project_name?: unknown
    comment?: unknown
    status?: unknown
}

function normalizeString(value: unknown): string {
    return String(value ?? '').trim();
}

function normalizeEnum<T extends readonly string[]>(
    value: unknown,
    allowedValues: T,
    fallback: T[number]
): T[number] {
    const normalized = normalizeString(value).toLowerCase();
    const matched = allowedValues.find((candidate) => candidate === normalized);
    return (matched ?? fallback) as T[number];
}

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
        status: normalizeEnum(row.status, COMMENT_STATUSES, 'open'),
    };
}

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
        status: normalizeEnum(row.status, REVIEW_PACKAGE_STATUSES, 'open'),
    };
}

/*export type ReviewPackage = {
    id: number;
    createdDate: Date;
    updatedDate: Date;
    createdBy: string;
    updatedBy: string;
    projectNumber: string;
    municipalNumber: string;
    reviewNumber: string;
    reviewDate: Date;
    projectName: string;
}*/