import { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { Combobox, Textbox } from '@wps/input';
import { Button } from '@wps/input';
import type { ClientInfo } from '../types/proposalTypes';
import { EMPTY_CLIENT } from '../types/emptyClientInfo';
import { Building, Link, RefreshCw, User } from 'lucide-react';
import { fetchQboCustomers, fetchQboProjects, fetchQboStatus, startQboConnection, syncQboCustomers } from '../../../../api/qbo';
import { showNotification } from '@wps/layout';
import type { QboConnectionStatus, QboCustomer } from '@wps/scripts';

interface ClientInfoStepProps {
    initialValues?: Partial<ClientInfo>;
    onNext: (info: ClientInfo) => void;
}

export function ClientInfoStep({ initialValues, onNext }: ClientInfoStepProps) {
    const { accounts } = useMsal();
    const [form, setForm] = useState<ClientInfo>({ ...EMPTY_CLIENT, ...initialValues });
    const [clientType, setClientType] = useState<"individual" | "company">("company");
    const [copyProjectAddress, setCopyProjectAddress] = useState(false);
    const [qboStatus, setQboStatus] = useState<QboConnectionStatus | null>(null);
    const [qboCustomers, setQboCustomers] = useState<QboCustomer[]>([]);
    const [qboProjects, setQboProjects] = useState<QboCustomer[]>([]);
    const [qboCustomerId, setQboCustomerId] = useState("");
    const [qboProjectId, setQboProjectId] = useState("");
    const [qboBusy, setQboBusy] = useState(false);
    const [errors, setErrors] = useState<{
        hasError: boolean;
        errors: Partial<Record<keyof ClientInfo, string>>
    }>({
        hasError: false,
        errors: {}
    });
    const canManageQbo = accounts[0]?.username?.toLowerCase() === "nwhite@whitepointsurvey.com";

    async function loadQboData() {
        try {
            const status = await fetchQboStatus();
            setQboStatus(status);
            if (status.connected) {
                setQboCustomers(await fetchQboCustomers());
            }
        } catch {
            setQboStatus({ connected: false, realmId: "", environment: "", lastCustomerSyncDate: "", lastItemSyncDate: "", lastAccountSyncDate: "", tokenExpiresDate: "", defaultServiceItemId: "", defaultServiceItemName: "", defaultDepositAccountId: "", defaultDepositAccountName: "", stripeFeeExpenseAccountId: "", stripeFeeExpenseAccountName: "" });
        }
    }

    useEffect(() => {
        void loadQboData();
    }, []);

    useEffect(() => {
        async function loadProjects() {
            if (!qboCustomerId) {
                setQboProjects([]);
                return;
            }
            try {
                setQboProjects(await fetchQboProjects(qboCustomerId));
            } catch (error) {
                showNotification({ title: "QBO Projects Failed To Load", body: String(error), style: "warning" });
            }
        }
        void loadProjects();
    }, [qboCustomerId]);

    async function connectQbo() {
        setQboBusy(true);
        try {
            window.location.href = await startQboConnection();
        } catch (error) {
            showNotification({ title: "QBO Connection Failed", body: String(error), style: "danger" });
        } finally {
            setQboBusy(false);
        }
    }

    async function refreshQboCustomers() {
        setQboBusy(true);
        try {
            const count = await syncQboCustomers();
            await loadQboData();
            showNotification({ title: "QBO Customers Synced", body: `${count} customers refreshed.`, style: "success" });
        } catch (error) {
            showNotification({ title: "QBO Sync Failed", body: String(error), style: "danger" });
        } finally {
            setQboBusy(false);
        }
    }

    function applyQboCustomer(customerId: string) {
        const customer = qboCustomers.find((entry) => entry.id === customerId);
        setQboCustomerId(customerId);
        setQboProjectId("");
        if (!customer) return;
        setForm(prev => ({
            ...prev,
            clientName: customer.companyName || customer.displayName || prev.clientName,
            contactName: `${customer.givenName} ${customer.familyName}`.trim() || prev.contactName,
            email: customer.primaryEmail || prev.email,
            phone: customer.primaryPhone || prev.phone,
            clientAddressLine1: customer.billAddrLine1 || prev.clientAddressLine1,
            clientAddressLine2: customer.billAddrLine2 || prev.clientAddressLine2,
            clientCity: customer.billAddrCity || prev.clientCity,
            clientState: customer.billAddrState || prev.clientState,
            clientZip: customer.billAddrPostalCode || prev.clientZip,
        }));
    }

    function applyQboProject(projectId: string) {
        const project = qboProjects.find((entry) => entry.id === projectId);
        setQboProjectId(projectId);
        if (!project) return;
        const addressLine = project.shipAddrLine1 || project.billAddrLine1;
        const city = project.shipAddrCity || project.billAddrCity;
        const state = project.shipAddrState || project.billAddrState;
        const zip = project.shipAddrPostalCode || project.billAddrPostalCode;
        setForm(prev => ({
            ...prev,
            projectName: project.displayName || prev.projectName,
            address: addressLine || prev.address,
            jurisdiction: city || prev.jurisdiction,
            state: state || prev.state,
            zipCode: zip || prev.zipCode,
            email: project.primaryEmail || prev.email,
        }));
    }

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
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto] gap-3 lg:col-span-4">
                    <Combobox
                        field="proposal-qbo-customer"
                        label="QBO Customer"
                        colorMode="auto"
                        selections={qboCustomers.map((customer) => ({ key: customer.displayName, value: customer.id }))}
                        value={qboCustomerId}
                        placeholder={qboStatus?.connected ? "Select customer" : "Connect QBO first"}
                        disabled={!qboStatus?.connected}
                        onChange={(_, value) => applyQboCustomer(value)}
                    />
                    <Combobox
                        field="proposal-qbo-project"
                        label="QBO Project / Sub-Customer"
                        colorMode="auto"
                        selections={qboProjects.map((project) => ({ key: project.displayName, value: project.id }))}
                        value={qboProjectId}
                        placeholder={qboCustomerId ? "Select project" : "Select customer first"}
                        disabled={!qboCustomerId}
                        onChange={(_, value) => applyQboProject(value)}
                    />
                    {canManageQbo && (qboStatus?.connected ? (
                        <Button colorMode="auto" label="Sync QBO" style="secondary" icon={RefreshCw} onClick={() => void refreshQboCustomers()} properties={{ disabled: qboBusy }} />
                    ) : (
                        <Button colorMode="auto" label="Connect QBO" style="secondary" icon={Link} onClick={() => void connectQbo()} properties={{ disabled: qboBusy }} />
                    ))}
                </div>
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
                        <Textbox colorMode="auto"
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
                        <Textbox colorMode="auto"
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
                        <Textbox colorMode="auto"
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
                        <Textbox colorMode="auto"
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
                    <Button colorMode="auto"
                        label={copyProjectAddress ? "Clear Project Address" : "Copy Project Address"}
                        style={copyProjectAddress ? "success" : "secondary"}
                        onClick={toggleCopyProjectAddress}
                    />
                    <div className="flex flex-col gap-2">
                        <Textbox colorMode="auto"
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
                        <Textbox colorMode="auto"
                            field="clientAddressLine2"
                            label="Unit / Apt / Ste"
                            value={form.clientAddressLine2 || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, clientAddressLine2: e.target.value }))}
                            showRequiredError={false}
                        />
                        {errors.errors.clientAddressLine2 && <p className="text-red-500 text-sm">{errors.errors.clientAddressLine2}</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                        <Textbox colorMode="auto"
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
                        <Textbox colorMode="auto"
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
                        <Textbox colorMode="auto"
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
                    <Button colorMode="auto"
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
