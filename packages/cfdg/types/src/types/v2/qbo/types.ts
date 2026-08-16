import { Address } from "../../common";

/** Cached QuickBooks Online customer or sub-customer used by Compass forms. */
export type QboCustomer = {
  /** Unique identifier of the customer */
  id: string;
  /** Unique identifier of the parent customer, if applicable */
  parentId: string;
  /** Display name of the customer. */
  displayName: string;
  /** Fully qualified name of the customer. Typically includes the parent customer's name if applicable */
  fullyQualifiedName: string;
  /** Billing address of the customer */
  billingAddress: Address;
  /** Shipping address of the customer */
  shippingAddress: Address;
  /** Whether the customer is active */
  active: boolean;
  /** Sync token of the customer */
  syncToken: string;
  /** Last updated time of the customer in QuickBooks Online */
  qboUpdatedTime: string;
  /** Last synced date of the customer in the local system */
  lastSyncedDate: string;
};

/** Cached QuickBooks Online address used for customers, billing, and shipping. */
export type QboAddress = {
  /** First line of the address */
  line1?: string;
  /** Second line of the address */
  line2?: string;
  /** City of the address */
  city?: string;
  /** State or province code of the address */
  CountrySubDivisionCode?: string;
  /** Postal code of the address */
  postalCode?: string;
};

/** Quickbooks Reference Item to be stored */
export type QboReferenceItem = {
  /** The ID of the selected reference (e.g., service item or account) */
  id: string;
  /** The name of the selected reference */
  name: string;
  /** The fully qualified name of the selected reference */
  fullyQualifiedName: string;
  /** Whether the selected reference is active */
  active: boolean;
  /** The sync token from QuickBooks Online, if this reference came from a cached QBO record */
  syncToken?: string;
  /** Last updated time from QuickBooks Online, if this reference came from a cached QBO record */
  qboUpdatedTime?: string;
  /** Local sync date, if this reference came from a cached QBO record */
  lastSyncedDate?: string;
  /** The date when the reference was selected */
  selectedDate?: string;
};

/** Cached QuickBooks Online service item used for invoice line sync. */
export type QboServiceItem = QboReferenceItem & {
  /** Description of the service item */
  description: string;
};

/** Cached QuickBooks Online account used for payment deposits and fee accounting. */
export type QboAccount = QboReferenceItem & {
  accountType: string;
  /** Sub-type of the account */
  accountSubType: string;
  /** Classification of the account */
  classification: string;
};

/** QuickBooks Online settings for the connected company. Only used internally in API. Use {@link QboAppSettings} for most cases. */
export type QboSettings = {
  /** Schema version of the QuickBooks Online settings */
  schemaVersion: 1;

  /** Connection details for the QuickBooks Online company */
  connection: {
    /** Realm ID of the connected QuickBooks Online company */
    realmId: string;
    /** Environment of the connected QuickBooks Online company */
    environment: "production" | "sandbox";
    /** Date when the connection to QuickBooks Online was established */
    connectedDate: string;
    /** Date when the connection details were last updated */
    updatedDate: string;
  };

  /** OAuth tokens and expiration dates for the QuickBooks Online connection */
  oauth: {
    /** Access token for the QuickBooks Online connection */
    accessToken: string;
    /** Refresh token for the QuickBooks Online connection */
    refreshToken: string;
    /** Expiration date of the access token */
    tokenExpiresDate: string;
    /** Expiration date of the refresh token */
    refreshExpiresDate: string;
  };

  /** Accounting defaults for the QuickBooks Online connection */
  accountingDefaults: {
    /** Default service item for invoices. */
    serviceItem: QboServiceItem | null;
    /** Default deposit account for payments */
    depositAccount: QboAccount | null;
    /** Default expense account for Stripe fees */
    stripeFeeExpenseAccount: QboAccount | null;
  };

  /** Date of the most recent successful customer pull into Northstar. */
  lastCustomerPullDate?: string;
};

/** QuickBooks Online app settings, excluding OAuth tokens. Use in most cases. */
export type QboAppSettings = {
  schemaVersion: QboSettings["schemaVersion"];
  connection: QboSettings["connection"];
  accountingDefaults: QboSettings["accountingDefaults"];
  /** Date of the most recent successful customer pull into Northstar. */
  lastCustomerPullDate?: string;
};
