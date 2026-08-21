import type {
  Invoice,
  InvoiceContactRecipient,
  InvoiceContactRecipientRow,
  InvoiceLineItem,
  InvoiceLineItemRow,
  InvoicePayment,
  InvoicePaymentKind,
  InvoicePaymentRow,
  InvoiceRow,
  InvoiceStatus,
  ProjectManager,
  ProjectInvoiceDocument,
} from 'cfdg/types'
import { Hono } from 'hono'
import { invoiceSyncState, paymentSyncState, payoutSyncState } from './accountingSyncState'
import { badRequest, jsonResponse, requireAuthMode, serverError, type HonoEnv } from './apiTypes'
import { ensureQboSchemaReady, syncInvoiceToQbo, syncStripePayoutDepositToQbo, trySyncInvoicePaymentToQbo, voidInvoiceInQbo } from './qboApi'
import { ensureProjectManagementSchemaReady, fetchActiveClientContactsByIds, fetchProjectBillingProfile, fetchProjectInvoiceDocuments, fetchProjectManager } from './projectManagementApi'
import { INVOICE_STATUSES } from 'cfdg/types/constants'
import { mapInvoiceContactRecipientRow, mapInvoiceLineItemRow, mapInvoicePaymentRow, mapInvoiceRow } from 'cfdg/types/mappers'

type InvoiceLineItemInput = {
  projectTaskId?: unknown
  description?: unknown
  quantity?: unknown
  unitAmountCents?: unknown
  contractAmountCents?: unknown
  percentComplete?: unknown
  billInFull?: unknown
}

type InvoicePayload = {
  qboCustomerId?: unknown
  qboProjectId?: unknown
  clientName?: unknown
  clientEmail?: unknown
  contactIds?: unknown
  poNumber?: unknown
  projectReference?: unknown
  issueDate?: unknown
  dueDate?: unknown
  notes?: unknown
  internalNote?: unknown
  previouslyBilledCents?: unknown
  updatedBy?: unknown
  createdBy?: unknown
  lineItems?: unknown
}

type BillingSnapshot = {
  clientName: string
  email: string
  addressLine1: string
  addressLine2: string
  addressCity: string
  addressState: string
  addressPostalCode: string
}

type ProjectAddressSnapshot = {
  addressLine1: string
  addressLine2: string
  addressCity: string
  addressState: string
  addressPostalCode: string
}

type InvoiceEmailAttachment = {
  filename?: unknown
  data?: unknown
  mimetype?: unknown
}

type NormalizedEmailAttachment = {
  name: string
  content: string
  type: string
}

type InvoiceEmailDeliveryStatePayload = {
  status: 'accepted' | 'warning' | 'failed'
  event: string
  recipient: string
  reason: string
  messageId: string
  updatedDate: string
  noticeSentDate: string
  noticeRecipients: string[]
}

type BrevoSendResponse = {
  messageId?: string
  messageIds?: string[]
}

type BrevoWebhookPayload = Record<string, unknown>

type SendInvoicePayload = {
  attachment?: InvoiceEmailAttachment
  attachments?: InvoiceEmailAttachment[]
  bccSenderEmail?: unknown
}

type StripeCheckoutSession = {
  id?: string
  client_secret?: string
  url?: string
  payment_intent?: string
  amount_total?: number
  payment_status?: string
  metadata?: Record<string, string>
}

type StripePayout = {
  id?: string
  amount?: number
  arrival_date?: number
  created?: number
  status?: string
}

type StripePaymentIntent = {
  id?: string
  client_secret?: string
  status?: string
  amount?: number
  amount_received?: number
  metadata?: Record<string, string>
  payment_method?: string | StripePaymentMethod
  latest_charge?: string | { id?: string; balance_transaction?: string | StripeBalanceTransaction }
}

type StripePaymentMethod = {
  id?: string
  type?: string
}

type StripeCharge = {
  id?: string
  balance_transaction?: string | StripeBalanceTransaction
}

type StripeBalanceTransaction = {
  id?: string
  amount?: number
  fee?: number
  net?: number
  source?: string
  type?: string
}

type StripeListResponse<T> = {
  data?: T[]
  has_more?: boolean
}

type StripePaymentDetails = {
  chargeId: string
  balanceTransactionId: string
  grossCents: number
  feeCents: number
  netCents: number
  method: string
  paymentMethodResolved: boolean
}

const invoiceSchemaReadyByDb = new WeakMap<D1Database, Promise<void>>()
const ACCOUNTING_ACCESS_GROUP_ID = '1cb77436-5086-490c-8b77-49056339667b'

type GraphTokenResponse = {
  access_token?: string
  error_description?: string
}

type GraphUser = {
  displayName?: string
  mail?: string
  userPrincipalName?: string
}

type GraphListResponse<T> = {
  value?: T[]
  '@odata.nextLink'?: string
  error?: { message?: string }
}

function normalizeString(value: unknown): string {
  return String(value ?? '').trim()
}

function getStripeSecretKey(env: HonoEnv['Bindings']): string {
  const stripeSecretKey = normalizeString(env.STRIPE_SECRET_KEY)
  if (!stripeSecretKey) {
    throw new Error('Server configuration error: Missing STRIPE_SECRET_KEY')
  }
  if (stripeSecretKey.startsWith('pk_')) {
    throw new Error('Server configuration error: STRIPE_SECRET_KEY is set to a publishable key. Set it to a Stripe secret key that starts with sk_.')
  }
  if (!stripeSecretKey.startsWith('sk_')) {
    throw new Error('Server configuration error: STRIPE_SECRET_KEY must be a Stripe secret key that starts with sk_.')
  }
  return stripeSecretKey
}

function getStripePublishableKey(env: HonoEnv['Bindings']): string {
  const publishableKey = normalizeString(env.STRIPE_PUBLISHABLE_KEY)
  if (!publishableKey) {
    throw new Error('Server configuration error: Missing STRIPE_PUBLISHABLE_KEY')
  }
  if (publishableKey.startsWith('sk_')) {
    throw new Error('Server configuration error: STRIPE_PUBLISHABLE_KEY is set to a secret key. Set it to a Stripe publishable key that starts with pk_.')
  }
  if (!publishableKey.startsWith('pk_')) {
    throw new Error('Server configuration error: STRIPE_PUBLISHABLE_KEY must be a Stripe publishable key that starts with pk_.')
  }
  return publishableKey
}

