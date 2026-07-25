import { Button, Combobox, Textbox } from 'cfdg/input'
import { type EntraUserAccount, type Invoice, type ProjectBillingProfile, type ProjectInvoiceDocument, type ProjectManager } from 'cfdg/scripts'
import { FileText, MoveRight, Save } from 'lucide-react'
import { Link } from 'react-router-dom'
import { type ProjectSummary } from '../../../api/projectManagement'
import { ProjectDocumentsSection } from './ProjectDocumentsSection'
import { formatProjectAddress } from './projectUtils'

type ProjectDetailPaneProps = {
  selectedProject: ProjectSummary | null
  manager: ProjectManager | null
  managerName: string
  managerEmail: string
  billingProfile: ProjectBillingProfile | null
  billingPoNumber: string
  billingDocumentNote: string
  invoiceDocuments: ProjectInvoiceDocument[]
  relatedInvoices: Invoice[]
  relatedLoading: boolean
  documentBusy: boolean
  eligibleManagers: EntraUserAccount[]
  selectedManagerId: string
  managersLoading: boolean
  saving: boolean
  billingSaving: boolean
  editorName: string
  onEditProject: () => void
  onOpenMoveDialog: () => void
  onSelectManager: (userId: string) => void
  onSaveManager: () => void
  onBillingPoNumberChange: (value: string) => void
  onBillingDocumentNoteChange: (value: string) => void
  onSaveBillingProfile: () => void
  onUploadDocument: (file: File | null) => void
  onDownloadDocument: (document: ProjectInvoiceDocument) => void
  onRemoveDocument: (document: ProjectInvoiceDocument) => void
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

export function ProjectDetailPane({
  selectedProject,
  manager,
  managerName,
  managerEmail,
  billingProfile,
  billingPoNumber,
  billingDocumentNote,
  invoiceDocuments,
  relatedInvoices,
  relatedLoading,
  documentBusy,
  eligibleManagers,
  selectedManagerId,
  managersLoading,
  saving,
  billingSaving,
  editorName,
  onEditProject,
  onOpenMoveDialog,
  onSelectManager,
  onSaveManager,
  onBillingPoNumberChange,
  onBillingDocumentNoteChange,
  onSaveBillingProfile,
  onUploadDocument,
  onDownloadDocument,
  onRemoveDocument,
}: ProjectDetailPaneProps) {
  return (
    <section className="rounded-md border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {selectedProject ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">{selectedProject.displayName}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedProject.fullyQualifiedName}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">QBO Project ID: {selectedProject.id}</p>
              </div>
              <Button label="Edit Project" size="small" style="secondary" icon={Save} onClick={onEditProject} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-900">
                <p className="text-xs font-semibold uppercase text-gray-500">Client</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <Link to={`/clients?clientId=${encodeURIComponent(selectedProject.parentId)}`} className="font-semibold text-blue-700 underline-offset-2 hover:underline dark:text-blue-300">
                    {selectedProject.parentDisplayName || selectedProject.parentId}
                  </Link>
                  <Button label="Move" size="small" style="secondary" icon={MoveRight} onClick={onOpenMoveDialog} />
                </div>
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-900">
                <h3 className="font-semibold">Internal Manager</h3>
                <div className="mt-3 space-y-3">
                  <Combobox
                    field="internal-project-manager"
                    label="Project Manager"
                    colorMode="auto"
                    selections={eligibleManagers.map((user) => ({
                      key: `${user.displayName}${user.jobTitle ? ` - ${user.jobTitle}` : ''}`,
                      value: user.id,
                    }))}
                    value={selectedManagerId}
                    placeholder={managersLoading ? 'Loading managers' : eligibleManagers.length > 0 ? 'Select manager' : 'Refresh PMs first'}
                    disabled={managersLoading || eligibleManagers.length === 0}
                    onChange={(_, value) => onSelectManager(value)}
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Textbox field="manager-name" label="Selected Name" colorMode="auto" value={managerName} onChange={() => undefined} disabled />
                    <Textbox field="manager-email" label="Selected Email" colorMode="auto" type="email" value={managerEmail} onChange={() => undefined} disabled />
                  </div>
                  <Button label={saving ? 'Saving' : 'Save Manager'} size="small" style="primary" icon={Save} onClick={onSaveManager} properties={{ disabled: saving }} />
                </div>
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-900 md:col-span-2">
                <p className="text-xs font-semibold uppercase text-gray-500">Address</p>
                <p className="mt-1 font-semibold">{formatProjectAddress(selectedProject) || 'No project address in QBO'}</p>
              </div>
            </div>

            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <h3 className="font-semibold">Invoices</h3>
              </div>
              {relatedLoading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading invoices...</p>}
              {!relatedLoading && relatedInvoices.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No invoices assigned to this project.</p>}
              <div className="space-y-2">
                {relatedInvoices.map((invoice) => (
                  <Link key={invoice.id} to={`/invoices?invoiceId=${encodeURIComponent(invoice.id)}`} className="block rounded-md border border-gray-200 bg-white p-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{invoice.invoiceNumber}</p>
                      <p className="font-semibold">{formatCurrency(invoice.totalCents)}</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{invoice.status} - {formatDate(invoice.issueDate)}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
            <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
              <p>{manager ? `Currently copied as ${manager.managerEmail}.` : 'Invoices for this project will not CC an internal manager until one is saved.'}</p>
              <p>{eligibleManagers.length} active users found in the Project Manager group.</p>
              <p>Saved by {editorName}</p>
            </div>
            <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">Invoice Billing</h3>
                {billingProfile?.updatedDate && <p className="text-xs text-gray-500 dark:text-gray-400">Updated {new Date(billingProfile.updatedDate).toLocaleDateString()}</p>}
              </div>
              <div className="mt-3 space-y-3">
                <Textbox field="billing-po-number" label="Project PO Number" colorMode="auto" value={billingPoNumber} onChange={(event) => onBillingPoNumberChange(event.target.value)} />
                <Textbox field="billing-document-note" label="Document Note" colorMode="auto" value={billingDocumentNote} onChange={(event) => onBillingDocumentNoteChange(event.target.value)} placeholder="PO docs, billing instructions, or invoice package note" />
                <Button label={billingSaving ? 'Saving' : 'Save Billing'} style="primary" icon={Save} onClick={onSaveBillingProfile} properties={{ disabled: billingSaving }} />
              </div>
            </div>
            <ProjectDocumentsSection
              documents={invoiceDocuments}
              documentBusy={documentBusy}
              onUpload={onUploadDocument}
              onDownload={onDownloadDocument}
              onRemove={onRemoveDocument}
            />
          </div>
        </div>
      ) : (
        <p className="py-12 text-center text-gray-500">Select a project to manage its internal manager.</p>
      )}
    </section>
  )
}

