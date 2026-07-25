import {
  mapInvoicePaymentRow,
  type ClientCreatePayload,
  type ClientUpdatePayload,
  type Invoice,
  type InvoicePayment,
  type InvoicePaymentRow,
  type ProjectCreatePayload,
  type ProjectUpdatePayload,
  type QboAccount,
  type QboConnectionStatus,
  type QboCustomer,
  type QboServiceItem,
} from '@wps/scripts'
import { Hono } from 'hono'
import { invoiceSyncState, paymentSyncState, payoutSyncState } from './accountingSyncState'
import { badRequest, jsonResponse, requireAuthMode, serverError, type ApiContext, type ApiHonoEnv } from './apiTypes'

const QBO_ADMIN_EMAIL = 'nwhite@whitepointsurvey.com'

type QboTokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  x_refresh_token_expires_in?: number
}

type QboAddress = {
  Line1?: string
  Line2?: string
  City?: string
  CountrySubDivisionCode?: string
  PostalCode?: string
}

type QboCustomerResponse = {
  Id?: string
  ParentRef?: { value?: string }
  DisplayName?: string
  FullyQualifiedName?: string
  CompanyName?: string
  GivenName?: string
  FamilyName?: string
  PrimaryEmailAddr?: { Address?: string }
  PrimaryPhone?: { FreeFormNumber?: string }
  BillAddr?: QboAddress
  ShipAddr?: QboAddress
  Active?: boolean
  SyncToken?: string
  Job?: boolean
  MetaData?: { LastUpdatedTime?: string }
}

type QboInvoiceResponse = {
  Invoice?: {
    Id?: string
    SyncToken?: string
  }
  Payment?: {
    Id?: string
    Line?: Array<{
      Id?: string
    }>
  }
  Deposit?: {
    Id?: string
  }
}

type StripePayoutDepositInput = {
  payoutId: string
  amountCents: number
  arrivalDate: string
}

type StripePayoutDepositPayment = {
  invoice: Invoice
  payment: InvoicePayment
}

type QboAccountResponse = {
  Id?: string
  Name?: string
  FullyQualifiedName?: string
  AccountType?: string
  AccountSubType?: string
  Classification?: string
  Active?: boolean
  SyncToken?: string
  MetaData?: { LastUpdatedTime?: string }
}

type QboItemResponse = {
  Id?: string
  Name?: string
  FullyQualifiedName?: string
  Description?: string
  Type?: string
  Active?: boolean
  SyncToken?: string
  MetaData?: { LastUpdatedTime?: string }
}

const qboSchemaReadyByDb = new WeakMap<D1Database, Promise<void>>()

function normalizeString(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeBool(value: unknown): boolean {
  return value === true || value === 1 || value === '1'
}

function nowIso(): string {
  return new Date().toISOString()
}

function createStateToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function getQboEnvironment(env: ApiHonoEnv['Bindings']): 'sandbox' | 'production' {
  return normalizeString(env.QBO_ENVIRONMENT).toLowerCase() === 'sandbox' ? 'sandbox' : 'production'
}

function getQboApiBaseUrl(env: ApiHonoEnv['Bindings']): string {
  return getQboEnvironment(env) === 'sandbox' ? 'https://sandbox-quickbooks.api.intuit.com' : 'https://quickbooks.api.intuit.com'
}

function getQboMinorVersion(env: ApiHonoEnv['Bindings']): string {
  return normalizeString(env.QBO_MINOR_VERSION) || '75'
}

function getDocumentBaseUrl(env: ApiHonoEnv['Bindings']): string {
  const configured = normalizeString(env.INVOICE_PUBLIC_BASE_URL)
  if (!configured) {
    throw new Error('Server configuration error: Missing INVOICE_PUBLIC_BASE_URL')
  }
  return configured.replace(/\/+$/g, '')
}

function requireQboConfig(env: ApiHonoEnv['Bindings']): { clientId: string; clientSecret: string; redirectUri: string } {
  const clientId = normalizeString(env.QBO_CLIENT_ID)
  const clientSecret = normalizeString(env.QBO_CLIENT_SECRET)
  const redirectUri = normalizeString(env.QBO_REDIRECT_URI)
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Server configuration error: Missing QuickBooks OAuth configuration')
  }
  return { clientId, clientSecret, redirectUri }
}

async function ensureColumn(db: D1Database, tableName: 'invoices', columnDefinitionSql: string): Promise<void> {
  try {
    await db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinitionSql}`).run()
  } catch (error: unknown) {
    const message = String(error instanceof Error ? error.message : error).toLowerCase()
    if (!message.includes('duplicate column name')) {
      throw error
    }
  }
}

async function ensureQboSchema(db: D1Database): Promise<void> {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS qbo_connection (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      realm_id TEXT NOT NULL,
      environment TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      token_expires_date DATETIME NOT NULL,
      refresh_expires_date DATETIME,
      last_customer_sync_date DATETIME,
      last_item_sync_date DATETIME,
      last_account_sync_date DATETIME,
      default_service_item_id TEXT,
      default_deposit_account_id TEXT,
      stripe_fee_expense_account_id TEXT,
      connected_date DATETIME NOT NULL,
      updated_date DATETIME NOT NULL
    )`
  ).run()

  for (const column of ['last_item_sync_date DATETIME', 'last_account_sync_date DATETIME', 'default_service_item_id TEXT', 'default_deposit_account_id TEXT', 'stripe_fee_expense_account_id TEXT']) {
    try {
      await db.prepare(`ALTER TABLE qbo_connection ADD COLUMN ${column}`).run()
    } catch (error: unknown) {
      const message = String(error instanceof Error ? error.message : error).toLowerCase()
      if (!message.includes('duplicate column name')) {
        throw error
      }
    }
  }

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS qbo_oauth_states (
      state TEXT PRIMARY KEY,
      return_path TEXT,
      created_date DATETIME NOT NULL
    )`
  ).run()

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS qbo_customers (
      qbo_id TEXT PRIMARY KEY,
      parent_id TEXT,
      display_name TEXT NOT NULL,
      fully_qualified_name TEXT,
      company_name TEXT,
      given_name TEXT,
      family_name TEXT,
      primary_email TEXT,
      primary_phone TEXT,
      bill_addr_line1 TEXT,
      bill_addr_line2 TEXT,
      bill_addr_city TEXT,
      bill_addr_state TEXT,
      bill_addr_postal_code TEXT,
      ship_addr_line1 TEXT,
      ship_addr_line2 TEXT,
      ship_addr_city TEXT,
      ship_addr_state TEXT,
      ship_addr_postal_code TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      sync_token TEXT,
      qbo_updated_time DATETIME,
      last_synced_date DATETIME NOT NULL
    )`
  ).run()

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS qbo_service_items (
      qbo_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      fully_qualified_name TEXT,
      description TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      sync_token TEXT,
      qbo_updated_time DATETIME,
      last_synced_date DATETIME NOT NULL
    )`
  ).run()

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS qbo_accounts (
      qbo_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      fully_qualified_name TEXT,
      account_type TEXT,
      account_sub_type TEXT,
      classification TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      sync_token TEXT,
      qbo_updated_time DATETIME,
      last_synced_date DATETIME NOT NULL
    )`
  ).run()

  for (const column of [
    'qbo_customer_id TEXT',
    'qbo_project_id TEXT',
    'qbo_invoice_id TEXT',
    'qbo_invoice_sync_token TEXT',
    'qbo_payment_id TEXT',
    'qbo_last_sync_date DATETIME',
    'qbo_sync_status TEXT',
    'qbo_sync_message TEXT',
  ]) {
    await ensureColumn(db, 'invoices', column)
  }

  for (const statement of [
    'CREATE INDEX IF NOT EXISTS idx_qbo_customers_parent_id ON qbo_customers(parent_id)',
    'CREATE INDEX IF NOT EXISTS idx_qbo_customers_display_name ON qbo_customers(display_name)',
    'CREATE INDEX IF NOT EXISTS idx_qbo_customers_primary_email ON qbo_customers(primary_email)',
    'CREATE INDEX IF NOT EXISTS idx_qbo_service_items_name ON qbo_service_items(name)',
    'CREATE INDEX IF NOT EXISTS idx_qbo_accounts_name ON qbo_accounts(name)',
    'CREATE INDEX IF NOT EXISTS idx_qbo_accounts_account_type ON qbo_accounts(account_type)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_qbo_customer_id ON invoices(qbo_customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_qbo_project_id ON invoices(qbo_project_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_qbo_invoice_id ON invoices(qbo_invoice_id)',
  ]) {
    await db.prepare(statement).run()
  }
}

