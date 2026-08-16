import { getIsoStringNow } from "cfdg/scripts";
import type {
  ClientStatus,
  Contact,
  ListOptions,
  ContactDbRow,
  ClientDbRow,
  ClientListItemDbRow,
  ProjectListItemDbRow,
} from "cfdg/types/v2";
import { mapContactObjectToDb } from "cfdg/types/mappers";

// #region Contacts

/** Lists all contacts for a client, including inactive contacts for editing. */
export async function listClientContacts(
  db: D1Database,
  qboId: string,
): Promise<ContactDbRow[]> {
  const result = await db
    .prepare(
      "SELECT * FROM client_contacts WHERE qbo_id = ? ORDER BY active DESC, name COLLATE NOCASE ASC, id ASC",
    )
    .bind(qboId)
    .all<ContactDbRow>();
  return result.results || [];
}

/** Creates a client contact and returns the inserted row. */
export async function createClientContact(
  db: D1Database,
  contact: Omit<Contact, "id" | "updated" | "created">,
): Promise<ContactDbRow | null> {
  const dbInfo = mapContactObjectToDb(contact);
  const date = getIsoStringNow();

  const result = await db
    .prepare(
      `INSERT INTO client_contacts (qbo_id, name, email, phone, title, point_of_contact, receive_invoices, active, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      dbInfo.qbo_id,
      dbInfo.name,
      dbInfo.email,
      dbInfo.phone,
      dbInfo.title,
      dbInfo.point_of_contact,
      dbInfo.receive_invoices,
      dbInfo.active,
      date,
    )
    .run();

  var check = await db
    .prepare("SELECT * FROM client_contacts WHERE id = ?")
    .bind(result.meta.last_row_id)
    .first<ContactDbRow>();

  return check;
}

/** Updates a client contact and returns the updated row, or null when it is not owned by the client. */
export async function updateClientContact(
  db: D1Database,
  contact: Contact,
): Promise<ContactDbRow | null> {
  const dbInfo = mapContactObjectToDb(contact);
  const date = getIsoStringNow();

  await db
    .prepare(
      `UPDATE client_contacts SET name = ?, email = ?, phone = ?, title = ?, point_of_contact = ?, receive_invoices = ?, active = ?, updated_date = ? WHERE id = ? AND qbo_id = ?`,
    )
    .bind(
      dbInfo.name,
      dbInfo.email,
      dbInfo.phone,
      dbInfo.title,
      dbInfo.point_of_contact,
      dbInfo.receive_invoices ? 1 : 0,
      dbInfo.active ? 1 : 0,
      date,
      dbInfo.id,
      dbInfo.qbo_id,
    )
    .run();
  return db
    .prepare("SELECT * FROM client_contacts WHERE id = ? AND qbo_id = ?")
    .bind(dbInfo.id, dbInfo.qbo_id)
    .first<ContactDbRow>();
}

// #endregion Contacts

const clientWhere =
  "(customer.parent_id IS NULL OR TRIM(customer.parent_id) = '')";
const nameOrder =
  "CASE WHEN TRIM(customer.display_name) <> '' THEN customer.display_name ELSE customer.fully_qualified_name END";

/**
 * Gets a one-page list of client Rows from the database (no parent IDs), including extra-data fields and. The list is sorted by display name (or fully-qualified name if display name is empty) and then by QBO ID.
 * @param db The D1 database instance.
 * @param options The {@link ListOptions} object containing pagination and sorting options.
 * @returns A promise that resolves to an array of client rows.
 */
export async function listClients(
  db: D1Database,
  options: ListOptions,
): Promise<ClientListItemDbRow[]> {
  const offset = (options.page - 1) * options.pageSize;
  const order = options.direction === "desc" ? "DESC" : "ASC";
  const result = await db
    .prepare(
      `
    SELECT customer.qbo_id as id, customer.display_name as fullName, COALESCE(NULLIF(TRIM(extra.status), ''), 'active') AS extra_status
    FROM qbo_customers customer
    LEFT JOIN client_extra_data extra ON extra.qbo_id = customer.qbo_id
    WHERE ${clientWhere}
    ORDER BY ${nameOrder} COLLATE NOCASE ${order}, customer.qbo_id ${order}
    LIMIT ? OFFSET ?
  `,
    )
    .bind(options.pageSize, offset)
    .all<ClientListItemDbRow>();
  return result.results || [];
}

/**
 * Counts top-level QBO customers for pagination.
 * @param db The D1 database instance.
 * @returns A promise that resolves to the total number of top-level clients.
 */
export async function countClients(db: D1Database): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS total FROM qbo_customers_projects customer WHERE ${clientWhere}`,
    )
    .first<{ total?: unknown }>();
  return Number(row?.total || 0);
}

