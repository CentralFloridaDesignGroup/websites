import { type ProjectInvoiceDocument, type ProjectStatus } from 'cfdg/types'
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

export function formatProjectStatus(status: ProjectStatus | undefined): string {
  const normalized = status || 'active'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export function projectStatusClassName(status: ProjectStatus | undefined): string {
  const classes: Record<ProjectStatus, string> = {
    proposal: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    hold: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
    complete: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  }
  return classes[status || 'active']
}

