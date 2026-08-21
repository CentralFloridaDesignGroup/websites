import type { CompanySettings } from "cfdg/types/v2";
import { requestJson } from "./client";
import { updateQboSettings } from "./qbo";
import { buildPackage } from "./common";

type CompanySettingsResponse = {
  settings: CompanySettings;
};

/** Gets the settings for the configured Northstar company. */
export async function getCompanySettings(): Promise<CompanySettings> {
  const response = await requestJson<CompanySettingsResponse>("/v2/company");
  return response.settings;
}

export async function updateCompanySettings(
  newSettings: CompanySettings,
): Promise<CompanySettings> {
  await requestJson<CompanySettingsResponse>(
    "/v2/company",
    buildPackage<CompanySettings>("PUT", newSettings),
  );

  // The general settings endpoint is independent from QBO. A settings row may
  // contain an empty or legacy QBO object before the OAuth connection exists;
  // only send QBO defaults after a real connection has been established.
  const qboSettings = newSettings.qboSettings;
  if (
    qboSettings?.connection?.connectedDate &&
    qboSettings.connection.realmId &&
    qboSettings.connection.environment
  ) {
    await updateQboSettings(qboSettings);
  }

  const response = await getCompanySettings();
  return response;
}
