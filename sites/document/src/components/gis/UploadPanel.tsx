import { useMemo, useState, type ChangeEvent } from 'react'
import Papa from 'papaparse'
import { Button } from 'cfdg/input'
import { Geodesy } from 'cfdg/scripts'
import {
  defaultPointMaterial,
  getDatumFromProjection,
  horizontalEstablishmentMethodOptions,
  pointMaterialOptions,
  statePlaneProjectionOptions,
  verticalEstablishmentMethodOptions,
} from './constants'
import type { CreateGisRecordInput, UploadImportSummary } from './types'
import { KnownStatePlaneProjection } from 'cfdg/types'

type UploadPanelProps = {
  isOpen: boolean
  currentUser: string
  onClose: () => void
  onImport: (rows: CreateGisRecordInput[]) => Promise<UploadImportSummary>
}

type CsvRow = {
  pointNumber?: string
  point_number?: string
  name?: string
  notes?: string
  description?: string
  material?: string
  witness?: string
  project_number?: string
  northing?: string
  easting?: string
  elevation?: string
  elevation_ngvd29?: string
  conversion_factor?: string
  conversion_sigma?: string
  horizontal_establishment_method?: string
  vertical_establishment_method?: string
  horizontal_accuracy?: string
  vertical_accuracy?: string
  latitude?: string
  longitude?: string
}

const templateColumns = [
  'pointNumber',
  'material',
  'witness',
  'project_number',
  'notes',
  'northing',
  'easting',
  'elevation',
  'elevation_ngvd29',
  'conversion_factor',
  'conversion_sigma',
  'horizontal_establishment_method',
  'vertical_establishment_method',
  'horizontal_accuracy',
  'vertical_accuracy',
]

function triggerDownload(blob: Blob, fileName: string) {
  const link = document.createElement('a')
  const objectUrl = URL.createObjectURL(blob)

  link.href = objectUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(objectUrl)
}

function downloadCsvTemplate() {
  const csv = `${templateColumns.join(',')}\n`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, 'gis-upload-template.csv')
}

