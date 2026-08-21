import { QboAppSettings, QboCustomer, QboCustomerDbRow, QboSettings } from "./types";
import { normalizeString, normalizeBoolean, normalizeJson, normalizeAddress } from "../helpers";
import { Address, UnknownPartial } from "../common";
import { QboCustomerResponse } from "./http";

/**
 * Converts a database row representing a {@link QboCustomerDbRow} into a {@link QboCustomer} object.
 * @param row The database row containing the customer data.
 * @returns A {@link QboCustomer} object with the mapped data from the database row.
 */
export function mapQboCustomerDbToObject(row: UnknownPartial<QboCustomerDbRow>): QboCustomer {

  const billingAddress = normalizeAddress(
    row.bill_addr_line1,
    row.bill_addr_line2,
    row.bill_addr_city,
    row.bill_addr_state,
    row.bill_addr_postal_code,
  );

  const shippingAddress = normalizeAddress(
    row.ship_addr_line1,
    row.ship_addr_line2,
    row.ship_addr_city,
    row.ship_addr_state,
    row.ship_addr_postal_code,
  );

  return {
    id: normalizeString(row.qbo_id),
    parentId: normalizeString(row.parent_id) || "",
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
 * Converts a {@link QboCustomer} object into a database row representation {@link QboCustomerDbRow}.
 * @param customer The {@link QboCustomer} object to convert.
 * @returns A {@link QboCustomerDbRow} object containing the mapped data for database storage.
 */
export function mapQboCustomerObjectToDb(customer: QboCustomer): QboCustomerDbRow {
  return {
    qbo_id: normalizeString(customer.id),
    parent_id: normalizeString(customer.parentId) || "",
    display_name: normalizeString(customer.displayName),
    fully_qualified_name: normalizeString(customer.fullyQualifiedName),
    bill_addr_line1: normalizeString(customer.billingAddress.line1) || "",
    bill_addr_line2: normalizeString(customer.billingAddress.line2) || "",
    bill_addr_city: normalizeString(customer.billingAddress.city) || "",
    bill_addr_state: normalizeString(customer.billingAddress.state) || "",
    bill_addr_postal_code: normalizeString(customer.billingAddress.zip) || "",
    ship_addr_line1: normalizeString(customer.shippingAddress.line1) || "",
    ship_addr_line2: normalizeString(customer.shippingAddress.line2) || "",
    ship_addr_city: normalizeString(customer.shippingAddress.city) || "",
    ship_addr_state: normalizeString(customer.shippingAddress.state) || "",
    ship_addr_postal_code: normalizeString(customer.shippingAddress.zip) || "",
    active: customer.active ? 1 : 0,
    sync_token: normalizeString(customer.syncToken),
    qbo_updated_time: normalizeString(customer.qboUpdatedTime),
    last_synced_date: normalizeString(customer.lastSyncedDate),
  };
}

/**
 * Converts a {@link QboCustomerResponse} object into a database row representation {@link QboCustomerDbRow}.
 * @param data The {@link QboCustomerResponse} object to convert.
 * @returns A {@link QboCustomerDbRow} object containing the mapped data for database storage.
 */
export function mapQboSourceToDb(data: QboCustomerResponse): QboCustomerDbRow {
  return {
    qbo_id: normalizeString(data.Id),
    parent_id: normalizeString(data.ParentRef?.value) || "",
    display_name: normalizeString(data.DisplayName),
    fully_qualified_name: normalizeString(data.FullyQualifiedName),
    bill_addr_line1: normalizeString(data.BillAddr?.line1) || "",
    bill_addr_line2: normalizeString(data.BillAddr?.line2) || "",
    bill_addr_city: normalizeString(data.BillAddr?.city) || "",
    bill_addr_state: normalizeString(data.BillAddr?.CountrySubDivisionCode) || "",
    bill_addr_postal_code: normalizeString(data.BillAddr?.postalCode) || "",
    ship_addr_line1: normalizeString(data.ShipAddr?.line1) || "",
    ship_addr_line2: normalizeString(data.ShipAddr?.line2) || "",
    ship_addr_city: normalizeString(data.ShipAddr?.city) || "",
    ship_addr_state: normalizeString(data.ShipAddr?.CountrySubDivisionCode) || "",
    ship_addr_postal_code: normalizeString(data.ShipAddr?.postalCode) || "",
    active: data.Active ? 1 : 0,
    sync_token: normalizeString(data.SyncToken),
    qbo_updated_time: normalizeString(data.MetaData?.LastUpdatedTime),
    last_synced_date: "", // This field is not available in the QboCustomerResponse, so we set it to an empty string.
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
