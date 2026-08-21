import { INVOICE_STATUSES, INVOICE_PAYMENT_KINDS, INVOICE_PAYMENT_STATUSES, INVOICE_EMAIL_DELIVERY_STATUSES } from './constants';
import { normalizeString, normalizeStringArray, normalizeNumber, normalizeBoolean, normalizeType } from './helpers';

// #region Type Definitions

/** Invoice status: 'draft', 'sent', 'paid', 'void' */
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/** Invoice payment kind: 'payment', 'deposit' */
export type InvoicePaymentKind = (typeof INVOICE_PAYMENT_KINDS)[number];

/** Invoice payment status: 'pending', 'succeeded', 'failed', 'void' */
export type InvoicePaymentStatus = (typeof INVOICE_PAYMENT_STATUSES)[number];

/** Invoice email delivery status: 'accepted', 'warning', 'failed' */
export type InvoiceEmailDeliveryStatus = (typeof INVOICE_EMAIL_DELIVERY_STATUSES)[number];

// #endregion

// #region Application Types

/** Current transactional email delivery state for a Compass invoice. Based on Brevo webhook events. */
export type InvoiceEmailDeliveryState = {
  /** The current email delivery status */
  status: InvoiceEmailDeliveryStatus;
  /** The email delivery event from Brevo */
  event: string;
  /** The email recipient */
  recipient: string;
  /** The reason for the email delivery status */
  reason: string;
  /** The message ID for the email delivery event */
  messageId: string;
  /** The latest update date for the event */
  updatedDate: string;
  /** The date a notice was sent */
  noticeSentDate: string;
  /** The recipients (emails) of the notice */
  noticeRecipients: string[];
};

/** Invoice line item for a Compass invoice. */
export type InvoiceLineItem = {
  /** Unique identifier for the line item */
  id: string;
  /** Unique identifier of the parent invoice */
  invoiceId: string;
  /** Source project task, when this line was created from a proposal task. */
  projectTaskId: string;
  /** Description of the line item */
  description: string;
  /** Quantity of the line item. @deprecated Use percentComplete instead. */
  quantity: number;
  /** Unit amount in cents. @deprecated use contractAmountCents instead. */
  unitAmountCents: number;
  /** Contract amount in cents. */
  contractAmountCents: number;
  /** Percent complete of the line item. Limit is 0 to 100. */
  percentComplete: number;
  /** Billable amount in cents. */
  amountCents: number;
  /** Indicates whether the line item should be billed in full, overriding past billing. */
  billInFull: boolean;
  /** Sort order of the line item. Lower numbers are higher on the page. */
  sortOrder: number;
};

/** Contact snapshot selected to receive an invoice. */
export type InvoiceContactRecipient = {
  /** Unique identifier for the invoice contact recipient */
  id: string;
  /** Unique identifier of the parent invoice */
  invoiceId: string;
  /** Unique identifier of the contact */
  contactId: string;
  /** Name of the contact */
  name: string;
  /** Email of the contact */
  email: string;
};

/** Payment or deposit record applied to a Compass invoice. */
export type InvoicePayment = {
  /** Unique identifier for the payment or deposit record */
  id: string;
  /** Unique identifier of the parent invoice */
  invoiceId: string;
  /** Payment kind: 'payment' or 'deposit' */
  kind: InvoicePaymentKind;
  /** Payment status: 'pending', 'succeeded', 'failed', 'void' */
  status: InvoicePaymentStatus;
  /** Payment method */
  method: string;
  /** Reference number for the payment or deposit record */
  referenceNumber: string;
  /** Gross amount in cents. Does not show fees removed. */
  grossCents: number;
  /** Fee amount in cents. */
  feeCents: number;
  /** Net amount in cents. */
  netCents: number;
  /** Date the payment was made */
  paidDate: string;
  /** Stripe Checkout Session ID */
  stripeCheckoutSessionId: string;
  /** Stripe Payment Intent ID */
  stripePaymentIntentId: string;
  /** Stripe Charge ID */
  stripeChargeId: string;
  /** Stripe Balance Transaction ID */
  stripeBalanceTransactionId: string;
  /** Stripe Payout ID */
  stripePayoutId: string;
  /** Stripe Payout Status */
  stripePayoutStatus: string;
  /** Stripe Payout Reconciled Date */
  stripePayoutReconciledDate: string;
  /** QuickBooks Online Payment ID */
  qboPaymentId: string;
  /** QuickBooks Online Deposit ID */
  qboDepositId: string;
  /** QuickBooks Online Sync Status */
  qboSyncStatus: string;
  /** QuickBooks Online Sync Message */
  qboSyncMessage: string;
  /** Accounting Sync State */
  accountingSyncState: string;
  /** QuickBooks Online Last Sync Date */
  qboLastSyncDate: string;
  /** Accounting Notification Sent Date */
  accountingNotificationSentDate: string;
  /** Note */
  note: string;
  /** Date the payment or deposit record was created */
  createdDate: string;
  /** Date the payment or deposit record was last updated */
  updatedDate: string;
  /** User who created the payment or deposit record */
  createdBy: string;
  /** User who last updated the payment or deposit record */
  updatedBy: string;
};

