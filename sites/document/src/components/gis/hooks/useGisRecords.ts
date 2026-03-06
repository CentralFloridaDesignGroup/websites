import { useEffect, useMemo, useState } from 'react'
import { deleteGisPoint, fetchGisPoints, importGisPoints, upsertGisPoint } from '../api'
import type {
  CreateGisRecordInput,
  GisRecord,
  UpdateGisRecordInput,
  UploadImportSummary,
} from '../types'

export function useGisRecords(currentUser: string) {
  const [records, setRecords] = useState<GisRecord[]>([])
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const points = await fetchGisPoints()
        if (!mounted) return
        setRecords(points)
      } catch (loadError) {
        if (!mounted) return
        setError(String(loadError))
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [])

  const selectedRecord = useMemo(() => {
    if (!selectedRecordId) {
      return null
    }
    return records.find((record) => record.id === selectedRecordId) ?? null
  }, [records, selectedRecordId])

  function selectRecord(id: string | null) {
    setSelectedRecordId(id)
  }

  async function createRecord(input: CreateGisRecordInput): Promise<GisRecord> {
    setError(null)
    const createdPoint = await upsertGisPoint({
      ...input,
      user: input.user || currentUser,
    })

    setRecords((previous) => [createdPoint, ...previous])
    setSelectedRecordId(createdPoint.id)
    return createdPoint
  }

  async function updateRecord(input: UpdateGisRecordInput): Promise<GisRecord> {
    setError(null)
    const updatedPoint = await upsertGisPoint({
      ...input,
      user: input.user || currentUser,
    })

    setRecords((previous) => previous.map((record) => (record.id === updatedPoint.id ? updatedPoint : record)))
    return updatedPoint
  }

  async function importRecords(recordsToCreate: CreateGisRecordInput[]): Promise<UploadImportSummary> {
    setError(null)
    const summary = await importGisPoints(recordsToCreate, currentUser)

    if (summary.created > 0) {
      const freshPoints = await fetchGisPoints()
      setRecords(freshPoints)
    }

    return summary
  }

  async function deleteRecord(id: string): Promise<void> {
    setError(null)
    await deleteGisPoint(id)
    setRecords((previous) => previous.filter((record) => record.id !== id))
    setSelectedRecordId((previous) => (previous === id ? null : previous))
  }

  return {
    records,
    loading,
    error,
    selectedRecord,
    selectedRecordId,
    selectRecord,
    createRecord,
    updateRecord,
    importRecords,
    deleteRecord,
  }
}
