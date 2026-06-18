import { useState } from 'react';
import { Textbox } from '@wps/input';
import { Button } from '@wps/input';
import type { ClientInfo } from '../types/noteEntry';

interface ClientInfoStepProps {
    initialValues?: Partial<ClientInfo>;
    onNext: (info: ClientInfo) => void;
}

const EMPTY: ClientInfo = {
    clientName: '',
    contactName: '',
    clientAddressLine1: '',
    clientAddressCityStZip: '',
    phone: '',
    email: '',
    projectNumber: '',
    projectName: '',
    proposalDate: new Date().toISOString().split('T')[0],
    projectAddress: '',
    projectJurisStZip: '',
    parcelIdList: '',
    whitePointSigner: '',
    whitePointTitle: '',
    projectCost: '',
    projectRetainer: '',
};

export function ClientInfoStep({ initialValues, onNext }: ClientInfoStepProps) {
    const [form, setForm] = useState<ClientInfo>({ ...EMPTY, ...initialValues });
    const [errors, setErrors] = useState<Partial<Record<keyof ClientInfo, string>>>({});

    const set = (key: keyof ClientInfo) => (_: string, value: string) => {
        setForm(prev => ({ ...prev, [key]: value }));
        if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
    };

    const validate = (): boolean => {
        const required: (keyof ClientInfo)[] = [
            'clientName', 'contactName', 'clientAddressLine1', 'clientAddressCityStZip',
            'projectNumber', 'projectName', 'proposalDate',
        ];
        const next: Partial<Record<keyof ClientInfo, string>> = {};
        for (const key of required) {
            if (!form[key].trim()) next[key] = 'Required';
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleNext = () => {
        if (validate()) onNext(form);
    };

    return (
        <div className="max-w-3xl mx-auto px-4 py-6">
            <h2 className="text-xl font-semibold mb-1 text-gray-900 dark:text-white">Client Information</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Enter the client and project details that will appear on the proposal.</p>

            <section className="mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Client</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Textbox field="clientName" label="Client Name" required value={form.clientName} onValidChange={set('clientName')} />
                        {errors.clientName && <p className="text-red-500 text-xs mt-1">{errors.clientName}</p>}
                    </div>
                    <div>
                        <Textbox field="contactName" label="Contact Person" required value={form.contactName} onValidChange={set('contactName')} />
                        {errors.contactName && <p className="text-red-500 text-xs mt-1">{errors.contactName}</p>}
                    </div>
                    <div>
                        <Textbox field="clientAddressLine1" label="Street Address" required value={form.clientAddressLine1} onValidChange={set('clientAddressLine1')} />
                        {errors.clientAddressLine1 && <p className="text-red-500 text-xs mt-1">{errors.clientAddressLine1}</p>}
                    </div>
                    <div>
                        <Textbox field="clientAddressCityStZip" label="City, State ZIP" required value={form.clientAddressCityStZip} onValidChange={set('clientAddressCityStZip')} />
                        {errors.clientAddressCityStZip && <p className="text-red-500 text-xs mt-1">{errors.clientAddressCityStZip}</p>}
                    </div>
                    <div>
                        <Textbox field="phone" label="Phone" value={form.phone} onValidChange={set('phone')} />
                    </div>
                    <div>
                        <Textbox field="email" label="Email" value={form.email} onValidChange={set('email')} />
                    </div>
                </div>
            </section>

            <section className="mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Project</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Textbox field="projectNumber" label="Project Number *" value={form.projectNumber} onValidChange={set('projectNumber')} />
                        {errors.projectNumber && <p className="text-red-500 text-xs mt-1">{errors.projectNumber}</p>}
                    </div>
                    <div>
                        <Textbox field="proposalDate" label="Proposal Date *" value={form.proposalDate} onValidChange={set('proposalDate')} />
                        {errors.proposalDate && <p className="text-red-500 text-xs mt-1">{errors.proposalDate}</p>}
                    </div>
                    <div className="md:col-span-2">
                        <Textbox field="projectName" label="Project Name / Description *" value={form.projectName} onValidChange={set('projectName')} />
                        {errors.projectName && <p className="text-red-500 text-xs mt-1">{errors.projectName}</p>}
                    </div>
                    <div>
                        <Textbox field="projectAddress" label="Project Street Address" value={form.projectAddress} onValidChange={set('projectAddress')} />
                    </div>
                    <div>
                        <Textbox field="projectJurisStZip" label="Project City / Jurisdiction, State ZIP" value={form.projectJurisStZip} onValidChange={set('projectJurisStZip')} />
                    </div>
                    <div className="md:col-span-2">
                        <Textbox field="parcelIdList" label="Parcel ID(s)" placeholder="e.g. 01-23-45-678-910" value={form.parcelIdList} onValidChange={set('parcelIdList')} />
                    </div>
                </div>
            </section>

            <section className="mb-8">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">White Point Signer</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Textbox field="whitePointSigner" label="Signer Name" value={form.whitePointSigner} onValidChange={set('whitePointSigner')} />
                    <Textbox field="whitePointTitle" label="Signer Title" value={form.whitePointTitle} onValidChange={set('whitePointTitle')} />
                </div>
            </section>

            <div className="flex justify-end">
                <Button label="Next: Select Services" style="primary" onClick={handleNext} />
            </div>
        </div>
    );
}