function normalizeNumber(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeAmountCents(value: unknown): number {
  return Math.max(0, Math.round(normalizeNumber(value)))
}

function normalizeBoolean(value: unknown): boolean {
  return value === true || value === 'true' || normalizeNumber(value) === 1
}

function nowIso(): string {
  return new Date().toISOString()
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function fromUnixDateSeconds(value: unknown): string {
  const seconds = normalizeNumber(value)
  if (!seconds) return ''
  return new Date(seconds * 1000).toISOString()
}

function createPublicToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function isInvoiceStatus(value: string): value is InvoiceStatus {
  return (INVOICE_STATUSES as readonly string[]).includes(value)
}

async function ensureColumn(db: D1Database, tableName: 'invoices' | 'invoice_line_items' | 'invoice_payments' | 'stripe_payouts', columnDefinitionSql: string): Promise<void> {
  try {
    await db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinitionSql}`).run()
  } catch (error: unknown) {
    const message = String(error instanceof Error ? error.message : error).toLowerCase()
    if (!message.includes('duplicate column name')) {
      throw error
    }
  }
}

async function backfillInvoiceBillingSnapshots(db: D1Database): Promise<void> {
  await db.prepare(
    `UPDATE invoices
     SET
       billing_client_name = COALESCE(NULLIF(billing_client_name, ''), client_name),
       billing_email = COALESCE(NULLIF(billing_email, ''), client_email)
     WHERE billing_client_name IS NULL OR billing_client_name = '' OR billing_email IS NULL OR billing_email = ''`
  ).run()

  await db.prepare(
    `UPDATE invoices
     SET
       billing_client_name = COALESCE((SELECT display_name FROM qbo_customers WHERE qbo_customers.qbo_id = invoices.qbo_customer_id), billing_client_name, client_name),
       billing_email = COALESCE(NULLIF(billing_email, ''), client_email),
       billing_address_line1 = COALESCE((SELECT bill_addr_line1 FROM qbo_customers WHERE qbo_customers.qbo_id = invoices.qbo_customer_id), billing_address_line1),
       billing_address_line2 = COALESCE((SELECT bill_addr_line2 FROM qbo_customers WHERE qbo_customers.qbo_id = invoices.qbo_customer_id), billing_address_line2),
       billing_address_city = COALESCE((SELECT bill_addr_city FROM qbo_customers WHERE qbo_customers.qbo_id = invoices.qbo_customer_id), billing_address_city),
       billing_address_state = COALESCE((SELECT bill_addr_state FROM qbo_customers WHERE qbo_customers.qbo_id = invoices.qbo_customer_id), billing_address_state),
       billing_address_postal_code = COALESCE((SELECT bill_addr_postal_code FROM qbo_customers WHERE qbo_customers.qbo_id = invoices.qbo_customer_id), billing_address_postal_code)
     WHERE qbo_customer_id IS NOT NULL AND qbo_customer_id != ''`
  ).run()
}

async function backfillInvoiceProjectAddressSnapshots(db: D1Database): Promise<void> {
  await db.prepare(
    `UPDATE invoices
     SET
       project_address_line1 = COALESCE(NULLIF((SELECT COALESCE(NULLIF(ship_addr_line1, ''), bill_addr_line1) FROM qbo_customers WHERE qbo_customers.qbo_id = invoices.qbo_project_id), ''), project_address_line1),
       project_address_line2 = COALESCE(NULLIF((SELECT COALESCE(NULLIF(ship_addr_line2, ''), bill_addr_line2) FROM qbo_customers WHERE qbo_customers.qbo_id = invoices.qbo_project_id), ''), project_address_line2),
       project_address_city = COALESCE(NULLIF((SELECT COALESCE(NULLIF(ship_addr_city, ''), bill_addr_city) FROM qbo_customers WHERE qbo_customers.qbo_id = invoices.qbo_project_id), ''), project_address_city),
       project_address_state = COALESCE(NULLIF((SELECT COALESCE(NULLIF(ship_addr_state, ''), bill_addr_state) FROM qbo_customers WHERE qbo_customers.qbo_id = invoices.qbo_project_id), ''), project_address_state),
       project_address_postal_code = COALESCE(NULLIF((SELECT COALESCE(NULLIF(ship_addr_postal_code, ''), bill_addr_postal_code) FROM qbo_customers WHERE qbo_customers.qbo_id = invoices.qbo_project_id), ''), project_address_postal_code)
     WHERE qbo_project_id IS NOT NULL AND qbo_project_id != ''
       AND (
         project_address_line1 IS NULL OR project_address_line1 = ''
         OR project_address_city IS NULL OR project_address_city = ''
         OR project_address_state IS NULL OR project_address_state = ''
         OR project_address_postal_code IS NULL OR project_address_postal_code = ''
       )`
  ).run()
}

async function ensureInvoicesSchema(db: D1Database): Promise<void> {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY,
      invoice_number TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'draft',
      qbo_customer_id TEXT,
      qbo_project_id TEXT,
      qbo_invoice_id TEXT,
      qbo_invoice_sync_token TEXT,
      qbo_payment_id TEXT,
      qbo_last_sync_date DATETIME,
      qbo_sync_status TEXT,
      qbo_sync_message TEXT,
      accounting_sync_state TEXT,
      client_name TEXT NOT NULL,
      client_email TEXT NOT NULL,
      billing_client_name TEXT,
      billing_email TEXT,
      billing_address_line1 TEXT,
      billing_address_line2 TEXT,
      billing_address_city TEXT,
      billing_address_state TEXT,
      billing_address_postal_code TEXT,
      project_address_line1 TEXT,
      project_address_line2 TEXT,
      project_address_city TEXT,
      project_address_state TEXT,
      project_address_postal_code TEXT,
      po_number TEXT,
      project_reference TEXT,
      issue_date DATE NOT NULL,
      due_date DATE,
      notes TEXT,
      internal_note TEXT,
      public_token TEXT NOT NULL UNIQUE,
      subtotal_cents INTEGER NOT NULL DEFAULT 0,
      previously_billed_cents INTEGER NOT NULL DEFAULT 0,
      total_cents INTEGER NOT NULL DEFAULT 0,
      stripe_checkout_session_id TEXT,
      stripe_payment_intent_id TEXT,
      paid_date DATETIME,
      sent_date DATETIME,
      void_date DATETIME,
      created_date DATETIME NOT NULL,
      updated_date DATETIME,
      created_by TEXT NOT NULL,
      updated_by TEXT
    )`
  ).run()

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS invoice_line_items (
      id INTEGER PRIMARY KEY,
      invoice_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit_amount_cents INTEGER NOT NULL DEFAULT 0,
      contract_amount_cents INTEGER NOT NULL DEFAULT 0,
      percent_complete REAL NOT NULL DEFAULT 0,
      amount_cents INTEGER NOT NULL DEFAULT 0,
      bill_in_full INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
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
    `CREATE TABLE IF NOT EXISTS invoice_payments (
      id INTEGER PRIMARY KEY,
      invoice_id INTEGER NOT NULL,
      kind TEXT NOT NULL DEFAULT 'payment',
      status TEXT NOT NULL DEFAULT 'succeeded',
      method TEXT NOT NULL,
      reference_number TEXT,
      gross_cents INTEGER NOT NULL DEFAULT 0,
      fee_cents INTEGER NOT NULL DEFAULT 0,
      net_cents INTEGER NOT NULL DEFAULT 0,
      paid_date DATETIME NOT NULL,
      stripe_checkout_session_id TEXT,
      stripe_payment_intent_id TEXT,
      stripe_charge_id TEXT,
      stripe_balance_transaction_id TEXT,
      stripe_payout_id TEXT,
      stripe_payout_status TEXT,
      stripe_payout_reconciled_date DATETIME,
      qbo_payment_id TEXT,
      qbo_deposit_id TEXT,
      qbo_sync_status TEXT,
      qbo_sync_message TEXT,
      accounting_sync_state TEXT,
      qbo_last_sync_date DATETIME,
      accounting_notification_sent_date DATETIME,
      note TEXT,
      created_date DATETIME NOT NULL,
      updated_date DATETIME,
      created_by TEXT NOT NULL,
      updated_by TEXT,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    )`
  ).run()

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS stripe_payouts (
      stripe_payout_id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      amount_cents INTEGER NOT NULL DEFAULT 0,
      arrival_date DATETIME,
      paid_date DATETIME,
      reconciled_date DATETIME,
      qbo_deposit_id TEXT,
      qbo_sync_status TEXT,
      qbo_sync_message TEXT,
      accounting_sync_state TEXT,
      qbo_last_sync_date DATETIME,
      email_sent_date DATETIME,
      created_date DATETIME NOT NULL,
      updated_date DATETIME
    )`
  ).run()

  const invoiceColumns = [
    'po_number TEXT',
    'previously_billed_cents INTEGER NOT NULL DEFAULT 0',
    'stripe_checkout_session_id TEXT',
    'stripe_payment_intent_id TEXT',
    'paid_date DATETIME',
    'sent_date DATETIME',
    'void_date DATETIME',
    'internal_note TEXT',
    'qbo_customer_id TEXT',
    'qbo_project_id TEXT',
    'qbo_invoice_id TEXT',
    'qbo_invoice_sync_token TEXT',
    'qbo_payment_id TEXT',
    'qbo_last_sync_date DATETIME',
    'qbo_sync_status TEXT',
    'qbo_sync_message TEXT',
    'accounting_sync_state TEXT',
    'billing_client_name TEXT',
    'billing_email TEXT',
    'billing_address_line1 TEXT',
    'billing_address_line2 TEXT',
    'billing_address_city TEXT',
    'billing_address_state TEXT',
    'billing_address_postal_code TEXT',
    'project_address_line1 TEXT',
    'project_address_line2 TEXT',
    'project_address_city TEXT',
    'project_address_state TEXT',
    'project_address_postal_code TEXT',
    'email_delivery_state TEXT',
  ]

  for (const column of invoiceColumns) {
    await ensureColumn(db, 'invoices', column)
  }

  await ensureQboSchemaReady(db)
  await backfillInvoiceBillingSnapshots(db)
  await backfillInvoiceProjectAddressSnapshots(db)

  const lineItemColumns = [
    'project_task_id INTEGER',
    'contract_amount_cents INTEGER NOT NULL DEFAULT 0',
    'percent_complete REAL NOT NULL DEFAULT 0',
    'bill_in_full INTEGER NOT NULL DEFAULT 0',
  ]

  for (const column of lineItemColumns) {
    await ensureColumn(db, 'invoice_line_items', column)
  }
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_invoice_line_items_project_task_id ON invoice_line_items(project_task_id)').run()

  const paymentColumns = [
    'kind TEXT NOT NULL DEFAULT \'payment\'',
    'status TEXT NOT NULL DEFAULT \'succeeded\'',
    'method TEXT NOT NULL DEFAULT \'Manual\'',
    'reference_number TEXT',
    'gross_cents INTEGER NOT NULL DEFAULT 0',
    'fee_cents INTEGER NOT NULL DEFAULT 0',
    'net_cents INTEGER NOT NULL DEFAULT 0',
    'paid_date DATETIME',
    'stripe_checkout_session_id TEXT',
    'stripe_payment_intent_id TEXT',
    'stripe_charge_id TEXT',
    'stripe_balance_transaction_id TEXT',
    'stripe_payout_id TEXT',
    'stripe_payout_status TEXT',
    'stripe_payout_reconciled_date DATETIME',
    'qbo_payment_id TEXT',
    'qbo_deposit_id TEXT',
    'qbo_sync_status TEXT',
    'qbo_sync_message TEXT',
    'accounting_sync_state TEXT',
    'qbo_last_sync_date DATETIME',
    'accounting_notification_sent_date DATETIME',
    'note TEXT',
    'created_date DATETIME',
    'updated_date DATETIME',
    'created_by TEXT',
    'updated_by TEXT',
  ]

  for (const column of paymentColumns) {
    await ensureColumn(db, 'invoice_payments', column)
  }

  for (const column of ['accounting_sync_state TEXT']) {
    await ensureColumn(db, 'stripe_payouts', column)
  }

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_client_email ON invoices(client_email)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_po_number ON invoices(po_number)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_public_token ON invoices(public_token)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_stripe_checkout_session_id ON invoices(stripe_checkout_session_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_stripe_payment_intent_id ON invoices(stripe_payment_intent_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_qbo_customer_id ON invoices(qbo_customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_qbo_project_id ON invoices(qbo_project_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_qbo_invoice_id ON invoices(qbo_invoice_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoice_contact_recipients_invoice_id ON invoice_contact_recipients(invoice_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoice_payments_stripe_session ON invoice_payments(stripe_checkout_session_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoice_payments_stripe_intent ON invoice_payments(stripe_payment_intent_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoice_payments_stripe_balance_transaction ON invoice_payments(stripe_balance_transaction_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoice_payments_stripe_payout ON invoice_payments(stripe_payout_id)',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_payments_unique_stripe_session ON invoice_payments(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL AND stripe_checkout_session_id != \'\'',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_payments_unique_stripe_intent ON invoice_payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL AND stripe_payment_intent_id != \'\'',
  ]

  for (const statement of indexes) {
    await db.prepare(statement).run()
  }
}

function ensureInvoicesSchemaReady(db: D1Database): Promise<void> {
  const existing = invoiceSchemaReadyByDb.get(db)
  if (existing) {
    return existing
  }

  const ready = ensureInvoicesSchema(db)
  invoiceSchemaReadyByDb.set(db, ready)
  return ready
}

async function parseJsonBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('Content-Type') || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error('Content-Type must be application/json')
  }
  const parsed = await request.json()
  return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}
}

function normalizeLineItems(value: unknown): InvoiceLineItemInput[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map((entry) => ({
      projectTaskId: entry.projectTaskId ?? entry.project_task_id,
      description: entry.description,
      quantity: entry.quantity,
      unitAmountCents: entry.unitAmountCents ?? entry.unit_amount_cents,
      contractAmountCents: entry.contractAmountCents ?? entry.contract_amount_cents ?? entry.unitAmountCents ?? entry.unit_amount_cents,
      percentComplete: entry.percentComplete ?? entry.percent_complete ?? entry.quantity,
      billInFull: entry.billInFull ?? entry.bill_in_full,
    }))
}

function normalizeContactIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const unique = new Set<string>()
  for (const item of value) {
    const normalized = normalizeString(item)
    if (normalized) {
      unique.add(normalized)
    }
  }
  return Array.from(unique)
}

function prepareLineItems(value: unknown): Array<Omit<InvoiceLineItem, 'id' | 'invoiceId'>> {
  return normalizeLineItems(value)
    .map((item, index) => {
      const description = normalizeString(item.description)
      const percentComplete = Math.max(0, normalizeNumber(item.percentComplete ?? item.quantity ?? 0))
      const contractAmountCents = normalizeAmountCents(item.contractAmountCents ?? item.unitAmountCents)
      const quantity = percentComplete
      const unitAmountCents = contractAmountCents
      return {
        projectTaskId: normalizeString(item.projectTaskId),
        description,
        quantity,
        unitAmountCents,
        contractAmountCents,
        percentComplete,
        amountCents: Math.round(contractAmountCents * (percentComplete / 100)),
        billInFull: normalizeBoolean(item.billInFull),
        sortOrder: index,
      }
    })
    .filter((item) => item.description && item.percentComplete > 0 && item.contractAmountCents > 0)
}

function calculateTotalCents(lineItems: Array<Omit<InvoiceLineItem, 'id' | 'invoiceId'>>): number {
  return lineItems.reduce((sum, item) => sum + item.amountCents, 0)
}

function calculatePreviousBillingEligibleCents(lineItems: Array<Omit<InvoiceLineItem, 'id' | 'invoiceId'>>): number {
  return lineItems.reduce((sum, item) => item.billInFull ? sum : sum + item.amountCents, 0)
}

async function createBillingSnapshot(db: D1Database, payload: InvoicePayload, clientEmail: string): Promise<BillingSnapshot> {
  const qboCustomerId = normalizeString(payload.qboCustomerId)
  const fallbackName = normalizeString(payload.clientName)
  const fallbackEmail = normalizeString(clientEmail || payload.clientEmail).toLowerCase()
  if (!qboCustomerId) {
    return {
      clientName: fallbackName,
      email: fallbackEmail,
      addressLine1: '',
      addressLine2: '',
      addressCity: '',
      addressState: '',
      addressPostalCode: '',
    }
  }

  const row = await db.prepare(
    `SELECT display_name, primary_email, bill_addr_line1, bill_addr_line2, bill_addr_city, bill_addr_state, bill_addr_postal_code
     FROM qbo_customers
     WHERE qbo_id = ?`
  ).bind(qboCustomerId).first<Record<string, unknown>>()

  return {
    clientName: normalizeString(row?.display_name) || fallbackName,
    email: fallbackEmail || normalizeString(row?.primary_email).toLowerCase(),
    addressLine1: normalizeString(row?.bill_addr_line1),
    addressLine2: normalizeString(row?.bill_addr_line2),
    addressCity: normalizeString(row?.bill_addr_city),
    addressState: normalizeString(row?.bill_addr_state),
    addressPostalCode: normalizeString(row?.bill_addr_postal_code),
  }
}

async function createProjectAddressSnapshot(db: D1Database, qboProjectId: string): Promise<ProjectAddressSnapshot> {
  if (!qboProjectId) {
    return {
      addressLine1: '',
      addressLine2: '',
      addressCity: '',
      addressState: '',
      addressPostalCode: '',
    }
  }

  const row = await db.prepare(
    `SELECT bill_addr_line1, bill_addr_line2, bill_addr_city, bill_addr_state, bill_addr_postal_code,
            ship_addr_line1, ship_addr_line2, ship_addr_city, ship_addr_state, ship_addr_postal_code
     FROM qbo_customers
     WHERE qbo_id = ?`
  ).bind(qboProjectId).first<Record<string, unknown>>()

  return {
    addressLine1: normalizeString(row?.ship_addr_line1) || normalizeString(row?.bill_addr_line1),
    addressLine2: normalizeString(row?.ship_addr_line2) || normalizeString(row?.bill_addr_line2),
    addressCity: normalizeString(row?.ship_addr_city) || normalizeString(row?.bill_addr_city),
    addressState: normalizeString(row?.ship_addr_state) || normalizeString(row?.bill_addr_state),
    addressPostalCode: normalizeString(row?.ship_addr_postal_code) || normalizeString(row?.bill_addr_postal_code),
  }
}

async function generateInvoiceNumber(db: D1Database): Promise<string> {
  const year = new Date().getUTCFullYear()
  const prefix = `WPS-${year}-`
  const row = await db.prepare(
    `SELECT MAX(CAST(substr(invoice_number, 10) AS INTEGER)) AS max_sequence
     FROM invoices
     WHERE invoice_number LIKE ?`
  ).bind(`${prefix}%`).first<{ max_sequence?: number }>()
  const nextSequence = Math.max(0, Number(row?.max_sequence ?? 0)) + 1
  return `${prefix}${String(nextSequence).padStart(4, '0')}`
}

async function fetchLineItems(db: D1Database, invoiceId: string): Promise<InvoiceLineItem[]> {
  const rows = await db.prepare(
    `SELECT id, invoice_id, description, quantity, unit_amount_cents, contract_amount_cents, percent_complete, amount_cents, bill_in_full, sort_order
     FROM invoice_line_items
     WHERE invoice_id = ?
     ORDER BY sort_order ASC, id ASC`
  ).bind(invoiceId).all()

  return (rows.results || []).map((row) => mapInvoiceLineItemRow(row as InvoiceLineItemRow))
}

async function fetchInvoiceContacts(db: D1Database, invoiceId: string): Promise<InvoiceContactRecipient[]> {
  const rows = await db.prepare(
    `SELECT id, invoice_id, contact_id, name, email
     FROM invoice_contact_recipients
     WHERE invoice_id = ?
     ORDER BY id ASC`
  ).bind(invoiceId).all()

  return (rows.results || []).map((row) => mapInvoiceContactRecipientRow(row as InvoiceContactRecipientRow))
}

async function fetchInvoicePayments(db: D1Database, invoiceId: string): Promise<InvoicePayment[]> {
  const rows = await db.prepare(
    `SELECT id, invoice_id, kind, status, method, reference_number, gross_cents, fee_cents, net_cents, paid_date,
            stripe_checkout_session_id, stripe_payment_intent_id, stripe_charge_id, stripe_balance_transaction_id,
            stripe_payout_id, stripe_payout_status, stripe_payout_reconciled_date,
            qbo_payment_id, qbo_deposit_id, qbo_sync_status, qbo_sync_message, accounting_sync_state, qbo_last_sync_date,
            accounting_notification_sent_date, note, created_date, updated_date, created_by, updated_by
     FROM invoice_payments
     WHERE invoice_id = ?
     ORDER BY paid_date ASC, id ASC`
  ).bind(invoiceId).all()

  return (rows.results || []).map((row) => mapInvoicePaymentRow(row as InvoicePaymentRow))
}

async function fetchInvoiceByWhere(db: D1Database, whereSql: string, value: string, includeLineItems: boolean): Promise<Invoice | null> {
  const row = await db.prepare(
    `SELECT id, invoice_number, status,
            qbo_customer_id, qbo_project_id, qbo_invoice_id, qbo_invoice_sync_token, qbo_payment_id,
            qbo_last_sync_date, qbo_sync_status, qbo_sync_message, accounting_sync_state,
            client_name, client_email, po_number, project_reference,
            billing_client_name, billing_email, billing_address_line1, billing_address_line2,
            billing_address_city, billing_address_state, billing_address_postal_code,
            project_address_line1, project_address_line2, project_address_city, project_address_state, project_address_postal_code,
            issue_date, due_date, notes, internal_note, public_token, subtotal_cents, previously_billed_cents, total_cents,
            stripe_checkout_session_id, stripe_payment_intent_id, paid_date, sent_date, void_date,
            email_delivery_state,
            created_date, updated_date, created_by, updated_by
     FROM invoices
     WHERE ${whereSql} = ?`
  ).bind(value).first()

  if (!row) {
    return null
  }

  const invoiceId = normalizeString((row as InvoiceRow).id)
  const lineItems = includeLineItems ? await fetchLineItems(db, invoiceId) : []
  const contacts = includeLineItems ? await fetchInvoiceContacts(db, invoiceId) : []
  const payments = includeLineItems ? await fetchInvoicePayments(db, invoiceId) : []
  const invoice = mapInvoiceRow(row as InvoiceRow, lineItems)
  invoice.contacts = contacts
  invoice.contactIds = contacts.map((contact) => contact.contactId)
  invoice.payments = payments
  return invoice
}

async function getSuccessfulPaymentTotalCents(db: D1Database, invoiceId: string): Promise<number> {
  const row = await db.prepare(
    `SELECT COALESCE(SUM(gross_cents), 0) AS paid_cents
     FROM invoice_payments
     WHERE invoice_id = ? AND status = 'succeeded'`
  ).bind(invoiceId).first<{ paid_cents?: unknown }>()
  return normalizeAmountCents(row?.paid_cents)
}

async function refreshInvoicePaymentStatus(db: D1Database, invoiceId: string): Promise<void> {
  const invoice = await fetchInvoiceById(db, invoiceId, false)
  if (!invoice || invoice.status === 'void') return
  const paidCents = await getSuccessfulPaymentTotalCents(db, invoiceId)
  const status = paidCents >= invoice.totalCents && invoice.totalCents > 0 ? 'paid' : 'sent'
  const paidDate = status === 'paid' ? nowIso() : ''
  await db.prepare(
    `UPDATE invoices
     SET status = ?,
         paid_date = CASE WHEN ? = 'paid' THEN COALESCE(paid_date, ?) ELSE NULL END,
         updated_date = ?
     WHERE id = ? AND status != 'void'`
  ).bind(status, status, paidDate, nowIso(), invoiceId).run()
}

async function fetchInvoiceById(db: D1Database, id: string, includeLineItems = true): Promise<Invoice | null> {
  return fetchInvoiceByWhere(db, 'id', id, includeLineItems)
}

async function fetchInvoiceByPublicToken(db: D1Database, token: string): Promise<Invoice | null> {
  const invoice = await fetchInvoiceByWhere(db, 'public_token', token, true)
  if (invoice) {
    invoice.emailDeliveryState = null
  }
  return invoice
}

async function replaceLineItems(db: D1Database, invoiceId: string, lineItems: Array<Omit<InvoiceLineItem, 'id' | 'invoiceId'>>): Promise<void> {
  await db.prepare('DELETE FROM invoice_line_items WHERE invoice_id = ?').bind(invoiceId).run()
  for (const item of lineItems) {
    await db.prepare(
      `INSERT INTO invoice_line_items (
         invoice_id, project_task_id, description, quantity, unit_amount_cents, contract_amount_cents, percent_complete, amount_cents, bill_in_full, sort_order
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      invoiceId,
      item.projectTaskId || null,
      item.description,
      item.quantity,
      item.unitAmountCents,
      item.contractAmountCents,
      item.percentComplete,
      item.amountCents,
      item.billInFull ? 1 : 0,
      item.sortOrder
    ).run()
  }
}

