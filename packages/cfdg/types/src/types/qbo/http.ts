import type { QboAccount, QboAddress, QboAppSettings, QboServiceItem } from "./types";

// #region Response from QBO

/** Response type for QuickBooks Online token requests */
export type QboTokenResponse = {
  /** QuickBooks Online access token */
  accessToken?: string;
  /** QuickBooks Online refresh token */
  refreshToken?: string;
  /** Expiration time of the QuickBooks Online access token in milliseconds since epoch */
  tokenExpiresTime?: number;
  /** Expiration time of the QuickBooks Online refresh token in milliseconds since epoch */
  xRefreshTokenExpiresTime?: number;
};

/** Response type for QuickBooks Online customer requests */
export type QboCustomerResponse = {
  /** Unique identifier of the customer */
  Id?: string;
  /** Reference to the parent customer, if any */
  ParentRef?: { value?: string };
  /** Display name of the customer */
  DisplayName?: string;
  /** Fully qualified name of the customer */
  FullyQualifiedName?: string;
  /** Company name of the customer */
  CompanyName?: string;
  /** Given name of the customer */
  GivenName?: string;
  /** Family name of the customer */
  FamilyName?: string;
  /** Primary email address of the customer */
  PrimaryEmailAddr?: { Address?: string };
  /** Primary phone number of the customer */
  PrimaryPhone?: { FreeFormNumber?: string };
  /** Billing address of the customer */
  BillAddr?: QboAddress;
  /** Shipping address of the customer */
  ShipAddr?: QboAddress;
  /** Whether the customer is active */
  Active?: boolean;
  /** Sync token of the customer */
  SyncToken?: string;
  /** Whether the customer is a job */
  Job?: boolean;
  /** Metadata of the customer including last updated time. */
  MetaData?: { LastUpdatedTime?: string };
};

/** Response type for QuickBooks Online invoice requests */
export type QboInvoiceResponse = {
  /** Invoice details */
  Invoice?: {
    /** Unique identifier of the invoice */
    Id?: string;
    /** Sync token of the invoice */
    SyncToken?: string;
  };
  /** Payment details */
  Payment?: {
    /** Unique identifier of the payment */
    Id?: string;
    /** Line items of the payment */
    Line?: Array<{
      /** Unique identifier of the line item */
      Id?: string;
    }>;
  };
  /** Deposit details */
  Deposit?: {
    /** Unique identifier of the deposit */
    Id?: string;
  };
};

/** Response type for QuickBooks Online account requests */
export type QboAccountResponse = {
  /** Unique identifier of the account */
  Id?: string;
  /** Reference to the parent account, if any */
  ParentRef?: { value?: string };
  /** Name of the account */
  Name?: string;
  /** Fully qualified name of the account */
  FullyQualifiedName?: string;
  /** Type of the account */
  AccountType?: string;
  /** Subtype of the account */
  AccountSubType?: string;
  /** Classification of the account */
  Classification?: string;
  /** Whether the account is active */
  Active?: boolean;
  /** Sync token of the account */
  SyncToken?: string;
  /** Metadata of the account including last updated time */
  MetaData?: { LastUpdatedTime?: string };
};

/** Response type for QuickBooks Online item requests */
export type QboItemResponse = {
  /** Unique identifier of the item */
  Id?: string;
  /** Reference to the parent item, if any */
  ParentRef?: { value?: string };
  /** Name of the item */
  Name?: string;
  /** Fully qualified name of the item */
  FullyQualifiedName?: string;
  /** Description of the item */
  Description?: string;
  /** Type of the item */
  Type?: string;
  /** Whether the item is active */
  Active?: boolean;
  /** Sync token of the item */
  SyncToken?: string;
  /** Metadata of the item including last updated time */
  MetaData?: { LastUpdatedTime?: string };
};

/** Response type for QuickBooks Online payment method requests */
export type QboPaymentMethodResponse = {
  /** Unique identifier of the payment method */
  Id?: string;
  /** Name of the payment method */
  Name?: string;
  /** Whether the payment method is active */
  Active?: boolean;
};

// #endregion

// #region QBO Connection Internal

/** Response type for QuickBooks Online connection status */
export type QboStatusResponse = {
  /** Whether the connection to QuickBooks Online is active */
  connected: boolean;
  /** Message providing additional information about the connection status */
  message: string;
  /** QuickBooks Online app settings, if available */
  settings?: QboAppSettings;
};

/** Response Body for the QuickBooks Online options request */
export type QboOptionsResponse = {
  /** List of service items (max 100) */
  serviceItems: QboServiceItem[];
  /** List of deposit accounts and fee accounts (max 100) */
  accounts: QboAccount[];
};

// #endregion