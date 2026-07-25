import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMsal } from '@azure/msal-react'
import { useSearchParams } from 'react-router-dom'
import { Button, Combobox, Textbox } from 'cfdg/input'
import { Modal, showNotification } from 'cfdg/layout'
import { type EntraUserAccount, type Invoice, type ProjectBillingProfile, type ProjectInvoiceDocument, type ProjectManager, type QboCustomer } from 'cfdg/scripts'
import { ArrowLeft, Plus, RefreshCw } from 'lucide-react'
import { fetchEligibleProjectManagers } from '../../../api/entra'
import { fetchInvoices } from '../../../api/invoices'
import {
  createProject,
  deleteProjectInvoiceDocument,
  downloadProjectInvoiceDocument,
  fetchClients,
  fetchProjectDetails,
  fetchProjects,
  moveProject,
  saveProjectManager,
  saveProjectBillingProfile,
  updateProject,
  uploadProjectInvoiceDocument,
  type ProjectCreatePayload,
  type ProjectUpdatePayload,
  type ProjectSummary,
} from '../../../api/projectManagement'
import { ProjectDetailPane } from './ProjectDetailPane'
import { ProjectList } from './ProjectList'

const projectNumberPattern = /^\d{2}-\d{4}$/
const projectDisplayNamePattern = /^(\d{2}-\d{4}) - (.+)$/

type ProjectForm = {
  parentCustomerId: string
  projectNumber: string
  projectName: string
  address: ProjectCreatePayload['address']
  phone: string
  email: string
}

const emptyProject: ProjectForm = {
  parentCustomerId: '',
  projectNumber: '',
  projectName: '',
  address: {
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
  },
  phone: '',
  email: '',
}

function splitProjectDisplayName(displayName: string): Pick<ProjectForm, 'projectNumber' | 'projectName'> {
  const match = displayName.match(projectDisplayNamePattern)
  if (!match) {
    return { projectNumber: '', projectName: displayName }
  }
  return { projectNumber: match[1], projectName: match[2] }
}

function buildProjectDisplayName(form: ProjectForm): string {
  return `${form.projectNumber.trim()} - ${form.projectName.trim()}`
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      resolve(result.includes(',') ? result.split(',').pop() || '' : result)
    }
    reader.onerror = () => reject(reader.error || new Error('File failed to read'))
    reader.readAsDataURL(file)
  })
}

