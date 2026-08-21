import type {
  QboAccount,
  QboConnectionStatus,
  QboCustomer,
  QboServiceItem,
  State,
} from "cfdg/types";
import { requestJson } from "./client";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function normalizeString(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function normalizeCustomer(value: unknown): QboCustomer {
  const row = asRecord(value);
  const billingAddress = asRecord(row.billingAddress);
  const shippingAddress = asRecord(row.shippingAddress);
  const billAddrLine1 = normalizeString(
    row.billAddrLine1 ?? row.bill_addr_line1 ?? billingAddress.line1,
  );
  const billAddrLine2 = normalizeString(
    row.billAddrLine2 ?? row.bill_addr_line2 ?? billingAddress.line2,
  );
  const billAddrCity = normalizeString(
    row.billAddrCity ?? row.bill_addr_city ?? billingAddress.city,
  );
  const billAddrState = normalizeString(
    row.billAddrState ?? row.bill_addr_state ?? billingAddress.state,
  );
  const billAddrPostalCode = normalizeString(
    row.billAddrPostalCode ?? row.bill_addr_postal_code ?? billingAddress.zip,
  );
  const shipAddrLine1 = normalizeString(
    row.shipAddrLine1 ?? row.ship_addr_line1 ?? shippingAddress.line1,
  );
  const shipAddrLine2 = normalizeString(
    row.shipAddrLine2 ?? row.ship_addr_line2 ?? shippingAddress.line2,
  );
  const shipAddrCity = normalizeString(
    row.shipAddrCity ?? row.ship_addr_city ?? shippingAddress.city,
  );
  const shipAddrState = normalizeString(
    row.shipAddrState ?? row.ship_addr_state ?? shippingAddress.state,
  );
  const shipAddrPostalCode = normalizeString(
    row.shipAddrPostalCode ?? row.ship_addr_postal_code ?? shippingAddress.zip,
  );
  return {
    id: normalizeString(row.id ?? row.qbo_id),
    parentId: normalizeString(row.parentId ?? row.parent_id),
    displayName: normalizeString(row.displayName ?? row.display_name),
    fullyQualifiedName: normalizeString(
      row.fullyQualifiedName ?? row.fully_qualified_name,
    ),
    companyName: normalizeString(row.companyName ?? row.company_name),
    givenName: normalizeString(row.givenName ?? row.given_name),
    familyName: normalizeString(row.familyName ?? row.family_name),
    primaryEmail: normalizeString(row.primaryEmail ?? row.primary_email),
    primaryPhone: normalizeString(row.primaryPhone ?? row.primary_phone),
    billingAddress: {
      line1: billAddrLine1,
      line2: billAddrLine2,
      city: billAddrCity,
      state: billAddrState as State,
      zip: billAddrPostalCode,
    },
    shippingAddress: {
      line1: shipAddrLine1,
      line2: shipAddrLine2,
      city: shipAddrCity,
      state: shipAddrState as State,
      zip: shipAddrPostalCode,
    },
    billAddrLine1,
    billAddrLine2,
    billAddrCity,
    billAddrState,
    billAddrPostalCode,
    shipAddrLine1,
    shipAddrLine2,
    shipAddrCity,
    shipAddrState,
    shipAddrPostalCode,
    active: normalizeBool(row.active),
    syncToken: normalizeString(row.syncToken ?? row.sync_token),
    qboUpdatedTime: normalizeString(row.qboUpdatedTime ?? row.qbo_updated_time),
    lastSyncedDate: normalizeString(row.lastSyncedDate ?? row.last_synced_date),
  };
}

function normalizeStatus(value: unknown): QboConnectionStatus {
  const row = asRecord(value);
  return {
    connected: normalizeBool(row.connected),
    realmId: normalizeString(row.realmId ?? row.realm_id),
    environment: normalizeString(row.environment),
    lastCustomerSyncDate: normalizeString(
      row.lastCustomerSyncDate ?? row.last_customer_sync_date,
    ),
    lastItemSyncDate: normalizeString(
      row.lastItemSyncDate ?? row.last_item_sync_date,
    ),
    lastAccountSyncDate: normalizeString(
      row.lastAccountSyncDate ?? row.last_account_sync_date,
    ),
    tokenExpiresDate: normalizeString(
      row.tokenExpiresDate ?? row.token_expires_date,
    ),
    defaultServiceItemId: normalizeString(
      row.defaultServiceItemId ?? row.default_service_item_id,
    ),
    defaultServiceItemName: normalizeString(
      row.defaultServiceItemName ?? row.default_service_item_name,
    ),
    defaultDepositAccountId: normalizeString(
      row.defaultDepositAccountId ?? row.default_deposit_account_id,
    ),
    defaultDepositAccountName: normalizeString(
      row.defaultDepositAccountName ?? row.default_deposit_account_name,
    ),
    stripeFeeExpenseAccountId: normalizeString(
      row.stripeFeeExpenseAccountId ?? row.stripe_fee_expense_account_id,
    ),
    stripeFeeExpenseAccountName: normalizeString(
      row.stripeFeeExpenseAccountName ?? row.stripe_fee_expense_account_name,
    ),
  };
}

function normalizeServiceItem(value: unknown): QboServiceItem {
  const row = asRecord(value);
  return {
    id: normalizeString(row.id ?? row.qbo_id),
    name: normalizeString(row.name),
    fullyQualifiedName: normalizeString(
      row.fullyQualifiedName ?? row.fully_qualified_name,
    ),
    description: normalizeString(row.description),
    active: normalizeBool(row.active),
    syncToken: normalizeString(row.syncToken ?? row.sync_token),
    qboUpdatedTime: normalizeString(row.qboUpdatedTime ?? row.qbo_updated_time),
    lastSyncedDate: normalizeString(row.lastSyncedDate ?? row.last_synced_date),
  };
}

function normalizeAccount(value: unknown): QboAccount {
  const row = asRecord(value);
  return {
    id: normalizeString(row.id ?? row.qbo_id),
    name: normalizeString(row.name),
    fullyQualifiedName: normalizeString(
      row.fullyQualifiedName ?? row.fully_qualified_name,
    ),
    accountType: normalizeString(row.accountType ?? row.account_type),
    accountSubType: normalizeString(row.accountSubType ?? row.account_sub_type),
    classification: normalizeString(row.classification),
    active: normalizeBool(row.active),
    syncToken: normalizeString(row.syncToken ?? row.sync_token),
    qboUpdatedTime: normalizeString(row.qboUpdatedTime ?? row.qbo_updated_time),
    lastSyncedDate: normalizeString(row.lastSyncedDate ?? row.last_synced_date),
  };
}

export async function fetchQboStatus(): Promise<QboConnectionStatus> {
  const data = await requestJson<{ status?: unknown }>("/api/qbo/status", {
    method: "GET",
    authMode: "microsoft",
  });
  return normalizeStatus(data.status);
}

export async function startQboConnection(): Promise<string> {
  const data = await requestJson<{ authorizationUrl?: unknown }>(
    "/api/qbo/connect",
    {
      method: "GET",
      authMode: "microsoft",
    },
  );
  return normalizeString(data.authorizationUrl);
}

export async function syncQboCustomers(): Promise<number> {
  const data = await requestJson<{ count?: unknown }>(
    "/api/qbo/customers/sync",
    {
      method: "POST",
      authMode: "microsoft",
      body: JSON.stringify({}),
    },
  );
  const count = Number(data.count ?? 0);
  return Number.isFinite(count) ? count : 0;
}

export async function syncQboServiceItems(): Promise<number> {
  const data = await requestJson<{ count?: unknown }>("/api/qbo/items/sync", {
    method: "POST",
    authMode: "microsoft",
    body: JSON.stringify({}),
  });
  const count = Number(data.count ?? 0);
  return Number.isFinite(count) ? count : 0;
}

export async function syncQboAccounts(): Promise<number> {
  const data = await requestJson<{ count?: unknown }>(
    "/api/qbo/accounts/sync",
    {
      method: "POST",
      authMode: "microsoft",
      body: JSON.stringify({}),
    },
  );
  const count = Number(data.count ?? 0);
  return Number.isFinite(count) ? count : 0;
}

export async function fetchQboCustomers(search = ""): Promise<QboCustomer[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  const data = await requestJson<{ customers?: unknown[] }>(
    `/api/qbo/customers${params.toString() ? `?${params}` : ""}`,
    {
      method: "GET",
      authMode: "microsoft",
    },
  );
  return (data.customers || []).map((customer) => normalizeCustomer(customer));
}

export async function fetchQboProjects(
  customerId: string,
): Promise<QboCustomer[]> {
  const data = await requestJson<{ projects?: unknown[] }>(
    `/api/qbo/customers/${encodeURIComponent(customerId)}/projects`,
    {
      method: "GET",
      authMode: "microsoft",
    },
  );
  return (data.projects || []).map((project) => normalizeCustomer(project));
}

export async function fetchQboServiceItems(
  search = "",
): Promise<QboServiceItem[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  const data = await requestJson<{ items?: unknown[] }>(
    `/api/qbo/items${params.toString() ? `?${params}` : ""}`,
    {
      method: "GET",
      authMode: "microsoft",
    },
  );
  return (data.items || []).map((item) => normalizeServiceItem(item));
}

export async function fetchQboAccounts(
  filters: { search?: string; accountType?: string } = {},
): Promise<QboAccount[]> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.accountType) params.set("accountType", filters.accountType);
  const data = await requestJson<{ accounts?: unknown[] }>(
    `/api/qbo/accounts${params.toString() ? `?${params}` : ""}`,
    {
      method: "GET",
      authMode: "microsoft",
    },
  );
  return (data.accounts || []).map((account) => normalizeAccount(account));
}

export async function updateQboSettings(
  settings:
    | {
        defaultServiceItemId?: string;
        defaultDepositAccountId?: string;
        stripeFeeExpenseAccountId?: string;
      }
    | string,
): Promise<void> {
  const body =
    typeof settings === "string"
      ? { defaultServiceItemId: settings }
      : settings;
  await requestJson("/api/qbo/settings", {
    method: "PUT",
    authMode: "microsoft",
    body: JSON.stringify(body),
  });
}