// TODO: Consider splitting this type into multiple types for better maintainability and clarity. It currently has a large number of properties, which can make it difficult to work with and understand. Requires syncing with a new table in D1. 
/** Compass invoice. */
export type Invoice = {
  /** Unique identifier for the invoice */
  id: string;
  /** Public facing invoice number */
  invoiceNumber: string;
  /** Invoice status: 'draft', 'sent', 'paid', 'void' */
  status: InvoiceStatus;
  /** QuickBooks Online Customer ID */
  qboCustomerId: string;
  /** QuickBooks Online Project ID */
  qboProjectId: string;
  /** QuickBooks Online Invoice ID */
  qboInvoiceId: string;
  /** QuickBooks Online Invoice Sync Token */
  qboInvoiceSyncToken: string;
  /** QuickBooks Online Payment ID */
  qboPaymentId: string;
  /** QuickBooks Online Last Sync Date */
  qboLastSyncDate: string;
  /** QuickBooks Online Sync Status */
  qboSyncStatus: string;
  /** QuickBooks Online Sync Message */
  qboSyncMessage: string;
  /** Accounting Sync State */
  accountingSyncState: string;
  /** Client name */
  clientName: string;
  /** Client email */
  clientEmail: string;
  /** Billing client name */
  billingClientName: string;
  /** Billing client email */
  billingEmail: string;
  /** Billing address line 1 */
  billingAddressLine1: string;
  /** Billing address line 2 */
  billingAddressLine2: string;
  /** Billing address city */
  billingAddressCity: string;
  /** Billing address state */
  billingAddressState: string;
  /** Billing address postal code */
  billingAddressPostalCode: string;
  /** Project address line 1 */
  projectAddressLine1: string;
  /** Project address line 2 */
  projectAddressLine2: string;
  /** Project address city */
  projectAddressCity: string;
  /** Project address state */
  projectAddressState: string;
  /** Project address postal code */
  projectAddressPostalCode: string;
  /** Purchase order number */
  poNumber: string;
  /** Project reference. Usually YY-#### - Project Name */
  projectReference: string;
  /** Issue date of the invoice */
  issueDate: string;
  /** Due date of the invoice */
  dueDate: string;
  /** Notes associated with the invoice for the client. */
  notes: string;
  /** Internal note associated with the invoice. */
  internalNote: string;
  /** Public token for the invoice to access the payment portal. */
  publicToken: string;
  /** Subtotal amount in cents. Does not include previous payments, billing, or discounts. */
  subtotalCents: number;
  /** Previously billed amount in cents. */
  previouslyBilledCents: number;
  /** Total billable amount in cents. */
  totalCents: number;
  /** Stripe Checkout Session ID */
  stripeCheckoutSessionId: string;
  /** Stripe Payment Intent ID */
  stripePaymentIntentId: string;
  /** Date the invoice was paid */
  paidDate: string;
  /** Date the invoice was sent */
  sentDate: string;
  /** Date the invoice was voided */
  voidDate: string;
  /** Email delivery state for the invoice. Null if invoice is not sent (drafted). */
  emailDeliveryState: InvoiceEmailDeliveryState | null;
  /** Date the invoice was created */
  createdDate: string;
  /** Date the invoice was last updated */
  updatedDate: string;
  /** User who created the invoice */
  createdBy: string;
  /** User who last updated the invoice */
  updatedBy: string;
  /** Client Contact IDs associated with the invoice */
  contactIds: string[];
  /** List of contact recipients associated with the invoice */
  contacts: InvoiceContactRecipient[];
  /** Line items associated with the invoice */
  lineItems: InvoiceLineItem[];
  /** Payments associated with the invoice */
  payments: InvoicePayment[];
};

// #endregion

// #region D1 Types

/** Compass invoice line item in the D1 database. */
export type InvoiceLineItemRow = {
  /** Unique identifier for the invoice line item */
  id?: unknown;
  /** Identifier for the associated invoice */
  invoice_id?: unknown;
  project_task_id?: unknown;
  /** Description of the line item */
  description?: unknown;
  /** Quantity of the line item. @deprecated use percent_complete instead */
  quantity?: unknown;
  /** Unit amount in cents. @deprecated use contract_amount_cents instead */
  unit_amount_cents?: unknown;
  /** Contract amount in cents */
  contract_amount_cents?: unknown;
  /** Percent complete */
  percent_complete?: unknown;
  /** Amount in cents */
  amount_cents?: unknown;
  /** Bill in full flag */
  bill_in_full?: unknown;
  /** Sort order */
  sort_order?: unknown;
};