export function ProjectsManager() {
  const { accounts } = useMsal()
  const [searchParams, setSearchParams] = useSearchParams()
  const editorName = accounts[0]?.name ?? accounts[0]?.username ?? 'unknown-user'
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [clients, setClients] = useState<QboCustomer[]>([])
  const [relatedInvoices, setRelatedInvoices] = useState<Invoice[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [mode, setMode] = useState<'overview' | 'detail'>(() => searchParams.get('projectId') ? 'detail' : 'overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [relatedLoading, setRelatedLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [manager, setManager] = useState<ProjectManager | null>(null)
  const [managerName, setManagerName] = useState('')
  const [managerEmail, setManagerEmail] = useState('')
  const [billingProfile, setBillingProfile] = useState<ProjectBillingProfile | null>(null)
  const [billingPoNumber, setBillingPoNumber] = useState('')
  const [billingDocumentNote, setBillingDocumentNote] = useState('')
  const [invoiceDocuments, setInvoiceDocuments] = useState<ProjectInvoiceDocument[]>([])
  const [billingSaving, setBillingSaving] = useState(false)
  const [documentBusy, setDocumentBusy] = useState(false)
  const [eligibleManagers, setEligibleManagers] = useState<EntraUserAccount[]>([])
  const [selectedManagerId, setSelectedManagerId] = useState('')
  const [managersLoading, setManagersLoading] = useState(false)
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState('')
  const [projectSaving, setProjectSaving] = useState(false)
  const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProject)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [moveSaving, setMoveSaving] = useState(false)
  const [moveClientId, setMoveClientId] = useState('')

  const selectedProject = useMemo(() => projects.find((project) => project.id === selectedProjectId) ?? null, [projects, selectedProjectId])
  const canSaveProject = Boolean(projectForm.parentCustomerId && projectNumberPattern.test(projectForm.projectNumber.trim()) && projectForm.projectName.trim() && projectForm.address.line1.trim() && projectForm.address.city.trim() && projectForm.address.state.trim() && projectForm.address.postalCode.trim())
  const canMoveProject = Boolean(selectedProject && moveClientId && moveClientId !== selectedProject.parentId)

  const loadProjects = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchProjects(searchTerm)
      setProjects(data)
      const projectIdParam = searchParams.get('projectId') || ''
      setSelectedProjectId((previous) => previous || projectIdParam)
    } catch (error) {
      showNotification({ title: 'Projects Failed To Load', body: String(error), style: 'danger' })
    } finally {
      setLoading(false)
    }
  }, [searchParams, searchTerm])

  const loadProjectDetails = useCallback(async () => {
    if (!selectedProjectId) {
      setManager(null)
      setManagerName('')
      setManagerEmail('')
      setBillingProfile(null)
      setBillingPoNumber('')
      setBillingDocumentNote('')
      setInvoiceDocuments([])
      return
    }
    try {
      const data = await fetchProjectDetails(selectedProjectId)
      setManager(data.manager)
      setManagerName(data.manager?.managerName || '')
      setManagerEmail(data.manager?.managerEmail || '')
      setBillingProfile(data.billingProfile)
      setBillingPoNumber(data.billingProfile.poNumber)
      setBillingDocumentNote(data.billingProfile.invoiceDocumentNote)
      setInvoiceDocuments(data.invoiceDocuments)
      setSelectedManagerId('')
    } catch (error) {
      showNotification({ title: 'Project Details Failed To Load', body: String(error), style: 'warning' })
    }
  }, [selectedProjectId])

  const loadRelatedInvoices = useCallback(async () => {
    if (!selectedProjectId) {
      setRelatedInvoices([])
      return
    }
    setRelatedLoading(true)
    try {
      setRelatedInvoices(await fetchInvoices({ qboProjectId: selectedProjectId }))
    } catch (error) {
      showNotification({ title: 'Project Invoices Failed To Load', body: String(error), style: 'warning' })
    } finally {
      setRelatedLoading(false)
    }
  }, [selectedProjectId])

  const loadEligibleManagers = useCallback(async () => {
    setManagersLoading(true)
    try {
      const data = await fetchEligibleProjectManagers()
      setEligibleManagers(data)
    } catch (error) {
      showNotification({ title: 'Eligible PMs Failed To Load', body: String(error), style: 'warning' })
    } finally {
      setManagersLoading(false)
    }
  }, [])

  const loadClients = useCallback(async () => {
    try {
      setClients(await fetchClients())
    } catch (error) {
      showNotification({ title: 'Clients Failed To Load', body: String(error), style: 'warning' })
    }
  }, [])

  useEffect(() => {
    document.title = 'Projects - The Compass'
    loadEligibleManagers();
  }, [])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  useEffect(() => {
    void loadClients()
  }, [loadClients])

  useEffect(() => {
    void loadProjectDetails()
  }, [loadProjectDetails])

  useEffect(() => {
    void loadRelatedInvoices()
  }, [loadRelatedInvoices])

  useEffect(() => {
    const projectIdParam = searchParams.get('projectId') || ''
    if (projectIdParam && projectIdParam !== selectedProjectId) {
      setSelectedProjectId(projectIdParam)
      setMode('detail')
    }
  }, [searchParams, selectedProjectId])

  useEffect(() => {
    const existing = eligibleManagers.find((user) => (user.mail || user.userPrincipalName).toLowerCase() === managerEmail.toLowerCase())
    setSelectedManagerId(existing?.id || '')
  }, [eligibleManagers, managerEmail])

  async function saveManager() {
    if (!selectedProjectId) return
    setSaving(true)
    try {
      const saved = await saveProjectManager(selectedProjectId, managerName.trim(), managerEmail.trim())
      setManager(saved)
      setManagerName(saved?.managerName || '')
      setManagerEmail(saved?.managerEmail || '')
      showNotification({ title: 'Project Manager Saved', body: saved?.managerEmail || 'Manager cleared', style: 'success' })
    } catch (error) {
      showNotification({ title: 'Project Manager Save Failed', body: String(error), style: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  async function saveBillingProfile() {
    if (!selectedProjectId) return
    setBillingSaving(true)
    try {
      const saved = await saveProjectBillingProfile(selectedProjectId, {
        poNumber: billingPoNumber.trim(),
        invoiceDocumentNote: billingDocumentNote.trim(),
      })
      setBillingProfile(saved)
      setBillingPoNumber(saved.poNumber)
      setBillingDocumentNote(saved.invoiceDocumentNote)
      showNotification({ title: 'Billing Profile Saved', body: saved.poNumber || 'No PO number set', style: 'success' })
    } catch (error) {
      showNotification({ title: 'Billing Save Failed', body: String(error), style: 'danger' })
    } finally {
      setBillingSaving(false)
    }
  }

  async function uploadBillingDocument(file: File | null) {
    if (!selectedProjectId || !file) return
    setDocumentBusy(true)
    try {
      const data = await fileToBase64(file)
      const documents = await uploadProjectInvoiceDocument(selectedProjectId, {
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        data,
      })
      setInvoiceDocuments(documents)
      showNotification({ title: 'Document Uploaded', body: file.name, style: 'success' })
    } catch (error) {
      showNotification({ title: 'Upload Failed', body: String(error), style: 'danger' })
    } finally {
      setDocumentBusy(false)
    }
  }

  async function downloadBillingDocument(document: ProjectInvoiceDocument) {
    if (!selectedProjectId) return
    setDocumentBusy(true)
    try {
      const blob = await downloadProjectInvoiceDocument(selectedProjectId, document.id)
      const url = URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = url
      link.download = document.filename
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      showNotification({ title: 'Download Failed', body: String(error), style: 'danger' })
    } finally {
      setDocumentBusy(false)
    }
  }

  async function removeBillingDocument(document: ProjectInvoiceDocument) {
    if (!selectedProjectId) return
    setDocumentBusy(true)
    try {
      await deleteProjectInvoiceDocument(selectedProjectId, document.id)
      setInvoiceDocuments((previous) => previous.filter((entry) => entry.id !== document.id))
      showNotification({ title: 'Document Removed', body: document.filename, style: 'success' })
    } catch (error) {
      showNotification({ title: 'Remove Failed', body: String(error), style: 'danger' })
    } finally {
      setDocumentBusy(false)
    }
  }

  function selectManager(userId: string) {
    setSelectedManagerId(userId)
    const user = eligibleManagers.find((entry) => entry.id === userId)
    if (!user) {
      setManagerName('')
      setManagerEmail('')
      return
    }
    setManagerName(user.displayName)
    setManagerEmail(user.mail || user.userPrincipalName)
  }

  function selectProject(projectId: string) {
    setSelectedProjectId(projectId)
    setMode('detail')
    setSearchParams(projectId ? { projectId } : {}, { replace: false })
  }

  function returnToOverview() {
    setMode('overview')
    setSearchParams({}, { replace: false })
  }

  function updateProjectField(field: keyof Omit<ProjectForm, 'address'>, value: string) {
    setProjectForm((previous) => ({ ...previous, [field]: value }))
  }

  function updateProjectAddressField(field: keyof ProjectForm['address'], value: string) {
    setProjectForm((previous) => ({
      ...previous,
      address: {
        ...previous.address,
        [field]: value,
      },
    }))
  }

  function openNewProjectDialog() {
    setEditingProjectId('')
    setProjectForm(emptyProject)
    setProjectDialogOpen(true)
  }

  function openEditProjectDialog() {
    if (!selectedProject) return
    const displayNameParts = splitProjectDisplayName(selectedProject.displayName)
    setEditingProjectId(selectedProject.id)
    setProjectForm({
      parentCustomerId: selectedProject.parentId,
      projectNumber: displayNameParts.projectNumber,
      projectName: displayNameParts.projectName,
      address: {
        line1: selectedProject.shipAddrLine1 || selectedProject.billAddrLine1,
        line2: selectedProject.shipAddrLine2 || selectedProject.billAddrLine2,
        city: selectedProject.shipAddrCity || selectedProject.billAddrCity,
        state: selectedProject.shipAddrState || selectedProject.billAddrState,
        postalCode: selectedProject.shipAddrPostalCode || selectedProject.billAddrPostalCode,
      },
      phone: selectedProject.primaryPhone,
      email: selectedProject.primaryEmail,
    })
    setProjectDialogOpen(true)
  }

  async function saveProject() {
    if (!canSaveProject) return
    setProjectSaving(true)
    try {
      const projectPayload: ProjectUpdatePayload = {
        name: buildProjectDisplayName(projectForm),
        address: {
          line1: projectForm.address.line1.trim(),
          line2: projectForm.address.line2.trim(),
          city: projectForm.address.city.trim(),
          state: projectForm.address.state.trim(),
          postalCode: projectForm.address.postalCode.trim(),
        },
        phone: projectForm.phone.trim(),
        email: projectForm.email.trim(),
      }
      const saved = editingProjectId
        ? await updateProject(editingProjectId, projectPayload)
        : await createProject({ parentCustomerId: projectForm.parentCustomerId, ...projectPayload })
      setProjects((previous) => [saved, ...previous.filter((project) => project.id !== saved.id)].sort((a, b) => a.displayName.localeCompare(b.displayName)))
      setSelectedProjectId(saved.id)
      setMode('detail')
      setSearchParams({ projectId: saved.id }, { replace: false })
      setProjectForm(emptyProject)
      setEditingProjectId('')
      setProjectDialogOpen(false)
      showNotification({ title: editingProjectId ? 'Project Updated' : 'Project Created', body: saved.displayName, style: 'success' })
    } catch (error) {
      showNotification({ title: editingProjectId ? 'Project Update Failed' : 'Project Create Failed', body: String(error), style: 'danger' })
    } finally {
      setProjectSaving(false)
    }
  }

  function openMoveDialog() {
    if (!selectedProject) return
    setMoveClientId(selectedProject.parentId)
    setMoveDialogOpen(true)
  }

  async function saveProjectMove() {
    if (!selectedProject || !canMoveProject) return
    setMoveSaving(true)
    try {
      const moved = await moveProject(selectedProject.id, moveClientId)
      setProjects((previous) => previous.map((project) => project.id === moved.id ? moved : project).sort((a, b) => a.displayName.localeCompare(b.displayName)))
      setSelectedProjectId(moved.id)
      setMoveDialogOpen(false)
      showNotification({ title: 'Project Moved', body: `${moved.displayName} now belongs to ${moved.parentDisplayName || moved.parentId}.`, style: 'success' })
    } catch (error) {
      showNotification({ title: 'Project Move Failed', body: String(error), style: 'danger' })
    } finally {
      setMoveSaving(false)
    }
  }

  return (
    <div className="h-full min-h-0 text-gray-900 dark:text-gray-100">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          {mode === 'detail' && <Button label="Back" style="textonly" icon={ArrowLeft} onClick={returnToOverview} colorMode="auto" />}
          <div>
            <h1 className="text-2xl font-bold">{mode === 'detail' && selectedProject ? selectedProject.displayName : 'Projects'}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">QuickBooks sub-customers with internal project email ownership.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button label="Refresh" style="secondary" icon={RefreshCw} onClick={() => void loadProjects()} properties={{ disabled: loading }} />
          <Button label="New Project" style="primary" icon={Plus} onClick={openNewProjectDialog} properties={{ disabled: projectSaving }} />
          <Button label="Refresh PMs" style="secondary" icon={RefreshCw} onClick={() => void loadEligibleManagers()} properties={{ disabled: managersLoading }} />
        </div>
      </div>

      <Modal
        title={editingProjectId ? 'Edit Project' : 'New Project'}
        isOpen={projectDialogOpen}
        onAccept={() => void saveProject()}
        onClose={() => {
          if (!projectSaving) setProjectDialogOpen(false)
        }}
        acceptText={projectSaving ? 'Saving' : editingProjectId ? 'Save Project' : 'Create Project'}
        acceptDisabled={!canSaveProject || projectSaving}
        colorMode="auto"
        size="lg"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Combobox
              field="new-project-client"
              label="Client"
              colorMode="auto"
              selections={clients.map((client) => ({ key: client.displayName, value: client.id }))}
              value={projectForm.parentCustomerId}
              placeholder={clients.length > 0 ? 'Select client' : 'No clients loaded'}
              disabled={clients.length === 0 || Boolean(editingProjectId)}
              onChange={(_, value) => updateProjectField('parentCustomerId', value)}
            />
          </div>
          <div>
            <Textbox field="new-project-number" label="Project Number" colorMode="auto" value={projectForm.projectNumber} onChange={(event) => updateProjectField('projectNumber', event.target.value)} placeholder="26-0001" required />
            {projectForm.projectNumber.trim() && !projectNumberPattern.test(projectForm.projectNumber.trim()) && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">Use YY-####.</p>
            )}
          </div>
          <Textbox field="new-project-name" label="Project Name" colorMode="auto" value={projectForm.projectName} onChange={(event) => updateProjectField('projectName', event.target.value)} placeholder="Project Name" required />
          <div className="md:col-span-2 rounded-md border border-gray-200 bg-gray-50 p-2 text-sm dark:border-gray-700 dark:bg-gray-900">
            <span className="text-gray-500 dark:text-gray-400">QuickBooks name: </span>
            <span className="font-semibold">{projectForm.projectNumber.trim() || 'YY-####'} - {projectForm.projectName.trim() || 'Project Name'}</span>
          </div>
          <div className="md:col-span-2">
            <Textbox field="new-project-address-line1" label="Address Line 1" colorMode="auto" value={projectForm.address.line1} onChange={(event) => updateProjectAddressField('line1', event.target.value)} required />
          </div>
          <div className="md:col-span-2">
            <Textbox field="new-project-address-line2" label="Address Line 2" colorMode="auto" value={projectForm.address.line2} onChange={(event) => updateProjectAddressField('line2', event.target.value)} />
          </div>
          <Textbox field="new-project-city" label="City" colorMode="auto" value={projectForm.address.city} onChange={(event) => updateProjectAddressField('city', event.target.value)} required />
          <Textbox field="new-project-state" label="State" colorMode="auto" value={projectForm.address.state} onChange={(event) => updateProjectAddressField('state', event.target.value)} required />
          <Textbox field="new-project-postal-code" label="Postal Code" colorMode="auto" value={projectForm.address.postalCode} onChange={(event) => updateProjectAddressField('postalCode', event.target.value)} required />
          <Textbox field="new-project-phone" label="Phone" colorMode="auto" value={projectForm.phone} onChange={(event) => updateProjectField('phone', event.target.value)} />
          <div className="md:col-span-2">
            <Textbox field="new-project-email" label="Email" colorMode="auto" type="email" value={projectForm.email} onChange={(event) => updateProjectField('email', event.target.value)} />
          </div>
        </div>
      </Modal>

      <Modal
        title="Move Project"
        isOpen={moveDialogOpen}
        onAccept={() => void saveProjectMove()}
        onClose={() => {
          if (!moveSaving) setMoveDialogOpen(false)
        }}
        acceptText={moveSaving ? 'Moving' : 'Move Project'}
        acceptDisabled={!canMoveProject || moveSaving}
        colorMode="auto"
        size="md"
      >
        <div className="space-y-3">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            This updates the project parent in QuickBooks. Existing Compass invoices keep their stored client and project IDs.
          </p>
          <Combobox
            field="move-project-client"
            label="New Client"
            colorMode="auto"
            selections={clients.map((client) => ({ key: client.displayName, value: client.id }))}
            value={moveClientId}
            placeholder={clients.length > 0 ? 'Select client' : 'No clients loaded'}
            disabled={clients.length === 0}
            onChange={(_, value) => setMoveClientId(value)}
          />
        </div>
      </Modal>

      {mode === 'overview' ? (
        <ProjectList
          projects={projects}
          loading={loading}
          searchTerm={searchTerm}
          selectedProjectId={selectedProjectId}
          onSearchTermChange={setSearchTerm}
          onSelectProject={selectProject}
        />
      ) : (
        <ProjectDetailPane
          selectedProject={selectedProject}
          manager={manager}
          managerName={managerName}
          managerEmail={managerEmail}
          billingProfile={billingProfile}
          billingPoNumber={billingPoNumber}
          billingDocumentNote={billingDocumentNote}
          invoiceDocuments={invoiceDocuments}
          relatedInvoices={relatedInvoices}
          relatedLoading={relatedLoading}
          documentBusy={documentBusy}
          eligibleManagers={eligibleManagers}
          selectedManagerId={selectedManagerId}
          managersLoading={managersLoading}
          saving={saving}
          billingSaving={billingSaving}
          editorName={editorName}
          onEditProject={openEditProjectDialog}
          onOpenMoveDialog={openMoveDialog}
          onSelectManager={selectManager}
          onSaveManager={() => void saveManager()}
          onBillingPoNumberChange={setBillingPoNumber}
          onBillingDocumentNoteChange={setBillingDocumentNote}
          onSaveBillingProfile={() => void saveBillingProfile()}
          onUploadDocument={(file) => void uploadBillingDocument(file)}
          onDownloadDocument={(document) => void downloadBillingDocument(document)}
          onRemoveDocument={(document) => void removeBillingDocument(document)}
        />
      )}
    </div>
  )
}
