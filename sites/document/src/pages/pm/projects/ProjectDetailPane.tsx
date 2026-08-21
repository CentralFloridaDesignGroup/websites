import { useState } from 'react'
import { Button, Combobox, Textarea, Textbox } from 'cfdg/input'
import { type EntraUserAccount, type Invoice, type ProjectBillingProfile, type ProjectInvoiceDocument, type ProjectManager, type ProjectStatus, type ProjectTask } from 'cfdg/types/v1'
import { FileText, MoveRight, Save } from 'lucide-react'
import { Link } from 'react-router-dom'
import { type ProjectSummary } from '../../../api/projectManagement'
import { ProjectDocumentsSection } from './ProjectDocumentsSection'
import { formatProjectAddress, projectStatusClassName } from './projectUtils'

type ProjectDetailPaneProps = {
  selectedProject: ProjectSummary | null
  manager: ProjectManager | null
  managerName: string
  managerEmail: string
  billingProfile: ProjectBillingProfile | null
  billingPoNumber: string
  billingDocumentNote: string
  invoiceDocuments: ProjectInvoiceDocument[]
  tasks: ProjectTask[]
  relatedInvoices: Invoice[]
  relatedLoading: boolean
  documentBusy: boolean
  eligibleManagers: EntraUserAccount[]
  selectedManagerId: string
  managersLoading: boolean
  saving: boolean
  billingSaving: boolean
  projectStatusSaving: boolean
  editorName: string
  onEditProject: () => void
  onProjectStatusChange: (status: ProjectStatus) => void
  onOpenMoveDialog: () => void
  onSelectManager: (userId: string) => void
  onSaveManager: () => void
  onBillingPoNumberChange: (value: string) => void
  onBillingDocumentNoteChange: (value: string) => void
  onSaveBillingProfile: () => void
  onUploadDocument: (file: File | null) => void
  onDownloadDocument: (document: ProjectInvoiceDocument) => void
  onRemoveDocument: (document: ProjectInvoiceDocument) => void
  onSaveTask: (task: ProjectTask) => void
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
  tasks,
  relatedInvoices,
  relatedLoading,
  documentBusy,
  eligibleManagers,
  selectedManagerId,
  managersLoading,
  saving,
  billingSaving,
  projectStatusSaving,
  editorName,
  onEditProject,
  onProjectStatusChange,
  onOpenMoveDialog,
  onSelectManager,
  onSaveManager,
  onBillingPoNumberChange,
  onBillingDocumentNoteChange,
  onSaveBillingProfile,
  onUploadDocument,
  onDownloadDocument,
  onRemoveDocument,
  onSaveTask,
}: ProjectDetailPaneProps) {
  return (
    <section className="rounded-md border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {selectedProject ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold">{selectedProject.displayName}</h2>
                  <select
                    aria-label="Project status"
                    value={selectedProject.status}
                    disabled={projectStatusSaving}
                    onChange={(event) => onProjectStatusChange(event.target.value as ProjectStatus)}
                    className={`rounded border-0 px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${projectStatusClassName(selectedProject.status)}`}
                  >
                    <option value="proposal">Proposal</option>
                    <option value="active">Active</option>
                    <option value="hold">Hold</option>
                    <option value="complete">Complete</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
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
                <p className="mt-2 text-xs font-semibold uppercase text-gray-500">Parcel ID</p>
                <p className="mt-1 font-semibold">{selectedProject.parcelId || 'Not set'}</p>
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
            <ProjectTasksSection projectId={selectedProject.id} tasks={tasks} saving={saving} onSave={onSaveTask} />
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

function ProjectTasksSection({ projectId, tasks, saving, onSave }: { projectId: string; tasks: ProjectTask[]; saving: boolean; onSave: (task: ProjectTask) => void }) {
  const [editing, setEditing] = useState<ProjectTask | null>(null)
  const empty = (): ProjectTask => ({ id: '', qboProjectId: projectId, name: '', scopeOfWork: '', contractAmountCents: 0, retainerCents: 0, priceType: 'Fixed Fee', sortOrder: tasks.length, active: true, createdDate: '', updatedDate: '', createdBy: '', updatedBy: '', billedCents: 0, remainingCents: 0 })
  return <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900"><div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">Project Tasks</h3><Button label="Add Task" size="small" style="secondary" onClick={() => setEditing(empty())} /></div><div className="space-y-2">{tasks.map((task) => <button key={task.id} type="button" onClick={() => setEditing(task)} className="block w-full rounded border border-gray-200 bg-white p-2 text-left text-sm dark:border-gray-700 dark:bg-gray-800"><span className="font-semibold">{task.name}</span><span className="float-right">{formatCurrency(task.contractAmountCents)}</span><p className="text-xs text-gray-500">{task.active ? 'Active' : 'Inactive'} · {task.scopeOfWork || 'No scope entered'}</p></button>)}</div>{editing && <div className="mt-3 grid gap-2 border-t pt-3 dark:border-gray-700"><Textbox field="project-task-name" label="Task Name" colorMode="auto" value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /><Textarea field="project-task-scope" label="Scope of Work" colorMode="auto" value={editing.scopeOfWork} onChange={(event) => setEditing({ ...editing, scopeOfWork: event.target.value })} /><div className="grid gap-2 sm:grid-cols-2"><Textbox field="project-task-amount" label="Contract Amount" colorMode="auto" value={(editing.contractAmountCents / 100).toFixed(2)} onChange={(event) => setEditing({ ...editing, contractAmountCents: Math.max(0, Math.round((Number(event.target.value) || 0) * 100)) })} /><Textbox field="project-task-retainer" label="Retainer" colorMode="auto" value={(editing.retainerCents / 100).toFixed(2)} onChange={(event) => setEditing({ ...editing, retainerCents: Math.max(0, Math.round((Number(event.target.value) || 0) * 100)) })} /></div><label className="text-sm"><input type="checkbox" checked={editing.active} onChange={(event) => setEditing({ ...editing, active: event.target.checked })} /> Active</label><div className="flex gap-2"><Button label="Save Task" size="small" style="primary" onClick={() => { onSave(editing); setEditing(null) }} properties={{ disabled: saving || !editing.name.trim() }} /><Button label="Cancel" size="small" style="secondary" onClick={() => setEditing(null)} /></div></div>}</div>
}

