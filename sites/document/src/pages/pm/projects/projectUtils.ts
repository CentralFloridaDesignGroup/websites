import { type ProjectInvoiceDocument } from 'cfdg/scripts'
import { type ProjectSummary } from '../../../api/projectManagement'

export function formatProjectAddress(project: ProjectSummary): string {
  return [project.shipAddrLine1 || project.billAddrLine1, project.shipAddrCity || project.billAddrCity, project.shipAddrState || project.billAddrState, project.shipAddrPostalCode || project.billAddrPostalCode].filter(Boolean).join(', ')
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getDocumentUpdatedLabel(document: ProjectInvoiceDocument): string {
  const date = document.updatedDate || document.createdDate
  if (!date) return ''
  const parsed = new Date(date)
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString()
}

