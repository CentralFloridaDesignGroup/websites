import type { QboAppSettings } from "../qbo/types";

/** The general settings for a company. */
export type GeneralSettings = {
  fullName: string;
  shortName: string;
};


export type CompanySettings = {
  /** The unique identifier of the company */
  id: string;
  general: GeneralSettings;
  qboSettings: QboAppSettings | null;
};

/** The database row representation of company settings. */
export type CompanySettingsRow = {
  id: number;
  general_settings: string | null;
  qbo_settings: string | null;
};
