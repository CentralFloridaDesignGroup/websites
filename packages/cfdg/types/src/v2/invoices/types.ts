// #region Imports

import { Address } from "../common";

// #endregion

// #region Line Item Types

export type InvoiceLineItemType = "billable" | "informational";

/** Accounting details for an invoice line item */
export type InvoiceLineItemAccounting = {
  /** Contract cost at the time of invoice. */
  contractCents: number;
  /** Amount previously billed for this line item. */
  priorBilledCents: number;
  /** Cumulative amount billed for this line item. */
  cumulativeBilledCents: number;
  /** Percent complete for this line item. */
  percentComplete: number;
  /** Amount due for this line item. */
  amountDueCents: number;
};

/** An invoice line item */
export type InvoiceLineItem = {
  /** Unique identifier for the invoice line item. */
  id: string;
  /** Identifier for the associated phase. */
  phaseId: string;
  /** Type of the invoice line item. */
  type: InvoiceLineItemType;
  /** Path of the associated phase. */
  phasePath: string;
  /** Identifier of the associated phase. */
  phaseIdentifier: string;
  /** Name of the invoice line item. */
  name: string;
  /** Description of the invoice line item. */
  description: string;
  /** Accounting details for the invoice line item. */
  accounting: InvoiceLineItemAccounting;
  /** Sort order of the invoice line item. */
  sortOrder: number;
  /** Creation time of the invoice line item. */
  createdTime: string;
  /** Last updated time of the invoice line item. */
  updatedTime: string;
  /** Identifier of the user who created the invoice line item. */
  createdBy: string;
  /** Identifier of the user who last updated the invoice line item. */
  updatedBy: string;
};

// #endregion

// #region Invoice Types

export type InvoiceStatus = "draft" | "active" | "paid" | "void" | "refunded";

export type InvoicePaymentTerm =
  | "dueOnReceipt"
  | "net30"
  | "net45"
  | "net60"
  | "payWhenPaid";

export type InvoiceQboSyncStatus =
  | "notSynced"
  | "pending"
  | "synced"
  | "failed"
  | "voidSynced";

/** Company information for an invoice snapshot */
export type CompanyInvoiceInfo = Address & {
  /** Name of the company. */
  name: string;
  /** Email address of the company. */
  email: string;
  /** Phone number of the company. */
  phone: string;
};

/** Client information for an invoice snapshot */
export type ClientInvoiceInfo = Address & {
  /** Name of the client. */
  name: string;
  /** Primary contact name for the client. */
  contactName: string;
};

/** Project information for an invoice snapshot */
export type ProjectInvoiceInfo = Address & {
  /** Name of the project. */
  name: string;
  /** Number of the project. */
  projectId: string;
  /** Purchase order number for the project. */
  poNumber: string;
};

/** An invoice */
export type Invoice = {
  /** Unique identifier for the invoice. */
  id: string;
  /** Invoice number or identifier. */
  invoiceId: string;
  /** Identifier of the project associated with the invoice. */
  projectId: string;
  /** Identifier of the client associated with the invoice. */
  clientId: string;
  /** Status of the invoice. */
  status: InvoiceStatus;
  /** Payment terms for the invoice. */
  paymentTerm: InvoicePaymentTerm;
  /** Client information for the invoice. */
  clientInfo: ClientInvoiceInfo;
  /** Company information for the invoice. */
  companyInfo: CompanyInvoiceInfo;
  /** Project information for the invoice. */
  projectInfo: ProjectInvoiceInfo;
  /** Project manager for the invoice. */
  projectManager: string;
  /** Public notes for the invoice. */
  publicNotes: string;
  /** Private notes for the invoice. */
  privateNotes: string;
  /** Subtotal amount for the invoice in cents. */
  subtotalCents: number;
  /** Total amount for the invoice in cents. */
  totalCents: number;
  /** Discount amount for the invoice in cents. */
  discountCents: number;
  /** Creation timestamp for the invoice. */
  createdAt: string;
  /** Identifier of the user who created the invoice. */
  createdBy: string;
  /** Activation timestamp for the invoice. */
  activatedAt: string;
  /** Closure timestamp for the invoice. */
  closedAt: string;
  /** Due date for the invoice, if applicable. */
  dueAt: string | null;
  /** Last update timestamp for the invoice. */
  updatedAt: string;
  /** Identifier of the user who last updated the invoice. */
  updatedBy: string;
  /** QuickBooks Online sync status for the invoice. */
  qboSyncStatus: InvoiceQboSyncStatus;
  /** QuickBooks Online invoice ID for the invoice, if applicable. */
  qboInvoiceId: string | null;
  /** QuickBooks Online sync token for the invoice, if applicable. */
  qboSyncToken: string | null;
  /** QuickBooks Online sync message for the invoice, if applicable. */
  qboSyncMessage: string | null;
  /** Timestamp of the last QuickBooks Online sync for the invoice, if applicable. */
  qboLastSyncedAt: string | null;
  /** Array of line items for the invoice. */
  lineItems: InvoiceLineItem[];
};

// #endregion

// #region Invoice Bundle Types

export type InvoiceBundle = {
  /** Unique identifier for the invoice bundle. */
  id: string;
  /** Identifier of the client associated with the invoice bundle. */
  clientId: string;
  /** Unique identifier for the invoice bundle. */
  bundleId: string;
  /** Status of the invoice bundle. */
  status: InvoiceStatus;
  /** Payment terms for the invoice bundle. */
  paymentTerm: InvoicePaymentTerm;
  /** Client information for the invoice bundle. */
  clientInfo: ClientInvoiceInfo;
  /** Company information for the invoice bundle. */
  companyInfo: CompanyInvoiceInfo;
  /** Subtotal amount for the invoice bundle in cents. */
  subtotalCents: number;
  /** Total amount for the invoice bundle in cents. */
  totalCents: number;
  /** Discount amount for the invoice bundle in cents. */
  discountCents: number;
  /** Creation timestamp for the invoice bundle. */
  createdAt: string;
  /** Identifier of the user who created the invoice bundle. */
  createdBy: string;
  /** Activation timestamp for the invoice bundle. */
  activatedAt: string;
  /** Closure timestamp for the invoice bundle. */
  closedAt: string;
  /** Due date for the invoice bundle, if applicable. */
  dueAt: string | null;
  /** Last update timestamp for the invoice bundle. */
  updatedAt: string;
  /** Identifier of the user who last updated the invoice bundle. */
  updatedBy: string;
};
// #endregion
