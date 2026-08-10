import type {
  QboAccount,
  QboAppSettings,
  QboOptionsResponse,
  QboServiceItem,
} from "cfdg/types";
import { requestJson } from "./client";

/** Starts the QuickBooks Online OAuth flow. */
export async function startQboConnection(): Promise<string> {
  const response = await requestJson<{ authorizationUrl?: string }>(
    "/v2/qbo/connect",
  );
  if (!response.authorizationUrl) {
    throw new Error("QuickBooks did not provide an authorization URL.");
  }
  return response.authorizationUrl;
}

/** Loads live QBO service items and accounts for the settings editor. */
export async function fetchQboOptions(): Promise<QboOptionsResponse> {
  return requestJson<QboOptionsResponse>("/v2/qbo/options");
}

/** Saves the selected QBO accounting defaults. */
export async function updateQboSettings(
  settings: QboAppSettings,
): Promise<QboAppSettings> {
  const response = await requestJson<{ settings: QboAppSettings }>(
    "/v2/qbo/settings",
    {
      method: "PUT",
      body: JSON.stringify({ accountingDefaults: settings.accountingDefaults }),
    },
  );
  return response.settings;
}

/** Disconnects QBO while leaving cached customer records available in Northstar. */
export async function disconnectQbo(): Promise<void> {
  await requestJson("/v2/qbo/settings", { method: "DELETE" });
}

/** Pulls all customers and projects from QBO into Northstar D1. */
export async function pullQboCustomers(): Promise<{
  count: number;
  lastCustomerPullDate: string;
}> {
  return requestJson("/v2/customers/sync", { method: "POST", body: "{}" });
}

export type { QboAccount, QboServiceItem };
