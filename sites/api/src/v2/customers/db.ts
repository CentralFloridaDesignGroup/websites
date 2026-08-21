import type { QboCustomerResponse } from "cfdg/types/v2";
import { mapQboSourceToDb } from "cfdg/types/v2/mappers";


/** Upserts one QBO customer or project into the Northstar customer table. */
export async function insertCustomer(
  db: D1Database,
  customer: QboCustomerResponse,
  syncedDate: string,
): Promise<boolean> {
  const dbCustomer = mapQboSourceToDb(customer);

  if (!dbCustomer) {
    return false;
  }

  const parentId = dbCustomer.parent_id &&
    await db
      .prepare("SELECT 1 FROM qbo_customers WHERE qbo_id = ?")
      .bind(dbCustomer.parent_id)
      .first()
    ? dbCustomer.parent_id
    : null;

  // Only insert the customer if it doesn't already exist. If it does exist, we don't want to overwrite it with potentially outdated data.
  const result = await db.prepare(`
    INSERT INTO qbo_customers (
      qbo_id, parent_id, display_name, fully_qualified_name,
      bill_addr_line1, bill_addr_line2, bill_addr_city, bill_addr_state, bill_addr_postal_code,
      ship_addr_line1, ship_addr_line2, ship_addr_city, ship_addr_state, ship_addr_postal_code,
      active, sync_token, qbo_updated_time, last_synced_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(qbo_id) DO NOTHING
  `).bind(
    dbCustomer.qbo_id,
    parentId,
    dbCustomer.display_name,
    dbCustomer.fully_qualified_name,
    dbCustomer.bill_addr_line1,
    dbCustomer.bill_addr_line2,
    dbCustomer.bill_addr_city,
    dbCustomer.bill_addr_state,
    dbCustomer.bill_addr_postal_code,
    dbCustomer.ship_addr_line1,
    dbCustomer.ship_addr_line2,
    dbCustomer.ship_addr_city,
    dbCustomer.ship_addr_state,
    dbCustomer.ship_addr_postal_code,
    dbCustomer.active ? 1 : 0,
    dbCustomer.sync_token,
    dbCustomer.qbo_updated_time,
    syncedDate,
  ).run();

  if (dbCustomer.parent_id) {
    await db.prepare("DELETE FROM client_extra_data WHERE qbo_id = ?").bind(dbCustomer.qbo_id).run();
    const updated = await db
      .prepare(
        `UPDATE project_extra_data
         SET status = CASE
           WHEN status IS NULL OR TRIM(status) = '' THEN 'imported'
           ELSE status
         END
         WHERE qbo_id = ?`,
      )
      .bind(dbCustomer.qbo_id)
      .run();
    if (!updated.meta.changes) {
      await db
        .prepare("INSERT INTO project_extra_data (qbo_id, status) VALUES (?, 'imported')")
        .bind(dbCustomer.qbo_id)
        .run();
    }
  } else {
    await db.prepare("DELETE FROM project_extra_data WHERE qbo_id = ?").bind(dbCustomer.qbo_id).run();
    const updated = await db
      .prepare(
        `UPDATE client_extra_data
         SET status = CASE
           WHEN status IS NULL OR TRIM(status) = '' THEN 'active'
           ELSE status
         END
         WHERE qbo_id = ?`,
      )
      .bind(dbCustomer.qbo_id)
      .run();
    if (!updated.meta.changes) {
      await db
        .prepare("INSERT INTO client_extra_data (qbo_id, status) VALUES (?, 'active')")
        .bind(dbCustomer.qbo_id)
        .run();
    }
  }

  return result.success;
}
