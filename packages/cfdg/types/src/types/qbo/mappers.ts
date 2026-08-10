import { QboAppSettings, QboCustomer, QboSettings } from "./types";
import { normalizeString, normalizeBoolean, normalizeJson } from "../helpers";

//TODO: Move to customers section once created.
export function mapQboCustomerRow(row: Record<string, unknown>): QboCustomer {
  return {
    id: normalizeString(row.qbo_id),
    parentId: normalizeString(row.parent_id),
    displayName: normalizeString(row.display_name),
    fullyQualifiedName: normalizeString(row.fully_qualified_name),
    companyName: normalizeString(row.company_name),
    givenName: normalizeString(row.given_name),
    familyName: normalizeString(row.family_name),
    primaryEmail: normalizeString(row.primary_email),
    primaryPhone: normalizeString(row.primary_phone),
    billAddrLine1: normalizeString(row.bill_addr_line1),
    billAddrLine2: normalizeString(row.bill_addr_line2),
    billAddrCity: normalizeString(row.bill_addr_city),
    billAddrState: normalizeString(row.bill_addr_state),
    billAddrPostalCode: normalizeString(row.bill_addr_postal_code),
    shipAddrLine1: normalizeString(row.ship_addr_line1),
    shipAddrLine2: normalizeString(row.ship_addr_line2),
    shipAddrCity: normalizeString(row.ship_addr_city),
    shipAddrState: normalizeString(row.ship_addr_state),
    shipAddrPostalCode: normalizeString(row.ship_addr_postal_code),
    active: normalizeBoolean(row.active),
    syncToken: normalizeString(row.sync_token),
    qboUpdatedTime: normalizeString(row.qbo_updated_time),
    lastSyncedDate: normalizeString(row.last_synced_date),
  };
}

/**
 * Converts a database text blob row into a QboSettings object.
 * @param text The text blob from the database representing QBO settings.
 * @returns A QboSettings object containing the parsed settings.
 * @throws Error if the text blob cannot be parsed into a valid QboSettings object.
 */
export function mapQboSettingsBlob(text: string): QboSettings {
  const parsed = normalizeJson<QboSettings>(text);
  if (!parsed) {
    throw new Error("Failed to parse QBO settings blob");
  }
  return parsed;
}

/** 
 * Converts a QboSettings object into a QboAppSettings object by omitting the OAuth tokens.
 * @param settings The QboSettings object to convert.
 * @returns A QboAppSettings object containing the relevant settings without OAuth tokens.
 */
export function mapQboAppSettings(settings: QboSettings): QboAppSettings {
  return {
    schemaVersion: settings.schemaVersion,
    connection: settings.connection,
    accountingDefaults: settings.accountingDefaults,
    lastCustomerPullDate: settings.lastCustomerPullDate,
  };
}
