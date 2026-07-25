export const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'void'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export const INVOICE_PAYMENT_KINDS = ['payment', 'deposit'] as const;
export type InvoicePaymentKind = (typeof INVOICE_PAYMENT_KINDS)[number];
export const INVOICE_PAYMENT_STATUSES = ['pending', 'succeeded', 'failed', 'void'] as const;
export type InvoicePaymentStatus = (typeof INVOICE_PAYMENT_STATUSES)[number];

export type InvoiceEmailDeliveryStatus = 'accepted' | 'warning' | 'failed';

/** Current transactional email delivery state for a Compass invoice. */
export type InvoiceEmailDeliveryState = {
  status: InvoiceEmailDeliveryStatus;
  event: string;
  recipient: string;
  reason: string;
  messageId: string;
  updatedDate: string;
  noticeSentDate: string;
  noticeRecipients: string[];
};

export type InvoiceLineItem = {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitAmountCents: number;
  contractAmountCents: number;
  percentComplete: number;
  amountCents: number;
  billInFull: boolean;
  sortOrder: number;
};

/** Contact snapshot selected to receive an invoice. */
export type InvoiceContactRecipient = {
  id: string;
  invoiceId: string;
  contactId: string;
  name: string;
  email: string;
};

/** Payment or deposit record applied to a Compass invoice. */
export type InvoicePayment = {
  id: string;
  invoiceId: string;
  kind: InvoicePaymentKind;
  status: InvoicePaymentStatus;
  method: string;
  referenceNumber: string;
  grossCents: number;
  feeCents: number;
  netCents: number;
  paidDate: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string;
  stripeChargeId: string;
  stripeBalanceTransactionId: string;
  stripePayoutId: string;
  stripePayoutStatus: string;
  stripePayoutReconciledDate: string;
  qboPaymentId: string;
  qboDepositId: string;
  qboSyncStatus: string;
  qboSyncMessage: string;
  accountingSyncState: string;
  qboLastSyncDate: string;
  accountingNotificationSentDate: string;
  note: string;
  createdDate: string;
  updatedDate: string;
  createdBy: string;
  updatedBy: string;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  qboCustomerId: string;
  qboProjectId: string;
  qboInvoiceId: string;
  qboInvoiceSyncToken: string;
  qboPaymentId: string;
  qboLastSyncDate: string;
  qboSyncStatus: string;
  qboSyncMessage: string;
  accountingSyncState: string;
  clientName: string;
  clientEmail: string;
  billingClientName: string;
  billingEmail: string;
  billingAddressLine1: string;
  billingAddressLine2: string;
  billingAddressCity: string;
  billingAddressState: string;
  billingAddressPostalCode: string;
  projectAddressLine1: string;
  projectAddressLine2: string;
  projectAddressCity: string;
  projectAddressState: string;
  projectAddressPostalCode: string;
  poNumber: string;
  projectReference: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  internalNote: string;
  publicToken: string;
  subtotalCents: number;
  previouslyBilledCents: number;
  totalCents: number;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string;
  paidDate: string;
  sentDate: string;
  voidDate: string;
  emailDeliveryState: InvoiceEmailDeliveryState | null;
  createdDate: string;
  updatedDate: string;
  createdBy: string;
  updatedBy: string;
  contactIds: string[];
  contacts: InvoiceContactRecipient[];
  lineItems: InvoiceLineItem[];
  payments: InvoicePayment[];
};

export type InvoiceLineItemRow = {
  id?: unknown;
  invoice_id?: unknown;
  description?: unknown;
  quantity?: unknown;
  unit_amount_cents?: unknown;
  contract_amount_cents?: unknown;
  percent_complete?: unknown;
  amount_cents?: unknown;
  bill_in_full?: unknown;
  sort_order?: unknown;
};

export type InvoiceRow = {
  id?: unknown;
  invoice_number?: unknown;
  status?: unknown;
  qbo_customer_id?: unknown;
  qbo_project_id?: unknown;
  qbo_invoice_id?: unknown;
  qbo_invoice_sync_token?: unknown;
  qbo_payment_id?: unknown;
  qbo_last_sync_date?: unknown;
  qbo_sync_status?: unknown;
  qbo_sync_message?: unknown;
  accounting_sync_state?: unknown;
  client_name?: unknown;
  client_email?: unknown;
  billing_client_name?: unknown;
  billing_email?: unknown;
  billing_address_line1?: unknown;
  billing_address_line2?: unknown;
  billing_address_city?: unknown;
  billing_address_state?: unknown;
  billing_address_postal_code?: unknown;
  project_address_line1?: unknown;
  project_address_line2?: unknown;
  project_address_city?: unknown;
  project_address_state?: unknown;
  project_address_postal_code?: unknown;
  po_number?: unknown;
  project_reference?: unknown;
  issue_date?: unknown;
  due_date?: unknown;
  notes?: unknown;
  internal_note?: unknown;
  public_token?: unknown;
  subtotal_cents?: unknown;
  previously_billed_cents?: unknown;
  total_cents?: unknown;
  stripe_checkout_session_id?: unknown;
  stripe_payment_intent_id?: unknown;
  paid_date?: unknown;
  sent_date?: unknown;
  void_date?: unknown;
  email_delivery_state?: unknown;
  created_date?: unknown;
  updated_date?: unknown;
  created_by?: unknown;
  updated_by?: unknown;
};

