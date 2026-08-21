import { mapCompanySettingsObjectToDb } from "cfdg/types/v2/mappers";
import type { CompanySettings, CompanySettingsDbRow } from "cfdg/types/v2";

const COMPANY_SETTINGS_ID = 1;

/**
 * Retrieves the company settings row from the database.
 * @param db The D1 database instance to query.
 * @returns A promise that resolves to the CompanySettingsDbRow if found, or null if not found.
 */
export async function getCompanySettingsRow(
  db: D1Database,
): Promise<CompanySettingsDbRow | null> {
  return db
    .prepare(
      "SELECT id, general_settings, invoice_settings, qbo_settings FROM company_settings WHERE id = ?",
    )
    .bind(COMPANY_SETTINGS_ID)
    .first<CompanySettingsDbRow>();
}

/**
 * upserts the company settings into the database. If a row with the specified ID exists, it updates the general and invoice settings; otherwise, it inserts a new row.
 * @param db The D1 database instance to query.
 * @param settings The company settings to upsert.
 * @returns A promise that resolves to the updated CompanySettingsDbRow if successful, or null if the operation fails.
 */
export async function upsertCompanySettings(
  db: D1Database,
  settings: CompanySettings,
): Promise<CompanySettingsDbRow | null> {
  const dbRow = mapCompanySettingsObjectToDb(settings);

  // Intentionally not updating the QBO settings here, as they are managed separately.
  await db
    .prepare(
      "INSERT INTO company_settings (id, general_settings, invoice_settings) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET general_settings = excluded.general_settings, invoice_settings = excluded.invoice_settings",
    )
    .bind(COMPANY_SETTINGS_ID, dbRow.general_settings, dbRow.invoice_settings)
    .run();

  const updatedRow = await getCompanySettingsRow(db);
  return updatedRow;
}
