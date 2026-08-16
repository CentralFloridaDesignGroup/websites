export type QboConnectionStatus = {
  /** Whether the connection to QuickBooks Online is established */
  connected: boolean;
  /** Realm ID of the connected QuickBooks Online company */
  realmId: string;
  /** Environment of the connected QuickBooks Online company */
  environment: string;
  /** Last date when customers were synced */
  lastCustomerSyncDate: string;
  /** Last date when items were synced */
  lastItemSyncDate: string;
  /** Last date when accounts were synced */
  lastAccountSyncDate: string;
  /** Expiration date of the QuickBooks Online access token */
  tokenExpiresDate: string;
  /** Default service item ID for invoices */
  defaultServiceItemId: string;
  /** Default service item name for invoices */
  defaultServiceItemName: string;
  /** Default deposit account ID for payments */
  defaultDepositAccountId: string;
  /** Default deposit account name for payments */
  defaultDepositAccountName: string;
  /** Stripe fee expense account ID */
  stripeFeeExpenseAccountId: string;
  /** Stripe fee expense account name */
  stripeFeeExpenseAccountName: string;
};