export type InvoiceContactRecipientRow = {
  id?: unknown;
  invoice_id?: unknown;
  contact_id?: unknown;
  name?: unknown;
  email?: unknown;
};

export type InvoicePaymentRow = {
  id?: unknown;
  invoice_id?: unknown;
  kind?: unknown;
  status?: unknown;
  method?: unknown;
  reference_number?: unknown;
  gross_cents?: unknown;
  fee_cents?: unknown;
  net_cents?: unknown;
  paid_date?: unknown;
  stripe_checkout_session_id?: unknown;
  stripe_payment_intent_id?: unknown;
  stripe_charge_id?: unknown;
  stripe_balance_transaction_id?: unknown;
  stripe_payout_id?: unknown;
  stripe_payout_status?: unknown;
  stripe_payout_reconciled_date?: unknown;
  qbo_payment_id?: unknown;
  qbo_deposit_id?: unknown;
  qbo_sync_status?: unknown;
  qbo_sync_message?: unknown;
  accounting_sync_state?: unknown;
  qbo_last_sync_date?: unknown;
  accounting_notification_sent_date?: unknown;
  note?: unknown;
  created_date?: unknown;
  updated_date?: unknown;
  created_by?: unknown;
  updated_by?: unknown;
};

function normalizeString(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeBoolean(value: unknown): boolean {
  return value === true || value === 'true' || normalizeNumber(value) === 1;
}

function normalizeInvoiceStatus(value: unknown): InvoiceStatus {
  const normalized = normalizeString(value).toLowerCase();
  const matched = INVOICE_STATUSES.find((candidate) => candidate === normalized);
  return matched ?? 'draft';
}

function normalizeInvoicePaymentKind(value: unknown): InvoicePaymentKind {
  const normalized = normalizeString(value).toLowerCase();
  const matched = INVOICE_PAYMENT_KINDS.find((candidate) => candidate === normalized);
  return matched ?? 'payment';
}

function normalizeInvoicePaymentStatus(value: unknown): InvoicePaymentStatus {
  const normalized = normalizeString(value).toLowerCase();
  const matched = INVOICE_PAYMENT_STATUSES.find((candidate) => candidate === normalized);
  return matched ?? 'pending';
}

function normalizeInvoiceEmailDeliveryStatus(value: unknown): InvoiceEmailDeliveryStatus {
  const normalized = normalizeString(value).toLowerCase();
  if (normalized === 'warning' || normalized === 'failed') return normalized;
  return 'accepted';
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((entry) => normalizeString(entry)).filter(Boolean) : [];
}

function mapInvoiceEmailDeliveryState(value: unknown): InvoiceEmailDeliveryState | null {
  const raw = normalizeString(value);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      status: normalizeInvoiceEmailDeliveryStatus(parsed.status),
      event: normalizeString(parsed.event),
      recipient: normalizeString(parsed.recipient),
      reason: normalizeString(parsed.reason),
      messageId: normalizeString(parsed.messageId ?? parsed.message_id),
      updatedDate: normalizeString(parsed.updatedDate ?? parsed.updated_date),
      noticeSentDate: normalizeString(parsed.noticeSentDate ?? parsed.notice_sent_date),
      noticeRecipients: normalizeStringArray(parsed.noticeRecipients ?? parsed.notice_recipients),
    };
  } catch {
    return null;
  }
}

export function mapInvoiceLineItemRow(row: InvoiceLineItemRow): InvoiceLineItem {
  const contractAmountCents = normalizeNumber(row.contract_amount_cents ?? row.unit_amount_cents);
  const percentComplete = normalizeNumber(row.percent_complete ?? row.quantity);
  return {
    id: normalizeString(row.id),
    invoiceId: normalizeString(row.invoice_id),
    description: normalizeString(row.description),
    quantity: percentComplete,
    unitAmountCents: contractAmountCents,
    contractAmountCents,
    percentComplete,
    amountCents: normalizeNumber(row.amount_cents),
    billInFull: normalizeBoolean(row.bill_in_full),
    sortOrder: normalizeNumber(row.sort_order),
  };
}

export function mapInvoiceContactRecipientRow(row: InvoiceContactRecipientRow): InvoiceContactRecipient {
  return {
    id: normalizeString(row.id),
    invoiceId: normalizeString(row.invoice_id),
    contactId: normalizeString(row.contact_id),
    name: normalizeString(row.name),
    email: normalizeString(row.email),
  };
}

