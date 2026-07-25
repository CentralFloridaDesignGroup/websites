import { Textbox } from '@wps/input'
import { type QboCustomer } from '@wps/scripts'
import { formatClientAddress } from './clientForms'

type ClientListProps = {
  clients: QboCustomer[]
  loading: boolean
  searchTerm: string
  selectedClientId: string
  onSearchTermChange: (value: string) => void
  onSelectClient: (clientId: string) => void
}

export function ClientList({ clients, loading, searchTerm, selectedClientId, onSearchTermChange, onSelectClient }: ClientListProps) {
  return (
    <section className="rounded-md border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <Textbox field="client-search" label="Search Clients" colorMode="auto" value={searchTerm} onChange={(event) => onSearchTermChange(event.target.value)} placeholder="Client, email, company" />
      <div className="mt-3 max-h-[calc(100vh-15rem)] overflow-y-auto">
        {clients.map((client) => (
          <button
            key={client.id}
            type="button"
            onClick={() => onSelectClient(client.id)}
            className={`mb-2 w-full rounded-md border p-3 text-left text-sm ${selectedClientId === client.id ? 'border-primary bg-blue-50 dark:bg-blue-950' : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700'}`}
          >
            <p className="font-semibold">{client.displayName}</p>
            <p className="text-gray-600 dark:text-gray-400">{client.primaryEmail || formatClientAddress(client) || 'No QBO contact details'}</p>
          </button>
        ))}
        {!loading && clients.length === 0 && <p className="py-6 text-center text-sm text-gray-500">No clients found. Sync QBO customers from invoices settings.</p>}
      </div>
    </section>
  )
}

