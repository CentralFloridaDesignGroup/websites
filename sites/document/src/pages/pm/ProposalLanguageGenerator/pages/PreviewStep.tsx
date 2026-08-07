import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'cfdg/input';
import { showNotification } from 'cfdg/layout';
import { generateWordDocument } from '../utils/documentGenerator';
import type { ClientInfo, ServiceEntry } from '../types/proposalTypes';
import { formatProposalDate, Proposal } from '../types/proposalTypes';
import type { EntraUserAccount } from 'cfdg/types';
import { createProject, fetchNextProjectNumber, saveProjectManager } from '../../../../api/projectManagement';
import { fetchProjectTasks } from '../../../../api/projectManagement';
import { createInvoice } from '../../../../api/invoices';

interface PreviewStepProps {
    clientInfo: ClientInfo;
    services: ServiceEntry[];
    onBack: () => void;
    clientId: string;
    contactId: string;
    manager: EntraUserAccount | null;
    createdProjectId: string;
    onProjectCreated: (projectId: string) => void;
    createdRetainerInvoiceId: string;
    onRetainerInvoiceCreated: (invoiceId: string) => void;
}

export function PreviewStep({ clientInfo, services, onBack, clientId, contactId, manager, createdProjectId, onProjectCreated, createdRetainerInvoiceId, onRetainerInvoiceCreated }: PreviewStepProps) {
    const [generatingWord, setGeneratingWord] = useState(false);
    const submittalPackage = new Proposal(clientInfo, services);

    const handleDownloadWord = async () => {
        setGeneratingWord(true);
        try {
            let projectId = createdProjectId;
            if (!projectId) {
                if (!clientId || !manager) throw new Error('Client and internal project manager are required.');
                const buildPayload = (projectNumber: string) => ({ parentCustomerId: clientId, name: `${projectNumber} - ${clientInfo.projectName}`, address: { line1: clientInfo.address, line2: '', city: clientInfo.jurisdiction, state: clientInfo.state as 'FL', postalCode: clientInfo.zipCode }, parcelId: clientInfo.parcelIdList, tasks: services.map((service, index) => ({ name: service.serviceName, scopeOfWork: service.scopeOfWork, contractAmountCents: Math.round((Number(service.serviceCost) || 0) * 100), retainerCents: Math.round((Number(service.serviceRetainer) || 0) * 100), priceType: service.serviceType, sortOrder: index, active: true })) });
                let created;
                try { created = await createProject(buildPayload(clientInfo.projectNumber)); } catch (error) {
                    if (!String(error).includes('already in use')) throw error;
                    const next = await fetchNextProjectNumber(clientInfo.proposalDate.slice(2, 4));
                    clientInfo.projectNumber = next;
                    created = await createProject(buildPayload(next));
                }
                projectId = created.id;
                onProjectCreated(projectId);
            }
            if (!manager) throw new Error('An internal project manager is required.');
            await saveProjectManager(projectId, manager.displayName, manager.mail || manager.userPrincipalName);
            if (!createdRetainerInvoiceId) {
                const tasks = await fetchProjectTasks(projectId);
                const retainerTasks = tasks.filter((task) => task.retainerCents > 0);
                if (retainerTasks.length > 0) {
                    const invoice = await createInvoice({
                        qboCustomerId: clientId,
                        qboProjectId: projectId,
                        contactIds: contactId ? [contactId] : [],
                        clientName: clientInfo.clientName,
                        clientEmail: clientInfo.email,
                        poNumber: '',
                        projectReference: `${clientInfo.projectNumber} - ${clientInfo.projectName}`,
                        issueDate: clientInfo.proposalDate,
                        dueDate: '',
                        notes: 'Proposal retainer invoice.',
                        internalNote: 'Automatically created from the proposal retainer.',
                        previouslyBilledCents: 0,
                        lineItems: retainerTasks.map((task) => {
                            const contractAmountCents = Math.max(task.contractAmountCents, task.retainerCents);
                            return { projectTaskId: task.id, description: `${task.name} Retainer`, quantity: (task.retainerCents / contractAmountCents) * 100, unitAmountCents: contractAmountCents, contractAmountCents, percentComplete: (task.retainerCents / contractAmountCents) * 100, billInFull: false };
                        }),
                    });
                    onRetainerInvoiceCreated(invoice.id);
                    showNotification({
                        title: 'Retainer Draft Created',
                        body: <span>{invoice.invoiceNumber} is ready. <Link to={`/invoices?invoiceId=${encodeURIComponent(invoice.id)}`} className="font-semibold text-primary underline">Open invoice</Link></span>,
                        style: 'success',
                        duration: 10,
                    });
                }
            }
            await generateWordDocument(submittalPackage.generateDocXJson());
            showNotification({ title: 'Word Document Downloaded', body: 'The proposal has been saved as a .docx file.', style: 'success' });
        } catch (err) {
            console.error(err);
            showNotification({ title: 'Download Failed', body: 'There was an error generating the Word document.', style: 'danger' });
        } finally {
            setGeneratingWord(false);
        }
    };

    const formattedCost = (cost: string) => {
        const num = parseFloat(cost);
        if (isNaN(num)) return cost;
        return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    };

    return (
        <div className="px-4 py-6">

            {/* top nav */}
            <div className="flex justify-between mb-6">
                <Button colorMode="auto" label="Back" style="secondary" onClick={onBack} />
                <Button colorMode="auto" label="Save and Download" style="primary" onClick={handleDownloadWord} properties={{disabled: generatingWord}} />
                    {/*<button
                        onClick={handleDownloadWord}
                        disabled={generatingWord}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5a] text-white text-sm font-medium rounded hover:bg-[#16304e] disabled:opacity-50 transition-colors"
                    >
                        <Download size={16} />
                        {generatingWord ? 'Generating...' : 'Download .docx'}
                    </button>*/}
            </div>

            {/* Document preview, mimicking the paper with final layout. */}
            <div className="border border-black bg-white shadow-lg">
                {/* Header */}
                <div className="text-black px-8 py-6">
                    <p className="text-xs font-semibold tracking-widest uppercase opacity-75 mb-1">White Point Surveying &amp; Mapping LLC</p>
                    <h1 className="text-xl font-bold">PROPOSAL FOR PROFESSIONAL SURVEYING SERVICES</h1>
                </div>

                <div className="px-8 py-6 space-y-6">
                    {/* Client / project info grid */}
                    <section className="grid grid-cols-2 gap-x-8 gap-y-1">
                        <InfoRow label="Client" value={submittalPackage.clientInfo.clientName} />
                        <InfoRow label="Project #" value={submittalPackage.clientInfo.projectNumber} />
                        <InfoRow label="Contact" value={submittalPackage.clientInfo.contactName} />
                        <InfoRow label="Proposal Date" value={formatProposalDate(submittalPackage.clientInfo.proposalDate)} />
                        <InfoRow label="Address" value={submittalPackage.getClientAddressLine()} />
                        <InfoRow label="Email" value={submittalPackage.clientInfo.email} />
                        <InfoRow label="" value={submittalPackage.getClientCityStZip()} />
                        <InfoRow label="Phone" value={submittalPackage.clientInfo.phone} />
                    </section>

                    {/* Project address */}
                    <section>
                        <InfoRow label="Project Name" value={submittalPackage.clientInfo.projectName} />
                        <InfoRow label="Project Location" value={[submittalPackage.getProjectAddress(), submittalPackage.getProjectJurisStZip(), `Parcel ID: ${submittalPackage.getFormattedParcelIdList()}`]} />
                    </section>

                    {/* Project Cost and Retainer */}
                    <section>
                        <div className="flex gap-2">
                            <span className="font-semibold text-black w-[20%]">Project Cost:</span>
                            <p className="text-primary font-bold">{formattedCost(submittalPackage.clientInfo.projectCost)}</p>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-black w-[20%]">Price to be paid before work can begin:</span>
                            <p className="text-neutral-600 font-bold">{formattedCost(submittalPackage.clientInfo.projectRetainer)}</p>
                        </div>
                    </section>

                    {/* Scope of Work */}
                    <section>
                        <h2 className="font-bold text-lg text-black mb-2">Scope of Work</h2>
                        <p className="text-black mb-4">
                            Based on our understanding of your needs, we have developed the detailed scope of work below.
                            This scope of work is based on our professional opinion and advise to best service your goals.
                        </p>

                        {services.length === 0 ? (
                            <p className="text-sm text-black italic">No service phases selected.</p>
                        ) : (
                            <div className="space-y-4">
                                {services.map((service, index) => {
                                    const phaseNum = (index + 1).toString().padStart(2, '0');
                                    return (
                                        <div key={`${service.serviceName}-${index}`}>
                                            <h3 className="font-bold text-black underline uppercase mb-2">
                                                Phase {phaseNum}: {service.serviceName}
                                            </h3>
                                            <div className="text-black space-y-2">
                                                {service.scopeOfWork}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <section>
                        <h2 className="font-bold text-lg text-black mb-2">Fee Schedule</h2>
                        <table className="min-w-full border-collapse border border-gray-300 text-black">
                            <thead>
                                <tr>
                                    <th className="border border-gray-300 border-b border-b-black px-4 py-2 text-center w-[10%]">Phase</th>
                                    <th className="border border-gray-300 border-b border-b-black px-4 py-2 text-left w-[40%]">Description</th>
                                    <th className="border border-gray-300 border-b border-b-black px-4 py-2 text-center w-[20%]">Fee</th>
                                    <th className="border border-gray-300 border-b border-b-black px-4 py-2 text-center w-[20%]">Retainer</th>
                                    <th className="border border-gray-300 border-b border-b-black px-4 py-2 text-center w-[10%]">Type</th>
                                </tr>
                            </thead>
                            {services.length === 0 ? (
                                <tbody>
                                    <tr>
                                        <td colSpan={5} className="border border-gray-300 px-4 py-2 text-center italic">No services selected.</td>
                                    </tr>
                                </tbody>
                            ) : (
                                <tbody>
                                    {services.map((service, index) => {
                                        const phaseNum = (index + 1).toString().padStart(2, '0');
                                        return (
                                            <tr key={service.serviceName}>
                                                <td className="border border-gray-300 px-4 py-2 text-center">{phaseNum}</td>
                                                <td className="border border-gray-300 px-4 py-2">{service.serviceName}</td>
                                                <td className="border border-gray-300 px-4 py-2 text-center">{formattedCost(service.serviceCost)}</td>
                                                <td className="border border-gray-300 px-4 py-2 text-center">{formattedCost(service.serviceRetainer)}</td>
                                                <td className="border border-gray-300 px-4 py-2 text-center">{submittalPackage.convertPriceTypeToAbbreviation(service.serviceType)}</td>
                                            </tr>
                                        );
                                    })}
                                    {/* Totals row */}
                                    <tr className="font-bold">
                                        <td className="border border-gray-300 px-4 py-2 text-center"></td>
                                        <td className="border border-gray-300 px-4 py-2 text-center"></td>
                                        <td className="border border-gray-300 px-4 py-2 text-center">{formattedCost(submittalPackage.clientInfo.projectCost)}</td>
                                        <td className="border border-gray-300 px-4 py-2 text-center">{formattedCost(submittalPackage.clientInfo.projectRetainer)}</td>
                                        <td className="border border-gray-300 px-4 py-2 text-center"></td>
                                    </tr>
                                </tbody>
                            )}
                        </table>
                    </section>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string | string[] }) {
    return (
        <div className="flex gap-2">
            <span className="font-semibold text-black w-[20%]">{label ? `${label}:` : ''}</span>
            <p className="text-black">{Array.isArray(value) ? value.map((v, i) => <span key={i}>{v}<br /></span>) : value || '—'}</p>
        </div>
    );
}
