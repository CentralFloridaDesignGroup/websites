import { Hono } from 'hono'
import { JSON_HEADERS } from 'cfdg/types/v1/constants'
import { badRequest, requireAuthMode, serverError, type HonoEnv } from './apiTypes'
import { normalizeNumber, normalizeString } from 'cfdg/scripts'
const GIS_DATUMS = ['wgs84', 'nad83-2011-fl-east', 'nad83-2011-fl-north', 'nad83-2011-fl-west'] as const
const POINT_MATERIALS = [
  '5/8" Iron Rod',
  '5/8" Iron Rod & Cap',
  'Mag Nail',
  'Mag Nail & Disk',
  'D Nail',
  'Nail in Power Pole',
  'Concrete Monument',
  'X Chisel',
  'Triangle Chisel',
  'Other',
] as const

type GisDatum = (typeof GIS_DATUMS)[number]
type PointMaterial = (typeof POINT_MATERIALS)[number]
type AdditionalInfo = {
  horizontal_establishment_method?: string
  vertical_establishment_method?: string
  horizontal_accuracy?: number
  vertical_accuracy?: number
}

const GIS_POINT_SELECT_COLUMNS = `id, created_date, updated_date, created_by, updated_by,
  point_number, northing, easting, elevation, material,
  witness, project_number, notes,
  elevation_ngvd29, conversion_factor, conversion_sigma, additional_info,
  latitude, longitude, source_datum`
const GIS_POINT_SELECT_BASE_QUERY = `SELECT ${GIS_POINT_SELECT_COLUMNS} FROM gis_points`

export interface GisPointsApiEnv {
  DB: D1Database
}

type GisPointRow = {
  id: string | number
  created_date: string | null
  updated_date: string | null
  created_by: string | null
  updated_by: string | null
  point_number: string | null
  northing: number | null
  easting: number | null
  elevation: number | null
  material: string | null
  witness: string | null
  project_number: string | null
  notes: string | null
  elevation_ngvd29: number | null
  conversion_factor: number | null
  conversion_sigma: number | null
  additional_info: string | null
  latitude: number | null
  longitude: number | null
  source_datum: string | null
}


function normalizeNullableNumber(value: unknown): number | null {
  const text = normalizeString(value)
  if (!text) {
    return null
  }
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeJsonRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return {}
    }

    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return {}
    }
  }

  return {}
}

function normalizeAdditionalInfo(value: unknown): AdditionalInfo {
  const record = normalizeJsonRecord(value)
  const horizontalEstablishmentMethod = normalizeString(record.horizontal_establishment_method)
  const verticalEstablishmentMethod = normalizeString(record.vertical_establishment_method)
  const horizontalAccuracy = normalizeNullableNumber(record.horizontal_accuracy)
  const verticalAccuracy = normalizeNullableNumber(record.vertical_accuracy)

  return {
    horizontal_establishment_method: horizontalEstablishmentMethod,
    vertical_establishment_method: verticalEstablishmentMethod,
    ...(horizontalAccuracy === null ? {} : { horizontal_accuracy: horizontalAccuracy }),
    ...(verticalAccuracy === null ? {} : { vertical_accuracy: verticalAccuracy }),
  }
}

function normalizeDatum(value: unknown): GisDatum {
  const normalized = normalizeString(value).toLowerCase()
  const match = GIS_DATUMS.find((datum) => datum === normalized)
  return match ?? 'wgs84'
}

function normalizeMaterial(value: unknown): PointMaterial {
  const normalized = normalizeString(value).toLowerCase()
  const match = POINT_MATERIALS.find((material) => material.toLowerCase() === normalized)
  return match ?? '5/8" Iron Rod'
}

async function parseJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get('Content-Type') || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error('Content-Type must be application/json')
  }
  return request.json()
}

