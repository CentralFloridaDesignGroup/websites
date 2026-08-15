import type { NorthstarPageSize, ProjectStatus } from "cfdg/types";

type ListOptions = { page: number; pageSize: NorthstarPageSize; direction: "asc" | "desc"; clientId?: string };
type DbRow = Record<string, unknown>;

/** Lists the client contacts assigned to a project. */
export async function listProjectContacts(db: D1Database, projectId: string): Promise<DbRow[]> {
  const result = await db.prepare(`
    SELECT contact.id, contact.name, contact.email
    FROM project_contact_assignments assignment
    JOIN client_contacts contact ON contact.id = assignment.contact_id
    WHERE assignment.project_id = ?
    ORDER BY contact.name COLLATE NOCASE ASC, contact.id ASC
  `).bind(projectId).all<DbRow>();
  return result.results || [];
}

/** Replaces all point-of-contact assignments for a project after validating client ownership. */
export async function replaceProjectContacts(db: D1Database, projectId: string, contactIds: string[], now: string, userId: string): Promise<DbRow[]> {
  const project = await db.prepare(
    "SELECT parent_id FROM qbo_customers_projects WHERE qbo_id = ? AND parent_id IS NOT NULL",
  ).bind(projectId).first<DbRow>();
  const clientId = String(project?.parent_id || "");
  const ids = Array.from(new Set(contactIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)));
  if (ids.length > 0) {
    const placeholders = ids.map(() => "?").join(",");
    const valid = await db.prepare(
      `SELECT id FROM client_contacts WHERE qbo_customer_id = ? AND active = 1 AND id IN (${placeholders})`,
    ).bind(clientId, ...ids).all<{ id: number }>();
    if ((valid.results || []).length !== ids.length) throw new Error("One or more selected contacts are not active contacts for this client");
  }
  await db.prepare("DELETE FROM project_contact_assignments WHERE project_id = ?").bind(projectId).run();
  if (ids.length > 0) {
    await db.batch(ids.map((id) => db.prepare(
      "INSERT INTO project_contact_assignments (project_id, contact_id, created_date, created_id) VALUES (?, ?, ?, ?)",
    ).bind(projectId, id, now, userId)));
  }
  return listProjectContacts(db, projectId);
}

/** Updates the project manager and the internal project address. */
export async function updateProjectCore(
  db: D1Database,
  projectId: string,
  values: {
    projectManagerId: string;
    status: string;
    purchaseOrder: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    postalCode: string;
  },
): Promise<{ project: DbRow; extra: DbRow }> {
  await db.prepare(`
    UPDATE qbo_customers_projects
    SET ship_addr_line1 = ?, ship_addr_line2 = ?, ship_addr_city = ?,
      ship_addr_state = ?, ship_addr_postal_code = ?
    WHERE qbo_id = ? AND parent_id IS NOT NULL
  `).bind(values.line1, values.line2, values.city, values.state, values.postalCode, projectId).run();
  await db.prepare(`
    INSERT INTO project_extra_data (qbo_id, status, purchase_order, project_manager)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(qbo_id) DO UPDATE SET
      status = excluded.status,
      purchase_order = excluded.purchase_order,
      project_manager = excluded.project_manager
  `).bind(projectId, values.status, values.purchaseOrder, values.projectManagerId).run();
  const project = await getProject(db, projectId);
  const extra = await getProjectExtraData(db, projectId);
  if (!project) throw new Error("Project not found after update");
  return { project, extra };
}

const nameOrder = "CASE WHEN TRIM(project.display_name) <> '' THEN project.display_name ELSE project.fully_qualified_name END";

