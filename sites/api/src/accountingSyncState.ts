import { compactRecord, normalizeString } from "cfdg/scripts";
import type { AccountingSyncState } from "cfdg/types/v1";

/**
 * Serializes accounting sync state after removing empty branches and values. Used for storing the state in a compact JSON format in D1.
 * @param state - The accounting sync state to serialize.
 * @returns A JSON string representation of the compacted accounting sync state.
 * @example
 * ```ts
 * const state: AccountingSyncState = {
 *  qbo: { invoiceId: '123', status: 'synced' },
 *  stripe: { checkoutSessionId: 'abc', payoutStatus: 'pending' },
 *  notifications: { accountingPaymentSentDate: '2024-01-01T00:00:00Z' }
 * }
 * const serializedState = serializeAccountingSyncState(state)
 * // serializedState will be a JSON string with only the non-empty branches and values
 * ```
 */
export function serializeAccountingSyncState(
  state: AccountingSyncState,
): string {
  const compacted: AccountingSyncState = {};
  const qbo = compactRecord(state.qbo || {});
  const stripe = compactRecord(state.stripe || {});
  const notifications = compactRecord(state.notifications || {});
  if (Object.keys(qbo).length > 0) compacted.qbo = qbo;
  if (Object.keys(stripe).length > 0) compacted.stripe = stripe;
  if (Object.keys(notifications).length > 0)
    compacted.notifications = notifications;
  return JSON.stringify(compacted);
}

/** Builds the invoice-level accounting state JSON from the current legacy columns.
 * @deprecated Future development should use the more comprehensive `paymentSyncState` function for handling accounting sync state, as it includes additional fields and better reflects the current data model.
 */
export function invoiceSyncState(input: {
  qboInvoiceId?: unknown;
  qboInvoiceSyncToken?: unknown;
  qboPaymentId?: unknown;
  qboStatus?: unknown;
  qboMessage?: unknown;
  qboLastSyncDate?: unknown;
  stripeCheckoutSessionId?: unknown;
  stripePaymentIntentId?: unknown;
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
  });
}

/** Builds the payment-level accounting state JSON from the current legacy columns.
 * @deprecated Future development should use the more comprehensive `paymentSyncState` function for handling accounting sync state, as it includes additional fields and better reflects the current data model.
 */
export function paymentSyncState(input: {
  qboPaymentId?: unknown;
  qboDepositId?: unknown;
  qboStatus?: unknown;
  qboMessage?: unknown;
  qboLastSyncDate?: unknown;
  stripeCheckoutSessionId?: unknown;
  stripePaymentIntentId?: unknown;
  stripeChargeId?: unknown;
  stripeBalanceTransactionId?: unknown;
  stripePayoutId?: unknown;
  stripePayoutStatus?: unknown;
  stripePayoutReconciledDate?: unknown;
  stripeDetailsStatus?: unknown;
  accountingNotificationSentDate?: unknown;
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
      accountingPaymentSentDate: normalizeString(
        input.accountingNotificationSentDate,
      ),
    },
  });
}

/** Builds the Stripe payout-level accounting state JSON from the current legacy columns.
 * @deprecated Future development should use the more comprehensive `paymentSyncState` function for handling accounting sync state, as it includes additional fields and better reflects the current data model.
 */
export function payoutSyncState(input: {
  payoutStatus?: unknown;
  qboDepositId?: unknown;
  qboStatus?: unknown;
  qboMessage?: unknown;
  qboLastSyncDate?: unknown;
  payoutEmailSentDate?: unknown;
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
  });
}
