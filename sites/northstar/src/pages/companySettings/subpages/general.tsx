import { CompanySettings } from "cfdg/types";
import { NorthstarCheckbox, NorthstarTextbox } from "cfdg/ui/input";

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

                <h3 className="mt-4 text-lg font-semibold">Invoice Branding</h3>
                <div className="flex flex-col gap-1">
                    <NorthstarTextbox
                        field="invoiceBrandingName"
                        label="Invoice Company Name"
                        required
                        value={settings.general.invoiceBranding.name}
                        onChange={(e) => onChange({ ...settings, general: { ...settings.general, invoiceBranding: { ...settings.general.invoiceBranding, name: e.target.value } } })}
                    />
                    {errors && errors["general.invoiceBranding.name"] && (
                        <p className="text-sm text-red-500 dark:text-red-300">{errors["general.invoiceBranding.name"]}</p>
                    )}
                </div>
                <div className="flex flex-col gap-1">
                    <NorthstarTextbox
                        field="invoicePhone"
                        label="Invoice Telephone"
                        required
                        value={settings.general.invoiceBranding.phone}
                        onChange={(e) => onChange({ ...settings, general: { ...settings.general, invoiceBranding: { ...settings.general.invoiceBranding, phone: e.target.value } } })}
                    />
                    {errors && errors["general.invoiceBranding.phone"] && (
                        <p className="text-sm text-red-500 dark:text-red-300">{errors["general.invoiceBranding.phone"]}</p>
                    )}
                </div>

                <h3 className="mt-4 text-lg font-semibold">Invoice Numbering</h3>
                <p className="max-w-2xl text-sm text-neutral-600 dark:text-neutral-300">
                    Configure separate templates for standard invoices and invoice bundles. Use YY or YYYY for the year, MM for the month, and one or more # characters for the sequence. Rendered numbers must be 15 characters or fewer.
                </p>
                <div className="flex flex-col gap-1">
                    <NorthstarTextbox
                        field="invoiceNumberTemplate"
                        label="Invoice Number Template"
                        required
                        characterLimit={15}
                        value={settings.general.invoiceNumbering.invoiceTemplate}
                        onChange={(e) => onChange({ ...settings, general: { ...settings.general, invoiceNumbering: { ...settings.general.invoiceNumbering, invoiceTemplate: e.target.value } } })}
                    />
                    {errors && errors["general.invoiceNumbering.invoiceTemplate"] && (
                        <p className="text-sm text-red-500 dark:text-red-300">{errors["general.invoiceNumbering.invoiceTemplate"]}</p>
                    )}
                </div>
                <div className="flex flex-col gap-1">
                    <NorthstarTextbox
                        field="bundleNumberTemplate"
                        label="Bundle Number Template"
                        required
                        characterLimit={15}
                        value={settings.general.invoiceNumbering.bundleTemplate}
                        onChange={(e) => onChange({ ...settings, general: { ...settings.general, invoiceNumbering: { ...settings.general.invoiceNumbering, bundleTemplate: e.target.value } } })}
                    />
                    {errors && errors["general.invoiceNumbering.bundleTemplate"] && (
                        <p className="text-sm text-red-500 dark:text-red-300">{errors["general.invoiceNumbering.bundleTemplate"]}</p>
                    )}
                </div>
                <div className="flex flex-col gap-1">
                    <NorthstarTextbox
                        field="invoiceNumberStartingSequence"
                        label="Starting Sequence"
                        required
                        type="number"
                        min={1}
                        value={settings.general.invoiceNumbering.startingSequence}
                        onChange={(e) => onChange({ ...settings, general: { ...settings.general, invoiceNumbering: { ...settings.general.invoiceNumbering, startingSequence: Math.max(1, Number(e.target.value) || 1) } } })}
                    />
                    {errors && errors["general.invoiceNumbering.startingSequence"] && (
                        <p className="text-sm text-red-500 dark:text-red-300">{errors["general.invoiceNumbering.startingSequence"]}</p>
                    )}
                </div>
                <NorthstarCheckbox
                    field="invoiceNumberReset"
                    label="Reset Sequence Each Year"
                    description="If checked, the invoice sequence will reset to the starting sequence at the beginning of each year."
                    checked={settings.general.invoiceNumbering.resetEachYear}
                    onChange={(e) => onChange({ ...settings, general: { ...settings.general, invoiceNumbering: { ...settings.general.invoiceNumbering, resetEachYear: e.target.checked } } })}
                />
            </div>
        </div>
    );
}

