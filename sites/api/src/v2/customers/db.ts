import { normalizeString } from "cfdg/scripts";
import type { QboCustomerResponse } from "cfdg/types";

function text(value: unknown): string {
  return normalizeString(value);
}

/** Upserts one QBO customer or project into the Northstar customer table. */
export async function upsertCustomer(
  db: D1Database,
  customer: QboCustomerResponse,
  syncedDate: string,
): Promise<boolean> {
  const id = text(customer.Id);
  const displayName = text(customer.DisplayName || customer.FullyQualifiedName || customer.CompanyName || `${text(customer.GivenName)} ${text(customer.FamilyName)}`);
  if (!id || !displayName) return false;

  const result = await db.prepare(`
    INSERT INTO qbo_customers_projects (
      qbo_id, parent_id, display_name, fully_qualified_name, company_name,
      given_name, family_name, primary_email, primary_phone,
      bill_addr_line1, bill_addr_line2, bill_addr_city, bill_addr_state, bill_addr_postal_code,
      ship_addr_line1, ship_addr_line2, ship_addr_city, ship_addr_state, ship_addr_postal_code,
      active, sync_token, qbo_updated_time, last_synced_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(qbo_id) DO UPDATE SET
      parent_id = excluded.parent_id,
      display_name = excluded.display_name,
      fully_qualified_name = excluded.fully_qualified_name,
      company_name = excluded.company_name,
      given_name = excluded.given_name,
      family_name = excluded.family_name,
      primary_email = excluded.primary_email,
      primary_phone = excluded.primary_phone,
      bill_addr_line1 = excluded.bill_addr_line1,
      bill_addr_line2 = excluded.bill_addr_line2,
      bill_addr_city = excluded.bill_addr_city,
      bill_addr_state = excluded.bill_addr_state,
      bill_addr_postal_code = excluded.bill_addr_postal_code,
      ship_addr_line1 = excluded.ship_addr_line1,
      ship_addr_line2 = excluded.ship_addr_line2,
      ship_addr_city = excluded.ship_addr_city,
      ship_addr_state = excluded.ship_addr_state,
      ship_addr_postal_code = excluded.ship_addr_postal_code,
      active = excluded.active,
      sync_token = excluded.sync_token,
      qbo_updated_time = excluded.qbo_updated_time,
      last_synced_date = excluded.last_synced_date
  `).bind(
    id,
    text(customer.ParentRef?.value),
    displayName,
    text(customer.FullyQualifiedName),
    text(customer.CompanyName),
    text(customer.GivenName),
    text(customer.FamilyName),
    text(customer.PrimaryEmailAddr?.Address),
    text(customer.PrimaryPhone?.FreeFormNumber),
    text(customer.BillAddr?.line1),
    text(customer.BillAddr?.line2),
    text(customer.BillAddr?.city),
    text(customer.BillAddr?.CountrySubDivisionCode),
    text(customer.BillAddr?.postalCode),
    text(customer.ShipAddr?.line1),
    text(customer.ShipAddr?.line2),
    text(customer.ShipAddr?.city),
    text(customer.ShipAddr?.CountrySubDivisionCode),
    text(customer.ShipAddr?.postalCode),
    customer.Active === false ? 0 : 1,
    text(customer.SyncToken),
    text(customer.MetaData?.LastUpdatedTime),
    syncedDate,
  ).run();

  return result.success;
}
