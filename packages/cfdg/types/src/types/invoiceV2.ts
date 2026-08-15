import type { NorthstarPagination } from "./pagination";

export const V2_INVOICE_STATUSES = ["draft", "active", "paid", "void", "refunded"] as const;
export type InvoiceV2Status = (typeof V2_INVOICE_STATUSES)[number];

export const V2_INVOICE_DUE_TYPES = ["dueOnReceipt", "net30", "net45", "net60", "payWhenPaid"] as const;
export type InvoiceV2DueType = (typeof V2_INVOICE_DUE_TYPES)[number];

export const V2_INVOICE_LINE_TYPES = ["billable", "informational"] as const;
export type InvoiceV2LineType = (typeof V2_INVOICE_LINE_TYPES)[number];

export const V2_INVOICE_QBO_SYNC_STATUSES = ["notSynced", "pending", "synced", "failed", "voidSynced"] as const;
export type InvoiceV2QboSyncStatus = (typeof V2_INVOICE_QBO_SYNC_STATUSES)[number];

export type InvoiceAddressSnapshot = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
};

export type InvoiceBrandingSnapshot = {
  name: string;
  logo: string;
  address: InvoiceAddressSnapshot;
  phone: string;
};

export type InvoiceNumberingSettings = {
  invoiceTemplate: string;
  bundleTemplate: string;
  resetEachYear: boolean;
  startingSequence: number;
};

export type InvoiceLineItemV2 = {
  id: string;
  invoiceId: string;
  qboId: string;
  phaseId: string;
  lineType: InvoiceV2LineType;
  phasePath: string;
  phaseIdentifier: string;
  phaseName: string;
  description: string;
  contractCents: number;
  priorBilledCents: number;
  cumulativeBilledCents: number;
  percentComplete: number;
  amountCents: number;
  sourcePhaseUpdatedTime: string;
  sortOrder: number;
};

export type InvoiceV2 = {
  id: string;
  invoiceNumber: string;
  status: InvoiceV2Status;
  dueType: InvoiceV2DueType;
  dueDate: string;
  qboCustomerId: string;
  qboProjectId: string;
  bundleId: string;
  purchaseOrder: string;
  client: { name: string; email: string; address: InvoiceAddressSnapshot };
  project: {
    name: string;
    reference: string;
    address: InvoiceAddressSnapshot;
    managerId: string;
    managerName: string;
  };
  company: InvoiceBrandingSnapshot;
  notes: string;
  internalNotes: string;
  subtotalCents: number;
  totalCents: number;
  created: { date: string; id: string };
  activated: { date: string; id: string } | null;
  voided: { date: string; id: string } | null;
  qbo: {
    invoiceId: string;
    syncToken: string;
    status: InvoiceV2QboSyncStatus;
    message: string;
    lastSyncDate: string;
  };
  lineItems: InvoiceLineItemV2[];
};

export type InvoiceV2LineItemInput = {
  phaseId?: string | null;
  qboId?: string | null;
  lineType: InvoiceV2LineType;
  phasePath?: string;
  phaseIdentifier?: string;
  phaseName?: string;
  description: string;
  percentComplete: number;
  amountCents: number;
  sortOrder: number;
};

export type InvoiceV2CreatePayload = {
  dueType: InvoiceV2DueType;
  notes?: string;
  internalNotes?: string;
  lineItems: InvoiceV2LineItemInput[];
};

export type InvoiceV2UpdatePayload = InvoiceV2CreatePayload;

export type InvoiceV2ListResponse = {
  invoices: InvoiceV2[];
  pagination: NorthstarPagination;
};

export type InvoiceBundle = {
  id: string;
  bundleNumber: string;
  status: InvoiceV2Status;
  dueType: InvoiceV2DueType;
  dueDate: string;
  qboCustomerId: string;
  client: { name: string; email: string; address: InvoiceAddressSnapshot };
  company: InvoiceBrandingSnapshot;
  subtotalCents: number;
  totalCents: number;
  created: { date: string; id: string };
  activated: { date: string; id: string } | null;
  voided: { date: string; id: string } | null;
  invoiceIds: string[];
  invoices: InvoiceV2[];
};

export type InvoiceBundleCreatePayload = {
  qboCustomerId: string;
  dueType: InvoiceV2DueType;
  invoiceIds: string[];
};

export type InvoiceBundleUpdatePayload = {
  dueType: InvoiceV2DueType;
  invoiceIds: string[];
};

export type InvoiceBundleListResponse = {
  bundles: InvoiceBundle[];
  pagination: NorthstarPagination;
};
