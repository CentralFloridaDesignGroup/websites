import type { Address } from './common';

/** Cached QuickBooks Online customer or sub-customer used by V1 Compass workflows. */
export type QboCustomer = {
  /** Unique QuickBooks Online customer ID. */
  id: string;
  /** Parent customer ID for sub-customers and projects. */
  parentId: string;
  /** Display name shown in QuickBooks Online. */
  displayName: string;
  /** Fully qualified QuickBooks Online name. */
  fullyQualifiedName: string;
  /** Optional company name supplied by QuickBooks Online. */
  companyName: string;
  /** Optional given name supplied by QuickBooks Online. */
  givenName: string;
  /** Optional family name supplied by QuickBooks Online. */
  familyName: string;
  /** Primary email address. */
  primaryEmail: string;
  /** Primary phone number. */
  primaryPhone: string;
  /** Billing address in the V1 nested response shape. */
  billingAddress: Address;
  /** Shipping address in the V1 nested response shape. */
  shippingAddress: Address;
  /** Flattened V1 billing address line 1. */
  billAddrLine1: string;
  /** Flattened V1 billing address line 2. */
  billAddrLine2: string;
  /** Flattened V1 billing address city. */
  billAddrCity: string;
  /** Flattened V1 billing address state. */
  billAddrState: string;
  /** Flattened V1 billing postal code. */
  billAddrPostalCode: string;
  /** Flattened V1 shipping address line 1. */
  shipAddrLine1: string;
  /** Flattened V1 shipping address line 2. */
  shipAddrLine2: string;
  /** Flattened V1 shipping address city. */
  shipAddrCity: string;
  /** Flattened V1 shipping address state. */
  shipAddrState: string;
  /** Flattened V1 shipping postal code. */
  shipAddrPostalCode: string;
  /** Whether the customer is active in QuickBooks Online. */
  active: boolean;
  /** QuickBooks Online sync token. */
  syncToken: string;
  /** Timestamp of the last update in QuickBooks Online. */
  qboUpdatedTime: string;
  /** Timestamp of the most recent local sync. */
  lastSyncedDate: string;
};

/** Cached QuickBooks Online service item used by V1 invoice workflows. */
export type QboServiceItem = {
  /** Unique QuickBooks Online item ID. */
  id: string;
  /** Item display name. */
  name: string;
  /** Fully qualified item name. */
  fullyQualifiedName: string;
  /** Item description. */
  description: string;
  /** Whether the item is active. */
  active: boolean;
  /** QuickBooks Online sync token. */
  syncToken: string;
  /** Timestamp of the last update in QuickBooks Online. */
  qboUpdatedTime: string;
  /** Timestamp of the most recent local sync. */
  lastSyncedDate: string;
};

/** Cached QuickBooks Online account used by V1 payment workflows. */
export type QboAccount = {
  /** Unique QuickBooks Online account ID. */
  id: string;
  /** Account name. */
  name: string;
  /** Fully qualified account name. */
  fullyQualifiedName: string;
  /** Account type. */
  accountType: string;
  /** Account sub-type. */
  accountSubType: string;
  /** Account classification. */
  classification: string;
  /** Whether the account is active. */
  active: boolean;
  /** QuickBooks Online sync token. */
  syncToken: string;
  /** Timestamp of the last update in QuickBooks Online. */
  qboUpdatedTime: string;
  /** Timestamp of the most recent local sync. */
  lastSyncedDate: string;
};

/** QuickBooks Online connection settings used by V1 workflows. */
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
