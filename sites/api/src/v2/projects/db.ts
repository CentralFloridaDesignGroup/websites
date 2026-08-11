import type { NorthstarPageSize, ProjectStatus } from "cfdg/types";

type ListOptions = { page: number; pageSize: NorthstarPageSize; direction: "asc" | "desc"; clientId?: string };
type DbRow = Record<string, unknown>;

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
    SELECT project.*, client.display_name AS parent_display_name,
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
  return db.prepare("SELECT * FROM qbo_customers_projects WHERE qbo_id = ? AND parent_id IS NOT NULL AND TRIM(parent_id) <> ''").bind(qboId).first<DbRow>();
}

/** Ensures a project has a matching extra-data row and returns it. */
export async function getProjectExtraData(db: D1Database, qboId: string): Promise<DbRow> {
  await db.prepare(`
    INSERT INTO project_extra_data (qbo_id, status) VALUES (?, 'active')
    ON CONFLICT(qbo_id) DO UPDATE SET
      status = CASE WHEN project_extra_data.status IS NULL OR TRIM(project_extra_data.status) = '' THEN 'active' ELSE project_extra_data.status END
  `).bind(qboId).run();
  return (await db.prepare("SELECT qbo_id, status FROM project_extra_data WHERE qbo_id = ?").bind(qboId).first<DbRow>()) || { qbo_id: qboId, status: "active" };
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
