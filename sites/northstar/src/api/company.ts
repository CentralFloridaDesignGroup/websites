import type { CompanySettings } from "cfdg/types";
import { requestJson } from "./client";
import { updateQboSettings } from "./qbo";

type CompanySettingsResponse = {
  settings: CompanySettings;
};

/** Gets the settings for the configured Northstar company. */
export async function getCompanySettings(): Promise<CompanySettings> {
  const response = await requestJson<CompanySettingsResponse>("/v2/company");
  return response.settings;
}

export async function updateCompanySettings(newSettings: CompanySettings): Promise<CompanySettings> {
  await requestJson<CompanySettingsResponse>("/v2/company", {
    method: "POST",
    body: JSON.stringify({ general: newSettings.general }),
  });

  if (newSettings.qboSettings) {
    await updateQboSettings(newSettings.qboSettings);
  }

  const response = await getCompanySettings();
  return response;
}
