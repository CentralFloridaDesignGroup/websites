import type { ClientStatus, ListOptions } from "cfdg/types";

type DbRow = Record<string, unknown>;

const clientWhere = "(customer.parent_id IS NULL OR TRIM(customer.parent_id) = '')";
const nameOrder = "CASE WHEN TRIM(customer.display_name) <> '' THEN customer.display_name ELSE customer.fully_qualified_name END";

/**
 * Gets a one-page list of client Rows from the database (no parent IDs), including extra-data fields. The list is sorted by display name (or fully-qualified name if display name is empty) and then by QBO ID.
 * @param db The D1 database instance.
 * @param options The {@link ListOptions} object containing pagination and sorting options.
 * @returns A promise that resolves to an array of client rows.
 */
export async function listClients(db: D1Database, options: ListOptions): Promise<DbRow[]> {
  const offset = (options.page - 1) * options.pageSize;
  const order = options.direction === "desc" ? "DESC" : "ASC";
  const result = await db.prepare(`
    SELECT customer.*, COALESCE(NULLIF(TRIM(extra.status), ''), 'active') AS extra_status
    FROM qbo_customers_projects customer
    LEFT JOIN client_extra_data extra ON extra.qbo_id = customer.qbo_id
    WHERE ${clientWhere}
    ORDER BY ${nameOrder} COLLATE NOCASE ${order}, customer.qbo_id ${order}
    LIMIT ? OFFSET ?
  `).bind(options.pageSize, offset).all<DbRow>();
  return result.results || [];
}

/**
 * Counts top-level QBO customers for pagination.
 * @param db The D1 database instance.
 * @returns A promise that resolves to the total number of top-level clients.
 */
export async function countClients(db: D1Database): Promise<number> {
  const row = await db.prepare(`SELECT COUNT(*) AS total FROM qbo_customers_projects customer WHERE ${clientWhere}`).first<{ total?: unknown }>();
  return Number(row?.total || 0);
}

/** 
 * Gets a single client row by QBO ID, including extra-data fields. Returns null if not found.
 * @param db The D1 database instance.
 * @param qboId The QBO ID of the client to retrieve.
 * @returns A promise that resolves to the client row or null if not found.
 */
export async function getClient(db: D1Database, qboId: string): Promise<DbRow | null> {
  return db.prepare(`SELECT * FROM qbo_customers_projects customer WHERE customer.qbo_id = ? AND ${clientWhere}`).bind(qboId).first<DbRow>();
}

/**
 * Gets or creates a client extra-data row for a given QBO ID. If the row does not exist, it is created with a default status of 'active'. If it exists, the status is preserved unless it is null or empty, in which case it is set to 'active'.
 * @param db The D1 database instance.
 * @param qboId The QBO ID of the client.
 * @returns A promise that resolves to the client extra-data row.
 */
export async function getClientExtraData(db: D1Database, qboId: string): Promise<DbRow> {
  await db.prepare(`
    INSERT INTO client_extra_data (qbo_id, status) VALUES (?, 'active')
    ON CONFLICT(qbo_id) DO UPDATE SET
      status = CASE WHEN client_extra_data.status IS NULL OR TRIM(client_extra_data.status) = '' THEN 'active' ELSE client_extra_data.status END
  `).bind(qboId).run();
  return (await db.prepare("SELECT qbo_id, status FROM client_extra_data WHERE qbo_id = ?").bind(qboId).first<DbRow>()) || { qbo_id: qboId, status: "active" };
}

/**
 * Gets a list of projects for a given client QBO ID, including extra-data fields. The list is sorted by display name (or fully-qualified name if display name is empty) and then by QBO ID.
 * @param db The D1 database instance.
 * @param clientId The QBO ID of the client.
 * @param limit The maximum number of projects to retrieve. Defaults to 250.
 * @returns A promise that resolves to an array of project rows.
 */
export async function listClientProjects(db: D1Database, clientId: string, limit: number = 250): Promise<DbRow[]> {
  const result = await db.prepare(`
    SELECT project.*, client.display_name AS parent_display_name,
      COALESCE(NULLIF(TRIM(extra.status), ''), 'active') AS extra_status
    FROM qbo_customers_projects project
    LEFT JOIN qbo_customers_projects client ON client.qbo_id = project.parent_id
    LEFT JOIN project_extra_data extra ON extra.qbo_id = project.qbo_id
    WHERE project.parent_id = ?
    ORDER BY CASE WHEN TRIM(project.display_name) <> '' THEN project.display_name ELSE project.fully_qualified_name END COLLATE NOCASE ASC, project.qbo_id ASC
    LIMIT ?
  `).bind(clientId, limit).all<DbRow>();
  return result.results || [];
}

/**
 * Updates or inserts a client extra-data row with the given QBO ID and status. If the row does not exist, it is created. If it exists, the status is updated.
 * @param db The D1 database instance.
 * @param qboId The QBO ID of the client.
 * @param status The status to set for the client.
 * @returns A promise that resolves to the client extra-data row.
 */
export async function updateClientStatus(db: D1Database, qboId: string, status: ClientStatus): Promise<DbRow> {
  await db.prepare(`
    INSERT INTO client_extra_data (qbo_id, status) VALUES (?, ?)
    ON CONFLICT(qbo_id) DO UPDATE SET status = excluded.status
  `).bind(qboId, status).run();
  return (await db.prepare("SELECT qbo_id, status FROM client_extra_data WHERE qbo_id = ?").bind(qboId).first<DbRow>()) || { qbo_id: qboId, status };
}
