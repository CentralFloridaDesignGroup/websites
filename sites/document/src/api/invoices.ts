import type {
  Invoice,
  InvoiceContactRecipient,
  InvoiceEmailDeliveryState,
  InvoiceLineItem,
  InvoicePayment,
  InvoicePaymentKind,
  InvoicePaymentStatus,
} from "cfdg/types";
import {
  INVOICE_STATUSES,
  INVOICE_PAYMENT_KINDS,
  INVOICE_PAYMENT_STATUSES,
} from 'cfdg/types/constants'
import { requestJson } from "./client";
import { normalizeBoolean, normalizeNumber, normalizeString, normalizeStringArray, normalizeType } from "cfdg/scripts";

export type InvoiceLineItemDraft = {
  id?: string;
  description: string;
  quantity: number;
  unitAmountCents: number;
  contractAmountCents: number;
  percentComplete: number;
  billInFull: boolean;
};

export type InvoiceSavePayload = {
  qboCustomerId?: string;
  qboProjectId?: string;
  contactIds?: string[];
  clientName: string;
  clientEmail: string;
  poNumber: string;
  projectReference: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  internalNote: string;
  previouslyBilledCents: number;
  createdBy?: string;
  updatedBy?: string;
  lineItems: InvoiceLineItemDraft[];
};

