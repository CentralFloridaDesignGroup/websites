import type { CompanySettings } from "cfdg/types";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getCompanySettings, updateCompanySettings } from "../api/company";

type CompanySettingsContextValue = {
  /** The current company settings, or null if they have not been loaded. */
  settings: CompanySettings | null;
  /** Whether the company settings are currently being loaded. */
  settingsLoading: boolean;
  /** Whether the company settings are currently being saved. */
  settingsSaving: boolean;
  /** Updates the current company settings. */
  settingsError: Error | null;
  /** Refreshes the company settings by re-fetching them from the API. */
  refresh: () => Promise<CompanySettings | null>;
  /** Pushes changes to the settings to the API and refreshes the context. */
  updateSettings: (newSettings: CompanySettings) => Promise<boolean>;
};

const CompanySettingsContext = createContext<CompanySettingsContextValue | undefined>(undefined);

/** Provides the current company settings to all authenticated Northstar pages. */
export function CompanySettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /** 
   * Refreshes the company settings by re-fetching them from the API.
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextSettings = await getCompanySettings();
      setSettings(nextSettings);
      return nextSettings;
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error("Unable to load company settings."));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Pushes changes to the settings to the API and refreshes the context. Should not be called while a refresh is in progress or on initial load, as it will overwrite any changes made by the API since the last refresh.
   * @param newSettings The new company settings to save.
   */
  const updateSettings = useCallback(async (newSettings: CompanySettings) => {
    setSaving(true);
    setError(null);
    if (!settings) {
      setError(new Error("Cannot update company settings before they have been loaded."));
      setSaving(false);
      return false;
    }
    if(loading) {
      setError(new Error("Cannot update company settings while a refresh is in progress."));
      setSaving(false);
      return false;
    }
    try {
      setSettings(await updateCompanySettings(newSettings));
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error("Unable to update company settings."));
      return false;
    }
    finally {
      setSaving(false);
    }
  }, [loading, refresh, settings]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ settings, settingsLoading: loading, settingsSaving: saving, settingsError: error, refresh, updateSettings }),
    [settings, loading, saving, error, refresh, updateSettings],
  );

  return <CompanySettingsContext.Provider value={value}>{children}</CompanySettingsContext.Provider>;
}

/** Reads company settings from the nearest {@link CompanySettingsProvider}. */
export function useCompanySettings(): CompanySettingsContextValue {
  const context = useContext(CompanySettingsContext);
  if (!context) {
    throw new Error("useCompanySettings must be used within a CompanySettingsProvider.");
  }

  return context;
}
