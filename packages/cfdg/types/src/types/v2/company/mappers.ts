import { UnknownPartial } from "cfdg/types/common";
import { CompanySettings, CompanySettingsDbRow } from "./types";
import { normalizeJson, normalizeNumber, normalizeString } from "cfdg/types/helpers";

/**
 * Converts and normalizes a {@link CompanySettingsDbRow} into a {@link CompanySettings} object.
 * @param row The database row containing company settings.
 * @returns A CompanySettings object if the row is valid, or a string describing the error.
 */
export function mapCompanySettingsDbToObject(row: UnknownPartial<CompanySettingsDbRow>): CompanySettings | string {
    if (!row || typeof row !== "object") return "Invalid database row";

    const id = normalizeNumber(row.id, 'int');
    const generalSettings = normalizeJson<CompanySettings["general"]>(normalizeString(row.general_settings));
    const invoiceSettings = normalizeJson<CompanySettings["invoice"]>(normalizeString(row.invoice_settings));
    const qboSettings = normalizeJson<CompanySettings["qboSettings"]>(normalizeString(row.qbo_settings));

    if (!generalSettings) return "Invalid general settings in database row";
    if (!invoiceSettings) return "Invalid invoice settings in database row";
    if (!qboSettings) return "Invalid QBO settings in database row";

    return {
        id: id,
        general: generalSettings,
        invoice: invoiceSettings,
        qboSettings: qboSettings,
    } as CompanySettings;
}

/**
 * Converts and normalizes a {@link CompanySettings} into a {@link CompanySettingsDbRow} object.
 * @param settings The CompanySettings object to convert.
 * @returns A CompanySettingsDbRow object suitable for database storage.
 */
export function mapCompanySettingsObjectToDb(settings: CompanySettings): CompanySettingsDbRow {
    return {
        id: normalizeNumber(settings.id, 'int'),
        general_settings: normalizeString(JSON.stringify(settings.general)), // Ensure the general settings are stored as a JSON string
        invoice_settings: normalizeString(JSON.stringify(settings.invoice)), // Ensure the invoice settings are stored as a JSON string
        qbo_settings: normalizeString(JSON.stringify(settings.qboSettings)), // Ensure the QBO settings are stored as a JSON string
    };
}