/**
 * Gets a single client row by QBO ID, including extra-data fields. Returns null if not found.
 * @param db The D1 database instance.
 * @param qboId The QBO ID of the client to retrieve.
 * @returns A promise that resolves to the client row or null if not found.
 */
export async function getClient(
  db: D1Database,
  qboId: string,
): Promise<ClientDbRow | null> {
  return db
    .prepare(
      `
      SELECT customer.*, COALESCE(NULLIF(TRIM(extra.status), ''), 'active') AS extra_status
    FROM qbo_customers customer
    LEFT JOIN client_extra_data extra ON extra.qbo_id = customer.qbo_id
      `,
    )
    .bind(qboId)
    .first<ClientDbRow>();
}

/**
 * Gets a list of projects for a given client QBO ID, including extra-data fields. The list is sorted by display name (or fully-qualified name if display name is empty) and then by QBO ID.
 * @param db The D1 database instance.
 * @param clientId The QBO ID of the client.
 * @param limit The maximum number of projects to retrieve. Defaults to 250.
 * @returns A promise that resolves to an array of project rows.
 */
export async function listClientProjects(
  db: D1Database,
  clientId: string,
  options: ListOptions,
): Promise<ProjectListItemDbRow[]> {
  const offset = (options.page - 1) * options.pageSize;
  const pageSize = options.pageSize;
  const order = options.direction === "desc" ? "DESC" : "ASC";
  const result = await db
    .prepare(
      `
    SELECT customer.qbo_id AS id, customer.display_name AS fullName, customer.parent_id AS parent_id, COALESCE(NULLIF(TRIM(extra.status), ''), 'active') AS extra_status
    FROM qbo_customers customer
    LEFT JOIN project_extra_data extra ON extra.qbo_id = customer.qbo_id
    WHERE customer.parent_id = ?
    ORDER BY customer.display_name COLLATE NOCASE ${order}, customer.qbo_id ${order}
    LIMIT ? OFFSET ?
  `,
    )
    .bind(clientId, pageSize, offset)
    .all<ProjectListItemDbRow>();
  return result.results || [];
}

/** 
 * Validates whether a given client QBO ID exists in the database. This is useful for ensuring that a client ID is valid before performing operations on it.
 * @param db The D1 database instance.
 * @param clientId The QBO ID of the client to validate.
 * @returns A promise that resolves to true if the client exists, false otherwise.
 */
export async function validateClientId(db: D1Database, clientId: string): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS total FROM qbo_customers_projects customer WHERE customer.qbo_id = ?`,
    )
    .bind(clientId)
    .first<{ total?: unknown }>();
  return Number(row?.total || 0) > 0;
}

/** 
 * Counts the number of projects for a given client QBO ID. This is useful for pagination.
 * @param db The D1 database instance.
 * @param clientId The QBO ID of the client.
 * @returns A promise that resolves to the total number of projects for the client.
 */
export async function countClientProjects(
  db: D1Database,
  clientId: string,
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS total FROM qbo_customers_projects customer WHERE customer.parent_id = ?`,
    )
    .bind(clientId)
    .first<{ total?: unknown }>();
  return Number(row?.total || 0);
}

/**
 * Updates or inserts a client extra-data row with the given QBO ID and status. If the row does not exist, it is created. If it exists, the status is updated.
 * @param db The D1 database instance.
 * @param qboId The QBO ID of the client.
 * @param status The status to set for the client.
 * @returns A promise that resolves to the client extra-data row.
 */
export async function updateClientStatus(
  db: D1Database,
  qboId: string,
  status: ClientStatus,
): Promise<ClientDbRow> {
  await db
    .prepare(
      `
    INSERT INTO client_extra_data (qbo_id, status) VALUES (?, ?)
    ON CONFLICT(qbo_id) DO UPDATE SET status = excluded.status
  `,
    )
    .bind(qboId, status)
    .run();
  return getClient(db, qboId) as Promise<ClientDbRow>;
}
