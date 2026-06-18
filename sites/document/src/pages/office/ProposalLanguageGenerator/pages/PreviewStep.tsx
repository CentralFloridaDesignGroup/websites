import { useState } from 'react';
import { Button } from '@wps/input';
import { Download, FileText } from 'lucide-react';
import { showNotification } from '@wps/layout';
import { generateWordDocument, generatePdfDocument } from '../utils/documentGenerator';
import type { ClientInfo, TemplateEntry } from '../types/noteEntry';

interface PreviewStepProps {
    clientInfo: ClientInfo;
    phases: TemplateEntry[];
    onBack: () => void;
}

export function PreviewStep({ clientInfo, phases, onBack }: PreviewStepProps) {
    const [generatingWord, setGeneratingWord] = useState(false);

    const handleDownloadWord = async () => {
        setGeneratingWord(true);
        try {
            await generateWordDocument(clientInfo, phases);
            showNotification({ title: 'Word Document Downloaded', body: 'The proposal has been saved as a .docx file.', style: 'success' });
        } catch (err) {
            console.error(err);
            showNotification({ title: 'Download Failed', body: 'There was an error generating the Word document.', style: 'danger' });
        } finally {
            setGeneratingWord(false);
        }
    };

    const handleDownloadPdf = () => {
        try {
            generatePdfDocument(clientInfo, phases);
            showNotification({ title: 'PDF Downloaded', body: 'The proposal summary has been saved as a PDF.', style: 'success' });
        } catch (err) {
            console.error(err);
            showNotification({ title: 'Download Failed', body: 'There was an error generating the PDF.', style: 'danger' });
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-start justify-between mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Preview Proposal</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Review the proposal below, then download as Word or PDF.</p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button label={generatingWord ? 'Generating...' : 'Download Word'} style="primary" onClick={handleDownloadWord} />
                    <Button label="Download PDF" style="secondary" onClick={handleDownloadPdf} />
                </div>
            </div>

            {/* Document preview */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="bg-[#1e3a5a] text-white px-8 py-6">
                    <p className="text-xs font-semibold tracking-widest uppercase opacity-75 mb-1">White Point Surveying &amp; Mapping LLC</p>
                    <h1 className="text-xl font-bold">PROPOSAL FOR PROFESSIONAL SURVEYING SERVICES</h1>
                </div>

                <div className="px-8 py-6 space-y-6">
                    {/* Client / project info grid */}
                    <section className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm border border-gray-200 dark:border-gray-700 rounded p-4 bg-gray-50 dark:bg-gray-800">
                        <InfoRow label="Client" value={clientInfo.clientName} />
                        <InfoRow label="Project #" value={clientInfo.projectNumber} />
                        <InfoRow label="Contact" value={clientInfo.contactName} />
                        <InfoRow label="Proposal Date" value={clientInfo.proposalDate} />
                        <InfoRow label="Address" value={clientInfo.clientAddressLine1} />
                        <InfoRow label="Email" value={clientInfo.email} />
                        <InfoRow label="" value={clientInfo.clientAddressCityStZip} />
                        <InfoRow label="Phone" value={clientInfo.phone} />
                    </section>

                    {/* Project address */}
                    <section>
                        <SectionHeading label="Project Name" />
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{clientInfo.projectName || '—'}</p>
                        {(clientInfo.projectAddress || clientInfo.projectJurisStZip) && (
                            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                {clientInfo.projectAddress && <p>{clientInfo.projectAddress}</p>}
                                {clientInfo.projectJurisStZip && <p>{clientInfo.projectJurisStZip}</p>}
                            </div>
                        )}
                        {clientInfo.parcelIdList && (
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Parcel ID: {clientInfo.parcelIdList}</p>
                        )}
                    </section>

                    {/* Scope of Work */}
                    <section>
                        <SectionHeading label="Scope of Work" prominent />
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Based on our understanding of your needs, we have developed the detailed scope of work below.
                            This scope of work is based on our professional opinion and advise to best service your goals.
                        </p>

                        {phases.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No service phases selected.</p>
                        ) : (
                            <div className="space-y-4">
                                {phases.map((phase, index) => {
                                    const phaseNum = (index + 1).toString().padStart(2, '0');
                                    const language = phase.formattedLanguage ?? phase.language;
                                    return (
                                        <div key={phase.id}>
                                            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">
                                                Phase {phaseNum}: {phase.name}
                                            </h3>
                                            <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2 pl-4">
                                                {language.map((lang, i) => (
                                                    <div key={i}>
                                                        {lang.type === 'paragraph' && (
                                                            <p className="text-justify">{lang.content as string}</p>
                                                        )}
                                                        {lang.type === 'list-numbered' && (
                                                            <ol className="list-decimal list-inside space-y-1">
                                                                {(lang.content as string[]).map((item, j) => <li key={j}>{item}</li>)}
                                                            </ol>
                                                        )}
                                                        {lang.type === 'list-bulleted' && (
                                                            <ul className="list-disc list-inside space-y-1">
                                                                {(lang.content as string[]).map((item, j) => <li key={j}>{item}</li>)}
                                                            </ul>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* PSA notice */}
                    <section className="border border-dashed border-gray-300 dark:border-gray-600 rounded p-4 flex items-start gap-3">
                        <FileText className="text-gray-400 shrink-0 mt-0.5" height={18} width={18} />
                        <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Full document included in Word download</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                The Word file includes the fee schedule, assumptions, exclusions, and the complete Professional Services Agreement.
                            </p>
                        </div>
                    </section>
                </div>
            </div>

            {/* Bottom nav */}
            <div className="flex justify-between mt-6">
                <Button label="Back" style="secondary" onClick={onBack} />
                <div className="flex gap-2">
                    <button
                        onClick={handleDownloadWord}
                        disabled={generatingWord}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5a] text-white text-sm font-medium rounded hover:bg-[#16304e] disabled:opacity-50 transition-colors"
                    >
                        <Download height={16} width={16} />
                        {generatingWord ? 'Generating...' : 'Download Word'}
                    </button>
                    <button
                        onClick={handleDownloadPdf}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
                    >
                        <Download height={16} width={16} />
                        Download PDF
                    </button>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex gap-2">
            <span className="font-semibold text-gray-600 dark:text-gray-400 shrink-0 w-24">{label ? `${label}:` : ''}</span>
            <span className="text-gray-900 dark:text-white">{value || '—'}</span>
        </div>
    );
}

function SectionHeading({ label, prominent }: { label: string; prominent?: boolean }) {
    return (
        <div className={`border-b pb-1 mb-2 ${prominent ? 'border-b-2 border-[#1e3a5a]' : 'border-gray-200 dark:border-gray-600'}`}>
            <h2 className={`font-bold ${prominent ? 'text-base text-[#1e3a5a] dark:text-blue-400' : 'text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400'}`}>
                {label}
            </h2>
        </div>
    );
}
