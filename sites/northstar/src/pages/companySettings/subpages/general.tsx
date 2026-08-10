import { CompanySettings } from "cfdg/types";
import { NorthstarTextbox } from "cfdg/ui/input";

export function GeneralPage({ settings, onChange }: { settings: CompanySettings; onChange: (newSettings: CompanySettings) => void }) {
    return (
        <div>
            <h2>General Settings</h2>
            <div className="flex flex-col gap-4">
                <NorthstarTextbox
                    field="companyName"
                    label="Full Company Name"
                    required
                    value={settings.general.fullName}
                    onChange={(e) => onChange({ ...settings, general: { ...settings.general, fullName: e.target.value } })}
                />

                <NorthstarTextbox
                    field="shortName"
                    label="Short Company Name"
                    required
                    value={settings.general.shortName}
                    onChange={(e) => onChange({ ...settings, general: { ...settings.general, shortName: e.target.value } })}
                />
            </div>
        </div>
    );
}