async function replaceInvoiceContacts(db: D1Database, invoiceId: string, contacts: InvoiceContactRecipient[]): Promise<void> {
  await db.prepare('DELETE FROM invoice_contact_recipients WHERE invoice_id = ?').bind(invoiceId).run()
  for (const contact of contacts) {
    await db.prepare(
      `INSERT INTO invoice_contact_recipients (invoice_id, contact_id, name, email)
       VALUES (?, ?, ?, ?)`
    ).bind(invoiceId, contact.contactId, contact.name, contact.email).run()
  }
}

async function getProjectPreviouslyBilledCents(db: D1Database, qboProjectId: string, excludedInvoiceId = ''): Promise<number> {
  if (!qboProjectId) return 0
  const bindings = excludedInvoiceId ? [qboProjectId, excludedInvoiceId] : [qboProjectId]
  const excludedSql = excludedInvoiceId ? 'AND id != ?' : ''
  const row = await db.prepare(
    `SELECT COALESCE(SUM(total_cents), 0) AS previously_billed_cents
     FROM invoices
     WHERE qbo_project_id = ?
       AND status != 'draft'
       AND status != 'void'
       ${excludedSql}`
  ).bind(...bindings).first<{ previously_billed_cents?: unknown }>()
  return normalizeAmountCents(row?.previously_billed_cents)
}

async function copyInvoiceToDraft(db: D1Database, source: Invoice, copiedBy: string): Promise<Invoice | null> {
  const lineItems = source.lineItems.map((item) => ({
    projectTaskId: item.projectTaskId,
    description: item.description,
    quantity: item.quantity,
    unitAmountCents: item.unitAmountCents,
    contractAmountCents: item.contractAmountCents,
    percentComplete: item.percentComplete,
    amountCents: item.amountCents,
    billInFull: item.billInFull,
    sortOrder: item.sortOrder,
  }))
  const subtotalCents = calculateTotalCents(lineItems)
  const previouslyBilledCents = Math.min(calculatePreviousBillingEligibleCents(lineItems), await getProjectPreviouslyBilledCents(db, source.qboProjectId, source.id))
  const totalCents = Math.max(0, subtotalCents - previouslyBilledCents)
  const createdDate = nowIso()
  const invoiceNumber = await generateInvoiceNumber(db)

  const insert = await db.prepare(
    `INSERT INTO invoices (
      invoice_number, status, qbo_customer_id, qbo_project_id, client_name, client_email,
      billing_client_name, billing_email, billing_address_line1, billing_address_line2, billing_address_city, billing_address_state, billing_address_postal_code,
      project_address_line1, project_address_line2, project_address_city, project_address_state, project_address_postal_code,
      po_number, project_reference, issue_date, due_date,
      notes, internal_note, public_token, subtotal_cents, previously_billed_cents, total_cents, created_date, created_by, updated_by
    ) VALUES (?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    invoiceNumber,
    source.qboCustomerId,
    source.qboProjectId,
    source.clientName,
    source.clientEmail,
    source.billingClientName,
    source.billingEmail,
    source.billingAddressLine1,
    source.billingAddressLine2,
    source.billingAddressCity,
    source.billingAddressState,
    source.billingAddressPostalCode,
    source.projectAddressLine1,
    source.projectAddressLine2,
    source.projectAddressCity,
    source.projectAddressState,
    source.projectAddressPostalCode,
    source.poNumber,
    source.projectReference,
    todayIsoDate(),
    '',
    source.notes,
    source.internalNote,
    createPublicToken(),
    subtotalCents,
    previouslyBilledCents,
    totalCents,
    createdDate,
    copiedBy,
    copiedBy
  ).run()

  const invoiceId = String(insert.meta.last_row_id)
  await replaceLineItems(db, invoiceId, lineItems)
  await replaceInvoiceContacts(db, invoiceId, source.contacts)
  return fetchInvoiceById(db, invoiceId)
}

async function resolveInvoiceContacts(db: D1Database, payload: InvoicePayload): Promise<InvoiceContactRecipient[] | Response> {
  const contactIds = normalizeContactIds(payload.contactIds)
  if (contactIds.length === 0) {
    return []
  }

  const qboCustomerId = normalizeString(payload.qboCustomerId)
  if (!qboCustomerId) {
    return badRequest('qboCustomerId is required when selecting invoice contacts')
  }

  await ensureProjectManagementSchemaReady(db)
  const contacts = await fetchActiveClientContactsByIds(db, qboCustomerId, contactIds)
  if (contacts.length !== contactIds.length) {
    return badRequest('One or more selected invoice contacts were not found for this client')
  }

  return contacts.map((contact) => ({
    id: '',
    invoiceId: '',
    contactId: contact.id,
    name: contact.name,
    email: contact.email,
  }))
}

function validateInvoicePayload(payload: InvoicePayload, requireLineItems: boolean): Response | null {
  if (!normalizeString(payload.clientName)) {
    return badRequest('clientName is required')
  }
  const hasContactIds = normalizeContactIds(payload.contactIds).length > 0
  if (!hasContactIds && (!normalizeString(payload.clientEmail) || !normalizeString(payload.clientEmail).includes('@'))) {
    return badRequest('A valid clientEmail is required')
  }
  if (!normalizeString(payload.issueDate)) {
    return badRequest('issueDate is required')
  }

  const lineItems = prepareLineItems(payload.lineItems)
  if (requireLineItems && lineItems.length === 0) {
    return badRequest('At least one invoice line item is required')
  }

  return null
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function formatInvoiceEmailDate(value: string): string {
  const normalized = normalizeString(value)
  if (!normalized) {
    return ''
  }
  const date = new Date(`${normalized}T00:00:00`)
  if (!Number.isFinite(date.getTime())) {
    return normalized
  }
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function getInvoicePublicBaseUrl(env: HonoEnv['Bindings']): string {
  const configured = normalizeString(env.INVOICE_PUBLIC_BASE_URL)
  if (!configured) {
    throw new Error('Server configuration error: Missing INVOICE_PUBLIC_BASE_URL')
  }
  return configured.replace(/\/+$/g, '')
}

function normalizeEmailAttachment(value: InvoiceEmailAttachment | undefined): NormalizedEmailAttachment | null {
  if (!value) {
    return null
  }

  const name = normalizeString(value.filename)
  const content = normalizeString(value.data)
  const type = normalizeString(value.mimetype)
  if (!name || !content || !type) {
    throw new Error('Invoice email attachment requires filename, data, and mimetype')
  }

  return { name, content, type }
}

function normalizeEmailAttachments(values: InvoiceEmailAttachment[] | undefined): { name: string; content: string; type: string }[] {
  return (values || []).map((value) => normalizeEmailAttachment(value)).filter((value): value is NormalizedEmailAttachment => Boolean(value))
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

async function buildProjectEmailAttachments(env: HonoEnv['Bindings'], documents: ProjectInvoiceDocument[]): Promise<NormalizedEmailAttachment[]> {
  const attachments: NormalizedEmailAttachment[] = []
  for (const document of documents) {
    const object = await env.INVOICE_DOCUMENTS.get(document.r2Key)
    if (!object) {
      throw new Error(`Project invoice document was not found in storage: ${document.filename}`)
    }
    const bytes = new Uint8Array(await object.arrayBuffer())
    attachments.push({
      name: document.filename,
      content: encodeBase64(bytes),
      type: document.contentType || 'application/octet-stream',
    })
  }
  return attachments
}

function serializeInvoiceEmailDeliveryState(state: InvoiceEmailDeliveryStatePayload): string {
  return JSON.stringify(state)
}

async function setInvoiceEmailDeliveryState(db: D1Database, invoiceId: string, state: InvoiceEmailDeliveryStatePayload): Promise<void> {
  await db.prepare(
    `UPDATE invoices
     SET email_delivery_state = ?,
         updated_date = ?
     WHERE id = ?`
  ).bind(serializeInvoiceEmailDeliveryState(state), state.updatedDate, invoiceId).run()
}

function buildInvoiceEmailDeliveryState(input: Partial<InvoiceEmailDeliveryStatePayload> & Pick<InvoiceEmailDeliveryStatePayload, 'status' | 'event'>, existing?: InvoiceEmailDeliveryStatePayload | null): InvoiceEmailDeliveryStatePayload {
  return {
    status: input.status,
    event: input.event,
    recipient: normalizeString(input.recipient ?? existing?.recipient),
    reason: normalizeString(input.reason ?? existing?.reason),
    messageId: normalizeString(input.messageId ?? existing?.messageId),
    updatedDate: normalizeString(input.updatedDate) || nowIso(),
    noticeSentDate: normalizeString(input.noticeSentDate ?? existing?.noticeSentDate),
    noticeRecipients: Array.isArray(input.noticeRecipients) ? input.noticeRecipients : existing?.noticeRecipients || [],
  }
}

async function recordInvoiceEmailAccepted(db: D1Database, invoice: Invoice, messageId: string): Promise<void> {
  await setInvoiceEmailDeliveryState(db, invoice.id, buildInvoiceEmailDeliveryState({
    status: 'accepted',
    event: 'accepted',
    recipient: invoice.contacts[0]?.email || invoice.clientEmail,
    reason: '',
    messageId,
    noticeSentDate: '',
    noticeRecipients: [],
  }, invoice.emailDeliveryState || null))
}

async function findInvoiceByEmailDeliveryMessageId(db: D1Database, messageId: string): Promise<Invoice | null> {
  if (!messageId) return null
  const row = await db.prepare(
    `SELECT id
     FROM invoices
     WHERE json_extract(email_delivery_state, '$.messageId') = ?
     ORDER BY updated_date DESC
     LIMIT 1`
  ).bind(messageId).first<{ id?: unknown }>()
  const invoiceId = normalizeString(row?.id)
  return invoiceId ? fetchInvoiceById(db, invoiceId, false) : null
}

function asBrevoRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function getRecordValue(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in record) return record[key]
  }
  return undefined
}

function getBrevoHeader(payload: BrevoWebhookPayload, headerName: string): string {
  const normalizedHeader = headerName.toLowerCase()
  const headers = asBrevoRecord(payload.headers)
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === normalizedHeader) return normalizeString(value)
  }
  for (const [key, value] of Object.entries(payload)) {
    if (key.toLowerCase() === normalizedHeader) return normalizeString(value)
  }
  return ''
}

function getBrevoTags(payload: BrevoWebhookPayload): string[] {
  const tags = getRecordValue(payload, ['tags', 'Tags', 'tag'])
  if (!Array.isArray(tags)) return []
  return tags.map((tag) => normalizeString(tag)).filter(Boolean)
}

function getBrevoMessageId(payload: BrevoWebhookPayload): string {
  return normalizeString(getRecordValue(payload, ['messageId', 'message_id', 'message-id', 'MessageId', 'Message-ID']))
}

function getBrevoInvoiceId(payload: BrevoWebhookPayload): string {
  const fromHeader = getBrevoHeader(payload, 'X-WPS-Invoice-Id')
  if (fromHeader) return fromHeader
  const direct = normalizeString(getRecordValue(payload, ['invoiceId', 'invoice_id']))
  if (direct) return direct
  const tagged = getBrevoTags(payload).find((tag) => /^invoice-id-/i.test(tag))
  return tagged ? tagged.replace(/^invoice-id-/i, '') : ''
}

function normalizeBrevoEvent(value: unknown): string {
  return normalizeString(value).replace(/[_\s-]+/g, '').toLowerCase()
}

function getBrevoDeliveryEvent(payload: BrevoWebhookPayload): string {
  const raw = normalizeString(getRecordValue(payload, ['event', 'Event', 'type', 'Type']))
  const normalized = normalizeBrevoEvent(raw)
  if (normalized === 'hardbounce') return 'hardBounce'
  if (normalized === 'softbounce') return 'softBounce'
  if (normalized === 'blocked') return 'blocked'
  if (normalized === 'invalid') return 'invalid'
  return raw
}

function getBrevoFailureReason(payload: BrevoWebhookPayload): string {
  return normalizeString(getRecordValue(payload, ['reason', 'Reason', 'message', 'Message', 'error', 'Error', 'description', 'Description']))
}

function getBrevoRecipient(payload: BrevoWebhookPayload): string {
  return normalizeString(getRecordValue(payload, ['email', 'Email', 'recipient', 'Recipient', 'to', 'To'])).toLowerCase()
}

function isSeriousBrevoDeliveryEvent(event: string): boolean {
  return event === 'hardBounce' || event === 'blocked' || event === 'invalid'
}

function isTrackedBrevoDeliveryEvent(event: string): boolean {
  return event === 'softBounce' || isSeriousBrevoDeliveryEvent(event)
}

function hasInvoiceDeliveryNoticeForFailure(invoice: Invoice, event: string, recipient: string, messageId: string): boolean {
  const existing = invoice.emailDeliveryState
  if (!existing?.noticeSentDate) return false
  return existing.event === event
    && existing.recipient.toLowerCase() === recipient.toLowerCase()
    && (!messageId || existing.messageId === messageId)
}

async function sendInvoiceDeliveryIssueEmail(env: HonoEnv['Bindings'], invoice: Invoice, manager: ProjectManager, state: InvoiceEmailDeliveryStatePayload): Promise<string[]> {
  const apiKey = normalizeString(env.BREVO_API_KEY)
  const senderEmail = normalizeString(env.SENDER_EMAIL)
  if (!apiKey) {
    throw new Error('Server configuration error: Missing BREVO_API_KEY')
  }
  if (!senderEmail) {
    throw new Error('Server configuration error: Missing SENDER_EMAIL')
  }

  const accountingRecipients = await fetchAccountingAccessRecipients(env)
  const managerEmail = manager.managerEmail.toLowerCase()
  const ccRecipients = accountingRecipients.filter((recipient) => recipient.email.toLowerCase() !== managerEmail)
  const noticeRecipients = [manager.managerEmail, ...ccRecipients.map((recipient) => recipient.email)]
  const invoiceUrl = `${getInvoicePublicBaseUrl(env)}/invoices`
  const brevoSandbox = normalizeString(env.BREVO_SANDBOX).toLowerCase() === 'true'
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: 'Do Not Reply - White Point' },
      to: [{ email: manager.managerEmail, name: manager.managerName || manager.managerEmail }],
      cc: ccRecipients.length > 0 ? ccRecipients : undefined,
      replyTo: { email: senderEmail },
      subject: `Invoice email delivery issue: ${invoice.invoiceNumber}`,
      htmlContent: [
        '<p>Brevo reported an invoice email delivery issue.</p>',
        `<p><strong>Invoice:</strong> ${escapeHtml(invoice.invoiceNumber)}</p>`,
        `<p><strong>Client:</strong> ${escapeHtml(invoice.clientName)}</p>`,
        `<p><strong>Project:</strong> ${escapeHtml(invoice.projectReference || 'Not provided')}</p>`,
        `<p><strong>Recipient:</strong> ${escapeHtml(state.recipient || 'Not provided')}</p>`,
        `<p><strong>Event:</strong> ${escapeHtml(state.event)}</p>`,
        state.reason ? `<p><strong>Reason:</strong> ${escapeHtml(state.reason)}</p>` : '',
        state.messageId ? `<p><strong>Brevo message:</strong> ${escapeHtml(state.messageId)}</p>` : '',
        `<p><strong>Invoice tool:</strong> <a href="${escapeHtml(invoiceUrl)}">${escapeHtml(invoiceUrl)}</a></p>`,
      ].join(''),
      ...(brevoSandbox ? { headers: { 'X-Sib-Sandbox': 'drop' } } : {}),
    }),
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Brevo invoice delivery issue email failed: ${body || response.statusText}`)
  }
  return noticeRecipients
}

