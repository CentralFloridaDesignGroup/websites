import { useEffect, useMemo, useState } from "react";
import type { CompanySettings, QboAccount, QboServiceItem } from "cfdg/types/v2";
import { NorthstarButton, NorthstarDropdown } from "cfdg/ui/input";
import { disconnectQbo, fetchQboOptions, pullQboCustomers, startQboConnection } from "../../../api/qbo";
import { LoadingOverlay } from "../../../components/LoadingOverlay";

type QboPageProps = {
  settings: CompanySettings;
  onChange: (newSettings: CompanySettings) => void;
  onDisconnected: () => void;
};

function displayDate(value: string | undefined): string {
  if (!value) return "Not pulled";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export function QboPage({ settings, onChange, onDisconnected }: QboPageProps) {
  const [busy, setBusy] = useState(false);
  const [context, setContext] = useState<"connect" | "settings" | "pull" | null>(null);
  const [editing, setEditing] = useState(false);
  const [options, setOptions] = useState<{ serviceItems: QboServiceItem[]; accounts: QboAccount[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastPullDate, setLastPullDate] = useState(settings.qboSettings?.lastCustomerPullDate);

  const qboSettings = settings.qboSettings;

  useEffect(() => {
    setLastPullDate(settings.qboSettings?.lastCustomerPullDate);
  }, [settings.qboSettings?.lastCustomerPullDate]);

  const depositAccounts = useMemo(
    () => options?.accounts.filter((account) => ["Bank", "Other Current Asset"].includes(account.accountType)) ?? [],
    [options],
  );
  const feeAccounts = useMemo(
    () => options?.accounts.filter((account) => ["Expense", "Other Expense", "Cost of Goods Sold"].includes(account.accountType)) ?? [],
    [options],
  );

  async function connectQbo() {
    setContext("connect");
    setBusy(true);
    setError(null);
    try {
      window.location.href = await startQboConnection();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start QBO connection.");
      setContext(null);
      setBusy(false);
    }
  }

  async function beginEditing() {
    setContext("settings");
    setBusy(true);
    setError(null);
    try {
      setOptions(await fetchQboOptions());
      setEditing(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load QBO options.");
    } finally {
      setContext(null);
      setBusy(false);
    }
  }

  async function pullCustomers() {
    setContext("pull");
    setBusy(true);
    setError(null);
    try {
      const result = await pullQboCustomers();
      setLastPullDate(result.lastCustomerPullDate);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to pull QBO customers.");
    } finally {
      setContext(null);
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect QuickBooks Online? Cached customers will remain in Northstar.")) return;
    setBusy(true);
    setError(null);
    try {
      await disconnectQbo();
      onDisconnected();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to disconnect QBO.");
      setBusy(false);
    }
  }

  function updateDefault(
    key: "serviceItem" | "depositAccount" | "stripeFeeExpenseAccount",
    value: QboServiceItem | QboAccount | null,
  ) {
    if (!qboSettings) return;
    onChange({
      ...settings,
      qboSettings: {
        ...qboSettings,
        accountingDefaults: {
          ...qboSettings.accountingDefaults,
          [key]: value,
        },
      },
    });
  }

  if (!qboSettings || !qboSettings.connection?.connectedDate) {
    return (
      <div className="flex flex-col gap-4 mx-auto max-w-xl">
        <h2 className="text-center text-2xl font-bold">QuickBooks Online Settings</h2>
        <p className="text-center text-lg">You need to connect your QuickBooks Online account before you can access the QBO settings.</p>
        <NorthstarButton field="connectQbo" buttonStyle="focused" onClick={() => void connectQbo()} disabled={busy}>
          Connect QBO Account
        </NorthstarButton>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold">QuickBooks Online Settings</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Connected to {qboSettings.connection.environment} QuickBooks company {qboSettings.connection.realmId}.
        </p>
      </div>

      {busy && context === "connect" && <LoadingOverlay header="Connecting to QuickBooks Online" message="Please view the other tab to connect to QuickBooks Online." />}
      {busy && context === "settings" && <LoadingOverlay header="Pulling Settings From Quickbooks" message="Pulling ledgers and accounts from Quickbooks Online." />}
      {busy && context === "pull" && <LoadingOverlay header="Copying QBO Customers" message="Copying customers from QuickBooks Online." />}

      <div className="flex flex-wrap items-center gap-3">
        {!editing && <NorthstarButton buttonStyle="focused" onClick={() => void beginEditing()} disabled={busy}>Edit QBO Settings</NorthstarButton>}
        <NorthstarButton buttonStyle="secondary" onClick={() => void pullCustomers()} disabled={busy}>Pull Customers</NorthstarButton>
        <NorthstarButton buttonStyle="secondary" onClick={() => void disconnect()} disabled={busy}>Disconnect QBO</NorthstarButton>
        <span className="text-sm text-gray-600 dark:text-gray-400">Last pull: {displayDate(lastPullDate)}</span>
      </div>

      {!editing && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Default service item</label>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{qboSettings.accountingDefaults.serviceItem?.fullyQualifiedName ?? "Not set"}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Default deposit account</label>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{qboSettings.accountingDefaults.depositAccount?.name ?? "Not set"}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Default Stripe fee account</label>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{qboSettings.accountingDefaults.stripeFeeExpenseAccount?.name ?? "Not set"}</p>
          </div>
        </div>
      )}

      {editing && options && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <NorthstarDropdown
            field="qbo-default-service-item"
            label="Default service item"
            options={options.serviceItems.map((item) => ({ label: item.fullyQualifiedName || item.name, value: item.id }))}
            value={qboSettings.accountingDefaults.serviceItem?.id ?? ""}
            placeholder="Select service item"
            searchable
            disabled={busy}
            onChange={(event) => updateDefault("serviceItem", options.serviceItems.find((item) => item.id === event.target.value) ?? null)}
          />
          <NorthstarDropdown
            field="qbo-default-deposit-account"
            label="Default deposit account"
            options={depositAccounts.map((account) => ({ label: `${account.name} (${account.accountType})`, value: account.id }))}
            value={qboSettings.accountingDefaults.depositAccount?.id ?? ""}
            placeholder="Select deposit account"
            searchable
            disabled={busy}
            onChange={(event) => updateDefault("depositAccount", depositAccounts.find((account) => account.id === event.target.value) ?? null)}
          />
          <NorthstarDropdown
            field="qbo-stripe-fee-account"
            label="Default Stripe fee account"
            options={feeAccounts.map((account) => ({ label: `${account.name} (${account.accountType})`, value: account.id }))}
            value={qboSettings.accountingDefaults.stripeFeeExpenseAccount?.id ?? ""}
            placeholder="Select Stripe fee account"
            searchable
            disabled={busy}
            onChange={(event) => updateDefault("stripeFeeExpenseAccount", feeAccounts.find((account) => account.id === event.target.value) ?? null)}
          />
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
