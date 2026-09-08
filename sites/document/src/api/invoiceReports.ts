import { requestJson } from './client'

export type InvoiceAgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '91-120' | '121+'
export type ClientInvoiceReportLine = { invoiceId: string; invoiceNumber: string; clientId: string; clientName: string; projectReference: string; issueDate: string; dueDate: string; amountDueCents: number; daysPastDue: number; agingBucket: InvoiceAgingBucket; paymentUrl: string }
export type ClientInvoiceReport = { generatedDate: string; clientId: string; clientName: string; openInvoiceCount: number; openBalanceCents: number; pastDueCount: number; pastDueBalanceCents: number; aging: Record<InvoiceAgingBucket, number>; invoices: ClientInvoiceReportLine[] }

function string(value: unknown): string { return String(value ?? '').trim() }
function number(value: unknown): number { const parsed = Number(value ?? 0); return Number.isFinite(parsed) ? parsed : 0 }
function normalizeLine(value: unknown): ClientInvoiceReportLine { const row = value as Record<string, unknown>; return { invoiceId: string(row.invoiceId), invoiceNumber: string(row.invoiceNumber), clientId: string(row.clientId), clientName: string(row.clientName), projectReference: string(row.projectReference), issueDate: string(row.issueDate), dueDate: string(row.dueDate), amountDueCents: number(row.amountDueCents), daysPastDue: number(row.daysPastDue), agingBucket: string(row.agingBucket) as InvoiceAgingBucket, paymentUrl: string(row.paymentUrl) } }
function normalizeReport(value: unknown): ClientInvoiceReport { const row = value as Record<string, unknown>; const agingRow = (row.aging || {}) as Record<string, unknown>; const aging = Object.fromEntries(['current', '1-30', '31-60', '61-90', '91-120', '121+'].map((key) => [key, number(agingRow[key])])) as ClientInvoiceReport['aging']; return { generatedDate: string(row.generatedDate), clientId: string(row.clientId), clientName: string(row.clientName), openInvoiceCount: number(row.openInvoiceCount), openBalanceCents: number(row.openBalanceCents), pastDueCount: number(row.pastDueCount), pastDueBalanceCents: number(row.pastDueBalanceCents), aging, invoices: Array.isArray(row.invoices) ? row.invoices.map(normalizeLine) : [] } }

export async function fetchClientInvoiceReport(qboCustomerId: string): Promise<ClientInvoiceReport> {
  const data = await requestJson<{ report?: unknown }>(`/api/invoice-reports/client?qboCustomerId=${encodeURIComponent(qboCustomerId)}`, { method: 'GET', authMode: 'microsoft' })
  return normalizeReport(data.report || {})
}
