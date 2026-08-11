import type { QboCustomer } from "../qbo/types";
import type { ProjectStatus } from "../projectManagement";
import type { NorthstarPagination } from "../pagination";

/** Northstar project record backed by a child QBO customer. */
export type NorthstarProject = QboCustomer;

/** Northstar project extra data stored separately from the QBO cache. */
export type ProjectExtraData = {
  /** QBO project ID shared with the base record. */
  qboId: string;
  /** Internal project lifecycle status. */
  status: ProjectStatus;
};

/** Project row returned by a paginated list endpoint. */
export type ProjectListItem = NorthstarProject & {
  /** Display name used for list presentation and sorting. */
  fullName: string;
  /** Display name of the linked client. */
  parentDisplayName: string;
  /** Internal project lifecycle status. */
  status: ProjectStatus;
};

/** Project list response returned by the Northstar API. */
export type ProjectListResponse = {
  projects: ProjectListItem[];
  pagination: NorthstarPagination;
};

/** Project extra-data row shape as returned by D1. */
export type ProjectExtraDataRow = {
  qbo_id?: unknown;
  status?: unknown;
};
