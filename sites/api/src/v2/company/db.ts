import type { CompanySettingsRow, GeneralSettings } from "cfdg/types";

const COMPANY_SETTINGS_ID = 1;

/** Gets the company settings row from the Northstar database. */
export async function getCompanySettingsRow(
  db: D1Database,
): Promise<CompanySettingsRow | null> {
  return db
    .prepare(
      "SELECT id, general_settings, qbo_settings FROM company_settings WHERE id = ?",
    )
    .bind(COMPANY_SETTINGS_ID)
    .first<CompanySettingsRow>();
}

/** Upserts the general company settings without changing the QBO settings blob. */
export async function upsertCompanySettings(
  db: D1Database,
  settings: GeneralSettings,
): Promise<boolean> {
  const result = await db
    .prepare(
      "INSERT INTO company_settings (id, general_settings) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET general_settings = excluded.general_settings",
    )
    .bind(COMPANY_SETTINGS_ID, JSON.stringify(settings))
    .run();

  return result.success;
}