function mapCachedQboAccount(row: Record<string, unknown>): QboAccount {
  return {
    id: normalizeString(row.qbo_id),
    name: normalizeString(row.name),
    fullyQualifiedName: normalizeString(row.fully_qualified_name),
    accountType: normalizeString(row.account_type),
    accountSubType: normalizeString(row.account_sub_type),
    classification: normalizeString(row.classification),
    active: normalizeBool(row.active),
    syncToken: normalizeString(row.sync_token),
    qboUpdatedTime: normalizeString(row.qbo_updated_time),
    lastSyncedDate: normalizeString(row.last_synced_date),
  }
}

function mapCachedQboServiceItem(row: Record<string, unknown>): QboServiceItem {
  return {
    id: normalizeString(row.qbo_id),
    name: normalizeString(row.name),
    fullyQualifiedName: normalizeString(row.fully_qualified_name),
    description: normalizeString(row.description),
    active: normalizeBool(row.active),
    syncToken: normalizeString(row.sync_token),
    qboUpdatedTime: normalizeString(row.qbo_updated_time),
    lastSyncedDate: normalizeString(row.last_synced_date),
  }
}

export function ensureQboSchemaReady(db: D1Database): Promise<void> {
  const existing = qboSchemaReadyByDb.get(db)
  if (existing) return existing
  const ready = ensureQboSchema(db)
  qboSchemaReadyByDb.set(db, ready)
  return ready
}

function mapCachedQboCustomer(row: Record<string, unknown>): QboCustomer {
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

async function getConnection(db: D1Database): Promise<Record<string, unknown> | null> {
  await ensureQboSchemaReady(db)
  return db.prepare('SELECT * FROM qbo_connection WHERE id = 1').first<Record<string, unknown>>()
}

async function exchangeToken(env: ApiHonoEnv['Bindings'], body: URLSearchParams): Promise<QboTokenResponse> {
  const { clientId, clientSecret } = requireQboConfig(env)
  const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'x-include-refresh-token-hard-expires-in': 'true',
    },
    body: body.toString(),
  })
  const data = await response.json().catch(() => null) as QboTokenResponse | { error_description?: string } | null
  if (!response.ok) {
    const message = data && 'error_description' in data ? data.error_description : response.statusText
    throw new Error(`QuickBooks OAuth failed: ${message || response.statusText}`)
  }
  return data as QboTokenResponse
}

async function storeConnection(db: D1Database, env: ApiHonoEnv['Bindings'], realmId: string, token: QboTokenResponse): Promise<void> {
  const accessToken = normalizeString(token.access_token)
  const refreshToken = normalizeString(token.refresh_token)
  if (!accessToken || !refreshToken) {
    throw new Error('QuickBooks OAuth did not return access and refresh tokens')
  }

  const now = Date.now()
  const tokenExpiresDate = new Date(now + Math.max(60, Number(token.expires_in ?? 3600) - 60) * 1000).toISOString()
  const refreshExpiresDate = token.x_refresh_token_expires_in
    ? new Date(now + Number(token.x_refresh_token_expires_in) * 1000).toISOString()
    : ''
  const date = nowIso()

  await db.prepare(
    `INSERT INTO qbo_connection (
      id, realm_id, environment, access_token, refresh_token, token_expires_date, refresh_expires_date, connected_date, updated_date
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      realm_id = excluded.realm_id,
      environment = excluded.environment,
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      token_expires_date = excluded.token_expires_date,
      refresh_expires_date = excluded.refresh_expires_date,
      updated_date = excluded.updated_date`
  ).bind(realmId, getQboEnvironment(env), accessToken, refreshToken, tokenExpiresDate, refreshExpiresDate, date, date).run()
}

async function getAccessToken(db: D1Database, env: ApiHonoEnv['Bindings']): Promise<{ realmId: string; accessToken: string }> {
  const connection = await getConnection(db)
  const realmId = normalizeString(connection?.realm_id)
  const accessToken = normalizeString(connection?.access_token)
  const refreshToken = normalizeString(connection?.refresh_token)
  if (!realmId || !accessToken || !refreshToken) {
    throw new Error('QuickBooks is not connected')
  }

  const expires = new Date(normalizeString(connection?.token_expires_date)).getTime()
  if (Number.isFinite(expires) && expires > Date.now() + 60_000) {
    return { realmId, accessToken }
  }

  const body = new URLSearchParams()
  body.set('grant_type', 'refresh_token')
  body.set('refresh_token', refreshToken)
  const token = await exchangeToken(env, body)
  await storeConnection(db, env, realmId, token)
  return { realmId, accessToken: normalizeString(token.access_token) }
}