async function handleBrevoInvoiceDeliveryWebhook(db: D1Database, env: HonoEnv['Bindings'], payload: BrevoWebhookPayload): Promise<boolean> {
  const event = getBrevoDeliveryEvent(payload)
  if (!isTrackedBrevoDeliveryEvent(event)) return false

  const invoiceId = getBrevoInvoiceId(payload)
  const messageId = getBrevoMessageId(payload)
  const invoice = invoiceId ? await fetchInvoiceById(db, invoiceId, false) : await findInvoiceByEmailDeliveryMessageId(db, messageId)
  if (!invoice) return false

  const state = buildInvoiceEmailDeliveryState({
    status: event === 'softBounce' ? 'warning' : 'failed',
    event,
    recipient: getBrevoRecipient(payload),
    reason: getBrevoFailureReason(payload),
    messageId,
    noticeSentDate: event === 'softBounce' ? '' : undefined,
    noticeRecipients: event === 'softBounce' ? [] : undefined,
  }, invoice.emailDeliveryState || null)

  if (isSeriousBrevoDeliveryEvent(event) && invoice.qboProjectId && !hasInvoiceDeliveryNoticeForFailure(invoice, event, state.recipient, state.messageId)) {
    const manager = await fetchProjectManager(db, invoice.qboProjectId)
    if (manager) {
      const noticeRecipients = await sendInvoiceDeliveryIssueEmail(env, invoice, manager, state)
      state.noticeSentDate = nowIso()
      state.noticeRecipients = noticeRecipients
    }
  }

  await setInvoiceEmailDeliveryState(db, invoice.id, state)
  return true
}

async function sendInvoiceEmail(invoice: Invoice, env: HonoEnv['Bindings'], manager: ProjectManager, attachments: NormalizedEmailAttachment[] = [], bccSenderEmail = ''): Promise<string> {
  const apiKey = normalizeString(env.BREVO_API_KEY)
  const senderEmail = normalizeString(env.SENDER_EMAIL)
  if (!apiKey) {
    throw new Error('Server configuration error: Missing BREVO_API_KEY')
  }
  if (!senderEmail) {
    throw new Error('Server configuration error: Missing SENDER_EMAIL')
  }

  const paymentUrl = `${getInvoicePublicBaseUrl(env)}/pay/${encodeURIComponent(invoice.publicToken)}`
  const brevoSandbox = normalizeString(env.BREVO_SANDBOX).toLowerCase() === 'true'
  const recipients = invoice.contacts.length > 0
    ? invoice.contacts.map((contact) => ({ email: contact.email, name: contact.name || invoice.clientName }))
    : [{ email: invoice.clientEmail, name: invoice.clientName }]
  const normalizedBccSenderEmail = normalizeString(bccSenderEmail).toLowerCase()
  const normalizedAttachments = attachments
  const headers = {
    'X-WPS-Invoice-Id': invoice.id,
    'X-WPS-Invoice-Number': invoice.invoiceNumber,
    ...(brevoSandbox ? { 'X-Sib-Sandbox': 'drop' } : {}),
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: 'Do Not Reply - White Point' },
      to: recipients,
      cc: [{ email: manager.managerEmail, name: manager.managerName || manager.managerEmail }],
      bcc: normalizedBccSenderEmail && normalizedBccSenderEmail.includes('@') ? [{ email: normalizedBccSenderEmail }] : undefined,
      replyTo: { email: senderEmail },
      templateId: 6,
      tags: ['invoice', `invoice-id-${invoice.id}`, invoice.invoiceNumber],
      params: {
        invoice_number: invoice.invoiceNumber,
        project: invoice.projectReference || invoice.clientName,
        purchase_order: invoice.poNumber || 'Not provided',
        total: formatCurrency(invoice.totalCents),
        due_date: formatInvoiceEmailDate(invoice.dueDate),
        payment_url: paymentUrl,
      },
      attachment: normalizedAttachments.length > 0 ? normalizedAttachments : undefined,
      headers,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Brevo invoice email failed: ${body || response.statusText}`)
  }
  const data = await response.json().catch(() => null) as BrevoSendResponse | null
  return normalizeString(data?.messageId || data?.messageIds?.[0])
}

async function sendStripePayoutEmail(env: HonoEnv['Bindings'], payout: StripePayout, matchedPaymentsCount = 0): Promise<void> {
  const apiKey = normalizeString(env.BREVO_API_KEY)
  const senderEmail = normalizeString(env.SENDER_EMAIL)
  if (!apiKey) {
    throw new Error('Server configuration error: Missing BREVO_API_KEY')
  }
  if (!senderEmail) {
    throw new Error('Server configuration error: Missing SENDER_EMAIL')
  }

  const payoutId = normalizeString(payout.id)
  const amountCents = normalizeAmountCents(payout.amount)
  const arrivalDate = fromUnixDateSeconds(payout.arrival_date)
  const brevoSandbox = normalizeString(env.BREVO_SANDBOX).toLowerCase() === 'true'
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: 'Do Not Reply - White Point' },
      to: [{ email: 'nwhite@whitepointsurvey.com', name: 'White Point Survey' }],
      replyTo: { email: senderEmail },
      subject: `Stripe payout ${formatEmailCurrency(amountCents)} is headed to the bank`,
      htmlContent: [
        '<p>Stripe reported a payout as paid.</p>',
        `<p><strong>Payout:</strong> ${payoutId || 'unknown'}</p>`,
        `<p><strong>Amount:</strong> ${formatEmailCurrency(amountCents)}</p>`,
        `<p><strong>Expected arrival:</strong> ${arrivalDate ? arrivalDate.slice(0, 10) : 'not provided'}</p>`,
        `<p><strong>Matched Compass payments:</strong> ${matchedPaymentsCount}</p>`,
      ].join(''),
      ...(brevoSandbox ? { headers: { 'X-Sib-Sandbox': 'drop' } } : {}),
    }),
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Brevo Stripe payout email failed: ${body || response.statusText}`)
  }
}

async function getGraphAccessToken(env: HonoEnv['Bindings']): Promise<string> {
  const tenantId = normalizeString(env.MICROSOFT_TENANT_ID)
  const clientId = normalizeString(env.MICROSOFT_CLIENT_ID)
  const clientSecret = normalizeString(env.MICROSOFT_CLIENT_SECRET)
  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Server configuration error: Missing Microsoft Graph client credentials')
  }

  const body = new URLSearchParams()
  body.set('client_id', clientId)
  body.set('client_secret', clientSecret)
  body.set('grant_type', 'client_credentials')
  body.set('scope', 'https://graph.microsoft.com/.default')
  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const data = await response.json().catch(() => null) as GraphTokenResponse | null
  if (!response.ok || !data?.access_token) {
    throw new Error(`Microsoft Graph token failed: ${data?.error_description || response.statusText}`)
  }
  return data.access_token
}

async function fetchAccountingAccessRecipients(env: HonoEnv['Bindings']): Promise<Array<{ email: string; name: string }>> {
  const accessToken = await getGraphAccessToken(env)
  const recipients = new Map<string, { email: string; name: string }>()
  let url = `https://graph.microsoft.com/v1.0/groups/${encodeURIComponent(ACCOUNTING_ACCESS_GROUP_ID)}/members/microsoft.graph.user?$select=displayName,mail,userPrincipalName&$top=999`

  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ConsistencyLevel: 'eventual',
      },
    })
    const data = await response.json().catch(() => null) as GraphListResponse<GraphUser> | null
    if (!response.ok) {
      throw new Error(`Microsoft Graph group lookup failed: ${data?.error?.message || response.statusText}`)
    }
    for (const member of data?.value || []) {
      const email = normalizeString(member.mail || member.userPrincipalName).toLowerCase()
      if (email && email.includes('@')) {
        recipients.set(email, { email, name: normalizeString(member.displayName) || email })
      }
    }
    url = normalizeString(data?.['@odata.nextLink'])
  }

  return Array.from(recipients.values())
}

async function sendAccountingPaymentSubmittedEmail(env: HonoEnv['Bindings'], invoice: Invoice, payment: InvoicePayment): Promise<void> {
  const apiKey = normalizeString(env.BREVO_API_KEY)
  const senderEmail = normalizeString(env.SENDER_EMAIL)
  if (!apiKey) {
    throw new Error('Server configuration error: Missing BREVO_API_KEY')
  }
  if (!senderEmail) {
    throw new Error('Server configuration error: Missing SENDER_EMAIL')
  }

  const recipients = await fetchAccountingAccessRecipients(env)
  if (recipients.length === 0) {
    throw new Error('Accounting Access group has no email-enabled user members')
  }

  const brevoSandbox = normalizeString(env.BREVO_SANDBOX).toLowerCase() === 'true'
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: 'Do Not Reply - White Point' },
      to: recipients,
      replyTo: { email: senderEmail },
      subject: `Payment submitted for invoice ${invoice.invoiceNumber}`,
      htmlContent: [
        '<p>A payment was submitted in Compass.</p>',
        `<p><strong>Invoice:</strong> ${escapeHtml(invoice.invoiceNumber)}</p>`,
        `<p><strong>Client:</strong> ${escapeHtml(invoice.clientName)}</p>`,
        `<p><strong>Project:</strong> ${escapeHtml(invoice.projectReference || 'Not provided')}</p>`,
        `<p><strong>Method:</strong> ${escapeHtml(payment.method || 'Payment')}</p>`,
        payment.referenceNumber ? `<p><strong>Reference:</strong> ${escapeHtml(payment.referenceNumber)}</p>` : '',
        `<p><strong>Gross:</strong> ${formatEmailCurrency(payment.grossCents)}</p>`,
        payment.feeCents > 0 ? `<p><strong>Stripe fee:</strong> ${formatEmailCurrency(payment.feeCents)}</p>` : '',
        `<p><strong>Net:</strong> ${formatEmailCurrency(payment.netCents || Math.max(0, payment.grossCents - payment.feeCents))}</p>`,
        `<p><strong>Paid date:</strong> ${(payment.paidDate || nowIso()).slice(0, 10)}</p>`,
        payment.stripeCheckoutSessionId ? `<p><strong>Stripe session:</strong> ${escapeHtml(payment.stripeCheckoutSessionId)}</p>` : '',
        payment.stripePaymentIntentId ? `<p><strong>Stripe payment intent:</strong> ${escapeHtml(payment.stripePaymentIntentId)}</p>` : '',
        payment.note ? `<p><strong>Note:</strong> ${escapeHtml(payment.note)}</p>` : '',
      ].join(''),
      ...(brevoSandbox ? { headers: { 'X-Sib-Sandbox': 'drop' } } : {}),
    }),
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Brevo accounting payment email failed: ${body || response.statusText}`)
  }
}

async function notifyAccountingPaymentSubmitted(db: D1Database, env: HonoEnv['Bindings'], invoice: Invoice, payment: InvoicePayment): Promise<void> {
  if (payment.status !== 'succeeded' || payment.grossCents <= 0 || payment.accountingNotificationSentDate) return
  try {
    await sendAccountingPaymentSubmittedEmail(env, invoice, payment)
    const date = nowIso()
    await db.prepare(
      `UPDATE invoice_payments
       SET accounting_notification_sent_date = ?,
           accounting_sync_state = json_patch(COALESCE(NULLIF(accounting_sync_state, ''), '{}'), ?),
           updated_date = ?
       WHERE id = ? AND (accounting_notification_sent_date IS NULL OR accounting_notification_sent_date = '')`
    ).bind(
      date,
      paymentSyncState({
        qboPaymentId: payment.qboPaymentId,
        qboDepositId: payment.qboDepositId,
        qboStatus: payment.qboSyncStatus,
        qboMessage: payment.qboSyncMessage,
        qboLastSyncDate: payment.qboLastSyncDate,
        stripeCheckoutSessionId: payment.stripeCheckoutSessionId,
        stripePaymentIntentId: payment.stripePaymentIntentId,
        stripeChargeId: payment.stripeChargeId,
        stripeBalanceTransactionId: payment.stripeBalanceTransactionId,
        stripePayoutId: payment.stripePayoutId,
        stripePayoutStatus: payment.stripePayoutStatus,
        stripePayoutReconciledDate: payment.stripePayoutReconciledDate,
        stripeDetailsStatus: payment.stripePaymentIntentId ? (payment.stripeBalanceTransactionId ? 'complete' : 'details_pending') : '',
        accountingNotificationSentDate: date,
      }),
      date,
      payment.id
    ).run()
  } catch (error: unknown) {
    console.error('Error sending accounting payment notification:', error)
  }
}

function getInvoiceBillingEmail(invoice: Invoice): string {
  return invoice.contacts[0]?.email || invoice.clientEmail
}

async function createStripeCheckoutSession(invoice: Invoice, env: HonoEnv['Bindings'], amountCents: number): Promise<StripeCheckoutSession> {
  const stripeSecretKey = getStripeSecretKey(env)

  const params = new URLSearchParams()
  params.set('mode', 'payment')
  params.set('ui_mode', 'elements')
  params.set('return_url', `${getInvoicePublicBaseUrl(env)}/pay/${encodeURIComponent(invoice.publicToken)}?payment=success&session_id={CHECKOUT_SESSION_ID}`)
  params.set('customer_email', getInvoiceBillingEmail(invoice))
  params.set('client_reference_id', invoice.id)
  params.set('line_items[0][quantity]', '1')
  params.set('line_items[0][price_data][currency]', 'usd')
  params.set('line_items[0][price_data][unit_amount]', String(amountCents))
  params.set('line_items[0][price_data][product_data][name]', `White Point Survey Invoice ${invoice.invoiceNumber}`)
  const description = invoice.projectReference
    ? `Project: ${invoice.projectReference}`
    : `Client: ${invoice.clientName}`
  params.set('line_items[0][price_data][product_data][description]', description)
  params.set('payment_intent_data[receipt_email]', getInvoiceBillingEmail(invoice))
  params.set('payment_intent_data[description]', `White Point Survey Invoice ${invoice.invoiceNumber}`)
  params.set('payment_intent_data[metadata][invoice_id]', invoice.id)
  params.set('payment_intent_data[metadata][invoice_number]', invoice.invoiceNumber)
  params.set('metadata[invoice_id]', invoice.id)
  params.set('metadata[invoice_number]', invoice.invoiceNumber)
  if (invoice.projectReference) {
    params.set('metadata[project_reference]', invoice.projectReference)
    params.set('payment_intent_data[metadata][project_reference]', invoice.projectReference)
  }

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  const data = await response.json().catch(() => null) as StripeCheckoutSession | { error?: { message?: string } } | null
  if (!response.ok) {
    const message = data && 'error' in data ? data.error?.message : response.statusText
    throw new Error(`Stripe checkout session failed: ${message || response.statusText}`)
  }

  return data as StripeCheckoutSession
}

async function stripeFetch<T>(env: HonoEnv['Bindings'], path: string): Promise<T | null> {
  const stripeSecretKey = getStripeSecretKey(env)
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${stripeSecretKey}` },
  })
  const data = await response.json().catch(() => null) as T | { error?: { message?: string } } | null
  if (!response.ok) {
    const message = data && typeof data === 'object' && 'error' in data ? data.error?.message : response.statusText
    throw new Error(`Stripe lookup failed: ${message || response.statusText}`)
  }
  return data as T
}