export type InvoiceEmailAttachment = {
  filename: string;
  data: string;
  mimetype: string;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function normalizeEmailDeliveryState(
  value: unknown,
): InvoiceEmailDeliveryState | null {
  if (!value || typeof value !== "object") return null;
  const row = asRecord(value);
  const status = normalizeString(row.status).toLowerCase();
  return {
    status: status === "warning" || status === "failed" ? status : "accepted",
    event: normalizeString(row.event),
    recipient: normalizeString(row.recipient),
    reason: normalizeString(row.reason),
    messageId: normalizeString(row.messageId ?? row.message_id),
    updatedDate: normalizeString(row.updatedDate ?? row.updated_date),
    noticeSentDate: normalizeString(row.noticeSentDate ?? row.notice_sent_date),
    noticeRecipients: normalizeStringArray(
      row.noticeRecipients ?? row.notice_recipients,
    ),
  };
}

function normalizeLineItem(value: unknown): InvoiceLineItem {
  const row = asRecord(value);
  return {
    id: normalizeString(row.id),
    invoiceId: normalizeString(row.invoiceId ?? row.invoice_id),
    description: normalizeString(row.description),
    quantity: normalizeNumber(
      row.quantity ?? row.percentComplete ?? row.percent_complete,
    ),
    unitAmountCents: normalizeNumber(
      row.unitAmountCents ??
        row.unit_amount_cents ??
        row.contractAmountCents ??
        row.contract_amount_cents,
    ),
    contractAmountCents: normalizeNumber(
      row.contractAmountCents ??
        row.contract_amount_cents ??
        row.unitAmountCents ??
        row.unit_amount_cents,
    ),
    percentComplete: normalizeNumber(
      row.percentComplete ?? row.percent_complete ?? row.quantity,
    ),
    amountCents: normalizeNumber(row.amountCents ?? row.amount_cents),
    billInFull: normalizeBoolean(row.billInFull ?? row.bill_in_full),
    sortOrder: normalizeNumber(row.sortOrder ?? row.sort_order),
  };
}

function normalizeInvoiceContact(value: unknown): InvoiceContactRecipient {
  const row = asRecord(value);
  return {
    id: normalizeString(row.id),
    invoiceId: normalizeString(row.invoiceId ?? row.invoice_id),
    contactId: normalizeString(row.contactId ?? row.contact_id),
    name: normalizeString(row.name),
    email: normalizeString(row.email),
  };
}

function normalizeInvoice(value: unknown): Invoice {
  const row = asRecord(value);
  const contacts = Array.isArray(row.contacts)
    ? row.contacts.map((contact) => normalizeInvoiceContact(contact))
    : [];
  return {
    id: normalizeString(row.id),
    invoiceNumber: normalizeString(row.invoiceNumber ?? row.invoice_number),
    status: normalizeType(row.status, INVOICE_STATUSES, "draft"),
    qboCustomerId: normalizeString(row.qboCustomerId ?? row.qbo_customer_id),
    qboProjectId: normalizeString(row.qboProjectId ?? row.qbo_project_id),
    qboInvoiceId: normalizeString(row.qboInvoiceId ?? row.qbo_invoice_id),
    qboInvoiceSyncToken: normalizeString(
      row.qboInvoiceSyncToken ?? row.qbo_invoice_sync_token,
    ),
    qboPaymentId: normalizeString(row.qboPaymentId ?? row.qbo_payment_id),
    qboLastSyncDate: normalizeString(
      row.qboLastSyncDate ?? row.qbo_last_sync_date,
    ),
    qboSyncStatus: normalizeString(row.qboSyncStatus ?? row.qbo_sync_status),
    qboSyncMessage: normalizeString(row.qboSyncMessage ?? row.qbo_sync_message),
    accountingSyncState: normalizeString(
      row.accountingSyncState ?? row.accounting_sync_state,
    ),
    clientName: normalizeString(row.clientName ?? row.client_name),
    clientEmail: normalizeString(row.clientEmail ?? row.client_email),
    billingClientName: normalizeString(
      row.billingClientName ??
        row.billing_client_name ??
        row.clientName ??
        row.client_name,
    ),
    billingEmail: normalizeString(
      row.billingEmail ??
        row.billing_email ??
        row.clientEmail ??
        row.client_email,
    ),
    billingAddressLine1: normalizeString(
      row.billingAddressLine1 ?? row.billing_address_line1,
    ),
    billingAddressLine2: normalizeString(
      row.billingAddressLine2 ?? row.billing_address_line2,
    ),
    billingAddressCity: normalizeString(
      row.billingAddressCity ?? row.billing_address_city,
    ),
    billingAddressState: normalizeString(
      row.billingAddressState ?? row.billing_address_state,
    ),
    billingAddressPostalCode: normalizeString(
      row.billingAddressPostalCode ?? row.billing_address_postal_code,
    ),
    projectAddressLine1: normalizeString(
      row.projectAddressLine1 ?? row.project_address_line1,
    ),
    projectAddressLine2: normalizeString(
      row.projectAddressLine2 ?? row.project_address_line2,
    ),
    projectAddressCity: normalizeString(
      row.projectAddressCity ?? row.project_address_city,
    ),
    projectAddressState: normalizeString(
      row.projectAddressState ?? row.project_address_state,
    ),
    projectAddressPostalCode: normalizeString(
      row.projectAddressPostalCode ?? row.project_address_postal_code,
    ),
    poNumber: normalizeString(row.poNumber ?? row.po_number),
    projectReference: normalizeString(
      row.projectReference ?? row.project_reference,
    ),
    issueDate: normalizeString(row.issueDate ?? row.issue_date),
    dueDate: normalizeString(row.dueDate ?? row.due_date),
    notes: normalizeString(row.notes),
    internalNote: normalizeString(row.internalNote ?? row.internal_note),
    publicToken: normalizeString(row.publicToken ?? row.public_token),
    subtotalCents: normalizeNumber(row.subtotalCents ?? row.subtotal_cents),
    previouslyBilledCents: normalizeNumber(
      row.previouslyBilledCents ?? row.previously_billed_cents,
    ),
    totalCents: normalizeNumber(row.totalCents ?? row.total_cents),
    stripeCheckoutSessionId: normalizeString(
      row.stripeCheckoutSessionId ?? row.stripe_checkout_session_id,
    ),
    stripePaymentIntentId: normalizeString(
      row.stripePaymentIntentId ?? row.stripe_payment_intent_id,
    ),
    paidDate: normalizeString(row.paidDate ?? row.paid_date),
    sentDate: normalizeString(row.sentDate ?? row.sent_date),
    voidDate: normalizeString(row.voidDate ?? row.void_date),
    emailDeliveryState: normalizeEmailDeliveryState(
      row.emailDeliveryState ?? row.email_delivery_state,
    ),
    createdDate: normalizeString(row.createdDate ?? row.created_date),
    updatedDate: normalizeString(row.updatedDate ?? row.updated_date),
    createdBy: normalizeString(row.createdBy ?? row.created_by),
    updatedBy: normalizeString(row.updatedBy ?? row.updated_by),
    contactIds:
      Array.isArray(row.contactIds) || Array.isArray(row.contact_ids)
        ? (Array.isArray(row.contactIds)
            ? row.contactIds
            : (row.contact_ids as unknown[])
          )
            .map((id: unknown) => normalizeString(id))
            .filter(Boolean)
        : contacts.map((contact) => contact.contactId),
    contacts,
    lineItems: Array.isArray(row.lineItems)
      ? row.lineItems.map((item) => normalizeLineItem(item))
      : [],
    payments: Array.isArray(row.payments)
      ? row.payments.map((payment) => normalizePayment(payment))
      : [],
  };
}

export async function fetchInvoices(
  filters: {
    status?: string;
    search?: string;
    qboCustomerId?: string;
    qboProjectId?: string;
  } = {},
): Promise<Invoice[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.qboCustomerId) params.set("qboCustomerId", filters.qboCustomerId);
  if (filters.qboProjectId) params.set("qboProjectId", filters.qboProjectId);
  const query = params.toString();
  const data = await requestJson<{ invoices?: unknown[] }>(
    `/api/invoices${query ? `?${query}` : ""}`,
    {
      method: "GET",
      authMode: "microsoft",
    },
  );
  return (data.invoices || []).map((invoice) => normalizeInvoice(invoice));
}

