import { useState } from 'react';
import { Textbox } from '@wps/input';
import { Button } from '@wps/input';
import type { ClientInfo } from '../types/proposalTypes';
import { EMPTY_CLIENT } from '../types/emptyClientInfo';
import { Building, User } from 'lucide-react';

interface ClientInfoStepProps {
    initialValues?: Partial<ClientInfo>;
    onNext: (info: ClientInfo) => void;
}

export function ClientInfoStep({ initialValues, onNext }: ClientInfoStepProps) {
    const [form, setForm] = useState<ClientInfo>({ ...EMPTY_CLIENT, ...initialValues });
    const [clientType, setClientType] = useState<"individual" | "company">("company");
    const [copyProjectAddress, setCopyProjectAddress] = useState(false);
    const [errors, setErrors] = useState<{
        hasError: boolean;
        errors: Partial<Record<keyof ClientInfo, string>>
    }>({
        hasError: false,
        errors: {}
    });

    /** Validates the form fields and updates the error state. */
    function validate(): boolean {
        var requiredFields: (keyof ClientInfo)[] = [
            "clientName",
            "phone",
            "email",
            "clientAddressLine1",
            "clientCity",
            "clientState",
            "clientZip",
            ...(clientType === "company" ? ["contactName" as keyof ClientInfo] : [])
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

    function toggleCopyProjectAddress() {
        if (!copyProjectAddress) {
            setForm(prev => ({
                ...prev,
                clientAddressLine1: prev.address,
                clientCity: prev.jurisdiction,
                clientState: prev.state,
                clientZip: prev.zipCode
            }));
        }
        else {
            setForm(prev => ({
                ...prev,
                clientAddressLine1: '',
                clientCity: '',
                clientState: '',
                clientZip: ''
            }));
        }
        setCopyProjectAddress(prev => !prev);
    }

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold">Client Information Setup</h2>
            <p className="mb-6 text-gray-600">This is where you set up the client information.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex flex-row gap-2 lg:col-span-2 justify-between">
                    <div className={`flex flex-col flex-1 ${clientType === "company" ? "bg-blue-600 dark:bg-blue-800 text-white" : "bg-gray-200 dark:bg-gray-800"} px-4 py-2 rounded items-center cursor-pointer`} onClick={() => setClientType("company")}>
                        <Building size={24} className="mb-1" />
                        <h2 className="text-lg font-bold">Company Client</h2>
                        <p className="text-sm">Must specify who in the company is requesting services.</p>
                    </div>
                    <div className={`flex flex-col flex-1 ${clientType === "individual" ? "bg-blue-600 dark:bg-blue-800 text-white" : "bg-gray-200 dark:bg-gray-800"} px-4 py-2 rounded items-center cursor-pointer`} onClick={() => setClientType("individual")}>
                        <User size={24} className="mb-1" />
                        <h2 className="text-lg font-bold">Individual Client</h2>
                        <p className="text-sm">We assume the individual is the primary contact.</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:col-span-2">
                    <div className="flex flex-col gap-2">
                        <Textbox
                            field="clientName"
                            label="Client Name"
                            required
                            value={form.clientName || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, clientName: e.target.value }))}
                            showRequiredError={false}
                        />
                        {errors.errors.clientName && <p className="text-red-500 text-sm">{errors.errors.clientName}</p>}
                    </div>
                    <div className={`flex flex-col gap-2 ${clientType === "company" ? "" : "invisible"}`}>
                        <Textbox
                            field="contactName"
                            label="Contact Name"
                            required
                            value={form.contactName || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, contactName: e.target.value }))}
                            showRequiredError={false}
                        />
                        {errors.errors.contactName && <p className="text-red-500 text-sm">{errors.errors.contactName}</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                        <Textbox
                            field="emailAddress"
                            label="Email Address"
                            required
                            value={form.email || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                            showRequiredError={false}
                        />
                        {errors.errors.email && <p className="text-red-500 text-sm">{errors.errors.email}</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                        <Textbox
                            field="phone"
                            label="Phone Number"
                            required
                            value={form.phone || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                            showRequiredError={false}
                        />
                        {errors.errors.phone && <p className="text-red-500 text-sm">{errors.errors.phone}</p>}
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 lg:col-span-4">
                    <Button
                        label={copyProjectAddress ? "Clear Project Address" : "Copy Project Address"}
                        style={copyProjectAddress ? "success" : "secondary"}
                        onClick={toggleCopyProjectAddress}
                    />
                    <div className="flex flex-col gap-2">
                        <Textbox
                            field="clientAddressLine1"
                            label="Client Mailing Address"
                            required
                            value={form.clientAddressLine1 || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, clientAddressLine1: e.target.value }))}
                            showRequiredError={false}
                            readOnly={copyProjectAddress}
                        />
                        {errors.errors.clientAddressLine1 && <p className="text-red-500 text-sm">{errors.errors.clientAddressLine1}</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                        <Textbox
                            field="clientAddressLine2"
                            label="Unit / Apt / Ste"
                            value={form.clientAddressLine2 || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, clientAddressLine2: e.target.value }))}
                            showRequiredError={false}
                        />
                        {errors.errors.clientAddressLine2 && <p className="text-red-500 text-sm">{errors.errors.clientAddressLine2}</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                        <Textbox
                            field="clientCity"
                            label="City"
                            required
                            value={form.clientCity || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, clientCity: e.target.value }))}
                            showRequiredError={false}
                            readOnly={copyProjectAddress}
                        />
                        {errors.errors.clientCity && <p className="text-red-500 text-sm">{errors.errors.clientCity}</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                        <Textbox
                            field="clientState"
                            label="State"
                            required
                            value={form.clientState || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, clientState: e.target.value }))}
                            showRequiredError={false}
                            readOnly={copyProjectAddress}
                        />
                        {errors.errors.clientState && <p className="text-red-500 text-sm">{errors.errors.clientState}</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                        <Textbox
                            field="clientZip"
                            label="Zip Code"
                            required
                            value={form.clientZip || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, clientZip: e.target.value }))}
                            showRequiredError={false}
                            readOnly={copyProjectAddress}
                        />
                        {errors.errors.clientZip && <p className="text-red-500 text-sm">{errors.errors.clientZip}</p>}
                    </div>
                </div>
                <div className="flex justify-end md:col-span-2 lg:col-span-4">
                    <Button
                        label="Next: Select Services"
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
