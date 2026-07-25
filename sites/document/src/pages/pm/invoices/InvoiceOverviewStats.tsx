type InvoiceOverviewStatsProps = {
  openInvoiceCount: number
  openInvoiceAmountCents: number
  pastDueCount: number
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function InvoiceOverviewStats({ openInvoiceCount, openInvoiceAmountCents, pastDueCount }: InvoiceOverviewStatsProps) {
  return (
    <div className="mb-4 grid gap-3 md:grid-cols-3">
      <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Open invoices</p>
        <p className="mt-2 text-3xl font-bold">{openInvoiceCount}</p>
      </div>
      <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Current open amount</p>
        <p className="mt-2 text-3xl font-bold">{formatCurrency(openInvoiceAmountCents)}</p>
      </div>
      <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Past due</p>
        <p className="mt-2 text-3xl font-bold">{pastDueCount}</p>
      </div>
    </div>
  )
}