function normalizeRequiredNumber(value: unknown, fieldName: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a valid number.`)
  }
  return parsed
}

function isValidLatitude(value: number): boolean {
  return value >= -90 && value <= 90
}

function isValidLongitude(value: number): boolean {
  return value >= -180 && value <= 180
}

function mapGisPointRow(row: GisPointRow) {
  const additionalInfo = normalizeAdditionalInfo(row.additional_info)

  return {
    id: normalizeString(row.id),
    pointNumber: normalizeString(row.point_number),
    northing: normalizeNumber(row.northing),
    easting: normalizeNumber(row.easting),
    elevation: normalizeNumber(row.elevation),
    material: normalizeMaterial(row.material),
    witness: normalizeString(row.witness),
    project_number: normalizeString(row.project_number),
    notes: normalizeString(row.notes),
    elevation_ngvd29: normalizeNullableNumber(row.elevation_ngvd29),
    conversion_factor: normalizeNullableNumber(row.conversion_factor),
    conversion_sigma: normalizeNullableNumber(row.conversion_sigma),
    additional_info: additionalInfo,
    additionalFields: additionalInfo,
    latitude: normalizeNumber(row.latitude),
    longitude: normalizeNumber(row.longitude),
    sourceDatum: normalizeDatum(row.source_datum),
    createdBy: normalizeString(row.created_by),
    updatedBy: normalizeString(row.updated_by),
    createdAt: normalizeString(row.created_date),
    updatedAt: normalizeString(row.updated_date),
  }
}

export function createGisPointsApi() {
  const app = new Hono<HonoEnv>()
  app.get('/api/gis/points', async (context) => {
    try {
      const env = context.env
      const authError = requireAuthMode(context, 'key')
      if (authError) return authError

      const rows = await env.DB.prepare(
        `${GIS_POINT_SELECT_BASE_QUERY}
         ORDER BY created_date DESC`
      ).all()

      return new Response(JSON.stringify({ points: (rows.results || []).map((row) => mapGisPointRow(row as GisPointRow)) }), {
        headers: JSON_HEADERS,
      })
    } catch (error: any) {
      console.error('Error listing gis points:', error)
      return serverError(String(error?.message || error))
    }
  })

  app.get('/api/gis/points/:id', async (context) => {
    try {
      const env = context.env
      const authError = requireAuthMode(context, 'key')
      if (authError) return authError


      const id = normalizeString(context.req.param('id'))
      if (!id) return badRequest('id is required')

      const row = await env.DB.prepare(
        `${GIS_POINT_SELECT_BASE_QUERY}
         WHERE id = ?`
      ).bind(id).first()

      if (!row) {
        return new Response(JSON.stringify({ error: 'Point not found' }), {
          status: 404,
          headers: JSON_HEADERS,
        })
      }

      return new Response(JSON.stringify({ point: mapGisPointRow(row as GisPointRow) }), {
        headers: JSON_HEADERS,
      })
    } catch (error: any) {
      console.error('Error fetching gis point:', error)
      return serverError(String(error?.message || error))
    }
  })

  app.post('/api/gis/points', async (context) => {
    try {
      const env = context.env
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError

      const body = (await parseJsonBody(context.req.raw)) as Record<string, unknown>

      const id = normalizeString(body.id) || null
      const pointNumber = normalizeString(body.pointNumber)
      const material = normalizeMaterial(body.material)
      const witness = normalizeString(body.witness)
      const projectNumber = normalizeString(body.project_number)
      const notes = normalizeString(body.notes)
      const northing = normalizeRequiredNumber(body.northing, 'northing')
      const easting = normalizeRequiredNumber(body.easting, 'easting')
      const elevation = normalizeRequiredNumber(body.elevation, 'elevation')
      const elevationNgvd29 = normalizeNullableNumber(body.elevation_ngvd29)
      const conversionFactor = normalizeNullableNumber(body.conversion_factor)
      const conversionSigma = normalizeNullableNumber(body.conversion_sigma)
      const latitude = normalizeRequiredNumber(body.latitude, 'latitude')
      const longitude = normalizeRequiredNumber(body.longitude, 'longitude')
      const sourceDatum = normalizeDatum(body.sourceDatum)
      const additionalInfo = normalizeAdditionalInfo(body.additional_info ?? body.additionalInfo ?? body.additionalFields)
      const createdByOverride = normalizeString(body.createdBy)
      const createdBy = normalizeString(body.createdBy || body.user)
      const updatedBy = normalizeString(body.updatedBy || body.user)

      if (!pointNumber) return badRequest('pointNumber is required')
      if (!createdBy && !id) return badRequest('createdBy or user is required when creating a point')
      if (!isValidLatitude(latitude)) return badRequest('latitude must be between -90 and 90')
      if (!isValidLongitude(longitude)) return badRequest('longitude must be between -180 and 180')

      const now = new Date().toISOString()

      if (id) {
        const existing = await env.DB.prepare(`SELECT id FROM gis_points WHERE id = ?`).bind(id).first()
        if (!existing) {
          return new Response(JSON.stringify({ error: 'Point not found' }), {
            status: 404,
            headers: JSON_HEADERS,
          })
        }

        await env.DB.prepare(
          `UPDATE gis_points
           SET created_by = COALESCE(NULLIF(?, ''), created_by),
               updated_date = ?, updated_by = ?,
               point_number = ?, northing = ?, easting = ?, elevation = ?,
               material = ?, witness = ?, project_number = ?, notes = ?,
               elevation_ngvd29 = ?, conversion_factor = ?, conversion_sigma = ?,
               additional_info = ?, latitude = ?, longitude = ?, source_datum = ?
           WHERE id = ?`
        ).bind(
          createdByOverride,
          now,
          updatedBy,
          pointNumber,
          northing,
          easting,
          elevation,
          material,
          witness,
          projectNumber,
          notes,
          elevationNgvd29,
          conversionFactor,
          conversionSigma,
          JSON.stringify(additionalInfo),
          latitude,
          longitude,
          sourceDatum,
          id
        ).run()

        const row = await env.DB.prepare(
          `${GIS_POINT_SELECT_BASE_QUERY}
           WHERE id = ?`
        ).bind(id).first()

        return new Response(JSON.stringify({ point: mapGisPointRow(row as GisPointRow) }), {
          headers: JSON_HEADERS,
        })
      }

      const result = await env.DB.prepare(
        `INSERT INTO gis_points
           (created_date, updated_date, created_by, updated_by,
            point_number, northing, easting, elevation,
            material, witness, project_number, notes,
            elevation_ngvd29, conversion_factor, conversion_sigma,
          additional_info, latitude, longitude, source_datum)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        now,
        now,
        createdBy,
        updatedBy || createdBy,
        pointNumber,
        northing,
        easting,
        elevation,
        material,
        witness,
        projectNumber,
        notes,
        elevationNgvd29,
        conversionFactor,
        conversionSigma,
        JSON.stringify(additionalInfo),
        latitude,
        longitude,
        sourceDatum
      ).run()

      const newId = result.meta?.last_row_id
      const row = await env.DB.prepare(
        `${GIS_POINT_SELECT_BASE_QUERY}
         WHERE id = ?`
      ).bind(newId).first()

      return new Response(JSON.stringify({ point: mapGisPointRow(row as GisPointRow) }), {
        status: 201,
        headers: JSON_HEADERS,
      })
    } catch (error: any) {
      console.error('Error saving gis point:', error)
      return serverError(String(error?.message || error))
    }
  })

  app.post('/api/gis/points/import', async (context) => {
    try {
      const env = context.env
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError

      const body = (await parseJsonBody(context.req.raw)) as Record<string, unknown>
      const points = Array.isArray(body.points) ? body.points : []
      const user = normalizeString(body.user)

      let created = 0
      const errors: string[] = []

      for (let index = 0; index < points.length; index += 1) {
        const item = points[index]
        const pointNumber = normalizeString(item.pointNumber)

        if (!pointNumber) {
          errors.push(`Row ${index + 1}: pointNumber is required.`)
          continue
        }

        try {
          const northing = normalizeRequiredNumber(item.northing, `Row ${index + 1} northing`)
          const easting = normalizeRequiredNumber(item.easting, `Row ${index + 1} easting`)
          const elevation = normalizeRequiredNumber(item.elevation, `Row ${index + 1} elevation`)
          const latitude = normalizeRequiredNumber(item.latitude, `Row ${index + 1} latitude`)
          const longitude = normalizeRequiredNumber(item.longitude, `Row ${index + 1} longitude`)

          if (!isValidLatitude(latitude)) {
            throw new Error('latitude must be between -90 and 90')
          }
          if (!isValidLongitude(longitude)) {
            throw new Error('longitude must be between -180 and 180')
          }

          const now = new Date().toISOString()
          const actor = user || normalizeString(item.user) || 'unknown-user'
          const additionalInfo = normalizeAdditionalInfo(item.additional_info ?? item.additionalInfo ?? item.additionalFields)
          await env.DB.prepare(
            `INSERT INTO gis_points
               (created_date, updated_date, created_by, updated_by,
                point_number, northing, easting, elevation,
                material, witness, project_number, notes,
                elevation_ngvd29, conversion_factor, conversion_sigma,
               additional_info, latitude, longitude, source_datum)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            now,
            now,
            actor,
            actor,
            pointNumber,
            northing,
            easting,
            elevation,
            normalizeMaterial(item.material),
            normalizeString(item.witness),
            normalizeString(item.project_number),
            normalizeString(item.notes),
            normalizeNullableNumber(item.elevation_ngvd29),
            normalizeNullableNumber(item.conversion_factor),
            normalizeNullableNumber(item.conversion_sigma),
            JSON.stringify(additionalInfo),
            latitude,
            longitude,
            normalizeDatum(item.sourceDatum)
          ).run()

          created += 1
        } catch (error) {
          errors.push(`Row ${index + 1}: ${String(error)}`)
        }
      }

      return new Response(JSON.stringify({
        summary: {
          created,
          failed: errors.length,
          errors,
        },
      }), {
        headers: JSON_HEADERS,
      })
    } catch (error: any) {
      console.error('Error importing gis points:', error)
      return serverError(String(error?.message || error))
    }
  })

  app.delete('/api/gis/points/:id', async (context) => {
    try {
      const env = context.env
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError

      const id = normalizeString(context.req.param('id'))
      if (!id) return badRequest('id is required')

      const result = await env.DB.prepare(`DELETE FROM gis_points WHERE id = ?`).bind(id).run()
      if (!result.success || (result.meta?.changes ?? 0) === 0) {
        return new Response(JSON.stringify({ error: 'Point not found' }), {
          status: 404,
          headers: JSON_HEADERS,
        })
      }

      return new Response(null, { status: 204, headers: JSON_HEADERS })
    } catch (error: any) {
      console.error('Error deleting gis point:', error)
      return serverError(String(error?.message || error))
    }
  })

  return app
}