/** Compass invoice in the D1 database. */
export type InvoiceRow = {
  /** Unique identifier for the invoice */
  id?: unknown;
  /** Public facing invoice number */
  invoice_number?: unknown;
  /** Invoice status: 'draft', 'sent', 'paid', 'void' */
  status?: unknown;
  /** QuickBooks Online Customer ID */
  qbo_customer_id?: unknown;
  /** QuickBooks Online Project ID */
  qbo_project_id?: unknown;
  /** QuickBooks Online Invoice ID */
  qbo_invoice_id?: unknown;
  /** QuickBooks Online Invoice Sync Token */
  qbo_invoice_sync_token?: unknown;
  /** QuickBooks Online Payment ID */
  qbo_payment_id?: unknown;
  /** QuickBooks Online Last Sync Date */
  qbo_last_sync_date?: unknown;
  /** QuickBooks Online Sync Status */
  qbo_sync_status?: unknown;
  /** QuickBooks Online Sync Message */
  qbo_sync_message?: unknown;
  /** Accounting Sync State */
  accounting_sync_state?: unknown;
  /** Client name */
  client_name?: unknown;
  /** Client email */
  client_email?: unknown;
  /** Billing client name */
  billing_client_name?: unknown;
  /** Billing client email */
  billing_email?: unknown;
  /** Billing address line 1 */
  billing_address_line1?: unknown;
  /** Billing address line 2 */
  billing_address_line2?: unknown;
  /** Billing address city */
  billing_address_city?: unknown;
  /** Billing address state */
  billing_address_state?: unknown;
  /** Billing address postal code */
  billing_address_postal_code?: unknown;
  /** Project address line 1 */
  project_address_line1?: unknown;
  /** Project address line 2 */
  project_address_line2?: unknown;
  /** Project address city */
  project_address_city?: unknown;
  /** Project address state */
  project_address_state?: unknown;
  /** Project address postal code */
  project_address_postal_code?: unknown;
  /** Purchase order number */
  po_number?: unknown;
  /** Project reference. Usually YY-#### - Project Name */
  project_reference?: unknown;
  /** Issue date of the invoice */
  issue_date?: unknown;
  /** Due date of the invoice */
  due_date?: unknown;
  /** Notes associated with the invoice for the client. */
  notes?: unknown;
  /** Internal note associated with the invoice. */
  internal_note?: unknown;
  /** Public token for the invoice to access the payment portal. */
  public_token?: unknown;
  /** Subtotal amount in cents. Does not include previous payments, billing, or discounts. */
  subtotal_cents?: unknown;
  /** Previously billed amount in cents. */
  previously_billed_cents?: unknown;
  /** Total billable amount in cents. */
  total_cents?: unknown;
  /** Stripe Checkout Session ID */
  stripe_checkout_session_id?: unknown;
  /** Stripe Payment Intent ID */
  stripe_payment_intent_id?: unknown;
  /** Date the invoice was paid */
  paid_date?: unknown;
  /** Date the invoice was sent */
  sent_date?: unknown;
  /** Date the invoice was voided */
  void_date?: unknown;
  /** Email delivery state for the invoice. Null if invoice is not sent (drafted). */
  email_delivery_state?: unknown;
  /** Date the invoice was created */
  created_date?: unknown;
  /** Date the invoice was last updated */
  updated_date?: unknown;
  /** User who created the invoice */
  created_by?: unknown;
  /** User who last updated the invoice */
  updated_by?: unknown;
};

/** Compass invoice contact recipient in the D1 database. */
export type InvoiceContactRecipientRow = {
  /** Unique identifier for the invoice contact recipient */
  id?: unknown;
  /** Identifier for the associated invoice */
  invoice_id?: unknown;
  /** Identifier for the associated contact */
  contact_id?: unknown;
  /** Name of the contact recipient */
  name?: unknown;
  /** Email of the contact recipient */
  email?: unknown;
};

