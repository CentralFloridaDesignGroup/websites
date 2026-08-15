import { normalizeJson, normalizeString } from "cfdg/scripts";
import type { CompanySettings, GeneralSettings, InvoiceBrandingSnapshot, InvoiceNumberingSettings } from "cfdg/types";
import { getQboSettings } from "../qbo/db";
import { getCompanySettingsRow } from "./db";
import { validateNumberingSettings } from "../invoices/internal";

const COMPANY_SETTINGS_ID = "1";

const EMPTY_ADDRESS = { line1: "", line2: "", city: "", state: "", postalCode: "" };
const DEFAULT_BRANDING: InvoiceBrandingSnapshot = {
  name: "",
  logo: "",
  address: EMPTY_ADDRESS,
  phone: "",
};
const DEFAULT_NUMBERING: InvoiceNumberingSettings = {
  invoiceTemplate: "",
  bundleTemplate: "",
  resetEachYear: true,
  startingSequence: 1,
};

/** Reads and combines the general and QBO settings stored for the company. */
export async function getCompanySettings(
  db: D1Database,
): Promise<CompanySettings | null> {
  const row = await getCompanySettingsRow(db);
  if (!row) return null;

  const general = normalizeJson<Partial<GeneralSettings>>(row.general_settings);
  const qboSettings = await getQboSettings(db);
  if (!general) return null;

  return {
    id: COMPANY_SETTINGS_ID,
    general: normalizeGeneralSettings(general),
    qboSettings,
  };
}

/** Normalizes and validates the general settings received from an API request. */
export function parseGeneralSettings(value: unknown): GeneralSettings | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  // General company name handling
  const fullName = normalizeString(record.fullName);
  const shortName = normalizeString(record.shortName);
  if (!fullName || !shortName) return null;

  // Invoice branding and numbering handling
  const branding = record.invoiceBranding && typeof record.invoiceBranding === "object" ? record.invoiceBranding as Record<string, unknown> : {};
  const address = branding.address && typeof branding.address === "object" ? branding.address as Record<string, unknown> : {};
  const numbering = record.invoiceNumbering && typeof record.invoiceNumbering === "object" ? record.invoiceNumbering as Record<string, unknown> : {};
  const parsedNumber = Number(numbering.startingSequence ?? DEFAULT_NUMBERING.startingSequence);
  const numberingValue = {
    invoiceTemplate: normalizeString(numbering.invoiceTemplate) || DEFAULT_NUMBERING.invoiceTemplate,
    bundleTemplate: normalizeString(numbering.bundleTemplate) || DEFAULT_NUMBERING.bundleTemplate,
    resetEachYear: numbering.resetEachYear !== false,
    startingSequence: Number.isInteger(parsedNumber) && parsedNumber > 0 ? parsedNumber : DEFAULT_NUMBERING.startingSequence,
  };
  if (validateNumberingSettings(numberingValue).error) return null;
  return {
    fullName,
    shortName,
    invoiceBranding: {
      name: normalizeString(branding.name),
      logo: normalizeString(branding.logo),
      address: {
        line1: normalizeString(address.line1),
        line2: normalizeString(address.line2),
        city: normalizeString(address.city),
        state: normalizeString(address.state),
        postalCode: normalizeString(address.postalCode),
      },
      phone: normalizeString(branding.phone),
    },
    invoiceNumbering: numberingValue,
  };
}

function normalizeGeneralSettings(value: Partial<GeneralSettings>): GeneralSettings {
  return parseGeneralSettings(value) || {
    fullName: normalizeString(value.fullName),
    shortName: normalizeString(value.shortName),
    invoiceBranding: DEFAULT_BRANDING,
    invoiceNumbering: DEFAULT_NUMBERING,
  };
}
