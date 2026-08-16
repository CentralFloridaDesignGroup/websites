import { QboAppSettings, QboCustomer, QboSettings } from "./types";
import { normalizeString, normalizeBoolean, normalizeJson, normalizeAddress } from "../../helpers";
import { Address } from "../../common";

//TODO: Move to customers section once created.
export function mapQboCustomerRow(row: Record<string, unknown>): QboCustomer {

  const billingAddress = normalizeAddress(
    row.billAddrLine1,
    row.billAddrLine2,
    row.billAddrCity,
    row.billAddrState,
    row.billAddrPostalCode,
  );

  const shippingAddress = normalizeAddress(
    row.shipAddrLine1,
    row.shipAddrLine2,
    row.shipAddrCity,
    row.shipAddrState,
    row.shipAddrPostalCode,
  );

  return {
    id: normalizeString(row.qbo_id),
    parentId: normalizeString(row.parent_id),
    displayName: normalizeString(row.display_name),
    fullyQualifiedName: normalizeString(row.fully_qualified_name),
    billingAddress: billingAddress ?? {} as Address,
    shippingAddress: shippingAddress ?? {} as Address,
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
