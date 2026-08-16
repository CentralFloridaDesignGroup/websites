import { CompanySettings } from "cfdg/types/v2";
import { NorthstarTextbox } from "cfdg/ui/input";

export function GeneralPage({ settings, errors, onChange }: { settings: CompanySettings; errors?: Record<string, string>; onChange: (newSettings: CompanySettings) => void }) {
    return (
        <div>
            <h2>General Settings</h2>
            {errors && Object.keys(errors).length > 0 && (
                <div className="mb-4 rounded border border-red-500 bg-red-100 p-4 text-sm text-red-700">
                    <strong>There are errors in the form:</strong>
                    <ul className="mt-2 list-disc pl-5">
                        {Object.entries(errors).map(([field, message]) => (
                            <li key={field}>{message}</li>
                        ))}
                    </ul>
                </div>
            )}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <NorthstarTextbox
                        field="companyName"
                        label="Full Company Name"
                        required
                        value={settings.general.fullName}
                        onChange={(e) => onChange({ ...settings, general: { ...settings.general, fullName: e.target.value } })}
                    />
                    {errors && errors["general.fullName"] && (
                        <p className="text-sm text-red-500 dark:text-red-300">{errors["general.fullName"]}</p>
                    )}
                </div>
                <div className="flex flex-col gap-1">
                    <NorthstarTextbox
                        field="shortName"
                        label="Short Company Name"
                        required
                        value={settings.general.shortName}
                        onChange={(e) => onChange({ ...settings, general: { ...settings.general, shortName: e.target.value } })}
                    />
                    {errors && errors["general.shortName"] && (
                        <p className="text-sm text-red-500 dark:text-red-300">{errors["general.shortName"]}</p>
                    )}
                </div>
            </div>
        </div>
    );
}