async function qboFetch<T>(db: D1Database, env: ApiHonoEnv['Bindings'], path: string, init: RequestInit = {}): Promise<T> {
  const { realmId, accessToken } = await getAccessToken(db, env)
  const separator = path.includes('?') ? '&' : '?'
  const response = await fetch(`${getQboApiBaseUrl(env)}/v3/company/${realmId}${path}${separator}minorversion=${encodeURIComponent(getQboMinorVersion(env))}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers || {}),
    },
  })
  const data = await response.json().catch(() => null) as T | { Fault?: { Error?: Array<{ Message?: string; Detail?: string }> } } | null
  if (!response.ok) {
    const error = data && typeof data === 'object' && 'Fault' in data ? data.Fault?.Error?.[0] : null
    throw new Error(`QuickBooks API failed: ${error?.Detail || error?.Message || response.statusText}`)
  }
  return data as T
}

function qboAmount(cents: number): number {
  return Math.round(cents) / 100
}

function requireQboAdmin(context: ApiContext): Response | null {
  const authError = requireAuthMode(context, 'microsoft')
  if (authError) return authError

  const email = normalizeString(context.get('auth')?.email).toLowerCase()
  if (email !== QBO_ADMIN_EMAIL) {
    return jsonResponse({ error: 'Forbidden' }, { status: 403 })
  }

  return null
}

function buildQboInvoiceLines(invoice: Invoice, serviceItemId: string) {
  const lines = invoice.lineItems.map((item) => ({
    DetailType: 'SalesItemLineDetail',
    Description: item.description,
    Amount: qboAmount(item.amountCents),
    SalesItemLineDetail: {
      ItemRef: { value: serviceItemId },
      Qty: 1,
      UnitPrice: qboAmount(item.amountCents),
    },
  }))

  if (invoice.previouslyBilledCents > 0) {
    lines.push({
      DetailType: 'SalesItemLineDetail',
      Description: 'Previously billed',
      Amount: -qboAmount(invoice.previouslyBilledCents),
      SalesItemLineDetail: {
        ItemRef: { value: serviceItemId },
        Qty: 1,
        UnitPrice: -qboAmount(invoice.previouslyBilledCents),
      },
    })
  }

  return lines
}

function customerDisplayName(customer: QboCustomerResponse): string {
  return normalizeString(customer.DisplayName || customer.FullyQualifiedName || customer.CompanyName || `${normalizeString(customer.GivenName)} ${normalizeString(customer.FamilyName)}`)
}

async function upsertQboCustomer(db: D1Database, customer: QboCustomerResponse, syncedDate: string): Promise<void> {
  const id = normalizeString(customer.Id)
  const displayName = customerDisplayName(customer)
  if (!id || !displayName) return

  await db.prepare(
    `INSERT INTO qbo_customers (
      qbo_id, parent_id, display_name, fully_qualified_name, company_name, given_name, family_name,
      primary_email, primary_phone, bill_addr_line1, bill_addr_line2, bill_addr_city, bill_addr_state, bill_addr_postal_code,
      ship_addr_line1, ship_addr_line2, ship_addr_city, ship_addr_state, ship_addr_postal_code,
      active, sync_token, qbo_updated_time, last_synced_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(qbo_id) DO UPDATE SET
      parent_id = excluded.parent_id,
      display_name = excluded.display_name,
      fully_qualified_name = excluded.fully_qualified_name,
      company_name = excluded.company_name,
      given_name = excluded.given_name,
      family_name = excluded.family_name,
      primary_email = excluded.primary_email,
      primary_phone = excluded.primary_phone,
      bill_addr_line1 = excluded.bill_addr_line1,
      bill_addr_line2 = excluded.bill_addr_line2,
      bill_addr_city = excluded.bill_addr_city,
      bill_addr_state = excluded.bill_addr_state,
      bill_addr_postal_code = excluded.bill_addr_postal_code,
      ship_addr_line1 = excluded.ship_addr_line1,
      ship_addr_line2 = excluded.ship_addr_line2,
      ship_addr_city = excluded.ship_addr_city,
      ship_addr_state = excluded.ship_addr_state,
      ship_addr_postal_code = excluded.ship_addr_postal_code,
      active = excluded.active,
      sync_token = excluded.sync_token,
      qbo_updated_time = excluded.qbo_updated_time,
      last_synced_date = excluded.last_synced_date`
  ).bind(
    id,
    normalizeString(customer.ParentRef?.value),
    displayName,
    normalizeString(customer.FullyQualifiedName),
    normalizeString(customer.CompanyName),
    normalizeString(customer.GivenName),
    normalizeString(customer.FamilyName),
    normalizeString(customer.PrimaryEmailAddr?.Address).toLowerCase(),
    normalizeString(customer.PrimaryPhone?.FreeFormNumber),
    normalizeString(customer.BillAddr?.Line1),
    normalizeString(customer.BillAddr?.Line2),
    normalizeString(customer.BillAddr?.City),
    normalizeString(customer.BillAddr?.CountrySubDivisionCode),
    normalizeString(customer.BillAddr?.PostalCode),
    normalizeString(customer.ShipAddr?.Line1),
    normalizeString(customer.ShipAddr?.Line2),
    normalizeString(customer.ShipAddr?.City),
    normalizeString(customer.ShipAddr?.CountrySubDivisionCode),
    normalizeString(customer.ShipAddr?.PostalCode),
    customer.Active === false ? 0 : 1,
    normalizeString(customer.SyncToken),
    normalizeString(customer.MetaData?.LastUpdatedTime),
    syncedDate
  ).run()
}

async function fetchCachedQboCustomer(db: D1Database, qboCustomerId: string): Promise<QboCustomer | null> {
  await ensureQboSchemaReady(db)
  const row = await db.prepare('SELECT * FROM qbo_customers WHERE qbo_id = ?').bind(qboCustomerId).first<Record<string, unknown>>()
  return row ? mapCachedQboCustomer(row) : null
}

function buildCustomerAddress(address: ClientCreatePayload['address']): QboAddress {
  return {
    Line1: normalizeString(address.line1),
    Line2: normalizeString(address.line2) || undefined,
    City: normalizeString(address.city),
    CountrySubDivisionCode: normalizeString(address.state),
    PostalCode: normalizeString(address.postalCode),
  }
}

function buildCustomerContact(payload: Pick<ClientCreatePayload, 'email' | 'phone'>) {
  const email = normalizeString(payload.email).toLowerCase()
  const phone = normalizeString(payload.phone)
  return {
    ...(email ? { PrimaryEmailAddr: { Address: email } } : {}),
    ...(phone ? { PrimaryPhone: { FreeFormNumber: phone } } : {}),
  }
}

function buildCachedCustomerPatch(
  current: QboCustomer,
  payload: ClientUpdatePayload | ProjectUpdatePayload,
  qboCustomer: QboCustomerResponse,
  parentId = current.parentId
): QboCustomerResponse {
  const address = buildCustomerAddress(payload.address)
  const syncToken = normalizeString(qboCustomer.SyncToken || current.syncToken)
  return {
    Id: current.id,
    ParentRef: parentId ? { value: parentId } : undefined,
    DisplayName: normalizeString(qboCustomer.DisplayName || payload.name || current.displayName),
    FullyQualifiedName: normalizeString(qboCustomer.FullyQualifiedName || current.fullyQualifiedName),
    CompanyName: normalizeString(qboCustomer.CompanyName || payload.name || current.companyName),
    GivenName: current.givenName,
    FamilyName: current.familyName,
    PrimaryEmailAddr: payload.email ? { Address: normalizeString(payload.email).toLowerCase() } : current.primaryEmail ? { Address: current.primaryEmail } : undefined,
    PrimaryPhone: payload.phone ? { FreeFormNumber: normalizeString(payload.phone) } : current.primaryPhone ? { FreeFormNumber: current.primaryPhone } : undefined,
    BillAddr: address,
    ShipAddr: parentId ? address : {
      Line1: current.shipAddrLine1,
      Line2: current.shipAddrLine2,
      City: current.shipAddrCity,
      CountrySubDivisionCode: current.shipAddrState,
      PostalCode: current.shipAddrPostalCode,
    },
    Active: current.active,
    SyncToken: syncToken,
    Job: Boolean(parentId),
    MetaData: { LastUpdatedTime: normalizeString(qboCustomer.MetaData?.LastUpdatedTime || current.qboUpdatedTime) },
  }
}

export async function createQboClientCustomer(db: D1Database, env: ApiHonoEnv['Bindings'], payload: ClientCreatePayload): Promise<QboCustomer> {
  await ensureQboSchemaReady(db)
  const name = normalizeString(payload.name)
  const data = await qboFetch<{ Customer?: QboCustomerResponse }>(db, env, '/customer', {
    method: 'POST',
    body: JSON.stringify({
      DisplayName: name,
      CompanyName: name,
      BillAddr: buildCustomerAddress(payload.address),
      ...buildCustomerContact(payload),
    }),
  })
  const customer = data.Customer
  const qboCustomerId = normalizeString(customer?.Id)
  if (!customer || !qboCustomerId) {
    throw new Error('QuickBooks did not return a customer ID')
  }
  await upsertQboCustomer(db, customer, nowIso())
  const cached = await fetchCachedQboCustomer(db, qboCustomerId)
  if (!cached) {
    throw new Error('QuickBooks customer was not cached after create')
  }
  return cached
}

export async function updateQboClientCustomer(db: D1Database, env: ApiHonoEnv['Bindings'], client: QboCustomer, payload: ClientUpdatePayload): Promise<QboCustomer> {
  await ensureQboSchemaReady(db)
  const name = normalizeString(payload.name)
  const data = await qboFetch<{ Customer?: QboCustomerResponse }>(db, env, '/customer', {
    method: 'POST',
    body: JSON.stringify({
      Id: client.id,
      SyncToken: client.syncToken,
      sparse: true,
      DisplayName: name,
      CompanyName: name,
      BillAddr: buildCustomerAddress(payload.address),
      ...buildCustomerContact(payload),
    }),
  })
  const customer = data.Customer
  const qboCustomerId = normalizeString(customer?.Id)
  if (!customer || !qboCustomerId) {
    throw new Error('QuickBooks did not return the updated customer')
  }
  await upsertQboCustomer(db, buildCachedCustomerPatch(client, payload, customer, ''), nowIso())
  const cached = await fetchCachedQboCustomer(db, qboCustomerId)
  if (!cached) {
    throw new Error('QuickBooks customer was not cached after update')
  }
  return cached
}

export async function createQboProjectCustomer(db: D1Database, env: ApiHonoEnv['Bindings'], payload: ProjectCreatePayload): Promise<QboCustomer> {
  await ensureQboSchemaReady(db)
  const name = normalizeString(payload.name)
  const parentCustomerId = normalizeString(payload.parentCustomerId)
  const data = await qboFetch<{ Customer?: QboCustomerResponse }>(db, env, '/customer', {
    method: 'POST',
    body: JSON.stringify({
      DisplayName: name,
      CompanyName: name,
      ParentRef: { value: parentCustomerId },
      Job: true,
      BillAddr: buildCustomerAddress(payload.address),
      ShipAddr: buildCustomerAddress(payload.address),
      ...buildCustomerContact(payload),
    }),
  })
  const customer = data.Customer
  const qboCustomerId = normalizeString(customer?.Id)
  if (!customer || !qboCustomerId) {
    throw new Error('QuickBooks did not return a project ID')
  }
  await upsertQboCustomer(db, customer, nowIso())
  const cached = await fetchCachedQboCustomer(db, qboCustomerId)
  if (!cached) {
    throw new Error('QuickBooks project was not cached after create')
  }
  return cached
}

export async function updateQboProjectCustomer(db: D1Database, env: ApiHonoEnv['Bindings'], project: QboCustomer, payload: ProjectUpdatePayload): Promise<QboCustomer> {
  await ensureQboSchemaReady(db)
  const name = normalizeString(payload.name)
  const data = await qboFetch<{ Customer?: QboCustomerResponse }>(db, env, '/customer', {
    method: 'POST',
    body: JSON.stringify({
      Id: project.id,
      SyncToken: project.syncToken,
      sparse: true,
      DisplayName: name,
      CompanyName: name,
      ParentRef: { value: project.parentId },
      Job: true,
      BillAddr: buildCustomerAddress(payload.address),
      ShipAddr: buildCustomerAddress(payload.address),
      ...buildCustomerContact(payload),
    }),
  })
  const customer = data.Customer
  const qboCustomerId = normalizeString(customer?.Id)
  if (!customer || !qboCustomerId) {
    throw new Error('QuickBooks did not return the updated project')
  }
  await upsertQboCustomer(db, buildCachedCustomerPatch(project, payload, customer, project.parentId), nowIso())
  const cached = await fetchCachedQboCustomer(db, qboCustomerId)
  if (!cached) {
    throw new Error('QuickBooks project was not cached after update')
  }
  return cached
}

export async function moveQboProjectCustomer(db: D1Database, env: ApiHonoEnv['Bindings'], project: QboCustomer, parentCustomerId: string): Promise<QboCustomer> {
  await ensureQboSchemaReady(db)
  const data = await qboFetch<{ Customer?: QboCustomerResponse }>(db, env, '/customer', {
    method: 'POST',
    body: JSON.stringify({
      Id: project.id,
      SyncToken: project.syncToken,
      sparse: true,
      ParentRef: { value: normalizeString(parentCustomerId) },
      Job: true,
    }),
  })
  const customer = data.Customer
  const qboCustomerId = normalizeString(customer?.Id)
  if (!customer || !qboCustomerId) {
    throw new Error('QuickBooks did not return the moved project')
  }
  await upsertQboCustomer(db, {
    Id: project.id,
    ParentRef: { value: normalizeString(parentCustomerId) },
    DisplayName: project.displayName,
    FullyQualifiedName: project.fullyQualifiedName,
    CompanyName: project.companyName,
    PrimaryEmailAddr: project.primaryEmail ? { Address: project.primaryEmail } : undefined,
    PrimaryPhone: project.primaryPhone ? { FreeFormNumber: project.primaryPhone } : undefined,
    BillAddr: {
      Line1: project.billAddrLine1,
      Line2: project.billAddrLine2,
      City: project.billAddrCity,
      CountrySubDivisionCode: project.billAddrState,
      PostalCode: project.billAddrPostalCode,
    },
    ShipAddr: {
      Line1: project.shipAddrLine1,
      Line2: project.shipAddrLine2,
      City: project.shipAddrCity,
      CountrySubDivisionCode: project.shipAddrState,
      PostalCode: project.shipAddrPostalCode,
    },
    Active: project.active,
    SyncToken: normalizeString(customer.SyncToken || project.syncToken),
    Job: true,
    MetaData: { LastUpdatedTime: normalizeString(customer.MetaData?.LastUpdatedTime || project.qboUpdatedTime) },
  }, nowIso())
  const cached = await fetchCachedQboCustomer(db, qboCustomerId)
  if (!cached) {
    throw new Error('QuickBooks project was not cached after move')
  }
  return cached
}

export async function syncQboCustomers(db: D1Database, env: ApiHonoEnv['Bindings']): Promise<number> {
  await ensureQboSchemaReady(db)
  let startPosition = 1
  let syncedCount = 0
  const syncedDate = nowIso()

  while (true) {
    const query = encodeURIComponent(`SELECT * FROM Customer STARTPOSITION ${startPosition} MAXRESULTS 1000`)
    const data = await qboFetch<{ QueryResponse?: { Customer?: QboCustomerResponse[]; maxResults?: number } }>(db, env, `/query?query=${query}`)
    const customers = data.QueryResponse?.Customer || []
    for (const customer of customers) {
      await upsertQboCustomer(db, customer, syncedDate)
      syncedCount += 1
    }
    if (customers.length < 1000) break
    startPosition += 1000
  }

  await db.prepare('UPDATE qbo_connection SET last_customer_sync_date = ?, updated_date = ? WHERE id = 1').bind(syncedDate, syncedDate).run()
  return syncedCount
}

async function upsertQboServiceItem(db: D1Database, item: QboItemResponse, syncedDate: string): Promise<void> {
  const id = normalizeString(item.Id)
  const name = normalizeString(item.Name || item.FullyQualifiedName)
  if (!id || !name || normalizeString(item.Type).toLowerCase() !== 'service') return

  await db.prepare(
    `INSERT INTO qbo_service_items (
      qbo_id, name, fully_qualified_name, description, active, sync_token, qbo_updated_time, last_synced_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(qbo_id) DO UPDATE SET
      name = excluded.name,
      fully_qualified_name = excluded.fully_qualified_name,
      description = excluded.description,
      active = excluded.active,
      sync_token = excluded.sync_token,
      qbo_updated_time = excluded.qbo_updated_time,
      last_synced_date = excluded.last_synced_date`
  ).bind(
    id,
    name,
    normalizeString(item.FullyQualifiedName),
    normalizeString(item.Description),
    item.Active === false ? 0 : 1,
    normalizeString(item.SyncToken),
    normalizeString(item.MetaData?.LastUpdatedTime),
    syncedDate
  ).run()
}

export async function syncQboServiceItems(db: D1Database, env: ApiHonoEnv['Bindings']): Promise<number> {
  await ensureQboSchemaReady(db)
  let startPosition = 1
  let syncedCount = 0
  const syncedDate = nowIso()

  while (true) {
    const query = encodeURIComponent(`SELECT * FROM Item WHERE Type = 'Service' STARTPOSITION ${startPosition} MAXRESULTS 1000`)
    const data = await qboFetch<{ QueryResponse?: { Item?: QboItemResponse[] } }>(db, env, `/query?query=${query}`)
    const items = data.QueryResponse?.Item || []
    for (const item of items) {
      await upsertQboServiceItem(db, item, syncedDate)
      syncedCount += 1
    }
    if (items.length < 1000) break
    startPosition += 1000
  }

  await db.prepare('UPDATE qbo_connection SET last_item_sync_date = ?, updated_date = ? WHERE id = 1').bind(syncedDate, syncedDate).run()
  return syncedCount
}

async function upsertQboAccount(db: D1Database, account: QboAccountResponse, syncedDate: string): Promise<void> {
  const id = normalizeString(account.Id)
  const name = normalizeString(account.Name)
  if (!id || !name) return

  await db.prepare(
    `INSERT INTO qbo_accounts (
      qbo_id, name, fully_qualified_name, account_type, account_sub_type, classification,
      active, sync_token, qbo_updated_time, last_synced_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(qbo_id) DO UPDATE SET
      name = excluded.name,
      fully_qualified_name = excluded.fully_qualified_name,
      account_type = excluded.account_type,
      account_sub_type = excluded.account_sub_type,
      classification = excluded.classification,
      active = excluded.active,
      sync_token = excluded.sync_token,
      qbo_updated_time = excluded.qbo_updated_time,
      last_synced_date = excluded.last_synced_date`
  ).bind(
    id,
    name,
    normalizeString(account.FullyQualifiedName),
    normalizeString(account.AccountType),
    normalizeString(account.AccountSubType),
    normalizeString(account.Classification),
    account.Active === false ? 0 : 1,
    normalizeString(account.SyncToken),
    normalizeString(account.MetaData?.LastUpdatedTime),
    syncedDate
  ).run()
}

export async function syncQboAccounts(db: D1Database, env: ApiHonoEnv['Bindings']): Promise<number> {
  await ensureQboSchemaReady(db)
  let startPosition = 1
  let syncedCount = 0
  const syncedDate = nowIso()

  while (true) {
    const query = encodeURIComponent(`SELECT * FROM Account STARTPOSITION ${startPosition} MAXRESULTS 1000`)
    const data = await qboFetch<{ QueryResponse?: { Account?: QboAccountResponse[] } }>(db, env, `/query?query=${query}`)
    const accounts = data.QueryResponse?.Account || []
    for (const account of accounts) {
      await upsertQboAccount(db, account, syncedDate)
      syncedCount += 1
    }
    if (accounts.length < 1000) break
    startPosition += 1000
  }

  await db.prepare('UPDATE qbo_connection SET last_account_sync_date = ?, updated_date = ? WHERE id = 1').bind(syncedDate, syncedDate).run()
  return syncedCount
}

async function getDefaultServiceItemId(db: D1Database): Promise<string> {
  const connection = await getConnection(db)
  return normalizeString(connection?.default_service_item_id)
}

async function getPaymentDepositSettings(db: D1Database): Promise<{ depositAccountId: string; feeExpenseAccountId: string }> {
  const connection = await getConnection(db)
  return {
    depositAccountId: normalizeString(connection?.default_deposit_account_id),
    feeExpenseAccountId: normalizeString(connection?.stripe_fee_expense_account_id),
  }
}

async function getQboPaymentTxnLineId(db: D1Database, env: ApiHonoEnv['Bindings'], paymentId: string): Promise<string> {
  const normalizedPaymentId = normalizeString(paymentId)
  if (!normalizedPaymentId) return ''

  const data = await qboFetch<QboInvoiceResponse>(db, env, `/payment/${encodeURIComponent(normalizedPaymentId)}`)
  const lineId = normalizeString(data.Payment?.Line?.find((line) => normalizeString(line.Id))?.Id)
  return lineId || '0'
}

function paymentReferenceDetail(payment: InvoicePayment): string {
  const referenceNumber = normalizeString(payment.referenceNumber)
  const method = payment.method || 'Payment'
  return referenceNumber ? `${method}${method.toLowerCase() === 'check' ? ' #' : ' reference '}${referenceNumber}` : method
}

function paymentPrivateNote(payment: InvoicePayment): string {
  const referenceDetail = paymentReferenceDetail(payment)
  return payment.note ? `${payment.note} ${referenceDetail}.` : `${referenceDetail} synced from Compass.`
}

export async function syncInvoiceToQbo(db: D1Database, env: ApiHonoEnv['Bindings'], invoice: Invoice): Promise<string> {
  await ensureQboSchemaReady(db)
  const customerRef = normalizeString(invoice.qboProjectId || invoice.qboCustomerId)
  if (!customerRef) return ''

  const serviceItemId = await getDefaultServiceItemId(db)
  if (!serviceItemId) {
    throw new Error('QuickBooks default service item is not selected')
  }

  const payload = {
    ...(invoice.qboInvoiceId ? { Id: invoice.qboInvoiceId, SyncToken: invoice.qboInvoiceSyncToken, sparse: false } : {}),
    CustomerRef: { value: customerRef },
    DocNumber: invoice.invoiceNumber,
    TxnDate: invoice.issueDate,
    DueDate: invoice.dueDate || undefined,
    PrivateNote: invoice.internalNote || undefined,
    CustomerMemo: invoice.notes ? { value: invoice.notes } : undefined,
    Line: buildQboInvoiceLines(invoice, serviceItemId),
  }

  const data = await qboFetch<QboInvoiceResponse>(db, env, '/invoice', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const qboInvoiceId = normalizeString(data.Invoice?.Id)
  const qboSyncToken = normalizeString(data.Invoice?.SyncToken)
  if (!qboInvoiceId) {
    throw new Error('QuickBooks did not return an invoice ID')
  }

  const date = nowIso()
  await db.prepare(
    `UPDATE invoices
     SET qbo_invoice_id = ?, qbo_invoice_sync_token = ?, qbo_last_sync_date = ?, qbo_sync_status = 'synced', qbo_sync_message = '',
         accounting_sync_state = json_patch(COALESCE(NULLIF(accounting_sync_state, ''), '{}'), ?)
     WHERE id = ?`
  ).bind(qboInvoiceId, qboSyncToken, date, invoiceSyncState({
    qboInvoiceId,
    qboInvoiceSyncToken: qboSyncToken,
    qboStatus: 'synced',
    qboLastSyncDate: date,
  }), invoice.id).run()
  return qboInvoiceId
}

export async function syncPaymentToQbo(db: D1Database, env: ApiHonoEnv['Bindings'], invoice: Invoice): Promise<void> {
  await ensureQboSchemaReady(db)
  if (!invoice.qboInvoiceId || invoice.qboPaymentId) return
  const customerRef = normalizeString(invoice.qboProjectId || invoice.qboCustomerId)
  if (!customerRef) return

  const data = await qboFetch<QboInvoiceResponse>(db, env, '/payment', {
    method: 'POST',
    body: JSON.stringify({
      CustomerRef: { value: customerRef },
      TotalAmt: qboAmount(invoice.totalCents),
      TxnDate: (invoice.paidDate || nowIso()).slice(0, 10),
      PrivateNote: invoice.internalNote || 'Compass payment sync.',
      Line: [
        {
          Amount: qboAmount(invoice.totalCents),
          LinkedTxn: [{ TxnId: invoice.qboInvoiceId, TxnType: 'Invoice' }],
        },
      ],
    }),
  })
  const paymentId = normalizeString(data.Payment?.Id)
  if (paymentId) {
    const date = nowIso()
    await db.prepare(
      `UPDATE invoices
       SET qbo_payment_id = ?, qbo_last_sync_date = ?, qbo_sync_status = 'payment_synced', qbo_sync_message = '',
           accounting_sync_state = json_patch(COALESCE(NULLIF(accounting_sync_state, ''), '{}'), ?)
       WHERE id = ?`
    ).bind(paymentId, date, invoiceSyncState({
      qboInvoiceId: invoice.qboInvoiceId,
      qboInvoiceSyncToken: invoice.qboInvoiceSyncToken,
      qboPaymentId: paymentId,
      qboStatus: 'payment_synced',
      qboLastSyncDate: date,
    }), invoice.id).run()
  }
}

export async function syncInvoicePaymentToQbo(db: D1Database, env: ApiHonoEnv['Bindings'], invoice: Invoice, payment: InvoicePayment): Promise<void> {
  await ensureQboSchemaReady(db)
  if (payment.status !== 'succeeded' || payment.grossCents <= 0) return
  const customerRef = normalizeString(invoice.qboProjectId || invoice.qboCustomerId)
  if (!customerRef) return
  const qboInvoiceId = invoice.qboInvoiceId || await syncInvoiceToQbo(db, env, invoice)
  if (!qboInvoiceId) {
    throw new Error('QuickBooks invoice ID is required before syncing payment')
  }

  let paymentId = payment.qboPaymentId
  if (!paymentId) {
    const data = await qboFetch<QboInvoiceResponse>(db, env, '/payment', {
      method: 'POST',
      body: JSON.stringify({
        CustomerRef: { value: customerRef },
        TotalAmt: qboAmount(payment.grossCents),
        TxnDate: (payment.paidDate || nowIso()).slice(0, 10),
        PrivateNote: paymentPrivateNote(payment),
        Line: [
          {
            Amount: qboAmount(payment.grossCents),
            LinkedTxn: [{ TxnId: qboInvoiceId, TxnType: 'Invoice' }],
          },
        ],
      }),
    })
    paymentId = normalizeString(data.Payment?.Id)
  }
  if (paymentId) {
    const date = nowIso()
    await db.prepare(
      `UPDATE invoice_payments
       SET qbo_payment_id = ?, qbo_last_sync_date = ?, qbo_sync_status = 'payment_synced', qbo_sync_message = '',
           accounting_sync_state = json_patch(COALESCE(NULLIF(accounting_sync_state, ''), '{}'), ?)
       WHERE id = ?`
    ).bind(paymentId, date, paymentSyncState({
      qboPaymentId: paymentId,
      qboDepositId: payment.qboDepositId,
      qboStatus: 'payment_synced',
      qboLastSyncDate: date,
    }), payment.id).run()
    await db.prepare(
      `UPDATE invoices
       SET qbo_payment_id = COALESCE(NULLIF(qbo_payment_id, ''), ?), qbo_last_sync_date = ?, qbo_sync_status = 'payment_synced', qbo_sync_message = '',
           accounting_sync_state = json_patch(COALESCE(NULLIF(accounting_sync_state, ''), '{}'), ?)
     WHERE id = ?`
    ).bind(paymentId, date, invoiceSyncState({
      qboInvoiceId,
      qboPaymentId: paymentId,
      qboStatus: 'payment_synced',
      qboLastSyncDate: date,
    }), invoice.id).run()

    const { depositAccountId, feeExpenseAccountId } = await getPaymentDepositSettings(db)
    const shouldCreateImmediateDeposit = !payment.stripeBalanceTransactionId && payment.method.toLowerCase() !== 'stripe'
    if (shouldCreateImmediateDeposit && depositAccountId && !payment.qboDepositId) {
      if (payment.feeCents > 0 && !feeExpenseAccountId) {
        throw new Error('QuickBooks Stripe fee expense account is not selected')
      }
      const paymentTxnLineId = await getQboPaymentTxnLineId(db, env, paymentId)
      const paymentReference = `invoice ${invoice.invoiceNumber}, ${paymentReferenceDetail(payment)}, QBO payment ${paymentId}`
      const depositLines: Array<Record<string, unknown>> = [
        {
          Amount: qboAmount(payment.grossCents),
          Description: `Gross payment for ${paymentReference}`,
          LinkedTxn: [{ TxnId: paymentId, TxnType: 'Payment', TxnLineId: paymentTxnLineId }],
        },
      ]
      if (payment.feeCents > 0) {
        depositLines.push({
          Amount: -qboAmount(payment.feeCents),
          Description: `Stripe fee for ${paymentReference}`,
          DepositLineDetail: {
            AccountRef: { value: feeExpenseAccountId },
          },
        })
      }
      const deposit = await qboFetch<QboInvoiceResponse>(db, env, '/deposit', {
        method: 'POST',
        body: JSON.stringify({
          DepositToAccountRef: { value: depositAccountId },
          TxnDate: (payment.paidDate || nowIso()).slice(0, 10),
          PrivateNote: `Compass deposit for ${paymentReference}${payment.feeCents > 0 ? `, Stripe fee ${qboAmount(payment.feeCents).toFixed(2)}, net ${qboAmount(Math.max(0, payment.grossCents - payment.feeCents)).toFixed(2)}` : ''}.`,
          Line: depositLines,
        }),
      })
      const depositId = normalizeString(deposit.Deposit?.Id)
      if (depositId) {
        await db.prepare(
          `UPDATE invoice_payments
           SET qbo_deposit_id = ?, qbo_last_sync_date = ?, qbo_sync_status = 'deposit_synced', qbo_sync_message = '',
               accounting_sync_state = json_patch(COALESCE(NULLIF(accounting_sync_state, ''), '{}'), ?)
           WHERE id = ?`
        ).bind(depositId, nowIso(), paymentSyncState({
          qboPaymentId: paymentId,
          qboDepositId: depositId,
          qboStatus: 'deposit_synced',
          qboLastSyncDate: nowIso(),
        }), payment.id).run()
      }
    }
  }
}

async function fetchSavedInvoicePayment(db: D1Database, paymentId: string): Promise<InvoicePayment | null> {
  const row = await db.prepare('SELECT * FROM invoice_payments WHERE id = ?').bind(paymentId).first<InvoicePaymentRow>()
  return row ? mapInvoicePaymentRow(row) : null
}

export async function syncStripePayoutDepositToQbo(
  db: D1Database,
  env: ApiHonoEnv['Bindings'],
  payout: StripePayoutDepositInput,
  payoutPayments: StripePayoutDepositPayment[]
): Promise<string> {
  await ensureQboSchemaReady(db)
  const payoutId = normalizeString(payout.payoutId)
  if (!payoutId || payoutPayments.length === 0) return ''

  const existingPayout = await db.prepare('SELECT qbo_deposit_id FROM stripe_payouts WHERE stripe_payout_id = ?').bind(payoutId).first<{ qbo_deposit_id?: unknown }>()
  const existingDepositId = normalizeString(existingPayout?.qbo_deposit_id) || normalizeString(payoutPayments.find((entry) => entry.payment.qboDepositId)?.payment.qboDepositId)
  if (existingDepositId) {
    await db.prepare(
      `UPDATE invoice_payments
       SET qbo_deposit_id = ?, qbo_sync_status = 'deposit_synced', qbo_sync_message = '', qbo_last_sync_date = ?,
           accounting_sync_state = json_patch(COALESCE(NULLIF(accounting_sync_state, ''), '{}'), ?)
       WHERE stripe_payout_id = ? AND (qbo_deposit_id IS NULL OR qbo_deposit_id = '')`
    ).bind(existingDepositId, nowIso(), paymentSyncState({
      qboDepositId: existingDepositId,
      qboStatus: 'deposit_synced',
      qboLastSyncDate: nowIso(),
      stripePayoutId: payoutId,
    }), payoutId).run()
    return existingDepositId
  }

  const { depositAccountId, feeExpenseAccountId } = await getPaymentDepositSettings(db)
  if (!depositAccountId) {
    throw new Error('QuickBooks payment deposit account is not selected')
  }
  if (payoutPayments.some((entry) => entry.payment.feeCents > 0) && !feeExpenseAccountId) {
    throw new Error('QuickBooks Stripe fee expense account is not selected')
  }

  const readyEntries: Array<{ invoice: Invoice; payment: InvoicePayment; qboPaymentId: string; qboPaymentTxnLineId: string }> = []
  for (const entry of payoutPayments) {
    let payment = entry.payment
    if (!payment.qboPaymentId) {
      await syncInvoicePaymentToQbo(db, env, entry.invoice, payment)
      payment = await fetchSavedInvoicePayment(db, payment.id) || payment
    }
    const qboPaymentId = normalizeString(payment.qboPaymentId)
    if (qboPaymentId) {
      readyEntries.push({
        invoice: entry.invoice,
        payment,
        qboPaymentId,
        qboPaymentTxnLineId: await getQboPaymentTxnLineId(db, env, qboPaymentId),
      })
    }
  }
  if (readyEntries.length === 0) {
    throw new Error('No QuickBooks payment records were available for this Stripe payout')
  }

  const depositLines: Array<Record<string, unknown>> = []
  for (const entry of readyEntries) {
    const paymentReference = `invoice ${entry.invoice.invoiceNumber}, QBO payment ${entry.qboPaymentId}`
    depositLines.push({
      Amount: qboAmount(entry.payment.grossCents),
      Description: `Gross Stripe payment for ${paymentReference}, Stripe payout ${payoutId}${entry.payment.stripeBalanceTransactionId ? `, balance transaction ${entry.payment.stripeBalanceTransactionId}` : ''}`,
      LinkedTxn: [{ TxnId: entry.qboPaymentId, TxnType: 'Payment', TxnLineId: entry.qboPaymentTxnLineId }],
    })
    if (entry.payment.feeCents > 0) {
      depositLines.push({
        Amount: -qboAmount(entry.payment.feeCents),
        Description: `Stripe fee for ${paymentReference}, Stripe payout ${payoutId}${entry.payment.stripeBalanceTransactionId ? `, balance transaction ${entry.payment.stripeBalanceTransactionId}` : ''}`,
        DepositLineDetail: {
          AccountRef: { value: feeExpenseAccountId },
        },
      })
    }
  }

  const grossCents = readyEntries.reduce((sum, entry) => sum + entry.payment.grossCents, 0)
  const feeCents = readyEntries.reduce((sum, entry) => sum + entry.payment.feeCents, 0)
  const invoiceNumbers = readyEntries.map((entry) => entry.invoice.invoiceNumber).join(', ')
  const deposit = await qboFetch<QboInvoiceResponse>(db, env, '/deposit', {
    method: 'POST',
    body: JSON.stringify({
      DepositToAccountRef: { value: depositAccountId },
      TxnDate: (payout.arrivalDate || nowIso()).slice(0, 10),
      PrivateNote: `Compass Stripe payout ${payoutId}. Invoices: ${invoiceNumbers}. Gross ${qboAmount(grossCents).toFixed(2)}, fees ${qboAmount(feeCents).toFixed(2)}, net ${qboAmount(payout.amountCents || Math.max(0, grossCents - feeCents)).toFixed(2)}.`,
      Line: depositLines,
    }),
  })
  const depositId = normalizeString(deposit.Deposit?.Id)
  if (!depositId) {
    throw new Error('QuickBooks did not return a deposit ID')
  }

  const date = nowIso()
  await db.prepare(
    `UPDATE invoice_payments
     SET qbo_deposit_id = ?, qbo_last_sync_date = ?, qbo_sync_status = 'deposit_synced', qbo_sync_message = '',
         accounting_sync_state = json_patch(COALESCE(NULLIF(accounting_sync_state, ''), '{}'), ?)
     WHERE stripe_payout_id = ?`
  ).bind(depositId, date, paymentSyncState({
    qboDepositId: depositId,
    qboStatus: 'deposit_synced',
    qboLastSyncDate: date,
    stripePayoutId: payoutId,
  }), payoutId).run()
  await db.prepare(
    `UPDATE stripe_payouts
     SET qbo_deposit_id = ?, qbo_last_sync_date = ?, qbo_sync_status = 'deposit_synced', qbo_sync_message = '',
         accounting_sync_state = json_patch(COALESCE(NULLIF(accounting_sync_state, ''), '{}'), ?), updated_date = ?
     WHERE stripe_payout_id = ?`
  ).bind(depositId, date, payoutSyncState({
    payoutStatus: 'reconciled',
    qboDepositId: depositId,
    qboStatus: 'deposit_synced',
    qboLastSyncDate: date,
  }), date, payoutId).run()
  return depositId
}

export async function voidInvoiceInQbo(db: D1Database, env: ApiHonoEnv['Bindings'], invoice: Invoice): Promise<void> {
  await ensureQboSchemaReady(db)
  if (!invoice.qboInvoiceId) return
  const data = await qboFetch<QboInvoiceResponse>(db, env, `/invoice/${encodeURIComponent(invoice.qboInvoiceId)}`)
  const qboInvoice = data.Invoice
  if (!qboInvoice) {
    throw new Error('QuickBooks invoice was not found for void')
  }
  const voided = await qboFetch<QboInvoiceResponse>(db, env, '/invoice?operation=void', {
    method: 'POST',
    body: JSON.stringify(qboInvoice),
  })
  const date = nowIso()
  await db.prepare(
    `UPDATE invoices
     SET qbo_invoice_sync_token = ?, qbo_last_sync_date = ?, qbo_sync_status = 'void_synced', qbo_sync_message = '',
         accounting_sync_state = json_patch(COALESCE(NULLIF(accounting_sync_state, ''), '{}'), ?)
     WHERE id = ?`
  ).bind(normalizeString(voided.Invoice?.SyncToken), date, invoiceSyncState({
    qboInvoiceId: invoice.qboInvoiceId,
    qboInvoiceSyncToken: normalizeString(voided.Invoice?.SyncToken),
    qboStatus: 'void_synced',
    qboLastSyncDate: date,
  }), invoice.id).run()
}

async function setInvoiceQboSyncError(db: D1Database, invoiceId: string, message: string): Promise<void> {
  const date = nowIso()
  await db.prepare(
    `UPDATE invoices
     SET qbo_last_sync_date = ?, qbo_sync_status = 'error', qbo_sync_message = ?,
         accounting_sync_state = json_patch(COALESCE(NULLIF(accounting_sync_state, ''), '{}'), ?)
     WHERE id = ?`
  ).bind(date, message.slice(0, 1000), invoiceSyncState({
    qboStatus: 'error',
    qboMessage: message.slice(0, 1000),
    qboLastSyncDate: date,
  }), invoiceId).run()
}

export async function trySyncPaymentToQbo(db: D1Database, env: ApiHonoEnv['Bindings'], invoice: Invoice): Promise<void> {
  try {
    await syncPaymentToQbo(db, env, invoice)
  } catch (error: unknown) {
    await setInvoiceQboSyncError(db, invoice.id, String(error instanceof Error ? error.message : error))
  }
}

export async function trySyncInvoicePaymentToQbo(db: D1Database, env: ApiHonoEnv['Bindings'], invoice: Invoice, payment: InvoicePayment): Promise<void> {
  try {
    await syncInvoicePaymentToQbo(db, env, invoice, payment)
  } catch (error: unknown) {
    await db.prepare(
      `UPDATE invoice_payments
       SET qbo_last_sync_date = ?, qbo_sync_status = 'error', qbo_sync_message = ?,
           accounting_sync_state = json_patch(COALESCE(NULLIF(accounting_sync_state, ''), '{}'), ?)
       WHERE id = ?`
    ).bind(nowIso(), String(error instanceof Error ? error.message : error).slice(0, 1000), paymentSyncState({
      qboStatus: 'error',
      qboMessage: String(error instanceof Error ? error.message : error).slice(0, 1000),
      qboLastSyncDate: nowIso(),
    }), payment.id).run()
    await setInvoiceQboSyncError(db, invoice.id, String(error instanceof Error ? error.message : error))
  }
}

export function createQboApi() {
  const app = new Hono<ApiHonoEnv>()

  app.get('/api/qbo/status', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      const connection = await getConnection(context.env.DB)
      const status: QboConnectionStatus = {
        connected: Boolean(connection),
        realmId: normalizeString(connection?.realm_id),
        environment: normalizeString(connection?.environment || getQboEnvironment(context.env)),
        lastCustomerSyncDate: normalizeString(connection?.last_customer_sync_date),
        lastItemSyncDate: normalizeString(connection?.last_item_sync_date),
        lastAccountSyncDate: normalizeString(connection?.last_account_sync_date),
        tokenExpiresDate: normalizeString(connection?.token_expires_date),
        defaultServiceItemId: normalizeString(connection?.default_service_item_id),
        defaultServiceItemName: '',
        defaultDepositAccountId: normalizeString(connection?.default_deposit_account_id),
        defaultDepositAccountName: '',
        stripeFeeExpenseAccountId: normalizeString(connection?.stripe_fee_expense_account_id),
        stripeFeeExpenseAccountName: '',
      }
      if (status.defaultServiceItemId) {
        const item = await context.env.DB.prepare('SELECT name FROM qbo_service_items WHERE qbo_id = ?').bind(status.defaultServiceItemId).first<{ name?: string }>()
        status.defaultServiceItemName = normalizeString(item?.name)
      }
      if (status.defaultDepositAccountId) {
        const account = await context.env.DB.prepare('SELECT name FROM qbo_accounts WHERE qbo_id = ?').bind(status.defaultDepositAccountId).first<{ name?: string }>()
        status.defaultDepositAccountName = normalizeString(account?.name)
      }
      if (status.stripeFeeExpenseAccountId) {
        const account = await context.env.DB.prepare('SELECT name FROM qbo_accounts WHERE qbo_id = ?').bind(status.stripeFeeExpenseAccountId).first<{ name?: string }>()
        status.stripeFeeExpenseAccountName = normalizeString(account?.name)
      }
      return jsonResponse({ status })
    } catch (error: unknown) {
      console.error('Error reading QBO status:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.get('/api/qbo/connect', async (context) => {
    try {
      const authError = requireQboAdmin(context)
      if (authError) return authError
      await ensureQboSchemaReady(context.env.DB)
      const { clientId, redirectUri } = requireQboConfig(context.env)
      const state = createStateToken()
      await context.env.DB.prepare('INSERT INTO qbo_oauth_states (state, return_path, created_date) VALUES (?, ?, ?)')
        .bind(state, '/invoices', nowIso()).run()
      const params = new URLSearchParams()
      params.set('client_id', clientId)
      params.set('response_type', 'code')
      params.set('scope', 'com.intuit.quickbooks.accounting')
      params.set('redirect_uri', redirectUri)
      params.set('state', state)
      return jsonResponse({ authorizationUrl: `https://appcenter.intuit.com/connect/oauth2?${params.toString()}` })
    } catch (error: unknown) {
      console.error('Error starting QBO connection:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.get('/api/qbo/callback', async (context) => {
    try {
      await ensureQboSchemaReady(context.env.DB)
      const state = normalizeString(context.req.query('state'))
      const code = normalizeString(context.req.query('code'))
      const realmId = normalizeString(context.req.query('realmId'))
      if (!state || !code || !realmId) {
        return badRequest('Missing QuickBooks OAuth callback parameters')
      }
      const stateRow = await context.env.DB.prepare('SELECT state FROM qbo_oauth_states WHERE state = ?').bind(state).first()
      if (!stateRow) {
        return jsonResponse({ error: 'Invalid QuickBooks OAuth state' }, { status: 400 })
      }
      await context.env.DB.prepare('DELETE FROM qbo_oauth_states WHERE state = ?').bind(state).run()
      const { redirectUri } = requireQboConfig(context.env)
      const body = new URLSearchParams()
      body.set('grant_type', 'authorization_code')
      body.set('code', code)
      body.set('redirect_uri', redirectUri)
      const token = await exchangeToken(context.env, body)
      await storeConnection(context.env.DB, context.env, realmId, token)
      return Response.redirect(`${getDocumentBaseUrl(context.env)}/invoices?qbo=connected`, 302)
    } catch (error: unknown) {
      console.error('Error handling QBO callback:', error)
      return Response.redirect(`${getDocumentBaseUrl(context.env)}/invoices?qbo=error`, 302)
    }
  })

  app.post('/api/qbo/customers/sync', async (context) => {
    try {
      const authError = requireQboAdmin(context)
      if (authError) return authError
      const count = await syncQboCustomers(context.env.DB, context.env)
      return jsonResponse({ count })
    } catch (error: unknown) {
      console.error('Error syncing QBO customers:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.post('/api/qbo/items/sync', async (context) => {
    try {
      const authError = requireQboAdmin(context)
      if (authError) return authError
      const count = await syncQboServiceItems(context.env.DB, context.env)
      return jsonResponse({ count })
    } catch (error: unknown) {
      console.error('Error syncing QBO service items:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.post('/api/qbo/accounts/sync', async (context) => {
    try {
      const authError = requireQboAdmin(context)
      if (authError) return authError
      const count = await syncQboAccounts(context.env.DB, context.env)
      return jsonResponse({ count })
    } catch (error: unknown) {
      console.error('Error syncing QBO accounts:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.get('/api/qbo/items', async (context) => {
    try {
      const authError = requireQboAdmin(context)
      if (authError) return authError
      await ensureQboSchemaReady(context.env.DB)
      const search = normalizeString(context.req.query('search'))
      const conditions = ['active = 1']
      const bindings: string[] = []
      if (search) {
        conditions.push('(name LIKE ? OR fully_qualified_name LIKE ? OR description LIKE ?)')
        const like = `%${search}%`
        bindings.push(like, like, like)
      }
      const rows = await context.env.DB.prepare(
        `SELECT * FROM qbo_service_items
         WHERE ${conditions.join(' AND ')}
         ORDER BY name ASC
         LIMIT 300`
      ).bind(...bindings).all()
      return jsonResponse({ items: (rows.results || []).map((row) => mapCachedQboServiceItem(row as Record<string, unknown>)) })
    } catch (error: unknown) {
      console.error('Error listing QBO service items:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.get('/api/qbo/accounts', async (context) => {
    try {
      const authError = requireQboAdmin(context)
      if (authError) return authError
      await ensureQboSchemaReady(context.env.DB)
      const search = normalizeString(context.req.query('search'))
      const accountType = normalizeString(context.req.query('accountType'))
      const conditions = ['active = 1']
      const bindings: string[] = []
      if (accountType) {
        conditions.push('account_type = ?')
        bindings.push(accountType)
      }
      if (search) {
        conditions.push('(name LIKE ? OR fully_qualified_name LIKE ? OR account_type LIKE ?)')
        const like = `%${search}%`
        bindings.push(like, like, like)
      }
      const rows = await context.env.DB.prepare(
        `SELECT * FROM qbo_accounts
         WHERE ${conditions.join(' AND ')}
         ORDER BY account_type ASC, name ASC
         LIMIT 500`
      ).bind(...bindings).all()
      return jsonResponse({ accounts: (rows.results || []).map((row) => mapCachedQboAccount(row as Record<string, unknown>)) })
    } catch (error: unknown) {
      console.error('Error listing QBO accounts:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.put('/api/qbo/settings', async (context) => {
    try {
      const authError = requireQboAdmin(context)
      if (authError) return authError
      await ensureQboSchemaReady(context.env.DB)
      const body = await context.req.json().catch(() => ({} as Record<string, unknown>)) as Record<string, unknown>
      const serviceItemId = normalizeString(body.defaultServiceItemId)
      const depositAccountId = normalizeString(body.defaultDepositAccountId)
      const feeExpenseAccountId = normalizeString(body.stripeFeeExpenseAccountId)
      if (serviceItemId) {
        const item = await context.env.DB.prepare('SELECT qbo_id FROM qbo_service_items WHERE qbo_id = ? AND active = 1').bind(serviceItemId).first()
        if (!item) {
          return badRequest('Selected QuickBooks service item was not found. Sync service items first.')
        }
      }
      if (depositAccountId) {
        const account = await context.env.DB.prepare('SELECT qbo_id FROM qbo_accounts WHERE qbo_id = ? AND active = 1').bind(depositAccountId).first()
        if (!account) {
          return badRequest('Selected QuickBooks deposit account was not found. Sync accounts first.')
        }
      }
      if (feeExpenseAccountId) {
        const account = await context.env.DB.prepare('SELECT qbo_id FROM qbo_accounts WHERE qbo_id = ? AND active = 1').bind(feeExpenseAccountId).first()
        if (!account) {
          return badRequest('Selected QuickBooks fee expense account was not found. Sync accounts first.')
        }
      }
      const connection = await getConnection(context.env.DB)
      await context.env.DB.prepare(
        `UPDATE qbo_connection
         SET default_service_item_id = ?,
             default_deposit_account_id = ?,
             stripe_fee_expense_account_id = ?,
             updated_date = ?
         WHERE id = 1`
      ).bind(
        serviceItemId || normalizeString(connection?.default_service_item_id),
        depositAccountId || normalizeString(connection?.default_deposit_account_id),
        feeExpenseAccountId || normalizeString(connection?.stripe_fee_expense_account_id),
        nowIso()
      ).run()
      return jsonResponse({ status: 'ok' })
    } catch (error: unknown) {
      console.error('Error updating QBO settings:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.get('/api/qbo/customers', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureQboSchemaReady(context.env.DB)
      const search = normalizeString(context.req.query('search'))
      const conditions = ['(parent_id IS NULL OR parent_id = \'\')', 'active = 1']
      const bindings: string[] = []
      if (search) {
        conditions.push('(display_name LIKE ? OR fully_qualified_name LIKE ? OR primary_email LIKE ?)')
        const like = `%${search}%`
        bindings.push(like, like, like)
      }
      const rows = await context.env.DB.prepare(
        `SELECT * FROM qbo_customers
         WHERE ${conditions.join(' AND ')}
         ORDER BY display_name ASC
         LIMIT 200`
      ).bind(...bindings).all()
      return jsonResponse({ customers: (rows.results || []).map((row) => mapCachedQboCustomer(row as Record<string, unknown>)) })
    } catch (error: unknown) {
      console.error('Error listing QBO customers:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  app.get('/api/qbo/customers/:id/projects', async (context) => {
    try {
      const authError = requireAuthMode(context, 'microsoft')
      if (authError) return authError
      await ensureQboSchemaReady(context.env.DB)
      const parentId = normalizeString(context.req.param('id'))
      const rows = await context.env.DB.prepare(
        `SELECT * FROM qbo_customers
         WHERE parent_id = ? AND active = 1
         ORDER BY display_name ASC
         LIMIT 500`
      ).bind(parentId).all()
      return jsonResponse({ projects: (rows.results || []).map((row) => mapCachedQboCustomer(row as Record<string, unknown>)) })
    } catch (error: unknown) {
      console.error('Error listing QBO projects:', error)
      return serverError(String(error instanceof Error ? error.message : error))
    }
  })

  return app
}
