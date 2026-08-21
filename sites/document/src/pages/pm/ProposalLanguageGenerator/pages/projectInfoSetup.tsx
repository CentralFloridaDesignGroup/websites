import { useEffect, useState } from "react";
import { ClientInfo } from "../types/proposalTypes";
import { EMPTY_CLIENT } from "../types/emptyClientInfo";
import { Button, Checkbox, Combobox, Textbox } from "cfdg/input";
import { RefreshCw } from 'lucide-react';
import type { EntraUserAccount } from 'cfdg/types/v1';
import { fetchEligibleProjectManagers } from '../../../../api/entra';
import { fetchNextProjectNumber } from '../../../../api/projectManagement';
import { useMsal } from '@azure/msal-react';
import { COUNTIES, STATES } from 'cfdg/types/v1/constants';

interface ProjectInfoSetupProps {
    initialValues: Partial<ClientInfo> | undefined;
    onNext: (info: ClientInfo, manager: EntraUserAccount) => void;
}

export function ProjectInfoSetup({ initialValues, onNext }: ProjectInfoSetupProps) {
    const { accounts } = useMsal();
    const [form, setForm] = useState<Partial<ClientInfo>>({ ...EMPTY_CLIENT, ...initialValues });
    const [errors, setErrors] = useState<{
        hasError: boolean;
        errors: Partial<Record<keyof ClientInfo, string>>
    }>({
        hasError: false,
        errors: {}
    });
    const [managers, setManagers] = useState<EntraUserAccount[]>([]);
    const [managerId, setManagerId] = useState('');
    const [manualNumber, setManualNumber] = useState(Boolean(initialValues?.projectNumber));
    async function refreshNumber() { const year = (form.proposalDate || new Date().toISOString()).slice(2, 4); try { const projectNumber = await fetchNextProjectNumber(year); setForm(prev => ({ ...prev, projectNumber })); setManualNumber(false) } catch { /* validation is shown on final creation */ } }
    useEffect(() => { void refreshNumber(); void fetchEligibleProjectManagers().then((users) => { setManagers(users); const email = accounts[0]?.username?.toLowerCase(); const current = users.find((user) => (user.mail || user.userPrincipalName).toLowerCase() === email); if (current) setManagerId(current.id) }).catch(() => undefined) }, []);
    useEffect(() => { if (!manualNumber) void refreshNumber() }, [form.proposalDate]);


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
        if (!managerId) { setErrors({ hasError: true, errors: { ...newErrors, whitePointSigner: 'Select a project manager' } }); return false; }
        return !hasError;
    }


    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold">Project Information Setup</h2>
            <p className="mb-6 text-gray-600">This is where you set up the project information.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                    <Textbox colorMode="auto"
                        field="projectNumber"
                        label="Project Number"
                        required
                        value={form.projectNumber || ''}
                        onChange={(e) => { setManualNumber(true); setForm(prev => ({ ...prev, projectNumber: e.target.value })) }}
                        showRequiredError={false}
                    />
                    {errors.errors.projectNumber && <p className="text-red-500 text-sm">{errors.errors.projectNumber}</p>}
                    <Button label="Refresh" size="small" style="textonly" icon={RefreshCw} onClick={() => void refreshNumber()} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 lg:col-span-2">
                    <div className="flex flex-col gap-2 md:col-span-4">
                        <Textbox colorMode="auto"
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
                        <Textbox colorMode="auto"
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
                        <Textbox colorMode="auto"
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
                        <Checkbox colorMode="auto"
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
                            <Textbox colorMode="auto"
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
                            <Checkbox colorMode="auto"
                                id="jurisdictionUnincorporated"
                                label="Unincorporated Area"
                                checked={form.isJurisdictionUnincorporated || false}
                                onChange={(e) => setForm(prev => ({ ...prev, isJurisdictionUnincorporated: e.target.checked }))}
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Combobox colorMode="auto"
                            field="county"
                            label="County"
                            selections={Object.values(COUNTIES).map((county) => ({ key: county, value: county }))}
                            value={form.county || ''}
                            placeholder="Select county"
                            onChange={(_, value) => setForm(prev => ({ ...prev, county: value }))}
                        />
                        {errors.errors.county && <p className="text-red-500 text-sm">{errors.errors.county}</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                        <Combobox colorMode="auto"
                            field="state"
                            label="State"
                            selections={Object.entries(STATES).map(([code, name]) => ({ key: `${name} (${code})`, value: code }))}
                            value={form.state || ''}
                            placeholder="Select state"
                            onChange={(_, value) => setForm(prev => ({ ...prev, state: value }))}
                        />
                        {errors.errors.state && <p className="text-red-500 text-sm">{errors.errors.state}</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                        <Textbox colorMode="auto"
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
                    <Textbox colorMode="auto"
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
                <div className="lg:col-span-3"><Combobox field="proposal-project-manager" label="Internal Project Manager" colorMode="auto" selections={managers.map((user) => ({ key: `${user.displayName}${user.jobTitle ? ` - ${user.jobTitle}` : ''}`, value: user.id }))} value={managerId} placeholder="Select project manager" onChange={(_, value) => setManagerId(value)} />{errors.errors.whitePointSigner && <p className="text-red-500 text-sm">{errors.errors.whitePointSigner}</p>}</div>
                <div className="flex justify-end md:col-span-2 lg:col-span-3">
                    <Button colorMode="auto"
                        label="Next: Enter Client Information"
                        style="primary"
                        onClick={() => {
                            const isFormValid = validate();
                            if (isFormValid) {
                                const manager = managers.find((entry) => entry.id === managerId);
                                if (manager) onNext({ ...form, whitePointSigner: manager.displayName, whitePointTitle: manager.jobTitle || 'Project Manager' } as ClientInfo, manager);
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
