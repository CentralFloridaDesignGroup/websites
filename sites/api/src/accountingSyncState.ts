/** QuickBooks identifiers and status mirrored from the legacy sync columns. */
export type QboSyncState = {
  invoiceId?: string
  invoiceSyncToken?: string
  paymentId?: string
  depositId?: string
  status?: string
  message?: string
  lastSyncDate?: string
}

/** Stripe identifiers and status used to repair payments or payout reconciliation. */
export type StripeSyncState = {
  checkoutSessionId?: string
  paymentIntentId?: string
  chargeId?: string
  balanceTransactionId?: string
  payoutId?: string
  payoutStatus?: string
  payoutReconciledDate?: string
  detailsStatus?: string
}

/** Notification send markers that must stay idempotent across webhook replays. */
export type NotificationSyncState = {
  accountingPaymentSentDate?: string
  payoutEmailSentDate?: string
}

export type AccountingSyncState = {
  qbo?: QboSyncState
  stripe?: StripeSyncState
  notifications?: NotificationSyncState
}

function normalizeString(value: unknown): string {
  return String(value ?? '').trim()
}

function compactRecord<T extends Record<string, unknown>>(record: T): Partial<T> {
  const compacted: Partial<T> = {}
  for (const [key, value] of Object.entries(record)) {
    if (value !== undefined && value !== null && value !== '') {
      compacted[key as keyof T] = value as T[keyof T]
    }
  }
  return compacted
}

/** Serializes accounting sync state after removing empty branches and values. */
export function serializeAccountingSyncState(state: AccountingSyncState): string {
  const compacted: AccountingSyncState = {}
  const qbo = compactRecord(state.qbo || {})
  const stripe = compactRecord(state.stripe || {})
  const notifications = compactRecord(state.notifications || {})
  if (Object.keys(qbo).length > 0) compacted.qbo = qbo
  if (Object.keys(stripe).length > 0) compacted.stripe = stripe
  if (Object.keys(notifications).length > 0) compacted.notifications = notifications
  return JSON.stringify(compacted)
}

/** Builds the invoice-level accounting state JSON from the current legacy columns. */
export function invoiceSyncState(input: {
  qboInvoiceId?: unknown
  qboInvoiceSyncToken?: unknown
  qboPaymentId?: unknown
  qboStatus?: unknown
  qboMessage?: unknown
  qboLastSyncDate?: unknown
  stripeCheckoutSessionId?: unknown
  stripePaymentIntentId?: unknown
}): string {
  return serializeAccountingSyncState({
    qbo: {
      invoiceId: normalizeString(input.qboInvoiceId),
      invoiceSyncToken: normalizeString(input.qboInvoiceSyncToken),
      paymentId: normalizeString(input.qboPaymentId),
      status: normalizeString(input.qboStatus),
      message: normalizeString(input.qboMessage),
      lastSyncDate: normalizeString(input.qboLastSyncDate),
    },
    stripe: {
      checkoutSessionId: normalizeString(input.stripeCheckoutSessionId),
      paymentIntentId: normalizeString(input.stripePaymentIntentId),
    },
  })
}

/** Builds the payment-level accounting state JSON from the current legacy columns. */
export function paymentSyncState(input: {
  qboPaymentId?: unknown
  qboDepositId?: unknown
  qboStatus?: unknown
  qboMessage?: unknown
  qboLastSyncDate?: unknown
  stripeCheckoutSessionId?: unknown
  stripePaymentIntentId?: unknown
  stripeChargeId?: unknown
  stripeBalanceTransactionId?: unknown
  stripePayoutId?: unknown
  stripePayoutStatus?: unknown
  stripePayoutReconciledDate?: unknown
  stripeDetailsStatus?: unknown
  accountingNotificationSentDate?: unknown
}): string {
  return serializeAccountingSyncState({
    qbo: {
      paymentId: normalizeString(input.qboPaymentId),
      depositId: normalizeString(input.qboDepositId),
      status: normalizeString(input.qboStatus),
      message: normalizeString(input.qboMessage),
      lastSyncDate: normalizeString(input.qboLastSyncDate),
    },
    stripe: {
      checkoutSessionId: normalizeString(input.stripeCheckoutSessionId),
      paymentIntentId: normalizeString(input.stripePaymentIntentId),
      chargeId: normalizeString(input.stripeChargeId),
      balanceTransactionId: normalizeString(input.stripeBalanceTransactionId),
      payoutId: normalizeString(input.stripePayoutId),
      payoutStatus: normalizeString(input.stripePayoutStatus),
      payoutReconciledDate: normalizeString(input.stripePayoutReconciledDate),
      detailsStatus: normalizeString(input.stripeDetailsStatus),
    },
    notifications: {
      accountingPaymentSentDate: normalizeString(input.accountingNotificationSentDate),
    },
  })
}

/** Builds the Stripe payout-level accounting state JSON from the current legacy columns. */
export function payoutSyncState(input: {
  payoutStatus?: unknown
  qboDepositId?: unknown
  qboStatus?: unknown
  qboMessage?: unknown
  qboLastSyncDate?: unknown
  payoutEmailSentDate?: unknown
}): string {
  return serializeAccountingSyncState({
    stripe: {
      payoutStatus: normalizeString(input.payoutStatus),
    },
    qbo: {
      depositId: normalizeString(input.qboDepositId),
      status: normalizeString(input.qboStatus),
      message: normalizeString(input.qboMessage),
      lastSyncDate: normalizeString(input.qboLastSyncDate),
    },
    notifications: {
      payoutEmailSentDate: normalizeString(input.payoutEmailSentDate),
    },
  })
}
