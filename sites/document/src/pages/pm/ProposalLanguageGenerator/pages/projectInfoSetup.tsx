import { useState } from "react";
import { ClientInfo } from "../types/proposalTypes";
import { EMPTY_CLIENT } from "../types/emptyClientInfo";
import { Button, Checkbox, Textbox } from "@wps/input";

interface ProjectInfoSetupProps {
    initialValues: Partial<ClientInfo> | undefined;
    onNext: (info: ClientInfo) => void;
}

export function ProjectInfoSetup({ initialValues, onNext }: ProjectInfoSetupProps) {
    const [form, setForm] = useState<Partial<ClientInfo>>({ ...EMPTY_CLIENT, ...initialValues });
    const [errors, setErrors] = useState<{
        hasError: boolean;
        errors: Partial<Record<keyof ClientInfo, string>>
    }>({
        hasError: false,
        errors: {}
    });


    /** Validates the form fields and updates the error state. */
    function validate(): boolean {
        const requiredFields: (keyof ClientInfo)[] = [
            'projectNumber',
            'projectName',
            'proposalDate',
            'address',
            'county',
            'state',
            'zipCode',
            'whitePointSigner',
            'whitePointTitle',
            'proposalDate'
        ];

        const newErrors: Partial<Record<keyof ClientInfo, string>> = {};
        let hasError = false;
        for (const field of requiredFields) {
            if (!form[field] || form[field]?.toString().trim() === '') {
                newErrors[field] = 'This field is required';
                hasError = true;
            }
        }
        setErrors({ hasError, errors: newErrors });
        return !hasError;
    }


    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold">Project Information Setup</h2>
            <p className="mb-6 text-gray-600">This is where you set up the project information.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                    <Textbox
                        field="projectNumber"
                        label="Project Number"
                        required
                        value={form.projectNumber || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, projectNumber: e.target.value }))}
                        showRequiredError={false}
                    />
                    {errors.errors.projectNumber && <p className="text-red-500 text-sm">{errors.errors.projectNumber}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 lg:col-span-2">
                    <div className="flex flex-col gap-2 md:col-span-4">
                        <Textbox
                            field="projectName"
                            label="Project Name"
                            required
                            value={form.projectName || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, projectName: e.target.value }))}
                            showRequiredError={false}
                        />
                        {errors.errors.projectName && <p className="text-red-500 text-sm">{errors.errors.projectName}</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                        <Textbox
                            field="proposalDate"
                            label="Proposal Date"
                            type="date"
                            required
                            value={form.proposalDate || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, proposalDate: e.target.value }))}
                            showRequiredError={false}
                        />
                        {errors.errors.proposalDate && <p className="text-red-500 text-sm">{errors.errors.proposalDate}</p>}
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex-1 flex-col">
                        <Textbox
                            field="projectAddress"
                            label="Project Address"
                            required
                            value={form.address || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                            showRequiredError={false}
                        />
                        {errors.errors.address && <p className="text-red-500 text-sm">{errors.errors.address}</p>}
                    </div>
                    <div className="shrink-0">
                        <Checkbox
                            id="isApproximateAddress"
                            label="Address is Approximate"
                            checked={form.approxAddress || false}
                            onChange={(e) => setForm(prev => ({ ...prev, approxAddress: e.target.checked }))}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:col-span-2">
                    <div className="flex flex-col gap-2">
                        <div className="flex-1 flex-col">
                            <Textbox
                                field="projectJurisdiction"
                                label="Jurisdiction"
                                required
                                value={form.jurisdiction || ''}
                                onChange={(e) => setForm(prev => ({ ...prev, jurisdiction: e.target.value }))}
                                showRequiredError={false}
                            />
                            {errors.errors.jurisdiction && <p className="text-red-500 text-sm">{errors.errors.jurisdiction}</p>}
                        </div>
                        <div className="shrink-0">
                            <Checkbox
                                id="jurisdictionUnincorporated"
                                label="Unincorporated Area"
                                checked={form.isJurisdictionUnincorporated || false}
                                onChange={(e) => setForm(prev => ({ ...prev, isJurisdictionUnincorporated: e.target.checked }))}
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Textbox
                            field="county"
                            label="County"
                            required
                            value={form.county || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, county: e.target.value }))}
                            showRequiredError={false}
                        />
                        {errors.errors.county && <p className="text-red-500 text-sm">{errors.errors.county}</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                        <Textbox
                            field="state"
                            label="State"
                            required
                            value={form.state || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, state: e.target.value }))}
                            showRequiredError={false}
                        />
                        {errors.errors.state && <p className="text-red-500 text-sm">{errors.errors.state}</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                        <Textbox
                            field="zipCode"
                            label="Zip Code"
                            required
                            value={form.zipCode || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, zipCode: e.target.value }))}
                            showRequiredError={false}
                        />
                        {errors.errors.zipCode && <p className="text-red-500 text-sm">{errors.errors.zipCode}</p>}
                    </div>
                </div>
                <div className="flex flex-col gap-2 md:col-span-2 lg:col-span-3">
                    <Textbox
                        field="parcelIdList"
                        label="Parcel ID List"
                        required
                        value={form.parcelIdList || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, parcelIdList: e.target.value }))}
                        showRequiredError={false}
                    />
                    <p className="text-gray-500 text-sm">Enter parcel IDs separated by commas. e.g. 01-23-45-678-910, 11-22-33-444-555</p>
                    {errors.errors.parcelIdList && <p className="text-red-500 text-sm">{errors.errors.parcelIdList}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:col-span-3">
                    <div className="flex flex-col gap-2">
                        <Textbox
                            field="signerName"
                            label="Signer Name"
                            required
                            value={form.whitePointSigner || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, whitePointSigner: e.target.value }))}
                            showRequiredError={false}
                        />
                        {errors.errors.whitePointSigner && <p className="text-red-500 text-sm">{errors.errors.whitePointSigner}</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                        <Textbox
                            field="signerTitle"
                            label="Signer Title"
                            required
                            value={form.whitePointTitle || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, whitePointTitle: e.target.value }))}
                            showRequiredError={false}
                        />
                        {errors.errors.whitePointTitle && <p className="text-red-500 text-sm">{errors.errors.whitePointTitle}</p>}
                    </div>
                </div>
                <div className="flex justify-end md:col-span-2 lg:col-span-3">
                    <Button
                        label="Next: Enter Client Information"
                        style="primary"
                        onClick={() => {
                            const isFormValid = validate();
                            if (isFormValid) {
                                onNext(form as ClientInfo);
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
}