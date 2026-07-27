import { type Invoice, type InvoiceStatus } from 'cfdg/types'
import { AlertTriangle } from 'lucide-react'

const statusLabels: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  void: 'Void',
}

const statusClasses: Record<InvoiceStatus, string> = {
  draft: 'border-gray-300 bg-gray-100 text-gray-800 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100',
  sent: 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-950 dark:text-blue-200',
  paid: 'border-green-300 bg-green-50 text-green-800 dark:border-green-500 dark:bg-green-950 dark:text-green-200',
  void: 'border-red-300 bg-red-50 text-red-800 dark:border-red-500 dark:bg-red-950 dark:text-red-200',
}

function formatDate(value: string): string {
  if (!value) return ''
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${statusClasses[status]}`}>
      {statusLabels[status]}
    </span>
  )
}

export function EmailDeliveryNotice({ invoice, compact = false }: { invoice: Invoice; compact?: boolean }) {
  const state = invoice.emailDeliveryState
  if (!state || state.status === 'accepted') return null
  const isFailed = state.status === 'failed'
  const className = isFailed
    ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-600 dark:bg-red-950 dark:text-red-200'
    : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-200'
  const eventLabel = state.event || 'delivery issue'
  if (compact) {
    return (
      <span className={`mt-1 inline-flex max-w-full items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold ${className}`} title={state.reason || eventLabel}>
        <AlertTriangle size={12} />
        {eventLabel}
      </span>
    )
  }
  return (
    <div className={`mb-4 rounded-md border p-3 text-sm ${className}`}>
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle size={16} />
        <span>Email delivery issue: {eventLabel}</span>
      </div>
      <p className="mt-1">
        {state.recipient ? `Recipient: ${state.recipient}. ` : ''}
        {state.reason ? `Reason: ${state.reason}. ` : ''}
        {state.updatedDate ? `Updated ${formatDate(state.updatedDate)}.` : ''}
      </p>
    </div>
  )
}

