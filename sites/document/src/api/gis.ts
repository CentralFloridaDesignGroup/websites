import type {
  CreateGisRecordInput,
  GisRecord,
  UpdateGisRecordInput,
  UploadImportSummary,
} from '../components/gis/types'
import { requestJson } from './client'

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord {
  if (value && typeof value === 'object') {
    return value as UnknownRecord
  }
  return {}
}

function asJsonRecord(value: unknown): UnknownRecord {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as UnknownRecord
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return {}
    }

    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as UnknownRecord
      }
    } catch {
      return {}
    }
  }

  return {}
}

function normalizeString(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeNullableNumber(value: unknown): number | null {
  const text = normalizeString(value)
  if (!text) {
    return null
  }
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeAdditionalFields(value: unknown): GisRecord['additionalFields'] {
  const row = asJsonRecord(value)
  const horizontalEstablishmentMethod = normalizeString(row.horizontal_establishment_method)
  const verticalEstablishmentMethod = normalizeString(row.vertical_establishment_method)
  const horizontalAccuracy = normalizeNullableNumber(row.horizontal_accuracy)
  const verticalAccuracy = normalizeNullableNumber(row.vertical_accuracy)

  return {
    horizontal_establishment_method: horizontalEstablishmentMethod,
    vertical_establishment_method: verticalEstablishmentMethod,
    ...(horizontalAccuracy === null ? {} : { horizontal_accuracy: horizontalAccuracy }),
    ...(verticalAccuracy === null ? {} : { vertical_accuracy: verticalAccuracy }),
  }
}

function normalizeGisRecord(value: unknown): GisRecord {
  const row = asRecord(value)
  const additionalFields = normalizeAdditionalFields(
    row.additionalFields ??
      row.additional_info ?? {
        horizontal_establishment_method: row.horizontal_establishment_method,
        vertical_establishment_method: row.vertical_establishment_method,
        horizontal_accuracy: row.horizontal_accuracy,
        vertical_accuracy: row.vertical_accuracy,
      }
  )

  return {
    id: normalizeString(row.id),
    pointNumber: normalizeString(row.pointNumber ?? row.point_number),
    northing: normalizeNumber(row.northing),
    easting: normalizeNumber(row.easting),
    elevation: normalizeNumber(row.elevation),
    material: (normalizeString(row.material) as GisRecord['material']) || '5/8" Iron Rod',
    witness: normalizeString(row.witness),
    project_number: normalizeString(row.project_number),
    notes: normalizeString(row.notes),
    elevation_ngvd29: normalizeNullableNumber(row.elevation_ngvd29),
    conversion_factor: normalizeNullableNumber(row.conversion_factor),
    conversion_sigma: normalizeNullableNumber(row.conversion_sigma),
    latitude: normalizeNumber(row.latitude),
    longitude: normalizeNumber(row.longitude),
    additionalFields,
    sourceDatum: (normalizeString(row.sourceDatum ?? row.source_datum) as GisRecord['sourceDatum']) || 'wgs84',
    createdBy: normalizeString(row.createdBy ?? row.created_by),
    updatedBy: normalizeString(row.updatedBy ?? row.updated_by),
    createdAt: normalizeString(row.createdAt ?? row.created_date),
    updatedAt: normalizeString(row.updatedAt ?? row.updated_date),
  }
}

export async function fetchGisPoints(): Promise<GisRecord[]> {
  const data = await requestJson<{ points?: unknown[] }>('/api/gis/points', {
    method: 'GET',
    authMode: 'key',
    apiKeyPreference: 'gis',
  })

  return (data.points || []).map((item) => normalizeGisRecord(item))
}

export async function upsertGisPoint(payload: CreateGisRecordInput | UpdateGisRecordInput): Promise<GisRecord> {
  const isUpdate = 'id' in payload
  const createdByOverride =
    'createdBy' in payload && payload.createdBy?.trim()
      ? payload.createdBy.trim()
      : undefined

  const body = {
    ...payload,
    ...(isUpdate
      ? createdByOverride
        ? { createdBy: createdByOverride }
        : {}
      : { createdBy: payload.user }),
    updatedBy: payload.user,
  }

  const data = await requestJson<{ point?: unknown }>('/api/gis/points', {
    method: 'POST',
    authMode: 'microsoft',
    body: JSON.stringify(body),
  })

  return normalizeGisRecord(data.point)
}

export async function importGisPoints(points: CreateGisRecordInput[], user: string): Promise<UploadImportSummary> {
  const data = await requestJson<{ summary?: Partial<UploadImportSummary> }>('/api/gis/points/import', {
    method: 'POST',
    authMode: 'microsoft',
    body: JSON.stringify({ points, user }),
  })

  return {
    created: Number(data.summary?.created ?? 0),
    failed: Number(data.summary?.failed ?? 0),
    errors: Array.isArray(data.summary?.errors) ? (data.summary?.errors as string[]) : [],
  }
}

export async function deleteGisPoint(id: string): Promise<void> {
  await requestJson<void>(`/api/gis/points/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    authMode: 'microsoft',
  })
}