async function downloadExcelTemplate() {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('GIS Upload Template')
  const validationSheet = workbook.addWorksheet('Validation Lists')

  worksheet.addRow(templateColumns)

  const materialOptions = pointMaterialOptions.map((option) => option.value)
  const horizontalMethodOptions = horizontalEstablishmentMethodOptions.map((option) => option.value)
  const verticalMethodOptions = verticalEstablishmentMethodOptions.map((option) => option.value)

  validationSheet.getColumn(1).values = ['Material', ...materialOptions]
  validationSheet.getColumn(2).values = ['Horizontal Method', ...horizontalMethodOptions]
  validationSheet.getColumn(3).values = ['Vertical Method', ...verticalMethodOptions]
  validationSheet.state = 'veryHidden'

  const templateRows = 500
  const colIndex = Object.fromEntries(
    templateColumns.map((columnName, index) => [columnName, index + 1]),
  ) as Record<(typeof templateColumns)[number], number>

  function applyListValidation(columnName: (typeof templateColumns)[number], formulaRange: string) {
    const column = colIndex[columnName]
    for (let row = 2; row <= templateRows + 1; row += 1) {
      worksheet.getCell(row, column).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [formulaRange],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Invalid value',
        error: `Choose a value from the ${columnName} list.`,
      }
    }
  }

  function applyDecimalValidation(columnName: (typeof templateColumns)[number]) {
    const column = colIndex[columnName]
    for (let row = 2; row <= templateRows + 1; row += 1) {
      worksheet.getCell(row, column).dataValidation = {
        type: 'decimal',
        operator: 'between',
        allowBlank: true,
        formulae: [-999999999, 999999999],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Invalid number',
        error: `${columnName} must be numeric.`,
      }
    }
  }

  applyListValidation('material', `='Validation Lists'!$A$2:$A$${materialOptions.length + 1}`)
  applyListValidation(
    'horizontal_establishment_method',
    `='Validation Lists'!$B$2:$B$${horizontalMethodOptions.length + 1}`,
  )
  applyListValidation(
    'vertical_establishment_method',
    `='Validation Lists'!$C$2:$C$${verticalMethodOptions.length + 1}`,
  )

  applyDecimalValidation('northing')
  applyDecimalValidation('easting')
  applyDecimalValidation('elevation')
  applyDecimalValidation('elevation_ngvd29')
  applyDecimalValidation('conversion_factor')
  applyDecimalValidation('conversion_sigma')
  applyDecimalValidation('horizontal_accuracy')
  applyDecimalValidation('vertical_accuracy')

  worksheet.views = [{ state: 'frozen', ySplit: 1 }]

  const workbookArrayBuffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([workbookArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  triggerDownload(blob, 'gis-upload-template.xlsx')
}

function toOptionalNumber(value: string | undefined): number | null {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) {
    return null
  }

  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function toRequiredNumber(value: string | undefined): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toPointMaterial(value: string | undefined) {
  const normalized = String(value ?? '').trim().toLowerCase()
  const match = pointMaterialOptions.find((option) => option.value.toLowerCase() === normalized)
  return match?.value ?? defaultPointMaterial
}

export function UploadPanel({ isOpen, currentUser, onClose, onImport }: UploadPanelProps) {
  const [statePlaneProjection, setStatePlaneProjection] =
    useState<KnownStatePlaneProjection>('EPSG:2236')
  const [summary, setSummary] = useState<UploadImportSummary | null>(null)
  const [uploading, setUploading] = useState(false)
  const sourceDatum = getDatumFromProjection(statePlaneProjection)

  const helpText = useMemo(() => {
    return 'CSV columns: pointNumber, material, witness, project_number, notes, northing, easting, elevation, elevation_ngvd29, conversion_factor, conversion_sigma. Latitude/longitude are auto-derived from northing/easting.'
  }, [])

  if (!isOpen) {
    return null
  }

  function readCsv(file: File): Promise<CsvRow[]> {
    return new Promise((resolve, reject) => {
      Papa.parse<CsvRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          if (result.errors.length > 0) {
            reject(new Error(result.errors[0]?.message || 'CSV parsing failed'))
            return
          }
          resolve(result.data)
        },
        error: (error) => reject(error),
      })
    })
  }

  async function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      setUploading(true)
      const parsedRows = await readCsv(file)
      const rowsToImport: CreateGisRecordInput[] = parsedRows.map((row, index) => {
        const normalizedNorthing = toRequiredNumber(row.northing)
        const normalizedEasting = toRequiredNumber(row.easting)

        if (!Number.isFinite(normalizedNorthing) || !Number.isFinite(normalizedEasting)) {
          throw new Error(`Row ${index + 1}: northing and easting must be valid numbers.`)
        }

        const converted = Geodesy.convertStatePlaneToWgs84({
          northing: normalizedNorthing,
          easting: normalizedEasting,
          projection: statePlaneProjection,
        })

        return {
          pointNumber: String(row.pointNumber ?? row.point_number ?? row.name ?? '').trim(),
          notes: String(row.notes ?? row.description ?? '').trim(),
          material: toPointMaterial(row.material),
          witness: String(row.witness ?? '').trim(),
          project_number: String(row.project_number ?? '').trim(),
          northing: normalizedNorthing,
          easting: normalizedEasting,
          elevation: toRequiredNumber(row.elevation),
          elevation_ngvd29: toOptionalNumber(row.elevation_ngvd29),
          conversion_factor: toOptionalNumber(row.conversion_factor),
          conversion_sigma: toOptionalNumber(row.conversion_sigma),
          additionalFields: {
            horizontal_establishment_method: String(row.horizontal_establishment_method ?? '').trim() || '',
            vertical_establishment_method: String(row.vertical_establishment_method ?? '').trim() || '',
            horizontal_accuracy: toOptionalNumber(row.horizontal_accuracy) ?? undefined,
            vertical_accuracy: toOptionalNumber(row.vertical_accuracy) ?? undefined,
          },
          latitude: converted.latitude,
          longitude: converted.longitude,
          sourceDatum,
          user: currentUser,
        }
      })

      const result = await onImport(rowsToImport)
      setSummary(result)
    } catch (error) {
      setSummary({
        created: 0,
        failed: 1,
        errors: [String(error)],
      })
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  return (
    <aside className="absolute left-1/2 top-1/2 z-[600] max-h-[calc(100vh-7rem)] w-[calc(100%-1rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md border border-slate-300 bg-white p-4 shadow-lg sm:max-h-[calc(100vh-6rem)] dark:bg-slate-800 dark:border-slate-700">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Upload Points</h3>
        <Button colorMode="auto"
          label="Close"
          style="primary"
          size="small"
          onClick={onClose}
          properties={{ disabled: uploading }}
        />
      </div>

      <div className="space-y-3">
        <p className="text-xs text-slate-600 dark:text-slate-400">{helpText}</p>

        <div className="rounded border border-slate-200 bg-slate-50 p-3 dark:bg-slate-700/75 flex flex-row items-center justify-between gap-4">
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">Download template</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadCsvTemplate}
              className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-gray-600 dark:bg-gray-700/75 dark:text-white dark:hover:bg-gray-600"
            >
              CSV
            </button>
            <button
              type="button"
              onClick={downloadExcelTemplate}
              className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-gray-600 dark:bg-gray-700/75 dark:text-white dark:hover:bg-gray-600"
            >
              Excel (.xlsx)
            </button>
          </div>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">State Plane Projection</span>
          <select
            value={statePlaneProjection}
            onChange={(event) =>
              setStatePlaneProjection(event.target.value as KnownStatePlaneProjection)
            }
            className="w-full rounded border border-slate-300 px-2 py-1 dark:bg-slate-700/75 dark:text-white"
          >
            {statePlaneProjectionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">CSV file</span>
          <input
            type="file"
            accept=".csv"
            onChange={onFileSelected}
            className="w-full rounded border border-slate-300 p-2 text-sm dark:bg-slate-700/75 dark:text-white"
            disabled={uploading}
          />
        </label>

        {summary ? (
          <div className="rounded border border-slate-200 bg-slate-50 p-2 text-sm dark:bg-slate-700/75 dark:text-white">
            <div>Created: {summary.created}</div>
            <div>Failed: {summary.failed}</div>
            {summary.errors.length > 0 ? (
              <ul className="mt-2 max-h-28 list-disc overflow-auto pl-5 text-xs text-red-700 dark:text-red-400">
                {summary.errors.map((error, index) => (
                  <li key={`${error}-${index}`}>{error}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  )
}