/** Lists one page of child QBO customers with project status and parent client name. */
export async function listProjects(db: D1Database, options: ListOptions): Promise<DbRow[]> {
  const offset = (options.page - 1) * options.pageSize;
  const order = options.direction === "desc" ? "DESC" : "ASC";
  const bindings: Array<string | number> = [];
  const conditions = ["project.parent_id IS NOT NULL", "TRIM(project.parent_id) <> ''"];
  if (options.clientId) {
    conditions.push("project.parent_id = ?");
    bindings.push(options.clientId);
  }
  bindings.push(options.pageSize, offset);
  const result = await db.prepare(`
    SELECT project.*, extra.purchase_order, client.display_name AS parent_display_name,
      COALESCE(NULLIF(TRIM(extra.status), ''), 'active') AS extra_status
    FROM qbo_customers_projects project
    LEFT JOIN qbo_customers_projects client ON client.qbo_id = project.parent_id
    LEFT JOIN project_extra_data extra ON extra.qbo_id = project.qbo_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY ${nameOrder} COLLATE NOCASE ${order}, project.qbo_id ${order}
    LIMIT ? OFFSET ?
  `).bind(...bindings).all<DbRow>();
  return result.results || [];
}

/** Counts child QBO customers for pagination. */
export async function countProjects(db: D1Database, clientId?: string): Promise<number> {
  const condition = clientId ? " AND project.parent_id = ?" : "";
  const row = await db.prepare(`
    SELECT COUNT(*) AS total
    FROM qbo_customers_projects project
    WHERE project.parent_id IS NOT NULL AND TRIM(project.parent_id) <> ''${condition}
  `).bind(...(clientId ? [clientId] : [])).first<{ total?: unknown }>();
  return Number(row?.total || 0);
}

/** Gets the base project row without extra-data fields. */
export async function getProject(db: D1Database, qboId: string): Promise<DbRow | null> {
  return db.prepare("SELECT project.*, extra.purchase_order FROM qbo_customers_projects project LEFT JOIN project_extra_data extra ON extra.qbo_id = project.qbo_id WHERE project.qbo_id = ? AND project.parent_id IS NOT NULL AND TRIM(project.parent_id) <> ''").bind(qboId).first<DbRow>();
}

/** Ensures a project has a matching extra-data row and returns it. */
export async function getProjectExtraData(db: D1Database, qboId: string): Promise<DbRow> {
  await db.prepare(`
    INSERT INTO project_extra_data (qbo_id, status, purchase_order) VALUES (?, 'active', '')
    ON CONFLICT(qbo_id) DO UPDATE SET
      status = CASE WHEN project_extra_data.status IS NULL OR TRIM(project_extra_data.status) = '' THEN 'active' ELSE project_extra_data.status END
  `).bind(qboId).run();
  return (await db.prepare("SELECT qbo_id, status, purchase_order, project_manager FROM project_extra_data WHERE qbo_id = ?").bind(qboId).first<DbRow>()) || { qbo_id: qboId, status: "active", purchase_order: "", project_manager: "" };
}

/** Updates the project purchase-order snapshot source. */
export async function updateProjectPurchaseOrder(db: D1Database, qboId: string, purchaseOrder: string): Promise<DbRow> {
  await db.prepare(`
    INSERT INTO project_extra_data (qbo_id, status, purchase_order) VALUES (?, 'active', ?)
    ON CONFLICT(qbo_id) DO UPDATE SET purchase_order = excluded.purchase_order
  `).bind(qboId, purchaseOrder).run();
  return (await db.prepare("SELECT qbo_id, status, purchase_order FROM project_extra_data WHERE qbo_id = ?").bind(qboId).first<DbRow>()) || { qbo_id: qboId, status: "active", purchase_order: purchaseOrder };
}

/** Gets the client row linked to a project. */
export async function getProjectClient(db: D1Database, parentId: string): Promise<DbRow | null> {
  return db.prepare("SELECT * FROM qbo_customers_projects WHERE qbo_id = ? AND (parent_id IS NULL OR TRIM(parent_id) = '')").bind(parentId).first<DbRow>();
}

/** Updates a project's internal lifecycle status. */
export async function updateProjectStatus(db: D1Database, qboId: string, status: ProjectStatus): Promise<DbRow> {
  await db.prepare(`
    INSERT INTO project_extra_data (qbo_id, status) VALUES (?, ?)
    ON CONFLICT(qbo_id) DO UPDATE SET status = excluded.status
  `).bind(qboId, status).run();
  return (await db.prepare("SELECT qbo_id, status FROM project_extra_data WHERE qbo_id = ?").bind(qboId).first<DbRow>()) || { qbo_id: qboId, status };
}
