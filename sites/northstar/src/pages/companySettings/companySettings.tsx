import { CompanySettings } from "cfdg/types/v2";
import { useCompanySettings } from "../../contexts/CompanySettingsContext";
import { NorthstarButton } from 'cfdg/ui/input'
import { Link2, Link2Off, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { GeneralPage, QboPage } from "./subpages";
import { LoadingOverlay } from "../../components/LoadingOverlay";

type CompanyPage = "general" | "qbo";

export function CompanySettingsPage() {
    const [currentPage, setCurrentPage] = useState<CompanyPage>("general");
    const [pendingChanges, setPendingChanges] = useState(true);
    const [errors, setErrors] = useState<Record<string, string> | undefined>(undefined);


    const { settings, settingsLoading, settingsSaving, settingsError, refresh, updateSettings } = useCompanySettings();
    const [localSettings, setLocalSettings] = useState<CompanySettings | null>(settings);

    const SECTIONS = [
        { key: "general", label: "General" },
        { key: "qbo", label: "QuickBooks Online" },
    ];

    useEffect(() => {
        const pageTitle = SECTIONS.find(section => section.key === currentPage)?.label ?? "Company Settings";
        document.title = `${pageTitle} Settings - Northstar`;
    }, [currentPage]);

    useEffect(() => {
        if (settings && !localSettings) {
            setLocalSettings(settings);
        }
    }, [localSettings, settings]);

    useEffect(() => {
        if (!settings || !localSettings) {
            setPendingChanges(false);
            return;
        }

        setPendingChanges(JSON.stringify(localSettings) !== JSON.stringify(settings));
    }, [localSettings, settings]);

    // TODO: Finish implementing validation for the settings before saving. For now, we just check that the required fields are present.
    async function saveChanges() {
        if (!localSettings) return;

        setErrors(undefined);

        // Validate the local settings before saving
        const validationErrors: Record<string, string> = {};
        if (!localSettings.general.fullName)
            validationErrors["general.fullName"] = "Full company name is required.";

        if (!localSettings.general.shortName)
            validationErrors["general.shortName"] = "Short company name is required.";

        if (!localSettings.invoice.invoiceIdTemplate)
            validationErrors["invoice.invoiceIdTemplate"] = "Invoice ID template is required.";

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const saved = await updateSettings(localSettings);
        if (saved) setPendingChanges(false);
    }

    function resetLocalSettings() {
        if (settings) setLocalSettings(settings);
        setPendingChanges(false);
    };

    function handleSettingsChange(newSettings: CompanySettings) {
        setLocalSettings(newSettings);
    }

    async function handleQboDisconnected() {
        const refreshedSettings = await refresh();
        if (refreshedSettings) {
            setLocalSettings(refreshedSettings);
            setPendingChanges(false);
        }
    }

    if (settingsLoading) {
        return <LoadingOverlay header="Loading settings..." />;
    }

    if (settingsError) {
        return (
            <div>
                <p>Error loading settings: {settingsError.message}</p>
                <button onClick={refresh}>Retry</button>
            </div>
        );
    }

    if (!localSettings) {
        return <p>Company settings are not configured.</p>;
    }

    return (
        <div className="p-4">
            {settingsSaving && <LoadingOverlay header="Saving settings" message="Please wait while your changes are being saved." />}
            <div className="flex flex-col md:flex-row md:justify-between gap-4">
                <h1 className="text-2xl font-bold mb-4">Company Settings</h1>
                {pendingChanges && (
                    <div className="flex gap-2">
                        <NorthstarButton
                            type="button"
                            colorMode="auto"
                            onClick={saveChanges}
                            buttonStyle="focused"
                        >
                            <Save className="mr-1" size={16} />
                            Save Changes
                        </NorthstarButton>
                        <NorthstarButton
                            type="button"
                            colorMode="auto"
                            onClick={resetLocalSettings}
                            buttonStyle="secondary"
                        >
                            <X className="mr-1" size={16} />
                            Cancel Changes
                        </NorthstarButton>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-[20rem_minmax(0,1fr)] gap-4">
                <div className="space-y-2">
                    {SECTIONS.map((section) => (
                        <div key={section.key} className={`cursor-pointer p-2 rounded flex flex-row justify-between items-center ${currentPage === section.key ? "bg-primary text-white font-semibold" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`} onClick={() => setCurrentPage(section.key as CompanyPage)}>
                            {section.label}
                            {section.key === "qbo" && (
                                localSettings.qboSettings?.connection ? (
                                    <Link2 className="text-sm text-green-500" size={16} />
                                ) : (
                                    <Link2Off className="text-sm text-red-500" size={16} />
                                )
                            )}
                        </div>
                    ))}
                </div>
                {currentPage === "general" && (
                    <GeneralPage settings={localSettings} errors={errors} onChange={handleSettingsChange} />
                )}
                {currentPage === "qbo" && (
                    <QboPage settings={localSettings} onChange={handleSettingsChange} onDisconnected={() => void handleQboDisconnected()} />
                )}
            </div>
        </div>
    )
}
