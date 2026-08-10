import { normalizeJson } from "cfdg/scripts";
import { QboSettings } from "cfdg/types";

//TODO: Allow for the possibility of multiple companies in the future. For now, we will only support a single company with ID 1.
/**
 * Upserts the QBO settings into the company_settings table.
 * @param db The database instance.
 * @param settings The QBO settings to upsert.
 * @returns A promise that resolves to true if the upsert was successful, otherwise false.
 * @throws Error if the upsert fails.
 */
export async function upsertQboSettings(
  db: D1Database,
  settings: QboSettings,
): Promise<boolean> {
  const settingsJson = JSON.stringify(settings);
  const result = await db
    .prepare(
      "INSERT INTO company_settings (id, qbo_settings) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET qbo_settings = excluded.qbo_settings",
    )
    .bind(settingsJson)
    .run();
  return result.success;
}

/**
 * Gets the QBO settings from the company_settings table.
 * @param db The database instance.
 * @returns The QBO settings, or null if not found.
 */
export async function getQboSettings(
  db: D1Database,
): Promise<QboSettings | null> {
  const row = await db
    .prepare("SELECT qbo_settings FROM company_settings WHERE id = 1")
    .first<{ qbo_settings: string }>();
  if (!row) {
    return null;
  }
  const settings = row.qbo_settings;
  if (!settings) {
    return null;
  }
  return normalizeJson<QboSettings>(settings);
}

/** Removes the stored QBO connection and settings without deleting cached customers. */
export async function clearQboSettings(db: D1Database): Promise<boolean> {
  const result = await db
    .prepare("UPDATE company_settings SET qbo_settings = NULL WHERE id = 1")
    .run();
  return result.success;
}
