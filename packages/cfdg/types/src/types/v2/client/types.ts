import type { QboCustomer } from "../qbo/types";
import { R2FileRecord } from "../../common";

/** Status stored in client extra data. */
export type ClientStatus = "active" | "inactive" | "suspended" | "prospect" | "archived";

/** Contact associated with a client. */
export type Contact = {
  /** Unique identifier of the contact. */
  id: string;
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
  /** Whether the contact is the primary contact. */
  primary: boolean;
  /** Creation timestamp of the contact. */
  created: string;
  /** Last update timestamp of the contact. */
  updated: string;
}

/** Client record returned by the Northstar API. */
export type Client = QboCustomer & {
  /** Status of the client. */
  status: ClientStatus;
  /** Contacts associated with the client. */
  contacts: Contact[];
  /** Files associated with the client. */
  files: R2FileRecord[];
}

/**  * Client row returned by the paginated Northstar list endpoint. 
 */
export type ClientListItem = {
  id: string;
  fullName: string;
  status: ClientStatus;
};
