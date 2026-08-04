import type { Address } from './general';
import { normalizeBoolean, normalizeNumber, normalizeString } from './helpers';
import type { PROJECT_STATUSES } from '../constants/projectManagement';

// #region Project Management Types

/** Compass lifecycle status for a QuickBooks-backed project. */
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** Compass-managed lifecycle data associated with a QuickBooks project. */
export type ProjectLifecycle = {
  /** The QuickBooks Online project ID. */
  qboProjectId: string;
  /** The current Compass lifecycle status. */
  status: ProjectStatus;
  /** The date the lifecycle status was last updated. */
  updatedDate: string;
  /** The user who last updated the lifecycle status. */
  updatedBy: string;
};

/** Project-level billing defaults used when creating and sending invoices. */
export type ProjectBillingProfile = {
  /** The QuickBooks Online project ID. */
  qboProjectId: string;
  /** The purchase order number associated with the project. */
  poNumber: string;
  /** A note to include in the invoice document. */
  invoiceDocumentNote: string;
  /** The date when the project billing profile was last updated. */
  updatedDate: string;
  /** The user who last updated the project billing profile. */
  updatedBy: string;
};

/** D1 row shape for project-level billing defaults. */
export type ProjectBillingProfileRow = {
  /** The QuickBooks Online project ID. */
  qbo_project_id?: unknown;
  /** The purchase order number associated with the project. */
  po_number?: unknown;
  /** A note to include in the invoice document. */
  invoice_document_note?: unknown;
  /** The date when the project billing profile was last updated. */
  updated_date?: unknown;
  /** The user who last updated the project billing profile. */
  updated_by?: unknown;
};

/** Metadata for an R2-backed document attached to project invoice emails. */
export type ProjectInvoiceDocument = {
  /** Unique identifier for the document. */
  id: string;
  /** The QuickBooks Online project ID associated with the document. */
  qboProjectId: string;
  /** The R2 key for the document. */
  r2Key: string;
  /** The original filename of the document. */
  filename: string;
  /** The MIME type of the document. */
  contentType: string;
  /** The size of the document in bytes. */
  sizeBytes: number;
  /** Whether the document is active (included in the invoice email). */
  active: boolean;
  /** The date when the document was created. */
  createdDate: string;
  /** The user who created the document. */
  createdBy: string;
  /** The date when the document was last updated. */
  updatedDate: string;
  /** The user who last updated the document. */
  updatedBy: string;
};

/** D1 row shape for project invoice document metadata. */
export type ProjectInvoiceDocumentRow = {
  id?: unknown;
  qbo_project_id?: unknown;
  r2_key?: unknown;
  filename?: unknown;
  content_type?: unknown;
  size_bytes?: unknown;
  active?: unknown;
  created_date?: unknown;
  created_by?: unknown;
  updated_date?: unknown;
  updated_by?: unknown;
};

/** Active Entra account that is eligible for internal project assignment. */
export type EntraUserAccount = {
  /** The unique identifier for the Entra user account. */
  id: string;
  /** The display name of the Entra user account. */
  displayName: string;
  /** The email address of the Entra user account. */
  mail: string;
  /** The user principal name of the Entra user account. */
  userPrincipalName: string;
  /** Whether the Entra user account is enabled. */
  accountEnabled: boolean;
  /** The job title of the Entra user account. */
  jobTitle: string;
  /** The IDs of the groups the Entra user account belongs to. */
  groupIds: string[];
  /** The names of the groups the Entra user account belongs to. */
  groupNames: string[];
};

/** Local Compass contact tied to a QuickBooks customer/client. */
export type ClientContact = {
  /** The unique identifier for the client contact. */
  id: string;
  /** The QuickBooks Online customer ID associated with the client contact. */
  qboCustomerId: string;
  /** The name of the client contact. */
  name: string;
  /** The email address of the client contact. */
  email: string;
  /** The phone number of the client contact. */
  phone: string;
  /** The role of the client contact. */
  role: string;
  /** Whether the client contact is an invoice recipient. */
  isInvoiceRecipient: boolean;
  /** Whether the client contact is active. */
  active: boolean;
  /** Notes about the client contact. */
  notes: string;
  /** The date when the client contact was created. */
  createdDate: string;
  /** The date when the client contact was last updated. */
  updatedDate: string;
  /** The user who created the client contact. */
  createdBy: string;
  /** The user who last updated the client contact. */
  updatedBy: string;
};

/** D1 row shape for local Compass client contacts. */
export type ClientContactRow = {
  /** The unique identifier for the client contact. */
  id?: unknown;
  /** The QuickBooks Online customer ID associated with the client contact. */
  qbo_customer_id?: unknown;
  /** The name of the client contact. */
  name?: unknown;
  /** The email address of the client contact. */
  email?: unknown;
  /** The phone number of the client contact. */
  phone?: unknown;
  /** The role of the client contact. */
  role?: unknown;
  /** Whether the client contact is an invoice recipient. */
  is_invoice_recipient?: unknown;
  /** Whether the client contact is active. */
  active?: unknown;
  /** Notes about the client contact. */
  notes?: unknown;
  /** The date when the client contact was created. */
  created_date?: unknown;
  /** The date when the client contact was last updated. */
  updated_date?: unknown;
  /** The user who created the client contact. */
  created_by?: unknown;
  /** The user who last updated the client contact. */
  updated_by?: unknown;
};