export async function fetchInvoice(id: string): Promise<Invoice> {
  const data = await requestJson<{ invoice?: unknown }>(
    `/api/invoices/${encodeURIComponent(id)}`,
    {
      method: "GET",
      authMode: "microsoft",
    },
  );
  return normalizeInvoice(data.invoice);
}

export async function fetchPublicInvoice(token: string): Promise<Invoice> {
  const data = await requestJson<{ invoice?: unknown }>(
    `/api/invoices/public/${encodeURIComponent(token)}`,
    {
      method: "GET",
      authMode: "public",
    },
  );
  return normalizeInvoice(data.invoice);
}

export async function createInvoice(
  payload: InvoiceSavePayload,
): Promise<Invoice> {
  const data = await requestJson<{ invoice?: unknown }>("/api/invoices", {
    method: "POST",
    authMode: "microsoft",
    body: JSON.stringify(payload),
  });
  return normalizeInvoice(data.invoice);
}

export async function updateInvoice(
  id: string,
  payload: InvoiceSavePayload,
): Promise<Invoice> {
  const data = await requestJson<{ invoice?: unknown }>(
    `/api/invoices/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      authMode: "microsoft",
      body: JSON.stringify(payload),
    },
  );
  return normalizeInvoice(data.invoice);
}

export async function copyInvoice(id: string): Promise<Invoice> {
  const data = await requestJson<{ invoice?: unknown }>(
    `/api/invoices/${encodeURIComponent(id)}/copy`,
    {
      method: "POST",
      authMode: "microsoft",
      body: JSON.stringify({}),
    },
  );
  return normalizeInvoice(data.invoice);
}

export async function sendInvoice(
  id: string,
  attachment?: InvoiceEmailAttachment,
  bccSenderEmail = "",
): Promise<Invoice> {
  const data = await requestJson<{ invoice?: unknown }>(
    `/api/invoices/${encodeURIComponent(id)}/send`,
    {
      method: "POST",
      authMode: "microsoft",
      body: JSON.stringify({ attachment, bccSenderEmail }),
    },
  );
  return normalizeInvoice(data.invoice);
}

export async function refreshInvoiceProjectAddress(
  id: string,
): Promise<Invoice> {
  const data = await requestJson<{ invoice?: unknown }>(
    `/api/invoices/${encodeURIComponent(id)}/refresh-project-address`,
    {
      method: "POST",
      authMode: "microsoft",
      body: JSON.stringify({}),
    },
  );
  return normalizeInvoice(data.invoice);
}

export async function voidInvoice(
  id: string,
  internalNote: string,
): Promise<Invoice> {
  const data = await requestJson<{ invoice?: unknown }>(
    `/api/invoices/${encodeURIComponent(id)}/void`,
    {
      method: "POST",
      authMode: "microsoft",
      body: JSON.stringify({ internalNote }),
    },
  );
  return normalizeInvoice(data.invoice);
}

function normalizePaymentKind(value: unknown): InvoicePaymentKind {
  const normalized = normalizeString(value).toLowerCase();
  const matched = INVOICE_PAYMENT_KINDS.find((kind) => kind === normalized);
  return matched ?? "payment";
}

function normalizePaymentStatus(value: unknown): InvoicePaymentStatus {
  const normalized = normalizeString(value).toLowerCase();
  const matched = INVOICE_PAYMENT_STATUSES.find(
    (status) => status === normalized,
  );
  return matched ?? "pending";
}

function normalizePayment(value: unknown): InvoicePayment {
  const row = asRecord(value);
  return {
    id: normalizeString(row.id),
    invoiceId: normalizeString(row.invoiceId ?? row.invoice_id),
    kind: normalizePaymentKind(row.kind),
    status: normalizePaymentStatus(row.status),
    method: normalizeString(row.method),
    referenceNumber: normalizeString(
      row.referenceNumber ?? row.reference_number,
    ),
    grossCents: normalizeNumber(row.grossCents ?? row.gross_cents),
    feeCents: normalizeNumber(row.feeCents ?? row.fee_cents),
    netCents: normalizeNumber(row.netCents ?? row.net_cents),
    paidDate: normalizeString(row.paidDate ?? row.paid_date),
    stripeCheckoutSessionId: normalizeString(
      row.stripeCheckoutSessionId ?? row.stripe_checkout_session_id,
    ),
    stripePaymentIntentId: normalizeString(
      row.stripePaymentIntentId ?? row.stripe_payment_intent_id,
    ),
    stripeChargeId: normalizeString(row.stripeChargeId ?? row.stripe_charge_id),
    stripeBalanceTransactionId: normalizeString(
      row.stripeBalanceTransactionId ?? row.stripe_balance_transaction_id,
    ),
    stripePayoutId: normalizeString(row.stripePayoutId ?? row.stripe_payout_id),
    stripePayoutStatus: normalizeString(
      row.stripePayoutStatus ?? row.stripe_payout_status,
    ),
    stripePayoutReconciledDate: normalizeString(
      row.stripePayoutReconciledDate ?? row.stripe_payout_reconciled_date,
    ),
    qboPaymentId: normalizeString(row.qboPaymentId ?? row.qbo_payment_id),
    qboDepositId: normalizeString(row.qboDepositId ?? row.qbo_deposit_id),
    qboSyncStatus: normalizeString(row.qboSyncStatus ?? row.qbo_sync_status),
    qboSyncMessage: normalizeString(row.qboSyncMessage ?? row.qbo_sync_message),
    accountingSyncState: normalizeString(
      row.accountingSyncState ?? row.accounting_sync_state,
    ),
    qboLastSyncDate: normalizeString(
      row.qboLastSyncDate ?? row.qbo_last_sync_date,
    ),
    accountingNotificationSentDate: normalizeString(
      row.accountingNotificationSentDate ??
        row.accounting_notification_sent_date,
    ),
    note: normalizeString(row.note),
    createdDate: normalizeString(row.createdDate ?? row.created_date),
    updatedDate: normalizeString(row.updatedDate ?? row.updated_date),
    createdBy: normalizeString(row.createdBy ?? row.created_by),
    updatedBy: normalizeString(row.updatedBy ?? row.updated_by),
  };
}

export type InvoicePaymentPayload = {
  kind: InvoicePaymentKind;
  method: string;
  referenceNumber?: string;
  grossCents: number;
  feeCents?: number;
  paidDate: string;
  note: string;
};

export async function markInvoicePaid(
  id: string,
  payload: InvoicePaymentPayload | string,
): Promise<Invoice> {
  const body =
    typeof payload === "string" ? { internalNote: payload } : payload;
  const data = await requestJson<{ invoice?: unknown }>(
    `/api/invoices/${encodeURIComponent(id)}/mark-paid`,
    {
      method: "POST",
      authMode: "microsoft",
      body: JSON.stringify(body),
    },
  );
  return normalizeInvoice(data.invoice);
}

export async function syncInvoicePayments(id: string): Promise<Invoice> {
  const data = await requestJson<{ invoice?: unknown }>(
    `/api/invoices/${encodeURIComponent(id)}/sync-payments`,
    {
      method: "POST",
      authMode: "microsoft",
      body: JSON.stringify({}),
    },
  );
  return normalizeInvoice(data.invoice);
}

async function retryInvoicePaymentAction(
  invoiceId: string,
  paymentId: string,
  action: string,
): Promise<Invoice> {
  const data = await requestJson<{ invoice?: unknown }>(
    `/api/invoices/${encodeURIComponent(invoiceId)}/payments/${encodeURIComponent(paymentId)}/${action}`,
    {
      method: "POST",
      authMode: "microsoft",
      body: JSON.stringify({}),
    },
  );
  return normalizeInvoice(data.invoice);
}

export function retryStripeDetails(
  invoiceId: string,
  paymentId: string,
): Promise<Invoice> {
  return retryInvoicePaymentAction(
    invoiceId,
    paymentId,
    "retry-stripe-details",
  );
}

export function retryQboPayment(
  invoiceId: string,
  paymentId: string,
): Promise<Invoice> {
  return retryInvoicePaymentAction(invoiceId, paymentId, "retry-qbo-payment");
}

export function retryQboDeposit(
  invoiceId: string,
  paymentId: string,
): Promise<Invoice> {
  return retryInvoicePaymentAction(invoiceId, paymentId, "retry-qbo-deposit");
}

export function retryPayoutSync(
  invoiceId: string,
  paymentId: string,
): Promise<Invoice> {
  return retryInvoicePaymentAction(invoiceId, paymentId, "retry-payout-sync");
}

export type InvoiceCheckoutSession = {
  clientSecret: string;
  checkoutSessionId: string;
  publishableKey: string;
};

export async function createInvoiceCheckoutSession(
  token: string,
): Promise<InvoiceCheckoutSession> {
  const data = await requestJson<{
    clientSecret?: unknown;
    checkoutSessionId?: unknown;
    publishableKey?: unknown;
  }>(`/api/invoices/public/${encodeURIComponent(token)}/checkout`, {
    method: "POST",
    authMode: "public",
    body: JSON.stringify({}),
  });
  return {
    clientSecret: normalizeString(data.clientSecret),
    checkoutSessionId: normalizeString(data.checkoutSessionId),
    publishableKey: normalizeString(data.publishableKey),
  };
}
