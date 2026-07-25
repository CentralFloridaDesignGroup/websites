import {
  type ClientContact,
  type ClientCreatePayload,
  type ClientUpdatePayload,
  type ProjectBillingProfile,
  type ProjectManager,
  type ProjectCreatePayload,
  type ProjectInvoiceDocument,
  type ProjectMovePayload,
  type ProjectUpdatePayload,
  type QboCustomer,
} from 'cfdg/scripts'
import { requestBlob, requestJson } from './client'

type UnknownRecord = Record<string, unknown>

export type ProjectSummary = QboCustomer & {
  parentDisplayName: string
}

export type ContactPayload = {
  name: string
  email: string
  phone: string
  role: string
  isInvoiceRecipient: boolean
  active: boolean
  notes: string
}

export type ProjectBillingPayload = {
  poNumber: string
  invoiceDocumentNote: string
}

export type ProjectDocumentUploadPayload = {
  filename: string
  data: string
  contentType: string
}

export type { ClientCreatePayload, ClientUpdatePayload, ProjectCreatePayload, ProjectMovePayload, ProjectUpdatePayload }

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? value as UnknownRecord : {}
}

function normalizeString(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeBool(value: unknown): boolean {
  return value === true || value === 1 || value === '1'
}

function normalizeCustomer(value: unknown): QboCustomer {
  const row = asRecord(value)
  return {
    id: normalizeString(row.id ?? row.qbo_id),
    parentId: normalizeString(row.parentId ?? row.parent_id),
    displayName: normalizeString(row.displayName ?? row.display_name),
    fullyQualifiedName: normalizeString(row.fullyQualifiedName ?? row.fully_qualified_name),
    companyName: normalizeString(row.companyName ?? row.company_name),
    givenName: normalizeString(row.givenName ?? row.given_name),
    familyName: normalizeString(row.familyName ?? row.family_name),
    primaryEmail: normalizeString(row.primaryEmail ?? row.primary_email),
    primaryPhone: normalizeString(row.primaryPhone ?? row.primary_phone),
    billAddrLine1: normalizeString(row.billAddrLine1 ?? row.bill_addr_line1),
    billAddrLine2: normalizeString(row.billAddrLine2 ?? row.bill_addr_line2),
    billAddrCity: normalizeString(row.billAddrCity ?? row.bill_addr_city),
    billAddrState: normalizeString(row.billAddrState ?? row.bill_addr_state),
    billAddrPostalCode: normalizeString(row.billAddrPostalCode ?? row.bill_addr_postal_code),
    shipAddrLine1: normalizeString(row.shipAddrLine1 ?? row.ship_addr_line1),
    shipAddrLine2: normalizeString(row.shipAddrLine2 ?? row.ship_addr_line2),
    shipAddrCity: normalizeString(row.shipAddrCity ?? row.ship_addr_city),
    shipAddrState: normalizeString(row.shipAddrState ?? row.ship_addr_state),
    shipAddrPostalCode: normalizeString(row.shipAddrPostalCode ?? row.ship_addr_postal_code),
    active: normalizeBool(row.active),
    syncToken: normalizeString(row.syncToken ?? row.sync_token),
    qboUpdatedTime: normalizeString(row.qboUpdatedTime ?? row.qbo_updated_time),
    lastSyncedDate: normalizeString(row.lastSyncedDate ?? row.last_synced_date),
  }
}

function normalizeContact(value: unknown): ClientContact {
  const row = asRecord(value)
  return {
    id: normalizeString(row.id),
    qboCustomerId: normalizeString(row.qboCustomerId ?? row.qbo_customer_id),
    name: normalizeString(row.name),
    email: normalizeString(row.email),
    phone: normalizeString(row.phone),
    role: normalizeString(row.role),
    isInvoiceRecipient: normalizeBool(row.isInvoiceRecipient ?? row.is_invoice_recipient),
    active: normalizeBool(row.active),
    notes: normalizeString(row.notes),
    createdDate: normalizeString(row.createdDate ?? row.created_date),
    updatedDate: normalizeString(row.updatedDate ?? row.updated_date),
    createdBy: normalizeString(row.createdBy ?? row.created_by),
    updatedBy: normalizeString(row.updatedBy ?? row.updated_by),
  }
}

function normalizeManager(value: unknown): ProjectManager | null {
  if (!value) return null
  const row = asRecord(value)
  const qboProjectId = normalizeString(row.qboProjectId ?? row.qbo_project_id)
  const managerEmail = normalizeString(row.managerEmail ?? row.manager_email)
  if (!qboProjectId || !managerEmail) return null
  return {
    qboProjectId,
    managerName: normalizeString(row.managerName ?? row.manager_name),
    managerEmail,
    updatedDate: normalizeString(row.updatedDate ?? row.updated_date),
    updatedBy: normalizeString(row.updatedBy ?? row.updated_by),
  }
}

function normalizeBillingProfile(value: unknown, qboProjectId = ''): ProjectBillingProfile {
  const row = asRecord(value)
  return {
    qboProjectId: normalizeString(row.qboProjectId ?? row.qbo_project_id) || qboProjectId,
    poNumber: normalizeString(row.poNumber ?? row.po_number),
    invoiceDocumentNote: normalizeString(row.invoiceDocumentNote ?? row.invoice_document_note),
    updatedDate: normalizeString(row.updatedDate ?? row.updated_date),
    updatedBy: normalizeString(row.updatedBy ?? row.updated_by),
  }
}

function normalizeInvoiceDocument(value: unknown): ProjectInvoiceDocument {
  const row = asRecord(value)
  return {
    id: normalizeString(row.id),
    qboProjectId: normalizeString(row.qboProjectId ?? row.qbo_project_id),
    r2Key: normalizeString(row.r2Key ?? row.r2_key),
    filename: normalizeString(row.filename),
    contentType: normalizeString(row.contentType ?? row.content_type),
    sizeBytes: Number(row.sizeBytes ?? row.size_bytes ?? 0) || 0,
    active: normalizeBool(row.active),
    createdDate: normalizeString(row.createdDate ?? row.created_date),
    createdBy: normalizeString(row.createdBy ?? row.created_by),
    updatedDate: normalizeString(row.updatedDate ?? row.updated_date),
    updatedBy: normalizeString(row.updatedBy ?? row.updated_by),
  }
}

export async function fetchClients(search = ''): Promise<QboCustomer[]> {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  const data = await requestJson<{ clients?: unknown[] }>(`/api/clients${params.toString() ? `?${params}` : ''}`, {
    method: 'GET',
    authMode: 'microsoft',
  })
  return (data.clients || []).map((client) => normalizeCustomer(client))
}

export async function createClient(payload: ClientCreatePayload): Promise<QboCustomer> {
  const data = await requestJson<{ client?: unknown }>('/api/clients', {
    method: 'POST',
    authMode: 'microsoft',
    body: JSON.stringify(payload),
  })
  return normalizeCustomer(data.client)
}

export async function updateClient(qboCustomerId: string, payload: ClientUpdatePayload): Promise<QboCustomer> {
  const data = await requestJson<{ client?: unknown }>(`/api/clients/${encodeURIComponent(qboCustomerId)}`, {
    method: 'PUT',
    authMode: 'microsoft',
    body: JSON.stringify(payload),
  })
  return normalizeCustomer(data.client)
}

export async function fetchClientContacts(qboCustomerId: string, includeInactive = false): Promise<ClientContact[]> {
  const params = new URLSearchParams()
  if (includeInactive) params.set('includeInactive', 'true')
  const data = await requestJson<{ contacts?: unknown[] }>(`/api/clients/${encodeURIComponent(qboCustomerId)}/contacts${params.toString() ? `?${params}` : ''}`, {
    method: 'GET',
    authMode: 'microsoft',
  })
  return (data.contacts || []).map((contact) => normalizeContact(contact))
}

export async function fetchClientDetails(qboCustomerId: string): Promise<{ client: QboCustomer; contacts: ClientContact[] }> {
  const data = await requestJson<{ client?: unknown; contacts?: unknown[] }>(`/api/clients/${encodeURIComponent(qboCustomerId)}`, {
    method: 'GET',
    authMode: 'microsoft',
  })
  return {
    client: normalizeCustomer(data.client),
    contacts: (data.contacts || []).map((contact) => normalizeContact(contact)),
  }
}

export async function createClientContact(qboCustomerId: string, payload: ContactPayload): Promise<ClientContact> {
  const data = await requestJson<{ contact?: unknown }>(`/api/clients/${encodeURIComponent(qboCustomerId)}/contacts`, {
    method: 'POST',
    authMode: 'microsoft',
    body: JSON.stringify(payload),
  })
  return normalizeContact(data.contact)
}

export async function updateClientContact(qboCustomerId: string, contactId: string, payload: ContactPayload): Promise<ClientContact> {
  const data = await requestJson<{ contact?: unknown }>(`/api/clients/${encodeURIComponent(qboCustomerId)}/contacts/${encodeURIComponent(contactId)}`, {
    method: 'PUT',
    authMode: 'microsoft',
    body: JSON.stringify(payload),
  })
  return normalizeContact(data.contact)
}

export async function deleteClientContact(qboCustomerId: string, contactId: string): Promise<void> {
  await requestJson(`/api/clients/${encodeURIComponent(qboCustomerId)}/contacts/${encodeURIComponent(contactId)}`, {
    method: 'DELETE',
    authMode: 'microsoft',
  })
}

export async function fetchProjects(filters: string | { search?: string; parentCustomerId?: string } = ''): Promise<ProjectSummary[]> {
  const search = typeof filters === 'string' ? filters : filters.search || ''
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (typeof filters !== 'string' && filters.parentCustomerId) params.set('parentCustomerId', filters.parentCustomerId)
  const data = await requestJson<{ projects?: unknown[] }>(`/api/projects${params.toString() ? `?${params}` : ''}`, {
    method: 'GET',
    authMode: 'microsoft',
  })
  return (data.projects || []).map((project) => {
    const row = asRecord(project)
    return {
      ...normalizeCustomer(project),
      parentDisplayName: normalizeString(row.parentDisplayName ?? row.parent_display_name),
    }
  })
}

export async function createProject(payload: ProjectCreatePayload): Promise<ProjectSummary> {
  const data = await requestJson<{ project?: unknown }>('/api/projects', {
    method: 'POST',
    authMode: 'microsoft',
    body: JSON.stringify(payload),
  })
  const row = asRecord(data.project)
  return {
    ...normalizeCustomer(data.project),
    parentDisplayName: normalizeString(row.parentDisplayName ?? row.parent_display_name),
  }
}

export async function updateProject(qboProjectId: string, payload: ProjectUpdatePayload): Promise<ProjectSummary> {
  const data = await requestJson<{ project?: unknown }>(`/api/projects/${encodeURIComponent(qboProjectId)}`, {
    method: 'PUT',
    authMode: 'microsoft',
    body: JSON.stringify(payload),
  })
  const row = asRecord(data.project)
  return {
    ...normalizeCustomer(data.project),
    parentDisplayName: normalizeString(row.parentDisplayName ?? row.parent_display_name),
  }
}

export async function moveProject(projectId: string, parentCustomerId: string): Promise<ProjectSummary> {
  const payload: ProjectMovePayload = { parentCustomerId }
  const data = await requestJson<{ project?: unknown }>(`/api/projects/${encodeURIComponent(projectId)}/client`, {
    method: 'PUT',
    authMode: 'microsoft',
    body: JSON.stringify(payload),
  })
  const row = asRecord(data.project)
  return {
    ...normalizeCustomer(data.project),
    parentDisplayName: normalizeString(row.parentDisplayName ?? row.parent_display_name),
  }
}

export async function fetchProjectManager(qboProjectId: string): Promise<ProjectManager | null> {
  const data = await requestJson<{ manager?: unknown }>(`/api/projects/${encodeURIComponent(qboProjectId)}`, {
    method: 'GET',
    authMode: 'microsoft',
  })
  return normalizeManager(data.manager)
}

export async function fetchProjectDetails(qboProjectId: string): Promise<{ project: ProjectSummary; client: QboCustomer | null; manager: ProjectManager | null; billingProfile: ProjectBillingProfile; invoiceDocuments: ProjectInvoiceDocument[] }> {
  const data = await requestJson<{ project?: unknown; client?: unknown; manager?: unknown; billingProfile?: unknown; invoiceDocuments?: unknown[] }>(`/api/projects/${encodeURIComponent(qboProjectId)}`, {
    method: 'GET',
    authMode: 'microsoft',
  })
  const projectRow = asRecord(data.project)
  return {
    project: {
      ...normalizeCustomer(data.project),
      parentDisplayName: normalizeString(projectRow.parentDisplayName ?? projectRow.parent_display_name),
    },
    client: data.client ? normalizeCustomer(data.client) : null,
    manager: normalizeManager(data.manager),
    billingProfile: normalizeBillingProfile(data.billingProfile, qboProjectId),
    invoiceDocuments: (data.invoiceDocuments || []).map((document) => normalizeInvoiceDocument(document)),
  }
}

export async function saveProjectManager(qboProjectId: string, managerName: string, managerEmail: string): Promise<ProjectManager | null> {
  const data = await requestJson<{ manager?: unknown }>(`/api/projects/${encodeURIComponent(qboProjectId)}/manager`, {
    method: 'PUT',
    authMode: 'microsoft',
    body: JSON.stringify({ managerName, managerEmail }),
  })
  return normalizeManager(data.manager)
}

export async function saveProjectBillingProfile(qboProjectId: string, payload: ProjectBillingPayload): Promise<ProjectBillingProfile> {
  const data = await requestJson<{ billingProfile?: unknown }>(`/api/projects/${encodeURIComponent(qboProjectId)}/billing`, {
    method: 'PUT',
    authMode: 'microsoft',
    body: JSON.stringify(payload),
  })
  return normalizeBillingProfile(data.billingProfile, qboProjectId)
}

export async function fetchProjectInvoiceDocuments(qboProjectId: string): Promise<ProjectInvoiceDocument[]> {
  const data = await requestJson<{ invoiceDocuments?: unknown[] }>(`/api/projects/${encodeURIComponent(qboProjectId)}/documents`, {
    method: 'GET',
    authMode: 'microsoft',
  })
  return (data.invoiceDocuments || []).map((document) => normalizeInvoiceDocument(document))
}

export async function uploadProjectInvoiceDocument(qboProjectId: string, payload: ProjectDocumentUploadPayload): Promise<ProjectInvoiceDocument[]> {
  const data = await requestJson<{ invoiceDocuments?: unknown[] }>(`/api/projects/${encodeURIComponent(qboProjectId)}/documents`, {
    method: 'POST',
    authMode: 'microsoft',
    body: JSON.stringify(payload),
  })
  return (data.invoiceDocuments || []).map((document) => normalizeInvoiceDocument(document))
}

export async function deleteProjectInvoiceDocument(qboProjectId: string, documentId: string): Promise<void> {
  await requestJson(`/api/projects/${encodeURIComponent(qboProjectId)}/documents/${encodeURIComponent(documentId)}`, {
    method: 'DELETE',
    authMode: 'microsoft',
  })
}

export async function downloadProjectInvoiceDocument(qboProjectId: string, documentId: string): Promise<Blob> {
  return requestBlob(`/api/projects/${encodeURIComponent(qboProjectId)}/documents/${encodeURIComponent(documentId)}/download`, {
    method: 'GET',
    authMode: 'microsoft',
  })
}
