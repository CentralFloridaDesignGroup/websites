/** Cached QuickBooks Online customer or sub-customer used by Compass forms. */
export type QboCustomer = {
  id: string;
  parentId: string;
  displayName: string;
  fullyQualifiedName: string;
  companyName: string;
  givenName: string;
  familyName: string;
  primaryEmail: string;
  primaryPhone: string;
  billAddrLine1: string;
  billAddrLine2: string;
  billAddrCity: string;
  billAddrState: string;
  billAddrPostalCode: string;
  shipAddrLine1: string;
  shipAddrLine2: string;
  shipAddrCity: string;
  shipAddrState: string;
  shipAddrPostalCode: string;
  active: boolean;
  syncToken: string;
  qboUpdatedTime: string;
  lastSyncedDate: string;
};

/** Local sync status for the connected QuickBooks Online company. */
export type QboConnectionStatus = {
  connected: boolean;
  realmId: string;
  environment: string;
  lastCustomerSyncDate: string;
  lastItemSyncDate: string;
  lastAccountSyncDate: string;
  tokenExpiresDate: string;
  defaultServiceItemId: string;
  defaultServiceItemName: string;
  defaultDepositAccountId: string;
  defaultDepositAccountName: string;
  stripeFeeExpenseAccountId: string;
  stripeFeeExpenseAccountName: string;
};

/** Cached QuickBooks Online service item used for invoice line sync. */
export type QboServiceItem = {
  id: string;
  name: string;
  fullyQualifiedName: string;
  description: string;
  active: boolean;
  syncToken: string;
  qboUpdatedTime: string;
  lastSyncedDate: string;
};

/** Cached QuickBooks Online account used for payment deposits and fee accounting. */
export type QboAccount = {
  id: string;
  name: string;
  fullyQualifiedName: string;
  accountType: string;
  accountSubType: string;
  classification: string;
  active: boolean;
  syncToken: string;
  qboUpdatedTime: string;
  lastSyncedDate: string;
};
