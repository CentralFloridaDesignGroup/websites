import type { CompanySettings } from "cfdg/types/v2";
import { getCompanySettingsRow } from "./db";
import { mapCompanySettingsDbToObject } from "cfdg/types/mappers";

/**
 * Retrieves the company settings from the database and maps them to a {@link CompanySettings} object.
 * @param db The database instance to query.
 * @returns A {@link CompanySettings} object if found, or a string describing the error.
 */
export async function getCompanySettings(
  db: D1Database,
): Promise<CompanySettings | string> {
  const row = await getCompanySettingsRow(db);
  if (!row) return "Company settings not found";

  const settings = mapCompanySettingsDbToObject(row);
  if (typeof settings === "string") return settings;

  return settings as CompanySettings; // Assignment for clarity.
}