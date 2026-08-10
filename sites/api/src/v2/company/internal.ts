import { normalizeJson, normalizeString } from "cfdg/scripts";
import type { CompanySettings, GeneralSettings } from "cfdg/types";
import { getQboSettings } from "../qbo/db";
import { getCompanySettingsRow } from "./db";

const COMPANY_SETTINGS_ID = "1";

/** Reads and combines the general and QBO settings stored for the company. */
export async function getCompanySettings(
  db: D1Database,
): Promise<CompanySettings | null> {
  const row = await getCompanySettingsRow(db);
  if (!row) return null;

  const general = normalizeJson<GeneralSettings>(row.general_settings);
  const qboSettings = await getQboSettings(db);
  if (!general) return null;

  return { id: COMPANY_SETTINGS_ID, general, qboSettings };
}

/** Normalizes and validates the general settings received from an API request. */
export function parseGeneralSettings(value: unknown): GeneralSettings | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const fullName = normalizeString(record.fullName);
  const shortName = normalizeString(record.shortName);
  if (!fullName || !shortName) return null;
  return { fullName, shortName };
}
