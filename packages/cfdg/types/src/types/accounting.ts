// #region Accounting Types

import { normalizeString } from "./helpers";

/** Quickbooks sync status for record-keeping */
export type QuickbooksSyncState = {
  /** The QuickBooks invoice ID associated with the record. */
  invoiceId?: string;
  /** The QuickBooks invoice sync token for concurrency control. */
  invoiceSyncToken?: string;
  /** The QuickBooks payment ID associated with the record. */
  paymentId?: string;
  /** The QuickBooks deposit ID associated with the record. */
  depositId?: string;
  /** The latest sync status of the QuickBooks record. */
  status?: string;
  /** The message associated with the latest sync attempt. */
  message?: string;
  /** The date and time of the last sync attempt. */
  lastSyncDate?: string;
};

/** Stripe sync status for record-keeping */
export type StripeSyncState = {
  /** The Stripe Checkout Session ID associated with the record. */
  checkoutSessionId?: string;
  /** The Stripe Payment Intent ID associated with the record. */
  paymentIntentId?: string;
  /** The Stripe Charge ID associated with the record. */
  chargeId?: string;
  /** The Stripe Balance Transaction ID associated with the record. */
  balanceTransactionId?: string;
  /** The Stripe Payout ID associated with the record. */
  payoutId?: string;
  /** The Stripe Payout status associated with the record. */
  payoutStatus?: string;
  /** The date and time when the Stripe Payout was reconciled. */
  payoutReconciledDate?: string;
  /** The status of the Stripe details associated with the record. */
  detailsStatus?: string;
};

/** Notification sync status for record-keeping */
export type NotificationSyncState = {
  /** The date and time when the payment notification was sent to the accounting team. */
  accountingPaymentSentDate?: string;
  /** The date and time when the payout notification was sent to the owner. */
  payoutEmailSentDate?: string;
};

/** Accounting sync state for record-keeping */
export type AccountingSyncState = {
  /** The QuickBooks sync state associated with the record. */
  qbo?: QuickbooksSyncState;
  /** The Stripe sync state associated with the record. */
  stripe?: StripeSyncState;
  /** The notification sync state associated with the record. */
  notifications?: NotificationSyncState;
};

// #endregion

// #region D1 Storage Types

/** QuickBooks sync status for record-keeping in D1 storage */
export type QuickbooksSyncStateRow = {
  /** The QuickBooks invoice ID associated with the record. */
  invoice_id?: unknown;
  /** The QuickBooks invoice sync token for concurrency control. */
  invoice_sync_token?: unknown;
  /** The QuickBooks payment ID associated with the record. */
  payment_id?: unknown;
  /** The QuickBooks deposit ID associated with the record. */
  deposit_id?: unknown;
  /** The latest sync status of the QuickBooks record. */
  status?: unknown;
  /** The message associated with the latest sync attempt. */
  message?: unknown;
  /** The date and time of the last sync attempt. */
  last_sync_date?: unknown;
};

/** Stripe sync status for record-keeping in D1 storage */
export type StripeSyncStateRow = {
  /** The Stripe Checkout Session ID associated with the record. */
  checkout_session_id?: unknown;
  /** The Stripe Payment Intent ID associated with the record. */
  payment_intent_id?: unknown;
  /** The Stripe Charge ID associated with the record. */
  charge_id?: unknown;
  /** The Stripe Balance Transaction ID associated with the record. */
  balance_transaction_id?: unknown;
  /** The Stripe Payout ID associated with the record. */
  payout_id?: unknown;
  /** The Stripe Payout status associated with the record. */
  payout_status?: unknown;
  /** The date and time when the Stripe Payout was reconciled. */
  payout_reconciled_date?: unknown;
  /** The status of the Stripe details associated with the record. */
  details_status?: unknown;
};

/** Notification sync status for record-keeping in D1 storage */
export type NotificationSyncStateRow = {
  /** The date and time when the payment notification was sent to the accounting team. */
  accounting_payment_sent_date?: unknown;
  /** The date and time when the payout notification was sent to the owner. */
  payout_email_sent_date?: unknown;
};

/** Accounting sync state for record-keeping in D1 storage */
export type AccountingSyncStateRow = {
  /** The QuickBooks sync state associated with the record. */
  qbo?: QuickbooksSyncStateRow;
  /** The Stripe sync state associated with the record. */
  stripe?: StripeSyncStateRow;
  /** The notification sync state associated with the record. */
  notifications?: NotificationSyncStateRow;
};

// #endregion

// #region Mappers

/** 
 * Maps a QuickbooksSyncStateRow to a QuickbooksSyncState by normalizing the string values. This function is useful for converting data retrieved from D1 storage into a more usable format for application logic.
 * @param row - The QuickbooksSyncStateRow object to be mapped.
 * @returns A QuickbooksSyncState object with normalized string values.
 */
export function mapQuickbooksSyncStateRow(row: QuickbooksSyncStateRow): QuickbooksSyncState {
    return {
        invoiceId: normalizeString(row.invoice_id),
        invoiceSyncToken: normalizeString(row.invoice_sync_token),
        paymentId: normalizeString(row.payment_id),
        depositId: normalizeString(row.deposit_id),
        status: normalizeString(row.status),
        message: normalizeString(row.message),
        lastSyncDate: normalizeString(row.last_sync_date),
    }
}

/** 
 * Maps a StripeSyncStateRow to a StripeSyncState by normalizing the string values. This function is useful for converting data retrieved from D1 storage into a more usable format for application logic.
 * @param row - The StripeSyncStateRow object to be mapped.
 * @returns A StripeSyncState object with normalized string values.
 */
export function mapStripeSyncStateRow(row: StripeSyncStateRow): StripeSyncState {
    return {
        checkoutSessionId: normalizeString(row.checkout_session_id),
        paymentIntentId: normalizeString(row.payment_intent_id),
        chargeId: normalizeString(row.charge_id),
        balanceTransactionId: normalizeString(row.balance_transaction_id),
        payoutId: normalizeString(row.payout_id),
        payoutStatus: normalizeString(row.payout_status),
        payoutReconciledDate: normalizeString(row.payout_reconciled_date),
        detailsStatus: normalizeString(row.details_status),
    }
}

/** 
 * Maps a NotificationSyncStateRow to a NotificationSyncState by normalizing the string values. This function is useful for converting data retrieved from D1 storage into a more usable format for application logic.
 * @param row - The NotificationSyncStateRow object to be mapped.
 * @returns A NotificationSyncState object with normalized string values.
 */
export function mapNotificationSyncStateRow(row: NotificationSyncStateRow): NotificationSyncState {
    return {
        accountingPaymentSentDate: normalizeString(row.accounting_payment_sent_date),
        payoutEmailSentDate: normalizeString(row.payout_email_sent_date),
    }
}

export function mapAccountingSyncStateRow(row: AccountingSyncStateRow): AccountingSyncState {
    return {
        qbo: row.qbo ? mapQuickbooksSyncStateRow(row.qbo) : undefined,
        stripe: row.stripe ? mapStripeSyncStateRow(row.stripe) : undefined,
        notifications: row.notifications ? mapNotificationSyncStateRow(row.notifications) : undefined,
    }
}

// #endregion