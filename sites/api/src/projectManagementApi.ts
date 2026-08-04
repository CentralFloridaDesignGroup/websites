import type {
  ClientContact,
  ClientContactRow,
  ClientCreatePayload,
  ClientUpdatePayload,
  ProjectCreatePayload,
  ProjectBillingProfile,
  ProjectBillingProfileRow,
  ProjectInvoiceDocument,
  ProjectInvoiceDocumentRow,
  ProjectManagerRow,
  ProjectMovePayload,
  ProjectStatus,
  ProjectUpdatePayload,
  QboCustomer,
  State,
} from 'cfdg/types'
import { CURRENT_PROJECT_STATUSES, PROJECT_STATUSES } from 'cfdg/types/constants'
import { Hono } from 'hono'
import { badRequest, jsonResponse, noContent, requireAuthMode, serverError, type HonoEnv } from './apiTypes'
import {
  createQboClientCustomer,
  createQboProjectCustomer,
  ensureQboSchemaReady,
  moveQboProjectCustomer,
  updateQboCustomerActiveState,
  updateQboClientCustomer,
  updateQboProjectCustomer,
} from './qboApi'
import { mapClientContactRow, mapProjectBillingProfileRow, mapProjectInvoiceDocumentRow, mapProjectManagerRow } from 'cfdg/types/projectManagement'

type ContactPayload = {
  name?: unknown
  email?: unknown
  phone?: unknown
  role?: unknown
  isInvoiceRecipient?: unknown
  active?: unknown
  notes?: unknown
}

type ProjectManagerPayload = {
  managerName?: unknown
  managerEmail?: unknown
}

type ProjectBillingPayload = {
  poNumber?: unknown
  invoiceDocumentNote?: unknown
}

type ProjectDocumentPayload = {
  filename?: unknown
  data?: unknown
  contentType?: unknown
  mimetype?: unknown
}

type StatusPayload = {
  status?: unknown
}

type AddressPayload = {
  line1?: unknown
  line2?: unknown
  city?: unknown
  state?: unknown
  postalCode?: unknown
}

type QboCustomerRow = {
  qbo_id?: unknown
  parent_id?: unknown
  display_name?: unknown
  fully_qualified_name?: unknown
  company_name?: unknown
  given_name?: unknown
  family_name?: unknown
  primary_email?: unknown
  primary_phone?: unknown
  bill_addr_line1?: unknown
  bill_addr_line2?: unknown
  bill_addr_city?: unknown
  bill_addr_state?: unknown
  bill_addr_postal_code?: unknown
  ship_addr_line1?: unknown
  ship_addr_line2?: unknown
  ship_addr_city?: unknown
  ship_addr_state?: unknown
  ship_addr_postal_code?: unknown
  active?: unknown
  sync_token?: unknown
  qbo_updated_time?: unknown
  last_synced_date?: unknown
}

function normalizeString(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeBool(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null || value === '') return fallback
  return value === true || value === 1 || value === '1'
}

function normalizeProjectStatus(value: unknown, fallback: ProjectStatus = 'active'): ProjectStatus {
  const status = normalizeString(value).toLowerCase()
  return (PROJECT_STATUSES as readonly string[]).includes(status) ? status as ProjectStatus : fallback
}

function nowIso(): string {
  return new Date().toISOString()
}