/** Maps a D1 invoice payment row to the shared API type. */
export function mapInvoicePaymentRow(row: InvoicePaymentRow): InvoicePayment {
  return {
    id: normalizeString(row.id),
    invoiceId: normalizeString(row.invoice_id),
    kind: normalizeInvoicePaymentKind(row.kind),
    status: normalizeInvoicePaymentStatus(row.status),
    method: normalizeString(row.method),
    referenceNumber: normalizeString(row.reference_number),
    grossCents: normalizeNumber(row.gross_cents),
    feeCents: normalizeNumber(row.fee_cents),
    netCents: normalizeNumber(row.net_cents),
    paidDate: normalizeString(row.paid_date),
    stripeCheckoutSessionId: normalizeString(row.stripe_checkout_session_id),
    stripePaymentIntentId: normalizeString(row.stripe_payment_intent_id),
    stripeChargeId: normalizeString(row.stripe_charge_id),
    stripeBalanceTransactionId: normalizeString(row.stripe_balance_transaction_id),
    stripePayoutId: normalizeString(row.stripe_payout_id),
    stripePayoutStatus: normalizeString(row.stripe_payout_status),
    stripePayoutReconciledDate: normalizeString(row.stripe_payout_reconciled_date),
    qboPaymentId: normalizeString(row.qbo_payment_id),
    qboDepositId: normalizeString(row.qbo_deposit_id),
    qboSyncStatus: normalizeString(row.qbo_sync_status),
    qboSyncMessage: normalizeString(row.qbo_sync_message),
    accountingSyncState: normalizeString(row.accounting_sync_state),
    qboLastSyncDate: normalizeString(row.qbo_last_sync_date),
    accountingNotificationSentDate: normalizeString(row.accounting_notification_sent_date),
    note: normalizeString(row.note),
    createdDate: normalizeString(row.created_date),
    updatedDate: normalizeString(row.updated_date),
    createdBy: normalizeString(row.created_by),
    updatedBy: normalizeString(row.updated_by),
  };
}

export function mapInvoiceRow(row: InvoiceRow, lineItems: InvoiceLineItem[] = []): Invoice {
  return {
    id: normalizeString(row.id),
    invoiceNumber: normalizeString(row.invoice_number),
    status: normalizeInvoiceStatus(row.status),
    qboCustomerId: normalizeString(row.qbo_customer_id),
    qboProjectId: normalizeString(row.qbo_project_id),
    qboInvoiceId: normalizeString(row.qbo_invoice_id),
    qboInvoiceSyncToken: normalizeString(row.qbo_invoice_sync_token),
    qboPaymentId: normalizeString(row.qbo_payment_id),
    qboLastSyncDate: normalizeString(row.qbo_last_sync_date),
    qboSyncStatus: normalizeString(row.qbo_sync_status),
    qboSyncMessage: normalizeString(row.qbo_sync_message),
    accountingSyncState: normalizeString(row.accounting_sync_state),
    clientName: normalizeString(row.client_name),
    clientEmail: normalizeString(row.client_email),
    billingClientName: normalizeString(row.billing_client_name ?? row.client_name),
    billingEmail: normalizeString(row.billing_email ?? row.client_email),
    billingAddressLine1: normalizeString(row.billing_address_line1),
    billingAddressLine2: normalizeString(row.billing_address_line2),
    billingAddressCity: normalizeString(row.billing_address_city),
    billingAddressState: normalizeString(row.billing_address_state),
    billingAddressPostalCode: normalizeString(row.billing_address_postal_code),
    projectAddressLine1: normalizeString(row.project_address_line1),
    projectAddressLine2: normalizeString(row.project_address_line2),
    projectAddressCity: normalizeString(row.project_address_city),
    projectAddressState: normalizeString(row.project_address_state),
    projectAddressPostalCode: normalizeString(row.project_address_postal_code),
    poNumber: normalizeString(row.po_number),
    projectReference: normalizeString(row.project_reference),
    issueDate: normalizeString(row.issue_date),
    dueDate: normalizeString(row.due_date),
    notes: normalizeString(row.notes),
    internalNote: normalizeString(row.internal_note),
    publicToken: normalizeString(row.public_token),
    subtotalCents: normalizeNumber(row.subtotal_cents),
    previouslyBilledCents: normalizeNumber(row.previously_billed_cents),
    totalCents: normalizeNumber(row.total_cents),
    stripeCheckoutSessionId: normalizeString(row.stripe_checkout_session_id),
    stripePaymentIntentId: normalizeString(row.stripe_payment_intent_id),
    paidDate: normalizeString(row.paid_date),
    sentDate: normalizeString(row.sent_date),
    voidDate: normalizeString(row.void_date),
    emailDeliveryState: mapInvoiceEmailDeliveryState(row.email_delivery_state),
    createdDate: normalizeString(row.created_date),
    updatedDate: normalizeString(row.updated_date),
    createdBy: normalizeString(row.created_by),
    updatedBy: normalizeString(row.updated_by),
    contactIds: [],
    contacts: [],
    lineItems,
    payments: [],
  };
}
