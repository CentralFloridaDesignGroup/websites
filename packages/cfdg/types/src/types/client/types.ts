import type { QboCustomer } from "../qbo/types";
import type { NorthstarPagination } from "../pagination";

/** Status stored in client extra data. */
export type ClientStatus = "active" | "inactive" | "suspended" | "prospect" | "archived";

/** Northstar client extra data stored separately from the QBO cache. */
export type ClientExtraData = {
  /** QBO customer ID shared with the base record. */
  qboId: string;
  /** Internal client status. */
  status: ClientStatus;
};

export type Client = QboCustomer & {
  extraData: ClientExtraData;
  status: ClientStatus;
}

/** Base QBO customer record used by Northstar client detail views. */
export type NorthstarClient = QboCustomer;

/** Client row returned by the paginated Northstar list endpoint. */
export type ClientListItem = QboCustomer & {
  fullName: string;
  status: ClientStatus;
};

/** Client list response returned by the Northstar API. */
export type ClientListResponse = {
  clients: ClientListItem[];
  pagination: NorthstarPagination;
};

/** Client extra-data row shape as returned by D1. */
export type ClientExtraDataRow = {
  qbo_id?: unknown;
  status?: unknown;
};
