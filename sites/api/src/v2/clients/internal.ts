import { normalizeString } from "cfdg/scripts";
import { mapQboCustomerRow } from "cfdg/types";
import type { ClientExtraData, ClientListItem, ClientStatus, Contact, NorthstarClient, NorthstarPagination, ProjectListItem } from "cfdg/types";

type UnknownRow = Record<string, unknown>;

/** Maps a cached QBO row into a Northstar client. */
export function mapClientRow(row: UnknownRow): NorthstarClient {
  return mapQboCustomerRow(row);
}

/** Maps a client list row, including its independently managed status. */
export function mapClientListRow(row: UnknownRow): ClientListItem {
  const client = mapClientRow(row);
  return {
    ...client,
    fullName: client.displayName || client.fullyQualifiedName,
    status: normalizeClientStatus(row.extra_status),
  };
}

/** Maps client extra data and applies the API's defensive default. */
export function mapClientExtraData(row: UnknownRow, qboId: string): ClientExtraData {
  return { qboId: normalizeString(row.qbo_id) || qboId, status: normalizeClientStatus(row.status), contacts: [] };
}

/** Maps a D1 client contact row into the Northstar API shape. */
export function mapClientContact(row: UnknownRow): Contact {
  return {
    id: normalizeString(row.id), name: normalizeString(row.name), email: normalizeString(row.email),
    phone: normalizeString(row.phone), title: normalizeString(row.title),
    pointOfContact: Boolean(Number(row.point_of_contact)),
    receiveInvoices: Boolean(Number(row.receive_invoices)), active: Boolean(Number(row.active)),
  };
}

/** Maps a project row embedded in a client detail response. */
export function mapClientProjectRow(row: UnknownRow): ProjectListItem {
  const project = mapQboCustomerRow(row);
  return {
    ...project,
    purchaseOrder: normalizeString(row.purchase_order),
    fullName: project.displayName || project.fullyQualifiedName,
    parentDisplayName: normalizeString(row.parent_display_name),
    status: normalizeProjectStatus(row.extra_status),
  };
}

/** Builds a paginated client response. */
export function clientListResponse(clients: ClientListItem[], pagination: NorthstarPagination) {
  return { clients, pagination };
}

function normalizeClientStatus(value: unknown): ClientStatus {
  return normalizeString(value).toLowerCase() === "inactive" ? "inactive" : "active";
}

function normalizeProjectStatus(value: unknown): ProjectListItem["status"] {
  const status = normalizeString(value).toLowerCase();
  return ["proposal", "active", "hold", "complete", "cancelled"].includes(status)
    ? status as ProjectListItem["status"]
    : "active";
}