function getExpandedId(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return normalizeString(value)
  if (typeof value === 'object') return normalizeString((value as { id?: unknown }).id)
  return ''
}

function formatEmailCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function escapeHtml(value: unknown): string {
  return normalizeString(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function stripeLedgerMethod(paymentMethodType: unknown): Pick<StripePaymentDetails, 'method' | 'paymentMethodResolved'> {
  switch (normalizeString(paymentMethodType).toLowerCase()) {
    case 'card':
    case 'link':
      return { method: 'Credit Card', paymentMethodResolved: true }
    case 'us_bank_account':
      return { method: 'ACH', paymentMethodResolved: true }
    case '':
      return { method: 'Stripe Details Pending', paymentMethodResolved: false }
    default:
      return { method: 'Stripe Other Payment', paymentMethodResolved: true }
  }
}

async function validateProjectTaskLinks(db: D1Database, qboProjectId: string, lineItems: Array<Omit<InvoiceLineItem, 'id' | 'invoiceId'>>): Promise<Response | null> {
  const taskIds = Array.from(new Set(lineItems.map((item) => normalizeString(item.projectTaskId)).filter(Boolean)))
  if (taskIds.length === 0) return null
  if (!qboProjectId) return badRequest('A project is required when using project tasks')
  const placeholders = taskIds.map(() => '?').join(', ')
  const rows = await db.prepare(`SELECT id FROM project_tasks WHERE qbo_project_id = ? AND active = 1 AND id IN (${placeholders})`).bind(qboProjectId, ...taskIds).all<{ id?: unknown }>()
  if ((rows.results || []).length !== taskIds.length) return badRequest('One or more invoice tasks do not belong to the selected active project')
  return null
}

function pendingStripePaymentDetails(grossCents: number): StripePaymentDetails {
  return {
    chargeId: '',
    balanceTransactionId: '',
    grossCents,
    feeCents: 0,
    netCents: grossCents,
    method: 'Stripe Details Pending',
    paymentMethodResolved: false,
  }
}

async function getStripePaymentDetails(env: HonoEnv['Bindings'], paymentIntentId: string): Promise<StripePaymentDetails> {
  if (!paymentIntentId) {
    return pendingStripePaymentDetails(0)
  }

  const paymentIntent = await stripeFetch<StripePaymentIntent>(env, `/payment_intents/${encodeURIComponent(paymentIntentId)}?expand[]=payment_method&expand[]=latest_charge.balance_transaction`)
  const paymentMethod = paymentIntent?.payment_method
  const paymentMethodType = paymentMethod && typeof paymentMethod === 'object' ? paymentMethod.type : ''
  const latestCharge = paymentIntent?.latest_charge
  const expandedCharge = latestCharge && typeof latestCharge === 'object' ? latestCharge as StripeCharge : null
  const chargeId = getExpandedId(latestCharge)
  let balanceTransaction = expandedCharge?.balance_transaction && typeof expandedCharge.balance_transaction === 'object'
    ? expandedCharge.balance_transaction as StripeBalanceTransaction
    : null
  let balanceTransactionId = getExpandedId(expandedCharge?.balance_transaction)

  if (!balanceTransaction && chargeId) {
    const charge = await stripeFetch<StripeCharge>(env, `/charges/${encodeURIComponent(chargeId)}?expand[]=balance_transaction`)
    balanceTransaction = charge?.balance_transaction && typeof charge.balance_transaction === 'object' ? charge.balance_transaction as StripeBalanceTransaction : null
    balanceTransactionId = getExpandedId(charge?.balance_transaction)
  }

  if (!balanceTransaction && balanceTransactionId) {
    balanceTransaction = await stripeFetch<StripeBalanceTransaction>(env, `/balance_transactions/${encodeURIComponent(balanceTransactionId)}`)
  }

  return {
    chargeId,
    balanceTransactionId: normalizeString(balanceTransaction?.id) || balanceTransactionId,
    grossCents: normalizeAmountCents(balanceTransaction?.amount),
    feeCents: normalizeAmountCents(balanceTransaction?.fee),
    netCents: Math.max(0, normalizeAmountCents(balanceTransaction?.net)),
    ...stripeLedgerMethod(paymentMethodType),
  }
}

async function listStripePayoutBalanceTransactions(env: HonoEnv['Bindings'], payoutId: string): Promise<StripeBalanceTransaction[]> {
  const transactions: StripeBalanceTransaction[] = []
  let startingAfter = ''
  while (true) {
    const params = new URLSearchParams()
    params.set('payout', payoutId)
    params.set('limit', '100')
    if (startingAfter) {
      params.set('starting_after', startingAfter)
    }
    const page = await stripeFetch<StripeListResponse<StripeBalanceTransaction>>(env, `/balance_transactions?${params.toString()}`)
    const data = page?.data || []
    transactions.push(...data)
    if (!page?.has_more || data.length === 0) {
      break
    }
    startingAfter = normalizeString(data[data.length - 1]?.id)
    if (!startingAfter) {
      break
    }
  }
  return transactions
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function verifyStripeSignature(rawBody: string, signatureHeader: string, webhookSecret: string): Promise<boolean> {
  const parts = signatureHeader.split(',').map((part) => part.trim())
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2)
  const signatures = parts.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3))
  if (!timestamp || signatures.length === 0) {
    return false
  }

  const expected = await hmacSha256Hex(webhookSecret, `${timestamp}.${rawBody}`)
  return signatures.some((signature) => signature.length === expected.length && signature === expected)
}