/** Internal project manager copied on outbound project invoice emails. */
export type ProjectManager = {
  /** The QuickBooks Online project ID associated with the project manager. */
  qboProjectId: string;
  /** The name of the project manager. */
  managerName: string;
  /** The email address of the project manager. */
  managerEmail: string;
  /** The date when the project manager record was last updated. */
  updatedDate: string;
  /** The user who last updated the project manager record. */
  updatedBy: string;
};

/** D1 row shape for internal project manager records. */
export type ProjectManagerRow = {
  /** The QuickBooks Online project ID associated with the project manager. */
  qbo_project_id?: unknown;
  /** The name of the project manager. */
  manager_name?: unknown;
  /** The email address of the project manager. */
  manager_email?: unknown;
  /** The date when the project manager record was last updated. */
  updated_date?: unknown;
  /** The user who last updated the project manager record. */
  updated_by?: unknown;
};

// #endregion

// #region Project Management Mappers

/** 
 * Maps a D1 client contact row to the shared API type. 
 * @param row - The D1 client contact row to map.
 * @returns The mapped ClientContact object.
 */
export function mapClientContactRow(row: ClientContactRow): ClientContact {
  return {
    id: normalizeString(row.id),
    qboCustomerId: normalizeString(row.qbo_customer_id),
    name: normalizeString(row.name),
    email: normalizeString(row.email),
    phone: normalizeString(row.phone),
    role: normalizeString(row.role),
    isInvoiceRecipient: normalizeBoolean(row.is_invoice_recipient),
    active: normalizeBoolean(row.active),
    notes: normalizeString(row.notes),
    createdDate: normalizeString(row.created_date),
    updatedDate: normalizeString(row.updated_date),
    createdBy: normalizeString(row.created_by),
    updatedBy: normalizeString(row.updated_by),
  };
}

/** 
 * Maps a D1 project manager row to the shared API type. 
 * @param row - The D1 project manager row to map.
 * @returns The mapped ProjectManager object, or null if the row is invalid.
 */
export function mapProjectManagerRow(row: ProjectManagerRow | null | undefined): ProjectManager | null {
  if (!row) return null;
  const qboProjectId = normalizeString(row.qbo_project_id);
  const managerEmail = normalizeString(row.manager_email);
  if (!qboProjectId || !managerEmail) return null;
  return {
    qboProjectId,
    managerName: normalizeString(row.manager_name),
    managerEmail,
    updatedDate: normalizeString(row.updated_date),
    updatedBy: normalizeString(row.updated_by),
  };
}

/** 
 * Maps a D1 project billing profile row to the shared API type. 
 * @param row - The D1 project billing profile row to map.
 * @param qboProjectId - The QuickBooks Online project ID to use if the row does not have one.
 * @returns The mapped ProjectBillingProfile object.
 */
export function mapProjectBillingProfileRow(row: ProjectBillingProfileRow | null | undefined, qboProjectId = ''): ProjectBillingProfile {
  return {
    qboProjectId: normalizeString(row?.qbo_project_id) || qboProjectId,
    poNumber: normalizeString(row?.po_number),
    invoiceDocumentNote: normalizeString(row?.invoice_document_note),
    updatedDate: normalizeString(row?.updated_date),
    updatedBy: normalizeString(row?.updated_by),
  };
}

/** 
 * Maps a D1 project invoice document row to the shared API type. 
 * @param row - The D1 project invoice document row to map.
 * @returns The mapped ProjectInvoiceDocument object.
 */
export function mapProjectInvoiceDocumentRow(row: ProjectInvoiceDocumentRow): ProjectInvoiceDocument {
  return {
    id: normalizeString(row.id),
    qboProjectId: normalizeString(row.qbo_project_id),
    r2Key: normalizeString(row.r2_key),
    filename: normalizeString(row.filename),
    contentType: normalizeString(row.content_type),
    sizeBytes: normalizeNumber(row.size_bytes),
    active: normalizeBoolean(row.active),
    createdDate: normalizeString(row.created_date),
    createdBy: normalizeString(row.created_by),
    updatedDate: normalizeString(row.updated_date),
    updatedBy: normalizeString(row.updated_by),
  };
}

// #endregion

// #region Project Management Payloads

/** Definition for a top-level QuickBooks customer/client. */
export type ClientPayload = {
  /** Display name value */
  name: string;
  /** Physical address of the client. */
  address: Address;
  /** Phone number of the client. */
  phone: string;
  /** Email address of the client. */
  email: string;
};

/** Payload for creating a top-level QuickBooks customer/client. */
export type ClientCreatePayload = ClientPayload;

/** Payload for updating a top-level QuickBooks customer/client. */
export type ClientUpdatePayload = ClientPayload;

/** Shared Compass project fields, excluding person-specific contact information. */
export type ProjectPayload = Pick<ClientPayload, 'name' | 'address'> & {
  /** Parcel identification number for the project property. */
  parcelId: string;
};

/** Definition for creating a QuickBooks sub-customer/project. */
export type ProjectCreatePayload = ProjectPayload & {
  parentCustomerId: string;
};

/** Payload for updating a QuickBooks sub-customer/project and its parent client. */
export type ProjectUpdatePayload = ProjectPayload & {
  parentCustomerId: string;
};

/** 
 * Payload for moving a QuickBooks sub-customer/project under a different client. The parentCustomerId specifies the new parent client.
 * @comment The current project ID is implied by the endpoint being called, so it is not included in this payload.
 */
export type ProjectMovePayload = {
  parentCustomerId: string;
};

// #endregion
