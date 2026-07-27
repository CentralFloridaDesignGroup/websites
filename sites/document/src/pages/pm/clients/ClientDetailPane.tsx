import { Button } from 'cfdg/input'
import type { ClientContact, Invoice, QboCustomer } from 'cfdg/types'
import { FileText, FolderOpen, Plus, Save, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { type ProjectSummary } from '../../../api/projectManagement'
import { contactToForm } from './clientForms'
import { type ContactForm } from './types'

type ClientDetailPaneProps = {
  selectedClient: QboCustomer | null
  contacts: ClientContact[]
  relatedProjects: ProjectSummary[]
  relatedInvoices: Invoice[]
  relatedLoading: boolean
  saving: boolean
  clientSaving: boolean
  onEditClient: () => void
  onShowNewContact: () => void
  onEditContact: (contact: ContactForm) => void
  onRemoveContact: (contact: ClientContact) => void
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function formatDate(value: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

export function ClientDetailPane({
  selectedClient,
  contacts,
  relatedProjects,
  relatedInvoices,
  relatedLoading,
  saving,
  clientSaving,
  onEditClient,
  onShowNewContact,
  onEditContact,
  onRemoveContact,
}: ClientDetailPaneProps) {
  return (
    <section className="rounded-md border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {selectedClient ? (
        <div className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">{selectedClient.displayName}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{selectedClient.fullyQualifiedName || selectedClient.companyName}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button label="Edit Client" size="small" style="secondary" icon={Save} onClick={onEditClient} properties={{ disabled: clientSaving }} />
              <Button label="New Contact" size="small" style="primary" icon={Plus} onClick={onShowNewContact} properties={{ disabled: saving }} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left dark:border-gray-700">
                  <th className="py-2 pr-2">Name</th>
                  <th className="px-2">Email</th>
                  <th className="px-2">Role</th>
                  <th className="px-2">Invoice</th>
                  <th className="px-2">Status</th>
                  <th className="py-2 pl-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 pr-2 font-semibold">{contact.name}</td>
                    <td className="px-2">{contact.email}</td>
                    <td className="px-2">{contact.role || '-'}</td>
                    <td className="px-2">{contact.isInvoiceRecipient ? 'Yes' : 'No'}</td>
                    <td className="px-2">{contact.active ? 'Active' : 'Inactive'}</td>
                    <td className="py-2 pl-2">
                      <div className="flex justify-end gap-1">
                        <Button label="Edit" size="small" style="secondary" icon={Save} onClick={() => onEditContact(contactToForm(contact))} />
                        <Button label="Deactivate" size="small" style="danger" icon={Trash2} onClick={() => onRemoveContact(contact)} properties={{ disabled: saving || !contact.active }} />
                      </div>
                    </td>
                  </tr>
                ))}
                {contacts.length === 0 && (
                  <tr>
                    <td className="py-6 text-center text-gray-500" colSpan={6}>No contacts for this client yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-2 flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                <h3 className="font-semibold">Projects</h3>
              </div>
              {relatedLoading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading projects...</p>}
              {!relatedLoading && relatedProjects.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No projects assigned to this client.</p>}
              <div className="space-y-2">
                {relatedProjects.map((project) => (
                  <Link key={project.id} to={`/projects?projectId=${encodeURIComponent(project.id)}`} className="block rounded-md border border-gray-200 bg-white p-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700">
                    <p className="font-semibold">{project.displayName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{project.fullyQualifiedName || project.id}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <h3 className="font-semibold">Invoices</h3>
              </div>
              {relatedLoading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading invoices...</p>}
              {!relatedLoading && relatedInvoices.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No invoices assigned to this client.</p>}
              <div className="space-y-2">
                {relatedInvoices.map((invoice) => (
                  <Link key={invoice.id} to={`/invoices?invoiceId=${encodeURIComponent(invoice.id)}`} className="block rounded-md border border-gray-200 bg-white p-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{invoice.invoiceNumber}</p>
                      <p className="font-semibold">{formatCurrency(invoice.totalCents)}</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{invoice.projectReference || 'No project'} - {invoice.status} - {formatDate(invoice.issueDate)}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="py-12 text-center text-gray-500">Select a client to manage contacts.</p>
      )}
    </section>
  )
}