function createStorageToken(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function isEmail(value: string): boolean {
  return Boolean(value) && value.includes('@')
}

function isOptionalEmail(value: string): boolean {
  return !value || isEmail(value)
}

function isValidProjectName(value: string): boolean {
  return /^\d{2}-\d{4} - .+$/.test(value)
}

function mapQboCustomer(row: QboCustomerRow): QboCustomer {
  return {
    id: normalizeString(row.qbo_id),
    parentId: normalizeString(row.parent_id),
    displayName: normalizeString(row.display_name),
    fullyQualifiedName: normalizeString(row.fully_qualified_name),
    companyName: normalizeString(row.company_name),
    givenName: normalizeString(row.given_name),
    familyName: normalizeString(row.family_name),
    primaryEmail: normalizeString(row.primary_email),
    primaryPhone: normalizeString(row.primary_phone),
    billAddrLine1: normalizeString(row.bill_addr_line1),
    billAddrLine2: normalizeString(row.bill_addr_line2),
    billAddrCity: normalizeString(row.bill_addr_city),
    billAddrState: normalizeString(row.bill_addr_state),
    billAddrPostalCode: normalizeString(row.bill_addr_postal_code),
    shipAddrLine1: normalizeString(row.ship_addr_line1),
    shipAddrLine2: normalizeString(row.ship_addr_line2),
    shipAddrCity: normalizeString(row.ship_addr_city),
    shipAddrState: normalizeString(row.ship_addr_state),
    shipAddrPostalCode: normalizeString(row.ship_addr_postal_code),
    active: normalizeBool(row.active),
    syncToken: normalizeString(row.sync_token),
    qboUpdatedTime: normalizeString(row.qbo_updated_time),
    lastSyncedDate: normalizeString(row.last_synced_date),
  }
}

async function ensureProjectManagementSchema(db: D1Database): Promise<void> {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS client_contacts (
      id INTEGER PRIMARY KEY,
      qbo_customer_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      role TEXT,
      is_invoice_recipient INTEGER NOT NULL DEFAULT 1,
      active INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      created_date DATETIME NOT NULL,
      updated_date DATETIME,
      created_by TEXT NOT NULL,
      updated_by TEXT
    )`
  ).run()

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS invoice_contact_recipients (
      id INTEGER PRIMARY KEY,
      invoice_id INTEGER NOT NULL,
      contact_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (contact_id) REFERENCES client_contacts(id)
    )`
  ).run()

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS project_managers (
      qbo_project_id TEXT PRIMARY KEY,
      manager_name TEXT NOT NULL,
      manager_email TEXT NOT NULL,
      updated_date DATETIME NOT NULL,
      updated_by TEXT NOT NULL
    )`
  ).run()

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS project_billing_profiles (
      qbo_project_id TEXT PRIMARY KEY,
      po_number TEXT,
      invoice_document_note TEXT,
      updated_date DATETIME NOT NULL,
      updated_by TEXT NOT NULL
    )`
  ).run()

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS project_invoice_documents (
      id INTEGER PRIMARY KEY,
      qbo_project_id TEXT NOT NULL,
      r2_key TEXT NOT NULL UNIQUE,
      filename TEXT NOT NULL,
      content_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_date DATETIME NOT NULL,
      created_by TEXT NOT NULL,
      updated_date DATETIME,
      updated_by TEXT
    )`
  ).run()

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS project_lifecycle (
      qbo_project_id TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK (status IN ('proposal', 'active', 'hold', 'complete', 'cancelled')),
      updated_date DATETIME NOT NULL,
      updated_by TEXT NOT NULL,
      FOREIGN KEY (qbo_project_id) REFERENCES qbo_customers(qbo_id)
    )`
  ).run()

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS project_property_profiles (
      qbo_project_id TEXT PRIMARY KEY,
      parcel_id TEXT NOT NULL DEFAULT '',
      updated_date DATETIME NOT NULL,
      updated_by TEXT NOT NULL,
      FOREIGN KEY (qbo_project_id) REFERENCES qbo_customers(qbo_id)
    )`
  ).run()

  await db.prepare(
    `INSERT OR IGNORE INTO project_lifecycle (qbo_project_id, status, updated_date, updated_by)
     SELECT qbo_id, CASE WHEN active = 1 THEN 'active' ELSE 'complete' END, CURRENT_TIMESTAMP, 'migration'
     FROM qbo_customers
     WHERE parent_id IS NOT NULL AND parent_id != ''`
  ).run()

  for (const statement of [
    'CREATE INDEX IF NOT EXISTS idx_client_contacts_qbo_customer_id ON client_contacts(qbo_customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_client_contacts_email ON client_contacts(email)',
    'CREATE INDEX IF NOT EXISTS idx_invoice_contact_recipients_invoice_id ON invoice_contact_recipients(invoice_id)',
    'CREATE INDEX IF NOT EXISTS idx_project_managers_email ON project_managers(manager_email)',
    'CREATE INDEX IF NOT EXISTS idx_project_invoice_documents_project_id ON project_invoice_documents(qbo_project_id)',
    'CREATE INDEX IF NOT EXISTS idx_project_lifecycle_status ON project_lifecycle(status)',
    'CREATE INDEX IF NOT EXISTS idx_project_property_profiles_parcel_id ON project_property_profiles(parcel_id)',
  ]) {
    await db.prepare(statement).run()
  }
}

export async function ensureProjectManagementSchemaReady(db: D1Database): Promise<void> {
  await ensureQboSchemaReady(db)
  await ensureProjectManagementSchema(db)
}

export async function fetchProjectManager(db: D1Database, qboProjectId: string) {
  await ensureProjectManagementSchemaReady(db)
  const row = await db.prepare('SELECT * FROM project_managers WHERE qbo_project_id = ?').bind(qboProjectId).first<ProjectManagerRow>()
  return mapProjectManagerRow(row)
}

export async function fetchProjectBillingProfile(db: D1Database, qboProjectId: string): Promise<ProjectBillingProfile> {
  await ensureProjectManagementSchemaReady(db)
  const row = await db.prepare('SELECT * FROM project_billing_profiles WHERE qbo_project_id = ?').bind(qboProjectId).first<ProjectBillingProfileRow>()
  return mapProjectBillingProfileRow(row, qboProjectId)
}

export async function fetchProjectInvoiceDocuments(db: D1Database, qboProjectId: string, includeInactive = false): Promise<ProjectInvoiceDocument[]> {
  await ensureProjectManagementSchemaReady(db)
  const rows = await db.prepare(
    `SELECT * FROM project_invoice_documents
     WHERE qbo_project_id = ? ${includeInactive ? '' : 'AND active = 1'}
     ORDER BY created_date DESC, id DESC`
  ).bind(qboProjectId).all()
  return (rows.results || []).map((row) => mapProjectInvoiceDocumentRow(row as ProjectInvoiceDocumentRow))
}

export async function fetchClientContacts(db: D1Database, qboCustomerId: string, includeInactive = false): Promise<ClientContact[]> {
  await ensureProjectManagementSchemaReady(db)
  const rows = await db.prepare(
    `SELECT * FROM client_contacts
     WHERE qbo_customer_id = ? ${includeInactive ? '' : 'AND active = 1'}
     ORDER BY is_invoice_recipient DESC, name ASC, email ASC`
  ).bind(qboCustomerId).all()
  return (rows.results || []).map((row) => mapClientContactRow(row as ClientContactRow))
}

async function fetchCustomer(db: D1Database, qboCustomerId: string, projectOnly = false): Promise<QboCustomer | null> {
  const conditions = projectOnly ? 'qbo_id = ? AND parent_id IS NOT NULL AND parent_id != ?' : 'qbo_id = ?'
  const statement = db.prepare(`SELECT * FROM qbo_customers WHERE ${conditions}`)
  const row = projectOnly
    ? await statement.bind(qboCustomerId, '').first<QboCustomerRow>()
    : await statement.bind(qboCustomerId).first<QboCustomerRow>()
  return row ? mapQboCustomer(row) : null
}

export async function fetchActiveClientContactsByIds(db: D1Database, qboCustomerId: string, contactIds: string[]): Promise<ClientContact[]> {
  await ensureProjectManagementSchemaReady(db)
  const uniqueIds = Array.from(new Set(contactIds.map((id) => normalizeString(id)).filter(Boolean)))
  if (uniqueIds.length === 0) {
    return []
  }
  const placeholders = uniqueIds.map(() => '?').join(', ')
  const rows = await db.prepare(
    `SELECT * FROM client_contacts
     WHERE qbo_customer_id = ? AND active = 1 AND id IN (${placeholders})
     ORDER BY name ASC, email ASC`
  ).bind(qboCustomerId, ...uniqueIds).all()
  return (rows.results || []).map((row) => mapClientContactRow(row as ClientContactRow))
}

async function parseJsonBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('Content-Type') || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error('Content-Type must be application/json')
  }
  const parsed = await request.json()
  return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}
}

function parseAddressPayload(value: unknown): ClientCreatePayload['address'] | Response {
  const address = value && typeof value === 'object' ? value as AddressPayload : {}
  const parsed = {
    line1: normalizeString(address.line1),
    line2: normalizeString(address.line2),
    city: normalizeString(address.city),
    state: normalizeString(address.state) as State,
    postalCode: normalizeString(address.postalCode),
  }
  if (!parsed.line1) return badRequest('address.line1 is required')
  if (!parsed.city) return badRequest('address.city is required')
  if (!parsed.state) return badRequest('address.state is required')
  if (!parsed.postalCode) return badRequest('address.postalCode is required')
  return parsed
}

function parseCustomerUpdatePayload(body: Record<string, unknown>): ClientUpdatePayload | Response {
  const name = normalizeString(body.name)
  const address = parseAddressPayload(body.address)
  const email = normalizeString(body.email).toLowerCase()
  if (!name) return badRequest('name is required')
  if (address instanceof Response) return address
  if (!isOptionalEmail(email)) return badRequest('A valid email is required')
  return {
    name,
    address,
    phone: normalizeString(body.phone),
    email,
  }
}

async function fetchProjectSummary(db: D1Database, qboProjectId: string) {
  const row = await db.prepare(
    `SELECT project.*, client.display_name AS parent_display_name, lifecycle.status AS project_status, property.parcel_id
     FROM qbo_customers project
     LEFT JOIN qbo_customers client ON client.qbo_id = project.parent_id
     LEFT JOIN project_lifecycle lifecycle ON lifecycle.qbo_project_id = project.qbo_id
     LEFT JOIN project_property_profiles property ON property.qbo_project_id = project.qbo_id
     WHERE project.qbo_id = ? AND project.parent_id IS NOT NULL AND project.parent_id != ''`
  ).bind(qboProjectId).first<QboCustomerRow & { parent_display_name?: unknown }>()
  if (!row) return null
  return { ...mapQboCustomer(row), parentDisplayName: normalizeString(row.parent_display_name), parcelId: normalizeString((row as Record<string, unknown>).parcel_id), status: normalizeProjectStatus((row as Record<string, unknown>).project_status, normalizeBool(row.active) ? 'active' : 'complete') }
}

function parseProjectPayload(body: Record<string, unknown>): Omit<ProjectUpdatePayload, 'parentCustomerId'> | Response {
  const name = normalizeString(body.name)
  const address = parseAddressPayload(body.address)
  if (!name) return badRequest('name is required')
  if (address instanceof Response) return address
  if (!isValidProjectName(name)) return badRequest('Project name must use YY-#### - Project Name')
  return {
    name,
    address,
    parcelId: normalizeString(body.parcelId),
  }
}

async function saveProjectStatus(db: D1Database, qboProjectId: string, status: ProjectStatus, updatedBy: string): Promise<void> {
  await db.prepare(
    `INSERT INTO project_lifecycle (qbo_project_id, status, updated_date, updated_by)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(qbo_project_id) DO UPDATE SET
       status = excluded.status,
       updated_date = excluded.updated_date,
       updated_by = excluded.updated_by`
  ).bind(qboProjectId, status, nowIso(), updatedBy).run()
}

async function saveProjectParcelId(db: D1Database, qboProjectId: string, parcelId: string, updatedBy: string): Promise<void> {
  await db.prepare(
    `INSERT INTO project_property_profiles (qbo_project_id, parcel_id, updated_date, updated_by)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(qbo_project_id) DO UPDATE SET
       parcel_id = excluded.parcel_id,
       updated_date = excluded.updated_date,
       updated_by = excluded.updated_by`
  ).bind(qboProjectId, parcelId, nowIso(), updatedBy).run()
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function sanitizeFilename(value: string): string {
  return normalizeString(value).replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').slice(0, 180) || 'invoice-document.pdf'
}

export function createProjectManagementApi() {
  const app = new Hono<HonoEnv>()

  app.get('/api/clients', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureProjectManagementSchemaReady(context.env.DB)
      const search = normalizeString(context.req.query('search'))
      const status = normalizeString(context.req.query('status')).toLowerCase() || 'active'
      if (!['active', 'inactive', 'all'].includes(status)) return badRequest('status must be active, inactive, or all')
      const conditions = ['(parent_id IS NULL OR parent_id = \'\')']
      const bindings: string[] = []
      if (status !== 'all') {
        conditions.push('active = ?')
        bindings.push(status === 'active' ? '1' : '0')
      }
      if (search) {
        conditions.push('(display_name LIKE ? OR fully_qualified_name LIKE ? OR primary_email LIKE ?)')
        const like = `%${search}%`
        bindings.push(like, like, like)
      }
      const rows = await context.env.DB.prepare(
        `SELECT * FROM qbo_customers
         WHERE ${conditions.join(' AND ')}
         ORDER BY display_name ASC
         LIMIT 500`
      ).bind(...bindings).all()
      return jsonResponse({ clients: (rows.results || []).map((row) => mapQboCustomer(row as QboCustomerRow)) })
    } catch (error: unknown) {
      console.error('Error listing clients:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.post('/api/clients', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureProjectManagementSchemaReady(context.env.DB)
      const body = await parseJsonBody(context.req.raw)
      const name = normalizeString(body.name)
      const address = parseAddressPayload(body.address)
      const email = normalizeString(body.email).toLowerCase()
      if (!name) return badRequest('name is required')
      if (address instanceof Response) return address
      if (!isOptionalEmail(email)) return badRequest('A valid email is required')
      const payload: ClientCreatePayload = {
        name,
        address,
        phone: normalizeString(body.phone),
        email,
      }
      const client = await createQboClientCustomer(context.env.DB, context.env, payload)
      return jsonResponse({ client }, { status: 201 })
    } catch (error: unknown) {
      console.error('Error creating client:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.get('/api/clients/:id', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureProjectManagementSchemaReady(context.env.DB)
      const client = await fetchCustomer(context.env.DB, normalizeString(context.req.param('id')))
      if (!client || client.parentId) {
        return jsonResponse({ error: 'Client not found' }, { status: 404 })
      }
      const contacts = await fetchClientContacts(context.env.DB, client.id, true)
      return jsonResponse({ client, contacts })
    } catch (error: unknown) {
      console.error('Error fetching client:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.put('/api/clients/:id', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureProjectManagementSchemaReady(context.env.DB)
      const qboCustomerId = normalizeString(context.req.param('id'))
      const client = await fetchCustomer(context.env.DB, qboCustomerId)
      if (!client || client.parentId) {
        return jsonResponse({ error: 'Client not found' }, { status: 404 })
      }
      const body = await parseJsonBody(context.req.raw)
      const payload = parseCustomerUpdatePayload(body)
      if (payload instanceof Response) return payload
      const updated = await updateQboClientCustomer(context.env.DB, context.env, client, payload)
      return jsonResponse({ client: updated })
    } catch (error: unknown) {
      console.error('Error updating client:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.put('/api/clients/:id/status', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureProjectManagementSchemaReady(context.env.DB)
      const client = await fetchCustomer(context.env.DB, normalizeString(context.req.param('id')))
      if (!client || client.parentId) return jsonResponse({ error: 'Client not found' }, { status: 404 })
      const body = await parseJsonBody(context.req.raw) as StatusPayload
      const status = normalizeString(body.status).toLowerCase()
      if (status !== 'active' && status !== 'inactive') return badRequest('status must be active or inactive')
      const updated = await updateQboCustomerActiveState(context.env.DB, context.env, client, status === 'active')
      return jsonResponse({ client: updated })
    } catch (error: unknown) {
      console.error('Error updating client status:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.get('/api/clients/:id/contacts', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      const contacts = await fetchClientContacts(context.env.DB, normalizeString(context.req.param('id')), context.req.query('includeInactive') === 'true')
      return jsonResponse({ contacts })
    } catch (error: unknown) {
      console.error('Error listing client contacts:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.post('/api/clients/:id/contacts', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureProjectManagementSchemaReady(context.env.DB)
      const qboCustomerId = normalizeString(context.req.param('id'))
      const client = await fetchCustomer(context.env.DB, qboCustomerId)
      if (!client || client.parentId) {
        return jsonResponse({ error: 'Client not found' }, { status: 404 })
      }
      const payload = await parseJsonBody(context.req.raw) as ContactPayload
      const name = normalizeString(payload.name)
      const email = normalizeString(payload.email).toLowerCase()
      if (!name) return badRequest('name is required')
      if (!isEmail(email)) return badRequest('A valid email is required')
      const date = nowIso()
      const user = context.get('auth').subject || 'unknown-user'
      const insert = await context.env.DB.prepare(
        `INSERT INTO client_contacts (
          qbo_customer_id, name, email, phone, role, is_invoice_recipient, active, notes, created_date, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        qboCustomerId,
        name,
        email,
        normalizeString(payload.phone),
        normalizeString(payload.role),
        normalizeBool(payload.isInvoiceRecipient, true) ? 1 : 0,
        normalizeBool(payload.active, true) ? 1 : 0,
        normalizeString(payload.notes),
        date,
        user,
        user
      ).run()
      const contacts = await fetchClientContacts(context.env.DB, qboCustomerId, true)
      const contact = contacts.find((entry) => entry.id === String(insert.meta.last_row_id))
      return jsonResponse({ contact }, { status: 201 })
    } catch (error: unknown) {
      console.error('Error creating client contact:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.put('/api/clients/:id/contacts/:contactId', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureProjectManagementSchemaReady(context.env.DB)
      const qboCustomerId = normalizeString(context.req.param('id'))
      const contactId = normalizeString(context.req.param('contactId'))
      const payload = await parseJsonBody(context.req.raw) as ContactPayload
      const name = normalizeString(payload.name)
      const email = normalizeString(payload.email).toLowerCase()
      if (!name) return badRequest('name is required')
      if (!isEmail(email)) return badRequest('A valid email is required')
      const date = nowIso()
      await context.env.DB.prepare(
        `UPDATE client_contacts
         SET name = ?, email = ?, phone = ?, role = ?, is_invoice_recipient = ?, active = ?, notes = ?, updated_date = ?, updated_by = ?
         WHERE id = ? AND qbo_customer_id = ?`
      ).bind(
        name,
        email,
        normalizeString(payload.phone),
        normalizeString(payload.role),
        normalizeBool(payload.isInvoiceRecipient, true) ? 1 : 0,
        normalizeBool(payload.active, true) ? 1 : 0,
        normalizeString(payload.notes),
        date,
        context.get('auth').subject || 'unknown-user',
        contactId,
        qboCustomerId
      ).run()
      const contacts = await fetchClientContacts(context.env.DB, qboCustomerId, true)
      const contact = contacts.find((entry) => entry.id === contactId)
      if (!contact) return jsonResponse({ error: 'Contact not found' }, { status: 404 })
      return jsonResponse({ contact })
    } catch (error: unknown) {
      console.error('Error updating client contact:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.delete('/api/clients/:id/contacts/:contactId', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureProjectManagementSchemaReady(context.env.DB)
      await context.env.DB.prepare(
        `UPDATE client_contacts
         SET active = 0, updated_date = ?, updated_by = ?
         WHERE id = ? AND qbo_customer_id = ?`
      ).bind(nowIso(), context.get('auth').subject || 'unknown-user', normalizeString(context.req.param('contactId')), normalizeString(context.req.param('id'))).run()
      return noContent()
    } catch (error: unknown) {
      console.error('Error deleting client contact:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.get('/api/projects', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureProjectManagementSchemaReady(context.env.DB)
      const search = normalizeString(context.req.query('search'))
      const parentCustomerId = normalizeString(context.req.query('parentCustomerId'))
      const status = normalizeString(context.req.query('status')).toLowerCase() || 'current'
      if (status !== 'all' && status !== 'current' && !(PROJECT_STATUSES as readonly string[]).includes(status)) {
        return badRequest('Invalid project status filter')
      }
      const conditions = ['project.parent_id IS NOT NULL', 'project.parent_id != \'\'']
      const bindings: string[] = []
      if (status === 'current') {
        conditions.push('project.active = 1')
        conditions.push(`lifecycle.status IN (${CURRENT_PROJECT_STATUSES.map(() => '?').join(', ')})`)
        bindings.push(...CURRENT_PROJECT_STATUSES)
      } else if (status !== 'all') {
        conditions.push('lifecycle.status = ?')
        bindings.push(status)
      }
      if (parentCustomerId) {
        conditions.push('project.parent_id = ?')
        bindings.push(parentCustomerId)
      }
      if (search) {
        conditions.push('(project.display_name LIKE ? OR project.fully_qualified_name LIKE ? OR client.display_name LIKE ?)')
        const like = `%${search}%`
        bindings.push(like, like, like)
      }
      const rows = await context.env.DB.prepare(
        `SELECT project.*, client.display_name AS parent_display_name, lifecycle.status AS project_status, property.parcel_id
         FROM qbo_customers project
         LEFT JOIN qbo_customers client ON client.qbo_id = project.parent_id
         LEFT JOIN project_lifecycle lifecycle ON lifecycle.qbo_project_id = project.qbo_id
         LEFT JOIN project_property_profiles property ON property.qbo_project_id = project.qbo_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY project.display_name ASC
         LIMIT 500`
      ).bind(...bindings).all()
      return jsonResponse({ projects: (rows.results || []).map((row) => ({ ...mapQboCustomer(row as QboCustomerRow), parentDisplayName: normalizeString((row as Record<string, unknown>).parent_display_name), parcelId: normalizeString((row as Record<string, unknown>).parcel_id), status: normalizeProjectStatus((row as Record<string, unknown>).project_status, normalizeBool((row as QboCustomerRow).active) ? 'active' : 'complete') })) })
    } catch (error: unknown) {
      console.error('Error listing projects:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.post('/api/projects', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureProjectManagementSchemaReady(context.env.DB)
      const body = await parseJsonBody(context.req.raw)
      const parentCustomerId = normalizeString(body.parentCustomerId)
      const projectPayload = parseProjectPayload(body)
      if (!parentCustomerId) return badRequest('parentCustomerId is required')
      const client = await fetchCustomer(context.env.DB, parentCustomerId)
      if (!client || client.parentId || !client.active) return badRequest('Selected parent client was not found or is inactive')
      if (projectPayload instanceof Response) return projectPayload
      const payload: ProjectCreatePayload = {
        parentCustomerId,
        ...projectPayload,
      }
      const created = await createQboProjectCustomer(context.env.DB, context.env, payload)
      const user = context.get('auth').subject || 'unknown-user'
      await Promise.all([saveProjectStatus(context.env.DB, created.id, 'proposal', user), saveProjectParcelId(context.env.DB, created.id, payload.parcelId, user)])
      const project = await fetchProjectSummary(context.env.DB, created.id)
      return jsonResponse({ project: project || created }, { status: 201 })
    } catch (error: unknown) {
      console.error('Error creating project:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.put('/api/projects/:id/status', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureProjectManagementSchemaReady(context.env.DB)
      const qboProjectId = normalizeString(context.req.param('id'))
      const project = await fetchCustomer(context.env.DB, qboProjectId, true)
      if (!project) return jsonResponse({ error: 'Project not found' }, { status: 404 })
      const body = await parseJsonBody(context.req.raw) as StatusPayload
      const status = normalizeString(body.status).toLowerCase()
      if (!(PROJECT_STATUSES as readonly string[]).includes(status)) return badRequest('Invalid project status')
      await saveProjectStatus(context.env.DB, qboProjectId, status as ProjectStatus, context.get('auth').subject || 'unknown-user')
      const updated = await fetchProjectSummary(context.env.DB, qboProjectId)
      return jsonResponse({ project: updated || project })
    } catch (error: unknown) {
      console.error('Error updating project status:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.get('/api/projects/:id', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureProjectManagementSchemaReady(context.env.DB)
      const project = await fetchCustomer(context.env.DB, normalizeString(context.req.param('id')), true)
      if (!project) {
        return jsonResponse({ error: 'Project not found' }, { status: 404 })
      }
      const client = await fetchCustomer(context.env.DB, project.parentId)
      const manager = await fetchProjectManager(context.env.DB, project.id)
      const billingProfile = await fetchProjectBillingProfile(context.env.DB, project.id)
      const invoiceDocuments = await fetchProjectInvoiceDocuments(context.env.DB, project.id)
      const summary = await fetchProjectSummary(context.env.DB, project.id)
      return jsonResponse({ project: summary || project, client, manager, billingProfile, invoiceDocuments })
    } catch (error: unknown) {
      console.error('Error fetching project:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.put('/api/projects/:id/billing', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureProjectManagementSchemaReady(context.env.DB)
      const qboProjectId = normalizeString(context.req.param('id'))
      const project = await fetchCustomer(context.env.DB, qboProjectId, true)
      if (!project) {
        return jsonResponse({ error: 'Project not found' }, { status: 404 })
      }
      const payload = await parseJsonBody(context.req.raw) as ProjectBillingPayload
      const date = nowIso()
      const user = context.get('auth').subject || 'unknown-user'
      await context.env.DB.prepare(
        `INSERT INTO project_billing_profiles (qbo_project_id, po_number, invoice_document_note, updated_date, updated_by)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(qbo_project_id) DO UPDATE SET
           po_number = excluded.po_number,
           invoice_document_note = excluded.invoice_document_note,
           updated_date = excluded.updated_date,
           updated_by = excluded.updated_by`
      ).bind(
        qboProjectId,
        normalizeString(payload.poNumber),
        normalizeString(payload.invoiceDocumentNote),
        date,
        user
      ).run()
      return jsonResponse({ billingProfile: await fetchProjectBillingProfile(context.env.DB, qboProjectId) })
    } catch (error: unknown) {
      console.error('Error saving project billing profile:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.get('/api/projects/:id/documents', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureProjectManagementSchemaReady(context.env.DB)
      const qboProjectId = normalizeString(context.req.param('id'))
      const project = await fetchCustomer(context.env.DB, qboProjectId, true)
      if (!project) {
        return jsonResponse({ error: 'Project not found' }, { status: 404 })
      }
      return jsonResponse({ invoiceDocuments: await fetchProjectInvoiceDocuments(context.env.DB, qboProjectId) })
    } catch (error: unknown) {
      console.error('Error listing project invoice documents:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.post('/api/projects/:id/documents', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureProjectManagementSchemaReady(context.env.DB)
      const qboProjectId = normalizeString(context.req.param('id'))
      const project = await fetchCustomer(context.env.DB, qboProjectId, true)
      if (!project) {
        return jsonResponse({ error: 'Project not found' }, { status: 404 })
      }
      const payload = await parseJsonBody(context.req.raw) as ProjectDocumentPayload
      const filename = sanitizeFilename(normalizeString(payload.filename))
      const contentType = normalizeString(payload.contentType ?? payload.mimetype) || 'application/octet-stream'
      const data = normalizeString(payload.data)
      if (!filename || !data) {
        return badRequest('filename and data are required')
      }
      const bytes = decodeBase64(data)
      if (bytes.byteLength === 0) {
        return badRequest('Document data is empty')
      }
      const date = nowIso()
      const user = context.get('auth').subject || 'unknown-user'
      const r2Key = `project-invoice-documents/${encodeURIComponent(qboProjectId)}/${date.replace(/[:.]/g, '-')}-${createStorageToken()}-${filename}`
      await context.env.INVOICE_DOCUMENTS.put(r2Key, bytes, {
        httpMetadata: { contentType },
        customMetadata: { qboProjectId, filename, uploadedBy: user },
      })
      const insert = await context.env.DB.prepare(
        `INSERT INTO project_invoice_documents (
          qbo_project_id, r2_key, filename, content_type, size_bytes, active, created_date, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`
      ).bind(qboProjectId, r2Key, filename, contentType, bytes.byteLength, date, user, user).run()
      const documents = await fetchProjectInvoiceDocuments(context.env.DB, qboProjectId)
      return jsonResponse({ invoiceDocument: documents.find((document) => document.id === String(insert.meta.last_row_id)), invoiceDocuments: documents }, { status: 201 })
    } catch (error: unknown) {
      console.error('Error uploading project invoice document:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.get('/api/projects/:id/documents/:documentId/download', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureProjectManagementSchemaReady(context.env.DB)
      const qboProjectId = normalizeString(context.req.param('id'))
      const documentId = normalizeString(context.req.param('documentId'))
      const row = await context.env.DB.prepare(
        `SELECT * FROM project_invoice_documents
         WHERE id = ? AND qbo_project_id = ? AND active = 1`
      ).bind(documentId, qboProjectId).first<ProjectInvoiceDocumentRow>()
      const document = row ? mapProjectInvoiceDocumentRow(row) : null
      if (!document) {
        return jsonResponse({ error: 'Document not found' }, { status: 404 })
      }
      const object = await context.env.INVOICE_DOCUMENTS.get(document.r2Key)
      if (!object) {
        return jsonResponse({ error: 'Document file not found' }, { status: 404 })
      }
      return new Response(object.body, {
        headers: {
          'Content-Type': document.contentType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${document.filename.replace(/"/g, '')}"`,
        },
      })
    } catch (error: unknown) {
      console.error('Error downloading project invoice document:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.delete('/api/projects/:id/documents/:documentId', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureProjectManagementSchemaReady(context.env.DB)
      const qboProjectId = normalizeString(context.req.param('id'))
      const documentId = normalizeString(context.req.param('documentId'))
      const date = nowIso()
      await context.env.DB.prepare(
        `UPDATE project_invoice_documents
         SET active = 0, updated_date = ?, updated_by = ?
         WHERE id = ? AND qbo_project_id = ?`
      ).bind(date, context.get('auth').subject || 'unknown-user', documentId, qboProjectId).run()
      return noContent()
    } catch (error: unknown) {
      console.error('Error deleting project invoice document:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.put('/api/projects/:id', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureProjectManagementSchemaReady(context.env.DB)
      const qboProjectId = normalizeString(context.req.param('id'))
      const project = await fetchCustomer(context.env.DB, qboProjectId, true)
      if (!project) {
        return jsonResponse({ error: 'Project not found' }, { status: 404 })
      }
      const body = await parseJsonBody(context.req.raw)
      const projectPayload = parseProjectPayload(body)
      const parentCustomerId = normalizeString(body.parentCustomerId)
      if (!parentCustomerId) return badRequest('parentCustomerId is required')
      const client = await fetchCustomer(context.env.DB, parentCustomerId)
      if (!client || client.parentId || !client.active) return badRequest('Selected parent client was not found or is inactive')
      if (projectPayload instanceof Response) return projectPayload
      const payload: ProjectUpdatePayload = { parentCustomerId, ...projectPayload }
      const current = project.parentId === parentCustomerId
        ? project
        : await moveQboProjectCustomer(context.env.DB, context.env, project, parentCustomerId)
      const updated = await updateQboProjectCustomer(context.env.DB, context.env, current, payload)
      await saveProjectParcelId(context.env.DB, updated.id, payload.parcelId, context.get('auth').subject || 'unknown-user')
      const summary = await fetchProjectSummary(context.env.DB, updated.id)
      return jsonResponse({ project: summary || updated })
    } catch (error: unknown) {
      console.error('Error updating project:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.put('/api/projects/:id/client', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureProjectManagementSchemaReady(context.env.DB)
      const qboProjectId = normalizeString(context.req.param('id'))
      const project = await fetchCustomer(context.env.DB, qboProjectId, true)
      if (!project) {
        return jsonResponse({ error: 'Project not found' }, { status: 404 })
      }
      const payload = await parseJsonBody(context.req.raw) as ProjectMovePayload
      const parentCustomerId = normalizeString(payload.parentCustomerId)
      if (!parentCustomerId) return badRequest('parentCustomerId is required')
      const client = await fetchCustomer(context.env.DB, parentCustomerId)
      if (!client || client.parentId) return badRequest('Selected parent client was not found')
      if (project.parentId === parentCustomerId) {
        const unchanged = await fetchProjectSummary(context.env.DB, project.id)
        return jsonResponse({ project: unchanged || project })
      }
      const moved = await moveQboProjectCustomer(context.env.DB, context.env, project, parentCustomerId)
      const summary = await fetchProjectSummary(context.env.DB, moved.id)
      return jsonResponse({ project: summary || moved })
    } catch (error: unknown) {
      console.error('Error moving project:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.put('/api/projects/:id/manager', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureProjectManagementSchemaReady(context.env.DB)
      const qboProjectId = normalizeString(context.req.param('id'))
      const project = await fetchCustomer(context.env.DB, qboProjectId, true)
      if (!project) {
        return jsonResponse({ error: 'Project not found' }, { status: 404 })
      }
      const payload = await parseJsonBody(context.req.raw) as ProjectManagerPayload
      const managerName = normalizeString(payload.managerName)
      const managerEmail = normalizeString(payload.managerEmail).toLowerCase()
      if (!managerName && !managerEmail) {
        await context.env.DB.prepare('DELETE FROM project_managers WHERE qbo_project_id = ?').bind(qboProjectId).run()
        return jsonResponse({ manager: null })
      }
      if (!managerName) return badRequest('managerName is required')
      if (!isEmail(managerEmail)) return badRequest('A valid managerEmail is required')
      await context.env.DB.prepare(
        `INSERT INTO project_managers (qbo_project_id, manager_name, manager_email, updated_date, updated_by)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(qbo_project_id) DO UPDATE SET
           manager_name = excluded.manager_name,
           manager_email = excluded.manager_email,
           updated_date = excluded.updated_date,
           updated_by = excluded.updated_by`
      ).bind(qboProjectId, managerName, managerEmail, nowIso(), context.get('auth').subject || 'unknown-user').run()
      return jsonResponse({ manager: await fetchProjectManager(context.env.DB, qboProjectId) })
    } catch (error: unknown) {
      console.error('Error saving project manager:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  return app
}
