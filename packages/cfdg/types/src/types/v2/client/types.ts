import type { QboCustomer, QboCustomerDbRow } from "../qbo/types";
import { R2FileRecord } from "../../common";

/** Status stored in client extra data. */
export type ClientStatus = "active" | "inactive" | "suspended" | "prospect" | "archived";

// #region Contact types

/** Contact associated with a client. */
export type Contact = {
  /** Unique identifier of the contact. */
  id: number;
  /** Unique identifier of the parent client. */
  parentId: string;
  /** Name of the contact. */
  name: string;
  /** Email address of the contact. */
  email: string;
  /** Phone number of the contact. Format on front-end */
  phone?: number;
  /** Title of the contact. */
  title?: string;
  /** Whether the contact is the primary point of contact. */
  pointOfContact: boolean;
  /** Whether the contact should receive invoices. */
  receiveInvoices: boolean;
  /** Whether the contact is active. */
  active: boolean;
  /** Creation timestamp of the contact. */
  created: string;
  /** Last update timestamp of the contact. */
  updated: string;
}

/** Contact associated with a project. */
export type ProjectContact = Contact & {
  /** Whether the contact is the primary contact for the project. */
  primaryContact: boolean;
  /** Role of the contact in the project. */
  role: 'invoicing' | 'point_of_contact' | 'other';
}

/** Database row representing a client contact. */
export type ContactDbRow = {
  /** Unique identifier of the contact. */
  id: number;
  /** QuickBooks Online customer ID. */
  qbo_id: string;
  /** Name of the contact. */
  name: string;
  /** Email address of the contact. */
  email: string;
  /** Phone number of the contact. */
  phone: number | null;
  /** Title of the contact. */
  title: string | null;
  /** Whether the contact is the primary point of contact. */
  point_of_contact: number;
  /** Whether the contact should receive invoices. */
  receive_invoices: number;
  /** Whether the contact is active. */
  active: number;
  /** Creation timestamp of the contact. */
  created_date: string;
  /** Last update timestamp of the contact. */
  updated_date: string;
}

// #endregion Contact types

/** Client record returned by the Northstar API. */
export type Client = QboCustomer & {
  /** Status of the client. */
  status: ClientStatus;
  /** Contacts associated with the client. */
  contacts: Contact[];
  /** Files associated with the client. */
  files: R2FileRecord[];
}

export type ClientDbRow = QboCustomerDbRow & {
  /** Status of the client. */
  extra_status: string;
}

/**  * Client row returned by the paginated Northstar list endpoint. 
 */
export type ClientListItem = {
  id: string;
  fullName: string;
  status: ClientStatus;
};

export type ClientListItemDbRow = {
  id: string;
  fullName: string;
  extra_status: string;
};