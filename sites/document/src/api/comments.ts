import {
  COMMENT_STATUSES,
  REVIEW_PACKAGE_STATUSES,
  type CommentRecord,
  type CommentStatus,
  type ReviewPackage,
  type ReviewPackageStatus,
} from '@wps/scripts'
import { requestJson } from './client'

export interface CommentQueryResponse {
  package: ReviewPackage
  comments: CommentRecord[]
}

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord {
  if (value && typeof value === 'object') {
    return value as UnknownRecord
  }
  return {}
}

function normalizeString(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeStatus<T extends readonly string[]>(
  value: unknown,
  allowedValues: T,
  fallback: T[number]
): T[number] {
  const normalized = normalizeString(value).toLowerCase()
  const match = allowedValues.find((candidate) => candidate === normalized)
  return (match ?? fallback) as T[number]
}

function normalizeReviewPackage(value: unknown): ReviewPackage {
  const row = asRecord(value)
  return {
    id: normalizeString(row.id),
    createdDate: normalizeString(row.createdDate ?? row.created_date),
    updatedDate: normalizeString(row.updatedDate ?? row.updated_date),
    createdBy: normalizeString(row.createdBy ?? row.created_by),
    updatedBy: normalizeString(row.updatedBy ?? row.updated_by),
    completedBy: normalizeString(row.completedBy ?? row.completed_by),
    projectNumber: normalizeString(row.projectNumber ?? row.project_number),
    municipalNumber: normalizeString(row.municipalNumber ?? row.municipal_number),
    reviewNumber: normalizeString(row.reviewNumber ?? row.review_number),
    reviewDate: normalizeString(row.reviewDate ?? row.review_date),
    projectName: normalizeString(row.projectName ?? row.project_name),
    comment: normalizeString(row.comment),
    status: normalizeStatus(row.status, REVIEW_PACKAGE_STATUSES, 'open'),
  }
}

function normalizeCommentRecord(value: unknown): CommentRecord {
  const row = asRecord(value)
  return {
    id: normalizeString(row.id),
    packageId: normalizeString(row.packageId ?? row.package),
    createdDate: normalizeString(row.createdDate ?? row.created_date),
    updatedDate: normalizeString(row.updatedDate ?? row.updated_date),
    createdBy: normalizeString(row.createdBy ?? row.created_by),
    updatedBy: normalizeString(row.updatedBy ?? row.updated_by),
    commentId: normalizeString(row.commentId ?? row.comment_id),
    comment: normalizeString(row.comment ?? row.comment_text),
    response: normalizeString(row.response ?? row.response_text),
    department: normalizeString(row.department),
    status: normalizeStatus(row.status, COMMENT_STATUSES, 'open'),
  }
}

export async function fetchReviewPackages(): Promise<ReviewPackage[]> {
  const data = await requestJson<{ packages?: unknown[] }>('/api/reviews', {
    method: 'GET',
    authMode: 'microsoft',
  })

  return (data.packages || []).map((item) => normalizeReviewPackage(item))
}

export async function fetchComments(packageId: string): Promise<CommentQueryResponse> {
  const encodedPackageId = encodeURIComponent(packageId)
  const data = await requestJson<{ package?: unknown; comments?: unknown[] }>(`/api/reviews/${encodedPackageId}/comments`, {
    method: 'GET',
    authMode: 'microsoft',
  })

  return {
    package: normalizeReviewPackage(data.package),
    comments: (data.comments || []).map((item) => normalizeCommentRecord(item)),
  }
}

export async function createReviewPackage(payload: {
  id?: string
  projectNumber: string
  municipalNumber: string
  reviewNumber: string
  reviewDate: string
  projectName: string
  comment: string
  completedBy: string
  createdBy: string
  updatedBy: string
  status?: ReviewPackageStatus
}): Promise<ReviewPackage> {
  const data = await requestJson<{ package?: unknown }>('/api/reviews', {
    method: 'POST',
    authMode: 'microsoft',
    body: JSON.stringify(payload),
  })

  return normalizeReviewPackage(data.package)
}

export async function createComment(payload: {
  packageId: string
  commentId: string
  department: string
  comment: string
  response: string
  createdBy: string
  updatedBy: string
  status?: CommentStatus
}): Promise<CommentRecord> {
  const data = await requestJson<{ comment?: unknown }>('/api/comments', {
    method: 'POST',
    authMode: 'microsoft',
    body: JSON.stringify(payload),
  })

  return normalizeCommentRecord(data.comment)
}

export async function updateComment(
  id: string,
  payload: {
    packageId: string
    commentId: string
    department: string
    comment: string
    response: string
    updatedBy: string
    status?: CommentStatus
  }
): Promise<CommentRecord> {
  const data = await requestJson<{ comment?: unknown }>('/api/comments', {
    method: 'POST',
    authMode: 'microsoft',
    body: JSON.stringify({ id, ...payload }),
  })

  return normalizeCommentRecord(data.comment)
}

export async function deleteComment(id: string): Promise<void> {
  const encodedId = encodeURIComponent(id)
  await requestJson<void>(`/api/comments/${encodedId}`, {
    method: 'DELETE',
    authMode: 'microsoft',
  })
}

export async function deleteReviewPackage(id: string): Promise<void> {
  const encodedId = encodeURIComponent(id)
  await requestJson<void>(`/api/reviews/${encodedId}`, {
    method: 'DELETE',
    authMode: 'microsoft',
  })
}
