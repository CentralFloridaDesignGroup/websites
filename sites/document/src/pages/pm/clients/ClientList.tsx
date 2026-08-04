import { Combobox, Textbox } from 'cfdg/input'
import { type QboCustomer } from 'cfdg/types'
import { formatClientAddress } from './clientForms'

type ClientListProps = {
  clients: QboCustomer[]
  loading: boolean
  searchTerm: string
  statusFilter: 'active' | 'inactive' | 'all'
  selectedClientId: string
  onSearchTermChange: (value: string) => void
  onStatusFilterChange: (value: 'active' | 'inactive' | 'all') => void
  onSelectClient: (clientId: string) => void
}

export function ClientList({ clients, loading, searchTerm, statusFilter, selectedClientId, onSearchTermChange, onStatusFilterChange, onSelectClient }: ClientListProps) {
  return (
    <section className="rounded-md border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex flex-grow flex-col md:flex-row md:justify-center items-end gap-3">
        <div className="grow-1 w-full">
          <Textbox field="client-search" label="Search Clients" colorMode="auto" value={searchTerm} onChange={(event) => onSearchTermChange(event.target.value)} placeholder="Client, email, company" />
        </div>
        <div className="grow-1 w-full">
          <div className="mt-2">
            <Combobox
              field="client-status-filter"
              label="Status"
              colorMode="auto"
              value={statusFilter}
              selections={[{ key: 'Active', value: 'active' }, { key: 'Inactive', value: 'inactive' }, { key: 'All Statuses', value: 'all' }]}
              onChange={(_, value) => onStatusFilterChange(value as 'active' | 'inactive' | 'all')}
            />
          </div>
        </div>
      </div>
      <div className="mt-3 max-h-[calc(100vh-15rem)] overflow-y-auto">
        {clients.map((client) => (
          <button
            key={client.id}
            type="button"
            onClick={() => onSelectClient(client.id)}
            className={`mb-2 w-full rounded-md border p-3 text-left text-sm ${selectedClientId === client.id ? 'border-primary bg-blue-50 dark:bg-blue-950' : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700'}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{client.displayName}</p>
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${client.active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'}`}>{client.active ? 'Active' : 'Inactive'}</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400">{client.primaryEmail || formatClientAddress(client) || 'No QBO contact details'}</p>
          </button>
        ))}
        {!loading && clients.length === 0 && <p className="py-6 text-center text-sm text-gray-500">No clients found. Sync QBO customers from invoices settings.</p>}
      </div>
    </section>
  )
}