/** Compass invoice payment in the D1 database. */
export type InvoicePaymentRow = {
  /** Unique identifier for the invoice payment */
  id?: unknown;
  /** Identifier for the associated invoice */
  invoice_id?: unknown;
  /** Payment kind: 'payment', 'refund', etc. */
  kind?: unknown;
  /** Payment status: 'pending', 'completed', etc. */
  status?: unknown;
  /** Payment method */
  method?: unknown;
  /** Reference number for the payment */
  reference_number?: unknown;
  /** Gross amount in cents */
  gross_cents?: unknown;
  /** Fee amount in cents */
  fee_cents?: unknown;
  /** Net amount in cents */
  net_cents?: unknown;
  /** Date the payment was made */
  paid_date?: unknown;
  /** Stripe Checkout Session ID */
  stripe_checkout_session_id?: unknown;
  /** Stripe Payment Intent ID */
  stripe_payment_intent_id?: unknown;
  /** Stripe Charge ID */
  stripe_charge_id?: unknown;
  /** Stripe Balance Transaction ID */
  stripe_balance_transaction_id?: unknown;
  /** Stripe Payout ID */
  stripe_payout_id?: unknown;
  /** Stripe Payout Status */
  stripe_payout_status?: unknown;
  /** Stripe Payout Reconciled Date */
  stripe_payout_reconciled_date?: unknown;
  /** QuickBooks Online Payment ID */
  qbo_payment_id?: unknown;
  /** QuickBooks Online Deposit ID */
  qbo_deposit_id?: unknown;
  /** QuickBooks Online Sync Status */
  qbo_sync_status?: unknown;
  /** QuickBooks Online Sync Message */
  qbo_sync_message?: unknown;
  /** Accounting Sync State */
  accounting_sync_state?: unknown;
  /** QuickBooks Online Last Sync Date */
  qbo_last_sync_date?: unknown;
  /** Accounting Notification Sent Date */
  accounting_notification_sent_date?: unknown;
  /** Note associated with the payment */
  note?: unknown;
  /** Date the payment was created */
  created_date?: unknown;
  /** Date the payment was last updated */
  updated_date?: unknown;
  /** User who created the payment */
  created_by?: unknown;
  /** User who last updated the payment */
  updated_by?: unknown;
};

// #endregion

// #region Mapping Functions

/**
 * Converts a raw invoice email delivery state value from the D1 database into a structured `InvoiceEmailDeliveryState` object. If the input value is not valid JSON or does not contain the expected properties, it returns null.
 * @param value - The raw value to map, typically a JSON string from the D1 database.
 * @returns The structured `InvoiceEmailDeliveryState` object, or null if the input is invalid.
 */
export function mapInvoiceEmailDeliveryState(value: unknown): InvoiceEmailDeliveryState | null {
  const raw = normalizeString(value);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      // status: normalizeInvoiceEmailDeliveryStatus(parsed.status),
      status: normalizeType<InvoiceEmailDeliveryStatus>(parsed.status, INVOICE_EMAIL_DELIVERY_STATUSES, 'accepted'),
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

/** 
 * Maps a D1 invoice line item row to the shared API type.
 * @param row - The D1 invoice line item row to map.
 * @returns The mapped `InvoiceLineItem` object.
 */
export function mapInvoiceLineItemRow(row: InvoiceLineItemRow): InvoiceLineItem {
  const contractAmountCents = normalizeNumber(row.contract_amount_cents ?? row.unit_amount_cents);
  const percentComplete = normalizeNumber(row.percent_complete ?? row.quantity);
  return {
    id: normalizeString(row.id),
    invoiceId: normalizeString(row.invoice_id),
    projectTaskId: normalizeString(row.project_task_id),
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

/**
 * Maps a D1 invoice contact recipient row to the shared API type.
 * @param row - The D1 invoice contact recipient row to map.
 * @returns The mapped `InvoiceContactRecipient` object.
 */
export function mapInvoiceContactRecipientRow(row: InvoiceContactRecipientRow): InvoiceContactRecipient {
  return {
    id: normalizeString(row.id),
    invoiceId: normalizeString(row.invoice_id),
    contactId: normalizeString(row.contact_id),
    name: normalizeString(row.name),
    email: normalizeString(row.email),
  };
}

/** 
 * Maps a D1 invoice payment row to the shared API type. 
 * @param row - The D1 invoice payment row to map.
 * @returns The mapped `InvoicePayment` object.
 */
export function mapInvoicePaymentRow(row: InvoicePaymentRow): InvoicePayment {
  return {
    id: normalizeString(row.id),
    invoiceId: normalizeString(row.invoice_id),
    kind: normalizeType<InvoicePaymentKind>(row.kind, INVOICE_PAYMENT_KINDS, 'payment'),
    status: normalizeType<InvoicePaymentStatus>(row.status, INVOICE_PAYMENT_STATUSES, 'pending'),
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

/**
 * Maps a D1 invoice row to the shared API type, including its associated line items.
 * @param row - The D1 invoice row to map.
 * @param lineItems - An optional array of `InvoiceLineItem` objects associated with the invoice. Defaults to an empty array if not provided.
 * @returns The mapped `Invoice` object.
 */
export function mapInvoiceRow(row: InvoiceRow, lineItems: InvoiceLineItem[] = []): Invoice {
  return {
    id: normalizeString(row.id),
    invoiceNumber: normalizeString(row.invoice_number),
    status: normalizeType<InvoiceStatus>(row.status, INVOICE_STATUSES, 'draft'),
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
// #endregion
