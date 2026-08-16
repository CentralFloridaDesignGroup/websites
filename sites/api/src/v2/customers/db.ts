import type { QboCustomerResponse } from "cfdg/types/v2";
import { mapQboSourceToDb } from "cfdg/types/mappers";


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

  // Only insert the customer if it doesn't already exist. If it does exist, we don't want to overwrite it with potentially outdated data.
  const result = await db.prepare(`
    INSERT INTO qbo_customers_projects (
      qbo_id, parent_id, display_name, fully_qualified_name,
      bill_addr_line1, bill_addr_line2, bill_addr_city, bill_addr_state, bill_addr_zip,
      ship_addr_line1, ship_addr_line2, ship_addr_city, ship_addr_state, ship_addr_zip,
      active, sync_token, qbo_updated_time, last_synced_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(qbo_id) IGNORE
  `).bind(
    dbCustomer.qbo_id,
    dbCustomer.parent_id,
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
    await db.prepare(`
      INSERT INTO project_extra_data (qbo_id, status)
      VALUES (?, 'imported')
      ON CONFLICT(qbo_id) DO UPDATE SET
        status = CASE
          WHEN project_extra_data.status IS NULL OR TRIM(project_extra_data.status) = '' THEN 'imported'
          ELSE project_extra_data.status
        END
    `).bind(dbCustomer.qbo_id).run();
  } else {
    await db.prepare("DELETE FROM project_extra_data WHERE qbo_id = ?").bind(dbCustomer.qbo_id).run();
    await db.prepare(`
      INSERT INTO client_extra_data (qbo_id, status)
      VALUES (?, 'active')
      ON CONFLICT(qbo_id) DO UPDATE SET
        status = CASE
          WHEN client_extra_data.status IS NULL OR TRIM(client_extra_data.status) = '' THEN 'active'
          ELSE client_extra_data.status
        END
    `).bind(dbCustomer.qbo_id).run();
  }

  return result.success;
}
