/** Entra group object IDs allowed to use Project Management tools. Add IDs here as access expands. */
export const PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS: string[] = ["1cb77436-5086-490c-8b77-49056339667b", "51ad0458-eb18-4f00-a829-6e8b6d4636e6"];

/** Entra group object ID for users eligible to be assigned as internal project managers. */
export const PROJECT_MANAGER_GROUP_ID = '51ad0458-eb18-4f00-a829-6e8b6d4636e6';

/** Fallback Entra group display name used when PROJECT_MANAGER_GROUP_ID is not configured. */
export const PROJECT_MANAGER_GROUP_DISPLAY_NAME = 'Project Manager';

/** Required address fields for creating QuickBooks clients and projects from Compass. */
export type ProjectManagementAddressPayload = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
};

/** Payload for creating a top-level QuickBooks customer/client. */
export type ClientCreatePayload = {
  name: string;
  address: ProjectManagementAddressPayload;
  phone: string;
  email: string;
};

/** Payload for updating a top-level QuickBooks customer/client. */
export type ClientUpdatePayload = ClientCreatePayload;

/** Payload for creating a QuickBooks sub-customer/project. */
export type ProjectCreatePayload = {
  parentCustomerId: string;
  name: string;
  address: ProjectManagementAddressPayload;
  phone: string;
  email: string;
};

/** Payload for updating a QuickBooks sub-customer/project without moving it. */
export type ProjectUpdatePayload = Omit<ProjectCreatePayload, 'parentCustomerId'>;

/** Payload for moving a QuickBooks sub-customer/project under a different client. */
export type ProjectMovePayload = {
  parentCustomerId: string;
};

/** Project-level billing defaults used when creating and sending invoices. */
export type ProjectBillingProfile = {
  qboProjectId: string;
  poNumber: string;
  invoiceDocumentNote: string;
  updatedDate: string;
  updatedBy: string;
};

/** D1 row shape for project-level billing defaults. */
export type ProjectBillingProfileRow = {
  qbo_project_id?: unknown;
  po_number?: unknown;
  invoice_document_note?: unknown;
  updated_date?: unknown;
  updated_by?: unknown;
};

/** Metadata for an R2-backed document attached to project invoice emails. */
export type ProjectInvoiceDocument = {
  id: string;
  qboProjectId: string;
  r2Key: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  active: boolean;
  createdDate: string;
  createdBy: string;
  updatedDate: string;
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
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  accountEnabled: boolean;
  jobTitle: string;
  groupIds: string[];
  groupNames: string[];
};

/** Local Compass contact tied to a QuickBooks customer/client. */
export type ClientContact = {
  id: string;
  qboCustomerId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isInvoiceRecipient: boolean;
  active: boolean;
  notes: string;
  createdDate: string;
  updatedDate: string;
  createdBy: string;
  updatedBy: string;
};

/** D1 row shape for local Compass client contacts. */
export type ClientContactRow = {
  id?: unknown;
  qbo_customer_id?: unknown;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  role?: unknown;
  is_invoice_recipient?: unknown;
  active?: unknown;
  notes?: unknown;
  created_date?: unknown;
  updated_date?: unknown;
  created_by?: unknown;
  updated_by?: unknown;
};

/** Internal project manager copied on outbound project invoice emails. */
export type ProjectManager = {
  qboProjectId: string;
  managerName: string;
  managerEmail: string;
  updatedDate: string;
  updatedBy: string;
};

/** D1 row shape for internal project manager records. */
export type ProjectManagerRow = {
  qbo_project_id?: unknown;
  manager_name?: unknown;
  manager_email?: unknown;
  updated_date?: unknown;
  updated_by?: unknown;
};

function normalizeString(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeBool(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

function normalizeNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Maps a D1 client contact row to the shared API type. */
export function mapClientContactRow(row: ClientContactRow): ClientContact {
  return {
    id: normalizeString(row.id),
    qboCustomerId: normalizeString(row.qbo_customer_id),
    name: normalizeString(row.name),
    email: normalizeString(row.email),
    phone: normalizeString(row.phone),
    role: normalizeString(row.role),
    isInvoiceRecipient: normalizeBool(row.is_invoice_recipient),
    active: normalizeBool(row.active),
    notes: normalizeString(row.notes),
    createdDate: normalizeString(row.created_date),
    updatedDate: normalizeString(row.updated_date),
    createdBy: normalizeString(row.created_by),
    updatedBy: normalizeString(row.updated_by),
  };
}

/** Maps a D1 project manager row to the shared API type. */
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

/** Maps a D1 project billing profile row to the shared API type. */
export function mapProjectBillingProfileRow(row: ProjectBillingProfileRow | null | undefined, qboProjectId = ''): ProjectBillingProfile {
  return {
    qboProjectId: normalizeString(row?.qbo_project_id) || qboProjectId,
    poNumber: normalizeString(row?.po_number),
    invoiceDocumentNote: normalizeString(row?.invoice_document_note),
    updatedDate: normalizeString(row?.updated_date),
    updatedBy: normalizeString(row?.updated_by),
  };
}

/** Maps a D1 project invoice document row to the shared API type. */
export function mapProjectInvoiceDocumentRow(row: ProjectInvoiceDocumentRow): ProjectInvoiceDocument {
  return {
    id: normalizeString(row.id),
    qboProjectId: normalizeString(row.qbo_project_id),
    r2Key: normalizeString(row.r2_key),
    filename: normalizeString(row.filename),
    contentType: normalizeString(row.content_type),
    sizeBytes: normalizeNumber(row.size_bytes),
    active: normalizeBool(row.active),
    createdDate: normalizeString(row.created_date),
    createdBy: normalizeString(row.created_by),
    updatedDate: normalizeString(row.updated_date),
    updatedBy: normalizeString(row.updated_by),
  };
}