async function upsertInvoicePayment(db: D1Database, payment: {
  invoiceId: string
  kind: InvoicePaymentKind
  status: 'pending' | 'succeeded' | 'failed' | 'void'
  method: string
  referenceNumber?: string
  grossCents: number
  feeCents: number
  netCents: number
  paidDate: string
  stripeCheckoutSessionId?: string
  stripePaymentIntentId?: string
  stripeChargeId?: string
  stripeBalanceTransactionId?: string
  note: string
  user: string
}): Promise<InvoicePayment> {
  const existing = payment.stripeCheckoutSessionId || payment.stripePaymentIntentId
    ? await fetchInvoicePaymentByStripe(db, payment.stripeCheckoutSessionId || '', payment.stripePaymentIntentId || '')
    : null
  const date = nowIso()
  const stripeDetailsStatus = payment.stripePaymentIntentId ? (payment.stripeBalanceTransactionId ? 'complete' : 'details_pending') : ''
  if (existing) {
    await db.prepare(
      `UPDATE invoice_payments
       SET kind = ?, status = ?, method = ?, reference_number = ?, gross_cents = ?, fee_cents = ?, net_cents = ?, paid_date = ?,
           stripe_checkout_session_id = COALESCE(NULLIF(?, ''), stripe_checkout_session_id),
           stripe_payment_intent_id = COALESCE(NULLIF(?, ''), stripe_payment_intent_id),
           stripe_charge_id = COALESCE(NULLIF(?, ''), stripe_charge_id),
           stripe_balance_transaction_id = COALESCE(NULLIF(?, ''), stripe_balance_transaction_id),
           accounting_sync_state = ?, note = ?, updated_date = ?, updated_by = ?
       WHERE id = ?`
    ).bind(
      payment.kind,
      payment.status,
      payment.method,
      payment.referenceNumber || '',
      payment.grossCents,
      payment.feeCents,
      payment.netCents,
      payment.paidDate,
      payment.stripeCheckoutSessionId || '',
      payment.stripePaymentIntentId || '',
      payment.stripeChargeId || '',
      payment.stripeBalanceTransactionId || '',
      paymentSyncState({
        qboPaymentId: existing.qboPaymentId,
        qboDepositId: existing.qboDepositId,
        qboStatus: existing.qboSyncStatus,
        qboMessage: existing.qboSyncMessage,
        qboLastSyncDate: existing.qboLastSyncDate,
        stripeCheckoutSessionId: payment.stripeCheckoutSessionId || existing.stripeCheckoutSessionId,
        stripePaymentIntentId: payment.stripePaymentIntentId || existing.stripePaymentIntentId,
        stripeChargeId: payment.stripeChargeId || existing.stripeChargeId,
        stripeBalanceTransactionId: payment.stripeBalanceTransactionId || existing.stripeBalanceTransactionId,
        stripePayoutId: existing.stripePayoutId,
        stripePayoutStatus: existing.stripePayoutStatus,
        stripePayoutReconciledDate: existing.stripePayoutReconciledDate,
        stripeDetailsStatus,
        accountingNotificationSentDate: existing.accountingNotificationSentDate,
      }),
      payment.note,
      date,
      payment.user,
      existing.id
    ).run()
    return (await fetchInvoicePaymentById(db, existing.id)) || existing
  }

  const insert = await db.prepare(
    `INSERT INTO invoice_payments (
      invoice_id, kind, status, method, reference_number, gross_cents, fee_cents, net_cents, paid_date,
      stripe_checkout_session_id, stripe_payment_intent_id, stripe_charge_id, stripe_balance_transaction_id,
      accounting_sync_state, note, created_date, updated_date, created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    payment.invoiceId,
    payment.kind,
    payment.status,
    payment.method,
    payment.referenceNumber || '',
    payment.grossCents,
    payment.feeCents,
    payment.netCents,
    payment.paidDate,
    payment.stripeCheckoutSessionId || '',
    payment.stripePaymentIntentId || '',
    payment.stripeChargeId || '',
    payment.stripeBalanceTransactionId || '',
    paymentSyncState({
      stripeCheckoutSessionId: payment.stripeCheckoutSessionId,
      stripePaymentIntentId: payment.stripePaymentIntentId,
      stripeChargeId: payment.stripeChargeId,
      stripeBalanceTransactionId: payment.stripeBalanceTransactionId,
      stripeDetailsStatus,
    }),
    payment.note,
    date,
    date,
    payment.user,
    payment.user
  ).run()
  const saved = await fetchInvoicePaymentById(db, String(insert.meta.last_row_id))
  if (!saved) {
    throw new Error('Payment record was not found after insert')
  }
  return saved
}

async function fetchInvoicePaymentById(db: D1Database, id: string): Promise<InvoicePayment | null> {
  const row = await db.prepare(
    `SELECT * FROM invoice_payments WHERE id = ?`
  ).bind(id).first<InvoicePaymentRow>()
  return row ? mapInvoicePaymentRow(row) : null
}

async function fetchInvoicePaymentForInvoice(db: D1Database, invoiceId: string, paymentId: string): Promise<InvoicePayment | null> {
  const payment = await fetchInvoicePaymentById(db, paymentId)
  return payment && payment.invoiceId === invoiceId ? payment : null
}

async function fetchInvoicePaymentByStripe(db: D1Database, sessionId: string, paymentIntentId: string): Promise<InvoicePayment | null> {
  if (!sessionId && !paymentIntentId) return null
  const row = await db.prepare(
    `SELECT * FROM invoice_payments
     WHERE (? != '' AND stripe_checkout_session_id = ?) OR (? != '' AND stripe_payment_intent_id = ?)
     ORDER BY id ASC
     LIMIT 1`
  ).bind(sessionId, sessionId, paymentIntentId, paymentIntentId).first<InvoicePaymentRow>()
  return row ? mapInvoicePaymentRow(row) : null
}

async function upsertStripePayout(db: D1Database, payout: StripePayout, statusOverride = ''): Promise<Record<string, unknown> | null> {
  const payoutId = normalizeString(payout.id)
  if (!payoutId) return null
  const date = nowIso()
  const status = normalizeString(statusOverride || payout.status || 'unknown')
  await db.prepare(
    `INSERT INTO stripe_payouts (
      stripe_payout_id, status, amount_cents, arrival_date, paid_date, reconciled_date, accounting_sync_state, created_date, updated_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(stripe_payout_id) DO UPDATE SET
      status = excluded.status,
      amount_cents = CASE WHEN excluded.amount_cents > 0 THEN excluded.amount_cents ELSE stripe_payouts.amount_cents END,
      arrival_date = COALESCE(NULLIF(excluded.arrival_date, ''), stripe_payouts.arrival_date),
      paid_date = COALESCE(NULLIF(excluded.paid_date, ''), stripe_payouts.paid_date),
      reconciled_date = COALESCE(NULLIF(excluded.reconciled_date, ''), stripe_payouts.reconciled_date),
      accounting_sync_state = json_patch(COALESCE(NULLIF(stripe_payouts.accounting_sync_state, ''), '{}'), excluded.accounting_sync_state),
      updated_date = excluded.updated_date`
  ).bind(
    payoutId,
    status,
    normalizeAmountCents(payout.amount),
    fromUnixDateSeconds(payout.arrival_date),
    status === 'paid' ? nowIso() : '',
    status === 'reconciled' ? nowIso() : '',
    payoutSyncState({ payoutStatus: status }),
    date,
    date
  ).run()
  return db.prepare('SELECT * FROM stripe_payouts WHERE stripe_payout_id = ?').bind(payoutId).first<Record<string, unknown>>()
}

async function fetchStripePayoutById(db: D1Database, payoutId: string): Promise<StripePayout | null> {
  if (!payoutId) return null
  const row = await db.prepare('SELECT * FROM stripe_payouts WHERE stripe_payout_id = ?').bind(payoutId).first<Record<string, unknown>>()
  if (!row) return null
  const arrivalDate = normalizeString(row.arrival_date)
  const arrivalTimestamp = arrivalDate ? Math.floor(new Date(arrivalDate).getTime() / 1000) : 0
  return {
    id: payoutId,
    amount: normalizeAmountCents(row.amount_cents),
    arrival_date: Number.isFinite(arrivalTimestamp) ? arrivalTimestamp : 0,
    status: normalizeString(row.status),
  }
}

async function fetchPaymentsForStripeBalanceTransactions(db: D1Database, balanceTransactionIds: string[]): Promise<Array<{ invoice: Invoice; payment: InvoicePayment }>> {
  const uniqueIds = Array.from(new Set(balanceTransactionIds.map((id) => normalizeString(id)).filter(Boolean)))
  if (uniqueIds.length === 0) return []

  const pairs: Array<{ invoice: Invoice; payment: InvoicePayment }> = []
  for (let index = 0; index < uniqueIds.length; index += 90) {
    const chunk = uniqueIds.slice(index, index + 90)
    const placeholders = chunk.map(() => '?').join(', ')
    const rows = await db.prepare(
      `SELECT * FROM invoice_payments
       WHERE status = 'succeeded'
         AND stripe_balance_transaction_id IN (${placeholders})
       ORDER BY paid_date ASC, id ASC`
    ).bind(...chunk).all()
    for (const row of rows.results || []) {
      const payment = mapInvoicePaymentRow(row as InvoicePaymentRow)
      const invoice = await fetchInvoiceById(db, payment.invoiceId)
      if (invoice && invoice.status !== 'void') {
        pairs.push({ invoice, payment })
      }
    }
  }
  return pairs
}

async function markPayoutPaymentsReconciled(db: D1Database, payoutId: string, balanceTransactionIds: string[]): Promise<void> {
  const uniqueIds = Array.from(new Set(balanceTransactionIds.map((id) => normalizeString(id)).filter(Boolean)))
  if (!payoutId || uniqueIds.length === 0) return
  const date = nowIso()
  for (let index = 0; index < uniqueIds.length; index += 90) {
    const chunk = uniqueIds.slice(index, index + 90)
    const placeholders = chunk.map(() => '?').join(', ')
    await db.prepare(
      `UPDATE invoice_payments
       SET stripe_payout_id = ?,
           stripe_payout_status = 'reconciled',
           stripe_payout_reconciled_date = ?,
           accounting_sync_state = json_patch(COALESCE(NULLIF(accounting_sync_state, ''), '{}'), ?),
           updated_date = ?
       WHERE status = 'succeeded'
         AND stripe_balance_transaction_id IN (${placeholders})`
    ).bind(
      payoutId,
      date,
      paymentSyncState({ stripePayoutId: payoutId, stripePayoutStatus: 'reconciled', stripePayoutReconciledDate: date }),
      date,
      ...chunk
    ).run()
  }
}

async function refreshPayoutPaymentDetails(db: D1Database, payoutId: string, balanceTransactions: StripeBalanceTransaction[]): Promise<void> {
  const date = nowIso()
  for (const transaction of balanceTransactions) {
    const balanceTransactionId = normalizeString(transaction.id)
    if (!balanceTransactionId) continue
    const sourceId = getExpandedId(transaction.source)
    const grossCents = normalizeAmountCents(transaction.amount)
    const feeCents = normalizeAmountCents(transaction.fee)
    const netCents = normalizeAmountCents(transaction.net)
    await db.prepare(
      `UPDATE invoice_payments
       SET stripe_balance_transaction_id = ?,
           gross_cents = CASE WHEN ? > 0 THEN ? ELSE gross_cents END,
           fee_cents = ?,
           net_cents = CASE WHEN ? > 0 THEN ? ELSE MAX(0, gross_cents - ?) END,
           stripe_payout_id = ?,
           stripe_payout_status = 'reconciled',
           stripe_payout_reconciled_date = ?,
           accounting_sync_state = json_patch(COALESCE(NULLIF(accounting_sync_state, ''), '{}'), ?),
           updated_date = ?
       WHERE status = 'succeeded'
         AND (stripe_balance_transaction_id = ? OR (? != '' AND stripe_charge_id = ?))`
    ).bind(
      balanceTransactionId,
      grossCents,
      grossCents,
      feeCents,
      netCents,
      netCents,
      feeCents,
      payoutId,
      date,
      paymentSyncState({
        stripeBalanceTransactionId: balanceTransactionId,
        stripePayoutId: payoutId,
        stripePayoutStatus: 'reconciled',
        stripePayoutReconciledDate: date,
        stripeDetailsStatus: 'complete',
      }),
      date,
      balanceTransactionId,
      sourceId,
      sourceId
    ).run()
  }
}

async function handleStripePayoutPaid(db: D1Database, env: HonoEnv['Bindings'], payout: StripePayout): Promise<void> {
  const payoutId = normalizeString(payout.id)
  if (!payoutId) return
  const row = await upsertStripePayout(db, payout, 'paid')
  if (normalizeString(row?.email_sent_date)) return
  await sendStripePayoutEmail(env, payout)
  const date = nowIso()
  await db.prepare(
    `UPDATE stripe_payouts
     SET email_sent_date = ?,
         accounting_sync_state = json_patch(COALESCE(NULLIF(accounting_sync_state, ''), '{}'), ?),
         updated_date = ?
     WHERE stripe_payout_id = ?`
  ).bind(date, payoutSyncState({ payoutStatus: 'paid', payoutEmailSentDate: date }), date, payoutId).run()
}

async function handleStripePayoutReconciled(db: D1Database, env: HonoEnv['Bindings'], payout: StripePayout): Promise<void> {
  const payoutId = normalizeString(payout.id)
  if (!payoutId) return
  await upsertStripePayout(db, payout, 'reconciled')
  const balanceTransactions = await listStripePayoutBalanceTransactions(env, payoutId)
  await refreshPayoutPaymentDetails(db, payoutId, balanceTransactions)
  const balanceTransactionIds = balanceTransactions.map((transaction) => normalizeString(transaction.id)).filter(Boolean)
  await markPayoutPaymentsReconciled(db, payoutId, balanceTransactionIds)
  const payoutPayments = await fetchPaymentsForStripeBalanceTransactions(db, balanceTransactionIds)
  if (payoutPayments.length === 0) {
    await db.prepare(
      `UPDATE stripe_payouts
       SET qbo_sync_status = 'no_matching_payments', qbo_sync_message = '',
           accounting_sync_state = json_patch(COALESCE(NULLIF(accounting_sync_state, ''), '{}'), ?),
           updated_date = ?
       WHERE stripe_payout_id = ?`
    ).bind(payoutSyncState({ payoutStatus: 'reconciled', qboStatus: 'no_matching_payments' }), nowIso(), payoutId).run()
    return
  }

  try {
    await syncStripePayoutDepositToQbo(db, env, {
      payoutId,
      amountCents: normalizeAmountCents(payout.amount),
      arrivalDate: fromUnixDateSeconds(payout.arrival_date),
    }, payoutPayments)
  } catch (error: unknown) {
    const message = String(error instanceof Error ? error.message : error).slice(0, 1000)
    await db.prepare(
      `UPDATE stripe_payouts
       SET qbo_last_sync_date = ?, qbo_sync_status = 'error', qbo_sync_message = ?,
           accounting_sync_state = json_patch(COALESCE(NULLIF(accounting_sync_state, ''), '{}'), ?),
           updated_date = ?
       WHERE stripe_payout_id = ?`
    ).bind(
      nowIso(),
      message,
      payoutSyncState({ payoutStatus: 'reconciled', qboStatus: 'error', qboMessage: message, qboLastSyncDate: nowIso() }),
      nowIso(),
      payoutId
    ).run()
    throw error
  }
}

async function markInvoicePaidFromStripe(db: D1Database, env: HonoEnv['Bindings'], session: StripeCheckoutSession): Promise<void> {
  const invoiceId = normalizeString(session.metadata?.invoice_id)
  const sessionId = normalizeString(session.id)
  const paymentIntentId = normalizeString(session.payment_intent)
  const paidAt = nowIso()

  if (invoiceId) {
    const invoice = await fetchInvoiceById(db, invoiceId)
    const stripeDetails = await getStripePaymentDetails(env, paymentIntentId)
      .catch(() => pendingStripePaymentDetails(invoice?.totalCents || 0))
    const grossCents = stripeDetails.grossCents || invoice?.totalCents || 0
    await upsertInvoicePayment(db, {
      invoiceId,
      kind: 'payment',
      status: 'succeeded',
      method: stripeDetails.method,
      referenceNumber: paymentIntentId,
      grossCents,
      feeCents: stripeDetails.feeCents,
      netCents: stripeDetails.netCents || Math.max(0, grossCents - stripeDetails.feeCents),
      paidDate: paidAt,
      stripeCheckoutSessionId: sessionId,
      stripePaymentIntentId: paymentIntentId,
      stripeChargeId: stripeDetails.chargeId,
      stripeBalanceTransactionId: stripeDetails.balanceTransactionId,
      note: 'Stripe checkout payment.',
      user: 'stripe-webhook',
    })
    await db.prepare(
      `UPDATE invoices
       SET updated_date = ?,
           stripe_checkout_session_id = COALESCE(NULLIF(?, ''), stripe_checkout_session_id),
           stripe_payment_intent_id = COALESCE(NULLIF(?, ''), stripe_payment_intent_id),
           accounting_sync_state = json_patch(COALESCE(NULLIF(accounting_sync_state, ''), '{}'), ?)
       WHERE id = ? AND status != 'void'`
    ).bind(paidAt, sessionId, paymentIntentId, invoiceSyncState({ stripeCheckoutSessionId: sessionId, stripePaymentIntentId: paymentIntentId }), invoiceId).run()
    await refreshInvoicePaymentStatus(db, invoiceId)
    const syncedInvoice = await fetchInvoiceById(db, invoiceId)
    const payment = await fetchInvoicePaymentByStripe(db, sessionId, paymentIntentId)
    if (syncedInvoice && payment) {
      await notifyAccountingPaymentSubmitted(db, env, syncedInvoice, payment)
      if (stripeDetails.paymentMethodResolved) {
        await trySyncInvoicePaymentToQbo(db, env, syncedInvoice, payment)
      }
    }
    return
  }

  if (sessionId) {
    const invoice = await fetchInvoiceByWhere(db, 'stripe_checkout_session_id', sessionId, true)
    if (invoice) {
      const stripeDetails = await getStripePaymentDetails(env, paymentIntentId)
        .catch(() => pendingStripePaymentDetails(invoice.totalCents))
      const grossCents = stripeDetails.grossCents || invoice.totalCents
      await upsertInvoicePayment(db, {
        invoiceId: invoice.id,
        kind: 'payment',
        status: 'succeeded',
        method: stripeDetails.method,
        referenceNumber: paymentIntentId,
        grossCents,
        feeCents: stripeDetails.feeCents,
        netCents: stripeDetails.netCents || Math.max(0, grossCents - stripeDetails.feeCents),
        paidDate: paidAt,
        stripeCheckoutSessionId: sessionId,
        stripePaymentIntentId: paymentIntentId,
        stripeChargeId: stripeDetails.chargeId,
        stripeBalanceTransactionId: stripeDetails.balanceTransactionId,
        note: 'Stripe checkout payment.',
        user: 'stripe-webhook',
      })
      await db.prepare(
        `UPDATE invoices
         SET updated_date = ?,
             stripe_payment_intent_id = COALESCE(NULLIF(?, ''), stripe_payment_intent_id),
             accounting_sync_state = json_patch(COALESCE(NULLIF(accounting_sync_state, ''), '{}'), ?)
         WHERE stripe_checkout_session_id = ? AND status != 'void'`
      ).bind(paidAt, paymentIntentId, invoiceSyncState({ stripeCheckoutSessionId: sessionId, stripePaymentIntentId: paymentIntentId }), sessionId).run()
      await refreshInvoicePaymentStatus(db, invoice.id)
      const syncedInvoice = await fetchInvoiceById(db, invoice.id)
      const payment = await fetchInvoicePaymentByStripe(db, sessionId, paymentIntentId)
      if (syncedInvoice && payment) {
        await notifyAccountingPaymentSubmitted(db, env, syncedInvoice, payment)
        if (stripeDetails.paymentMethodResolved) {
          await trySyncInvoicePaymentToQbo(db, env, syncedInvoice, payment)
        }
      }
    }
  }
}

async function markInvoicePaidFromStripePaymentIntent(db: D1Database, env: HonoEnv['Bindings'], paymentIntent: StripePaymentIntent): Promise<void> {
  const paymentIntentId = normalizeString(paymentIntent.id)
  const invoiceId = normalizeString(paymentIntent.metadata?.invoice_id)
  const paidAt = nowIso()
  if (!paymentIntentId) return

  const invoice = invoiceId
    ? await fetchInvoiceById(db, invoiceId)
    : await fetchInvoiceByWhere(db, 'stripe_payment_intent_id', paymentIntentId, true)
  if (!invoice) return

  const stripeDetails = await getStripePaymentDetails(env, paymentIntentId)
    .catch(() => pendingStripePaymentDetails(normalizeAmountCents(paymentIntent.amount_received || paymentIntent.amount) || invoice.totalCents))
  const grossCents = stripeDetails.grossCents || normalizeAmountCents(paymentIntent.amount_received || paymentIntent.amount) || invoice.totalCents
  await upsertInvoicePayment(db, {
    invoiceId: invoice.id,
    kind: 'payment',
    status: 'succeeded',
    method: stripeDetails.method,
    referenceNumber: paymentIntentId,
    grossCents,
    feeCents: stripeDetails.feeCents,
    netCents: stripeDetails.netCents || Math.max(0, grossCents - stripeDetails.feeCents),
    paidDate: paidAt,
    stripePaymentIntentId: paymentIntentId,
    stripeChargeId: stripeDetails.chargeId,
    stripeBalanceTransactionId: stripeDetails.balanceTransactionId,
    note: 'Stripe embedded payment.',
    user: 'stripe-webhook',
  })
  await db.prepare(
    `UPDATE invoices
     SET updated_date = ?,
         stripe_payment_intent_id = COALESCE(NULLIF(?, ''), stripe_payment_intent_id),
         accounting_sync_state = json_patch(COALESCE(NULLIF(accounting_sync_state, ''), '{}'), ?)
     WHERE id = ? AND status != 'void'`
  ).bind(paidAt, paymentIntentId, invoiceSyncState({ stripePaymentIntentId: paymentIntentId }), invoice.id).run()
  await refreshInvoicePaymentStatus(db, invoice.id)
  const syncedInvoice = await fetchInvoiceById(db, invoice.id)
  const payment = await fetchInvoicePaymentByStripe(db, '', paymentIntentId)
  if (syncedInvoice && payment) {
    await notifyAccountingPaymentSubmitted(db, env, syncedInvoice, payment)
    if (stripeDetails.paymentMethodResolved) {
      await trySyncInvoicePaymentToQbo(db, env, syncedInvoice, payment)
    }
  }
}

export function createInvoicesApi() {
  const app = new Hono<HonoEnv>()

  app.get('/api/invoices', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureInvoicesSchemaReady(context.env.DB)
      await ensureQboSchemaReady(context.env.DB)

      const status = normalizeString(context.req.query('status')).toLowerCase()
      const search = normalizeString(context.req.query('search'))
      const qboCustomerId = normalizeString(context.req.query('qboCustomerId'))
      const qboProjectId = normalizeString(context.req.query('qboProjectId'))
      const conditions: string[] = []
      const bindings: string[] = []
      if (status && isInvoiceStatus(status)) {
        conditions.push('status = ?')
        bindings.push(status)
      }
      if (qboCustomerId) {
        conditions.push('qbo_customer_id = ?')
        bindings.push(qboCustomerId)
      }
      if (qboProjectId) {
        conditions.push('qbo_project_id = ?')
        bindings.push(qboProjectId)
      }
      if (search) {
        conditions.push('(invoice_number LIKE ? OR client_name LIKE ? OR client_email LIKE ? OR po_number LIKE ? OR project_reference LIKE ?)')
        const likeSearch = `%${search}%`
        bindings.push(likeSearch, likeSearch, likeSearch, likeSearch, likeSearch)
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      const rows = await context.env.DB.prepare(
        `SELECT id, invoice_number, status,
                qbo_customer_id, qbo_project_id, qbo_invoice_id, qbo_invoice_sync_token, qbo_payment_id,
                qbo_last_sync_date, qbo_sync_status, qbo_sync_message, accounting_sync_state,
                client_name, client_email, po_number, project_reference,
                billing_client_name, billing_email, billing_address_line1, billing_address_line2,
                billing_address_city, billing_address_state, billing_address_postal_code,
                project_address_line1, project_address_line2, project_address_city, project_address_state, project_address_postal_code,
                issue_date, due_date, notes, internal_note, public_token, subtotal_cents, previously_billed_cents, total_cents,
                stripe_checkout_session_id, stripe_payment_intent_id, paid_date, sent_date, void_date,
                email_delivery_state,
                created_date, updated_date, created_by, updated_by
         FROM invoices
         ${where}
         ORDER BY created_date DESC`
      ).bind(...bindings).all()

      return jsonResponse({ invoices: (rows.results || []).map((row) => mapInvoiceRow(row as InvoiceRow)) })
    } catch (error: unknown) {
      console.error('Error listing invoices:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.get('/api/invoices/public/:token', async (context) => {
    try {
      await ensureInvoicesSchemaReady(context.env.DB)
      const invoice = await fetchInvoiceByPublicToken(context.env.DB, normalizeString(context.req.param('token')))
      if (!invoice) {
        return jsonResponse({ error: 'Invoice not found' }, { status: 404 })
      }
      return jsonResponse({ invoice })
    } catch (error: unknown) {
      console.error('Error fetching public invoice:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.get('/api/invoices/:id', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureInvoicesSchemaReady(context.env.DB)
      await ensureQboSchemaReady(context.env.DB)
      const invoice = await fetchInvoiceById(context.env.DB, normalizeString(context.req.param('id')))
      if (!invoice) {
        return jsonResponse({ error: 'Invoice not found' }, { status: 404 })
      }
      return jsonResponse({ invoice })
    } catch (error: unknown) {
      console.error('Error fetching invoice:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.post('/api/invoices/:id/copy', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureInvoicesSchemaReady(context.env.DB)
      await ensureProjectManagementSchemaReady(context.env.DB)
      const sourceInvoiceId = normalizeString(context.req.param('id'))
      const source = await fetchInvoiceById(context.env.DB, sourceInvoiceId)
      if (!source) {
        return jsonResponse({ error: 'Invoice not found' }, { status: 404 })
      }
      if (source.lineItems.length === 0) {
        return badRequest('Invoice must have at least one line item before it can be copied')
      }
      const copiedBy = context.get('auth').subject || 'unknown-user'
      const invoice = await copyInvoiceToDraft(context.env.DB, source, copiedBy)
      if (!invoice) {
        return jsonResponse({ error: 'Invoice not found after copy' }, { status: 404 })
      }
      return jsonResponse({ invoice }, { status: 201 })
    } catch (error: unknown) {
      console.error('Error copying invoice:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.post('/api/invoices', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureInvoicesSchemaReady(context.env.DB)
      await ensureProjectManagementSchemaReady(context.env.DB)
      const payload = await parseJsonBody(context.req.raw) as InvoicePayload
      const validationError = validateInvoicePayload(payload, true)
      if (validationError) return validationError
      const resolvedContacts = await resolveInvoiceContacts(context.env.DB, payload)
      if (resolvedContacts instanceof Response) return resolvedContacts

      const lineItems = prepareLineItems(payload.lineItems)
      const taskError = await validateProjectTaskLinks(context.env.DB, normalizeString(payload.qboProjectId), lineItems)
      if (taskError) return taskError
      const subtotalCents = calculateTotalCents(lineItems)
      const previouslyBilledCents = Math.min(calculatePreviousBillingEligibleCents(lineItems), normalizeAmountCents(payload.previouslyBilledCents))
      const totalCents = Math.max(0, subtotalCents - previouslyBilledCents)
      const createdDate = nowIso()
      const invoiceNumber = await generateInvoiceNumber(context.env.DB)
      const createdBy = normalizeString(payload.createdBy) || context.get('auth').subject || 'unknown-user'
      const clientEmail = resolvedContacts[0]?.email || normalizeString(payload.clientEmail).toLowerCase()
      const billingSnapshot = await createBillingSnapshot(context.env.DB, payload, clientEmail)
      const qboProjectId = normalizeString(payload.qboProjectId)
      const projectAddressSnapshot = await createProjectAddressSnapshot(context.env.DB, qboProjectId)
      const projectBillingProfile = qboProjectId ? await fetchProjectBillingProfile(context.env.DB, qboProjectId) : null
      const poNumber = normalizeString(payload.poNumber) || projectBillingProfile?.poNumber || ''

      const insert = await context.env.DB.prepare(
        `INSERT INTO invoices (
          invoice_number, status, qbo_customer_id, qbo_project_id, client_name, client_email,
          billing_client_name, billing_email, billing_address_line1, billing_address_line2, billing_address_city, billing_address_state, billing_address_postal_code,
          project_address_line1, project_address_line2, project_address_city, project_address_state, project_address_postal_code,
          po_number, project_reference, issue_date, due_date,
          notes, internal_note, public_token, subtotal_cents, previously_billed_cents, total_cents, created_date, created_by, updated_by
        ) VALUES (?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        invoiceNumber,
        normalizeString(payload.qboCustomerId),
        qboProjectId,
        normalizeString(payload.clientName),
        clientEmail,
        billingSnapshot.clientName,
        billingSnapshot.email,
        billingSnapshot.addressLine1,
        billingSnapshot.addressLine2,
        billingSnapshot.addressCity,
        billingSnapshot.addressState,
        billingSnapshot.addressPostalCode,
        projectAddressSnapshot.addressLine1,
        projectAddressSnapshot.addressLine2,
        projectAddressSnapshot.addressCity,
        projectAddressSnapshot.addressState,
        projectAddressSnapshot.addressPostalCode,
        poNumber,
        normalizeString(payload.projectReference),
        normalizeString(payload.issueDate) || todayIsoDate(),
        normalizeString(payload.dueDate),
        normalizeString(payload.notes),
        normalizeString(payload.internalNote),
        createPublicToken(),
        subtotalCents,
        previouslyBilledCents,
        totalCents,
        createdDate,
        createdBy,
        createdBy
      ).run()

      const invoiceId = String(insert.meta.last_row_id)
      await replaceLineItems(context.env.DB, invoiceId, lineItems)
      await replaceInvoiceContacts(context.env.DB, invoiceId, resolvedContacts)
      const invoice = await fetchInvoiceById(context.env.DB, invoiceId)
      return jsonResponse({ invoice }, { status: 201 })
    } catch (error: unknown) {
      console.error('Error creating invoice:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.put('/api/invoices/:id', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureInvoicesSchemaReady(context.env.DB)
      await ensureQboSchemaReady(context.env.DB)
      await ensureProjectManagementSchemaReady(context.env.DB)
      const invoiceId = normalizeString(context.req.param('id'))
      const existing = await fetchInvoiceById(context.env.DB, invoiceId)
      if (!existing) {
        return jsonResponse({ error: 'Invoice not found' }, { status: 404 })
      }
      if (existing.status === 'sent' || existing.status === 'paid' || existing.status === 'void') {
        return badRequest('Sent, paid, or void invoices cannot be edited. Void the invoice and create a new one for corrections.')
      }

      const payload = await parseJsonBody(context.req.raw) as InvoicePayload
      const validationError = validateInvoicePayload(payload, true)
      if (validationError) return validationError
      const resolvedContacts = await resolveInvoiceContacts(context.env.DB, payload)
      if (resolvedContacts instanceof Response) return resolvedContacts
      const lineItems = prepareLineItems(payload.lineItems)
      const taskError = await validateProjectTaskLinks(context.env.DB, normalizeString(payload.qboProjectId), lineItems)
      if (taskError) return taskError
      const subtotalCents = calculateTotalCents(lineItems)
      const previouslyBilledCents = Math.min(calculatePreviousBillingEligibleCents(lineItems), normalizeAmountCents(payload.previouslyBilledCents))
      const totalCents = Math.max(0, subtotalCents - previouslyBilledCents)
      const updatedDate = nowIso()
      const updatedBy = normalizeString(payload.updatedBy) || context.get('auth').subject || 'unknown-user'
      const clientEmail = resolvedContacts[0]?.email || normalizeString(payload.clientEmail).toLowerCase()
      const billingSnapshot = await createBillingSnapshot(context.env.DB, payload, clientEmail)
      const qboProjectId = normalizeString(payload.qboProjectId)
      const projectAddressSnapshot = await createProjectAddressSnapshot(context.env.DB, qboProjectId)
      const projectBillingProfile = qboProjectId ? await fetchProjectBillingProfile(context.env.DB, qboProjectId) : null
      const poNumber = normalizeString(payload.poNumber) || projectBillingProfile?.poNumber || ''

      await context.env.DB.prepare(
        `UPDATE invoices
         SET client_name = ?, client_email = ?,
             billing_client_name = ?, billing_email = ?, billing_address_line1 = ?, billing_address_line2 = ?,
             billing_address_city = ?, billing_address_state = ?, billing_address_postal_code = ?,
             project_address_line1 = ?, project_address_line2 = ?, project_address_city = ?, project_address_state = ?, project_address_postal_code = ?,
             po_number = ?, project_reference = ?, issue_date = ?, due_date = ?,
             qbo_customer_id = ?, qbo_project_id = ?, qbo_invoice_id = NULL, qbo_invoice_sync_token = NULL,
             qbo_payment_id = NULL, qbo_sync_status = NULL, qbo_sync_message = NULL, accounting_sync_state = ?,
             notes = ?, internal_note = ?, subtotal_cents = ?, previously_billed_cents = ?, total_cents = ?, updated_date = ?, updated_by = ?
         WHERE id = ?`
      ).bind(
        normalizeString(payload.clientName),
        clientEmail,
        billingSnapshot.clientName,
        billingSnapshot.email,
        billingSnapshot.addressLine1,
        billingSnapshot.addressLine2,
        billingSnapshot.addressCity,
        billingSnapshot.addressState,
        billingSnapshot.addressPostalCode,
        projectAddressSnapshot.addressLine1,
        projectAddressSnapshot.addressLine2,
        projectAddressSnapshot.addressCity,
        projectAddressSnapshot.addressState,
        projectAddressSnapshot.addressPostalCode,
        poNumber,
        normalizeString(payload.projectReference),
        normalizeString(payload.issueDate) || todayIsoDate(),
        normalizeString(payload.dueDate),
        normalizeString(payload.qboCustomerId),
        qboProjectId,
        invoiceSyncState({}),
        normalizeString(payload.notes),
        normalizeString(payload.internalNote),
        subtotalCents,
        previouslyBilledCents,
        totalCents,
        updatedDate,
        updatedBy,
        invoiceId
      ).run()

      await replaceLineItems(context.env.DB, invoiceId, lineItems)
      await replaceInvoiceContacts(context.env.DB, invoiceId, resolvedContacts)
      const invoice = await fetchInvoiceById(context.env.DB, invoiceId)
      return jsonResponse({ invoice })
    } catch (error: unknown) {
      console.error('Error updating invoice:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.post('/api/invoices/:id/refresh-project-address', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureInvoicesSchemaReady(context.env.DB)
      await ensureQboSchemaReady(context.env.DB)
      const invoiceId = normalizeString(context.req.param('id'))
      const invoice = await fetchInvoiceById(context.env.DB, invoiceId, false)
      if (!invoice) {
        return jsonResponse({ error: 'Invoice not found' }, { status: 404 })
      }
      if (invoice.status === 'void') {
        return badRequest('Void invoices cannot refresh project address snapshots')
      }
      if (!invoice.qboProjectId) {
        return badRequest('A QuickBooks project is required before refreshing the project address snapshot')
      }

      const snapshot = await createProjectAddressSnapshot(context.env.DB, invoice.qboProjectId)
      await context.env.DB.prepare(
        `UPDATE invoices
         SET project_address_line1 = ?, project_address_line2 = ?, project_address_city = ?,
             project_address_state = ?, project_address_postal_code = ?, updated_date = ?, updated_by = ?
         WHERE id = ?`
      ).bind(
        snapshot.addressLine1,
        snapshot.addressLine2,
        snapshot.addressCity,
        snapshot.addressState,
        snapshot.addressPostalCode,
        nowIso(),
        context.get('auth').subject || 'unknown-user',
        invoiceId
      ).run()

      return jsonResponse({ invoice: await fetchInvoiceById(context.env.DB, invoiceId) })
    } catch (error: unknown) {
      console.error('Error refreshing invoice project address:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.post('/api/invoices/:id/send', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureInvoicesSchemaReady(context.env.DB)
      const invoiceId = normalizeString(context.req.param('id'))
      const invoice = await fetchInvoiceById(context.env.DB, invoiceId)
      if (!invoice) {
        return jsonResponse({ error: 'Invoice not found' }, { status: 404 })
      }
      if (invoice.status === 'void') {
        return badRequest('Void invoices cannot be sent')
      }
      if (invoice.status === 'paid') {
        return badRequest('Paid invoices cannot be sent')
      }
      if (!invoice.qboCustomerId) {
        return badRequest('Invoice must be linked to a QuickBooks customer before sending')
      }
      if (!invoice.qboProjectId) {
        return badRequest('Invoice must be linked to a QuickBooks project before sending')
      }
      const manager = await fetchProjectManager(context.env.DB, invoice.qboProjectId)
      if (!manager) {
        return badRequest('Invoice project must have an internal project manager before sending')
      }
      if (invoice.contacts.length === 0 && !invoice.clientEmail) {
        return badRequest('At least one invoice contact is required before sending')
      }

      const body = await parseJsonBody(context.req.raw).catch(() => ({} as SendInvoicePayload)) as SendInvoicePayload
      const sentDate = nowIso()
      await context.env.DB.prepare(
        `UPDATE invoices
         SET status = 'sent', sent_date = COALESCE(sent_date, ?), updated_date = ?, updated_by = ?
         WHERE id = ?`
      ).bind(sentDate, sentDate, context.get('auth').subject || 'unknown-user', invoiceId).run()

      const sentInvoice = await fetchInvoiceById(context.env.DB, invoiceId)
      if (!sentInvoice) {
        return jsonResponse({ error: 'Invoice not found after marking sent' }, { status: 404 })
      }
      await syncInvoiceToQbo(context.env.DB, context.env, sentInvoice)
      const syncedInvoice = await fetchInvoiceById(context.env.DB, invoiceId)
      if (!syncedInvoice) {
        return jsonResponse({ error: 'Invoice not found after QuickBooks sync' }, { status: 404 })
      }
      const clientAttachments = normalizeEmailAttachments([
        ...(body.attachment ? [body.attachment] : []),
        ...(Array.isArray(body.attachments) ? body.attachments : []),
      ])
      const projectDocuments = syncedInvoice.qboProjectId ? await fetchProjectInvoiceDocuments(context.env.DB, syncedInvoice.qboProjectId) : []
      const projectAttachments = await buildProjectEmailAttachments(context.env, projectDocuments)
      const messageId = await sendInvoiceEmail(syncedInvoice, context.env, manager, [...clientAttachments, ...projectAttachments], normalizeString(body.bccSenderEmail))
      await recordInvoiceEmailAccepted(context.env.DB, syncedInvoice, messageId)
      return jsonResponse({ invoice: await fetchInvoiceById(context.env.DB, invoiceId) })
    } catch (error: unknown) {
      console.error('Error sending invoice:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.post('/api/invoices/:id/void', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureInvoicesSchemaReady(context.env.DB)
      const invoiceId = normalizeString(context.req.param('id'))
      const existing = await fetchInvoiceById(context.env.DB, invoiceId, false)
      if (!existing) {
        return jsonResponse({ error: 'Invoice not found' }, { status: 404 })
      }
      if (existing.status === 'paid') {
        return badRequest('Paid invoices cannot be voided')
      }

      const body = await parseJsonBody(context.req.raw).catch(() => ({} as Record<string, unknown>))
      const voidDate = nowIso()
      const note = normalizeString(body.internalNote) || existing.internalNote
      if (existing.qboInvoiceId) {
        await voidInvoiceInQbo(context.env.DB, context.env, existing)
      }
      await context.env.DB.prepare(
        `UPDATE invoices
         SET status = 'void', void_date = COALESCE(void_date, ?), internal_note = ?, updated_date = ?, updated_by = ?
         WHERE id = ?`
      ).bind(voidDate, note, voidDate, context.get('auth').subject || 'unknown-user', invoiceId).run()
      return jsonResponse({ invoice: await fetchInvoiceById(context.env.DB, invoiceId) })
    } catch (error: unknown) {
      console.error('Error voiding invoice:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.post('/api/invoices/:id/mark-paid', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureInvoicesSchemaReady(context.env.DB)
      const invoiceId = normalizeString(context.req.param('id'))
      const existing = await fetchInvoiceById(context.env.DB, invoiceId, false)
      if (!existing) {
        return jsonResponse({ error: 'Invoice not found' }, { status: 404 })
      }
      if (existing.status === 'void') {
        return badRequest('Void invoices cannot be marked paid')
      }

      const body = await parseJsonBody(context.req.raw).catch(() => ({} as Record<string, unknown>))
      const user = context.get('auth').subject || 'unknown-user'
      const paidDate = normalizeString(body.paidDate) || nowIso()
      const grossCents = normalizeAmountCents(body.grossCents ?? body.amountCents ?? existing.totalCents)
      const feeCents = normalizeAmountCents(body.feeCents)
      const method = normalizeString(body.method) || 'Manual'
      const referenceNumber = normalizeString(body.referenceNumber ?? body.reference_number)
      const kind = normalizeString(body.kind) === 'deposit' ? 'deposit' : 'payment'
      const note = normalizeString(body.note ?? body.internalNote)
      if (grossCents <= 0) {
        return badRequest('Payment amount must be greater than zero')
      }
      if (method.toLowerCase() === 'check' && !referenceNumber) {
        return badRequest('Check number is required for check payments')
      }
      const payment = await upsertInvoicePayment(context.env.DB, {
        invoiceId,
        kind,
        status: 'succeeded',
        method,
        referenceNumber,
        grossCents,
        feeCents,
        netCents: Math.max(0, grossCents - feeCents),
        paidDate,
        note,
        user,
      })
      await context.env.DB.prepare(
        `UPDATE invoices
         SET internal_note = COALESCE(NULLIF(?, ''), internal_note), updated_date = ?, updated_by = ?
         WHERE id = ?`
      ).bind(note, nowIso(), user, invoiceId).run()
      await refreshInvoicePaymentStatus(context.env.DB, invoiceId)
      const paidInvoice = await fetchInvoiceById(context.env.DB, invoiceId)
      if (paidInvoice) {
        await notifyAccountingPaymentSubmitted(context.env.DB, context.env, paidInvoice, payment)
        await trySyncInvoicePaymentToQbo(context.env.DB, context.env, paidInvoice, payment)
      }
      return jsonResponse({ invoice: await fetchInvoiceById(context.env.DB, invoiceId) })
    } catch (error: unknown) {
      console.error('Error marking invoice paid:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.post('/api/invoices/:id/sync-payments', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureInvoicesSchemaReady(context.env.DB)
      await ensureQboSchemaReady(context.env.DB)
      const invoiceId = normalizeString(context.req.param('id'))
      const invoice = await fetchInvoiceById(context.env.DB, invoiceId)
      if (!invoice) {
        return jsonResponse({ error: 'Invoice not found' }, { status: 404 })
      }
      if (invoice.status === 'void') {
        return badRequest('Void invoices cannot sync payments')
      }

      const syncablePayments = invoice.payments.filter((payment) => payment.status === 'succeeded' &&
        !(payment.stripePaymentIntentId && payment.method === 'Stripe Details Pending') && (
        !payment.qboPaymentId ||
        payment.qboSyncStatus === 'error' ||
        Boolean(payment.qboPaymentId && !payment.qboDepositId && !payment.stripeBalanceTransactionId && !payment.stripePaymentIntentId)
      ))
      for (const payment of syncablePayments) {
        const currentInvoice = await fetchInvoiceById(context.env.DB, invoiceId)
        if (currentInvoice) {
          await trySyncInvoicePaymentToQbo(context.env.DB, context.env, currentInvoice, payment)
        }
      }

      return jsonResponse({ invoice: await fetchInvoiceById(context.env.DB, invoiceId) })
    } catch (error: unknown) {
      console.error('Error syncing invoice payments:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.post('/api/invoices/:id/payments/:paymentId/retry-stripe-details', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureInvoicesSchemaReady(context.env.DB)
      const invoiceId = normalizeString(context.req.param('id'))
      const paymentId = normalizeString(context.req.param('paymentId'))
      const payment = await fetchInvoicePaymentForInvoice(context.env.DB, invoiceId, paymentId)
      if (!payment) {
        return jsonResponse({ error: 'Payment not found' }, { status: 404 })
      }
      const paymentIntentId = payment.stripePaymentIntentId
      if (!paymentIntentId) {
        return badRequest('Stripe payment intent is required before retrying Stripe details')
      }

      const details = await getStripePaymentDetails(context.env, paymentIntentId)
      const grossCents = details.grossCents || payment.grossCents
      const feeCents = details.feeCents || payment.feeCents
      const netCents = details.netCents || Math.max(0, grossCents - feeCents)
      await context.env.DB.prepare(
        `UPDATE invoice_payments
         SET method = ?, reference_number = COALESCE(NULLIF(?, ''), reference_number),
             gross_cents = ?, fee_cents = ?, net_cents = ?,
             stripe_charge_id = COALESCE(NULLIF(?, ''), stripe_charge_id),
             stripe_balance_transaction_id = COALESCE(NULLIF(?, ''), stripe_balance_transaction_id),
             accounting_sync_state = json_patch(COALESCE(NULLIF(accounting_sync_state, ''), '{}'), ?),
             updated_date = ?, updated_by = ?
         WHERE id = ?`
      ).bind(
        details.method,
        paymentIntentId,
        grossCents,
        feeCents,
        netCents,
        details.chargeId,
        details.balanceTransactionId,
        paymentSyncState({
          qboPaymentId: payment.qboPaymentId,
          qboDepositId: payment.qboDepositId,
          qboStatus: payment.qboSyncStatus,
          qboMessage: payment.qboSyncMessage,
          qboLastSyncDate: payment.qboLastSyncDate,
          stripeCheckoutSessionId: payment.stripeCheckoutSessionId,
          stripePaymentIntentId: paymentIntentId,
          stripeChargeId: details.chargeId || payment.stripeChargeId,
          stripeBalanceTransactionId: details.balanceTransactionId || payment.stripeBalanceTransactionId,
          stripePayoutId: payment.stripePayoutId,
          stripePayoutStatus: payment.stripePayoutStatus,
          stripePayoutReconciledDate: payment.stripePayoutReconciledDate,
          stripeDetailsStatus: details.balanceTransactionId ? 'complete' : 'details_pending',
          accountingNotificationSentDate: payment.accountingNotificationSentDate,
        }),
        nowIso(),
        context.get('auth').subject || 'unknown-user',
        paymentId
      ).run()
      await refreshInvoicePaymentStatus(context.env.DB, invoiceId)
      const refreshedInvoice = await fetchInvoiceById(context.env.DB, invoiceId)
      const refreshedPayment = await fetchInvoicePaymentForInvoice(context.env.DB, invoiceId, paymentId)
      if (details.paymentMethodResolved && refreshedInvoice && refreshedPayment) {
        await trySyncInvoicePaymentToQbo(context.env.DB, context.env, refreshedInvoice, refreshedPayment)
      }
      return jsonResponse({ invoice: await fetchInvoiceById(context.env.DB, invoiceId) })
    } catch (error: unknown) {
      console.error('Error retrying Stripe payment details:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.post('/api/invoices/:id/payments/:paymentId/retry-qbo-payment', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureInvoicesSchemaReady(context.env.DB)
      await ensureQboSchemaReady(context.env.DB)
      const invoiceId = normalizeString(context.req.param('id'))
      const paymentId = normalizeString(context.req.param('paymentId'))
      const invoice = await fetchInvoiceById(context.env.DB, invoiceId)
      const payment = await fetchInvoicePaymentForInvoice(context.env.DB, invoiceId, paymentId)
      if (!invoice || !payment) {
        return jsonResponse({ error: 'Invoice or payment not found' }, { status: 404 })
      }
      if (invoice.status === 'void') {
        return badRequest('Void invoices cannot sync payments')
      }
      if (payment.stripePaymentIntentId && payment.method === 'Stripe Details Pending') {
        return badRequest('Stripe payment details must be retrieved before syncing to QuickBooks')
      }

      await trySyncInvoicePaymentToQbo(context.env.DB, context.env, invoice, payment)
      return jsonResponse({ invoice: await fetchInvoiceById(context.env.DB, invoiceId) })
    } catch (error: unknown) {
      console.error('Error retrying QBO payment:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.post('/api/invoices/:id/payments/:paymentId/retry-qbo-deposit', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureInvoicesSchemaReady(context.env.DB)
      await ensureQboSchemaReady(context.env.DB)
      const invoiceId = normalizeString(context.req.param('id'))
      const paymentId = normalizeString(context.req.param('paymentId'))
      const invoice = await fetchInvoiceById(context.env.DB, invoiceId)
      const payment = await fetchInvoicePaymentForInvoice(context.env.DB, invoiceId, paymentId)
      if (!invoice || !payment) {
        return jsonResponse({ error: 'Invoice or payment not found' }, { status: 404 })
      }
      if (!payment.qboPaymentId) {
        return badRequest('QBO payment must be synced before retrying the deposit')
      }

      await trySyncInvoicePaymentToQbo(context.env.DB, context.env, invoice, payment)
      return jsonResponse({ invoice: await fetchInvoiceById(context.env.DB, invoiceId) })
    } catch (error: unknown) {
      console.error('Error retrying QBO deposit:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.post('/api/invoices/:id/payments/:paymentId/retry-payout-sync', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureInvoicesSchemaReady(context.env.DB)
      await ensureQboSchemaReady(context.env.DB)
      const invoiceId = normalizeString(context.req.param('id'))
      const paymentId = normalizeString(context.req.param('paymentId'))
      const payment = await fetchInvoicePaymentForInvoice(context.env.DB, invoiceId, paymentId)
      if (!payment) {
        return jsonResponse({ error: 'Payment not found' }, { status: 404 })
      }
      if (!payment.stripePayoutId) {
        return badRequest('Stripe payout is required before retrying payout sync')
      }
      const payout = await fetchStripePayoutById(context.env.DB, payment.stripePayoutId)
      if (!payout) {
        return jsonResponse({ error: 'Stripe payout not found' }, { status: 404 })
      }

      await handleStripePayoutReconciled(context.env.DB, context.env, payout)
      return jsonResponse({ invoice: await fetchInvoiceById(context.env.DB, invoiceId) })
    } catch (error: unknown) {
      console.error('Error retrying payout sync:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.post('/api/invoices/public/:token/checkout', async (context) => {
    try {
      await ensureInvoicesSchemaReady(context.env.DB)
      const invoice = await fetchInvoiceByPublicToken(context.env.DB, normalizeString(context.req.param('token')))
      if (!invoice) {
        return jsonResponse({ error: 'Invoice not found' }, { status: 404 })
      }
      if (invoice.status === 'paid' || invoice.status === 'void') {
        return badRequest('This invoice is not payable')
      }
      const paidCents = await getSuccessfulPaymentTotalCents(context.env.DB, invoice.id)
      const amountDueCents = Math.max(0, invoice.totalCents - paidCents)
      if (amountDueCents <= 0) {
        return badRequest('Invoice total must be greater than zero')
      }

      const publishableKey = getStripePublishableKey(context.env)
      const checkoutSession = await createStripeCheckoutSession(invoice, context.env, amountDueCents)
      const clientSecret = normalizeString(checkoutSession.client_secret)
      if (!clientSecret) {
        return serverError('Stripe did not return a checkout client secret')
      }
      await context.env.DB.prepare(
        `UPDATE invoices
         SET stripe_checkout_session_id = COALESCE(NULLIF(?, ''), stripe_checkout_session_id),
             status = CASE WHEN status = 'draft' THEN 'sent' ELSE status END,
             updated_date = ?
         WHERE id = ?`
      ).bind(normalizeString(checkoutSession.id), nowIso(), invoice.id).run()

      return jsonResponse({ clientSecret, checkoutSessionId: normalizeString(checkoutSession.id), publishableKey })
    } catch (error: unknown) {
      console.error('Error creating invoice checkout:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.post('/api/brevo/webhook', async (context) => {
    try {
      await ensureInvoicesSchemaReady(context.env.DB)
      const webhookSecret = normalizeString(context.env.BREVO_WEBHOOK_SECRET)
      if (!webhookSecret) {
        return serverError('Server configuration error: Missing BREVO_WEBHOOK_SECRET')
      }
      const providedSecret = normalizeString(context.req.raw.headers.get('X-Brevo-Webhook-Secret'))
      if (!providedSecret || providedSecret !== webhookSecret) {
        return jsonResponse({ error: 'Invalid Brevo webhook secret' }, { status: 400 })
      }

      const payload = await context.req.raw.json().catch(() => null) as BrevoWebhookPayload | null
      if (!payload || typeof payload !== 'object') {
        return badRequest('Invalid Brevo webhook payload')
      }

      const handled = await handleBrevoInvoiceDeliveryWebhook(context.env.DB, context.env, payload)
      return jsonResponse({ received: true, handled })
    } catch (error: unknown) {
      console.error('Error handling Brevo webhook:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.post('/api/stripe/webhook', async (context) => {
    try {
      await ensureInvoicesSchemaReady(context.env.DB)
      const webhookSecret = normalizeString(context.env.STRIPE_WEBHOOK_SECRET)
      if (!webhookSecret) {
        return serverError('Server configuration error: Missing STRIPE_WEBHOOK_SECRET')
      }
      const rawBody = await context.req.raw.text()
      const signatureHeader = normalizeString(context.req.raw.headers.get('Stripe-Signature'))
      const verified = await verifyStripeSignature(rawBody, signatureHeader, webhookSecret)
      if (!verified) {
        return jsonResponse({ error: 'Invalid Stripe signature' }, { status: 400 })
      }

      const event = JSON.parse(rawBody) as { type?: string; data?: { object?: StripeCheckoutSession | StripePaymentIntent | StripePayout } }
      const eventObject = event.data?.object
      const session = eventObject as StripeCheckoutSession | undefined
      if (
        session &&
        (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') &&
        (session.payment_status === 'paid' || event.type === 'checkout.session.async_payment_succeeded')
      ) {
        await markInvoicePaidFromStripe(context.env.DB, context.env, session)
      }

      if (session && event.type === 'checkout.session.async_payment_failed') {
        const invoiceId = normalizeString(session.metadata?.invoice_id)
        if (invoiceId) {
          await context.env.DB.prepare(
            `UPDATE invoices
             SET status = CASE WHEN status = 'paid' THEN status ELSE 'sent' END,
                 internal_note = 'Stripe reported async payment failed.',
                 updated_date = ?
             WHERE id = ? AND status != 'void'`
          ).bind(nowIso(), invoiceId).run()
        }
      }

      if (eventObject && event.type === 'payment_intent.succeeded') {
        await markInvoicePaidFromStripePaymentIntent(context.env.DB, context.env, eventObject as StripePaymentIntent)
      }

      if (eventObject && event.type === 'payment_intent.payment_failed') {
        const paymentIntent = eventObject as StripePaymentIntent
        const invoiceId = normalizeString(paymentIntent.metadata?.invoice_id)
        if (invoiceId) {
          await context.env.DB.prepare(
            `UPDATE invoices
             SET status = CASE WHEN status = 'paid' THEN status ELSE 'sent' END,
                 internal_note = 'Stripe reported payment failed.',
                 updated_date = ?
             WHERE id = ? AND status != 'void'`
          ).bind(nowIso(), invoiceId).run()
        }
      }

      if (eventObject && event.type === 'payout.paid') {
        await handleStripePayoutPaid(context.env.DB, context.env, eventObject as StripePayout)
      }

      if (eventObject && event.type === 'payout.reconciliation_completed') {
        await handleStripePayoutReconciled(context.env.DB, context.env, eventObject as StripePayout)
      }

      return jsonResponse({ received: true })
    } catch (error: unknown) {
      console.error('Error handling Stripe webhook:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  return app
}
