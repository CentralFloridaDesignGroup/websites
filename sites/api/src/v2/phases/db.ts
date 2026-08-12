import type { PhaseCreatePayload, PhaseUpdatePayload } from "cfdg/types";

type DbRow = Record<string, unknown>;

/** Gets a cached QBO project, rejecting top-level clients. */
export async function getNorthstarProject(db: D1Database, qboId: string): Promise<DbRow | null> {
  return db.prepare(
    "SELECT qbo_id, parent_id FROM qbo_customers_projects WHERE qbo_id = ? AND parent_id IS NOT NULL AND TRIM(parent_id) <> ''"
  ).bind(qboId).first<DbRow>();
}

/** Gets one phase belonging to a project. */
export async function getPhase(db: D1Database, qboId: string, phaseId: string): Promise<DbRow | null> {
  return db.prepare("SELECT * FROM phases WHERE qbo_id = ? AND id = ?").bind(qboId, phaseId).first<DbRow>();
}

/** Gets all phases for a project for hierarchical mapping. */
export async function listPhases(db: D1Database, qboId: string): Promise<DbRow[]> {
  const result = await db.prepare(
    "SELECT * FROM phases WHERE qbo_id = ? AND deleted = 0 ORDER BY COALESCE(parent_id, 0), lower(trim(phase_id)), id"
  ).bind(qboId).all<DbRow>();
  return result.results || [];
}

/** Creates a phase and, when needed, converts its parent into a child-summary phase. */
export async function createPhase(
  db: D1Database,
  qboId: string,
  payload: PhaseCreatePayload,
  values: { contractCents: number; retainerCents: number; createdTime: string; createdId: string },
): Promise<DbRow> {
  const parentId = payload.parentId || null;
  const statements: D1PreparedStatement[] = [];

  if (parentId) {
    statements.push(db.prepare(
      "UPDATE phases SET contract_cents = 0, updated_time = ?, updated_id = ? WHERE qbo_id = ? AND id = ? AND NOT EXISTS (SELECT 1 FROM phases WHERE qbo_id = ? AND parent_id = ?)"
    ).bind(values.createdTime, values.createdId, qboId, parentId, qboId, parentId));
  }

  statements.push(db.prepare(
    `INSERT INTO phases (
       qbo_id, parent_id, phase_id, name, description, bill_type, active, billable,
       contract_cents, retainer_cents, billed_cents, income_cents, phase_project_manager,
       created_time, created_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)`
  ).bind(
    qboId,
    parentId,
    payload.phaseId,
    payload.name,
    payload.description || null,
    toDbBillType(payload.billType),
    payload.active ? 1 : 0,
    payload.billable ? 1 : 0,
    values.contractCents,
    values.retainerCents,
    payload.projectManagerId || null,
    values.createdTime,
    values.createdId,
  ));

  const results = await db.batch(statements);
  const insertedId = results[results.length - 1]?.meta.last_row_id;
  if (insertedId === undefined || insertedId === null) throw new Error("Phase creation did not return an ID");
  const created = await getPhase(db, qboId, String(insertedId));
  if (!created) throw new Error("Created phase could not be loaded");
  return created;
}

/** Updates editable phase fields and propagates changed status flags to descendants. */
export async function updatePhase(
  db: D1Database,
  qboId: string,
  id: string,
  payload: PhaseUpdatePayload,
  values: { contractCents: number; retainerCents: number; updatedTime: string; updatedId: string },
  statusChanged: boolean,
): Promise<DbRow> {
  const statements: D1PreparedStatement[] = [db.prepare(
    `UPDATE phases SET
       phase_id = ?, name = ?, description = ?, bill_type = ?, active = ?, billable = ?,
       contract_cents = ?, retainer_cents = ?, phase_project_manager = ?, updated_time = ?, updated_id = ?
     WHERE qbo_id = ? AND id = ?`
  ).bind(
    payload.phaseId,
    payload.name,
    payload.description || null,
    toDbBillType(payload.billType),
    payload.active ? 1 : 0,
    payload.billable ? 1 : 0,
    values.contractCents,
    values.retainerCents,
    payload.projectManagerId || null,
    values.updatedTime,
    values.updatedId,
    qboId,
    id,
  )];

  if (statusChanged) {
    statements.push(db.prepare(
      `WITH RECURSIVE descendants(id) AS (
         SELECT id FROM phases WHERE qbo_id = ? AND id = ?
         UNION ALL
         SELECT child.id
         FROM phases child
         JOIN descendants parent ON child.parent_id = parent.id
         WHERE child.qbo_id = ?
       )
       UPDATE phases
       SET active = ?, billable = ?, updated_time = ?, updated_id = ?
       WHERE qbo_id = ? AND id IN (SELECT id FROM descendants) AND id <> ?`
    ).bind(
      qboId,
      id,
      qboId,
      payload.active ? 1 : 0,
      payload.billable ? 1 : 0,
      values.updatedTime,
      values.updatedId,
      qboId,
      id,
    ));
  }

  await db.batch(statements);
  const updated = await getPhase(db, qboId, id);
  if (!updated) throw new Error("Updated phase could not be loaded");
  return updated;
}

/** Soft-deletes a phase and all descendants by hiding them from summaries. */
export async function deletePhase(
  db: D1Database,
  qboId: string,
  id: string,
  updatedTime: string,
  updatedId: string,
): Promise<DbRow> {
  await db.prepare(
    `WITH RECURSIVE descendants(id) AS (
       SELECT id FROM phases WHERE qbo_id = ? AND id = ?
       UNION ALL
       SELECT child.id
       FROM phases child
       JOIN descendants parent ON child.parent_id = parent.id
       WHERE child.qbo_id = ?
     )
     UPDATE phases
     SET deleted = 1, updated_time = ?, updated_id = ?
     WHERE qbo_id = ? AND id IN (SELECT id FROM descendants)`
  ).bind(qboId, id, qboId, updatedTime, updatedId, qboId).run();
  const deleted = await getPhase(db, qboId, id);
  if (!deleted) throw new Error("Deleted phase could not be loaded");
  return deleted;
}

/** Converts the shared camelCase billing type into the persisted value. */
export function toDbBillType(value: PhaseCreatePayload["billType"]): string {
  return value === "fixedFee" ? "fixed-fee" : value === "timeAndMaterials" ? "time-and-materials" : "non-billable";
}
