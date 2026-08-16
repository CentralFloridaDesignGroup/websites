import { Address } from "../../common";
import type { QboAppSettings } from "../qbo/types";



/** The general settings for a company. */
export type GeneralSettings = {
  /** Full legal name of the company */
  fullName: string;
  /** Short name or common name of the company */
  shortName: string;
  /** The address of the company */
  address: Address;
  /** The phone number of the company. To be formatted on the front end */
  phone: number | null;
  /** The common email address of the company */
  commonEmail: string | null;
  /** The website of the company */
  website: string | null;
  /** The full logo URL of the company */
  logoFullUrl: string | null;
  /** The square logo URL of the company */
  logoSquareUrl: string | null;
};

/** The invoice settings for a company. */
export type CompanyInvoiceSettings = {
  /** The template for generating invoice IDs */
  invoiceIdTemplate: string;
  /** The counter for generating invoice IDs */
  invoiceIdCounter: number;
  /** Whether to reset the invoice counter each year */
  resetInvoiceEachYear: boolean;
  /** The template for generating bundle IDs */
  bundleIdTemplate: string;
  /** The counter for generating bundle IDs */
  bundleIdCounter: number;
  /** Whether to reset the bundle counter each year */
  resetBundleEachYear: boolean;
};


export type CompanySettings = {
  /** The unique identifier of the company */
  id: string;
  general: GeneralSettings;
  invoice: CompanyInvoiceSettings;
  qboSettings: QboAppSettings | null;
};

/** The database row representation of company settings. */
export type CompanySettingsRow = {
  id: number;
  general_settings: string;
  invoice_settings: string;
  qbo_settings: string;
};
