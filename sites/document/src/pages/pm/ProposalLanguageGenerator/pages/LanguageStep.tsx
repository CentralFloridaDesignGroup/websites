import { useEffect, useRef, useState } from 'react';
import type { ClientInfo, ServiceEntry } from '../types/proposalTypes';
import { ServiceEntryTemplate } from '../components/serviceItemTemplate';
import { ImportTemplateModal } from '../components/ImportTemplateModal';
import { Button } from '@wps/input';

const EMPTY_SERVICE: ServiceEntry = {
    serviceName: "",
    serviceCost: "",
    serviceRetainer: "",
    retainerPercentage: "",
    serviceType: "Fixed Fee",
    scopeOfWork: ""
}

interface LanguageStepProps {
    clientInfo: ClientInfo;
    services: ServiceEntry[];
    onNext: (info: ClientInfo, services: ServiceEntry[]) => void;
    onBack: () => void;
}

export function LanguageStep({ clientInfo, services, onNext, onBack }: LanguageStepProps) {
    const [entries, setEntries] = useState<ServiceEntry[]>(services.length > 0 ? services : [EMPTY_SERVICE]);
    const [entryIds, setEntryIds] = useState<number[]>(() => entries.map((_, i) => i));
    const nextId = useRef(entries.length);
    const [importTargetIndex, setImportTargetIndex] = useState<number | null>(null);

    const totalCost = entries.reduce((sum, e) => sum + (parseFloat(e.serviceCost) || 0), 0);
    const totalRetainer = entries.reduce((sum, e) => sum + (parseFloat(e.serviceRetainer) || 0), 0);

    // Ensure there's always at least one entry to display
    useEffect(() => {
        if (services.length === 0) {
            setEntries([EMPTY_SERVICE]);
            setEntryIds([0]);
            nextId.current = 1;
        }
    }, [services]);

    function formatAccounting(value: number, currency = 'USD', locale = 'en-US'): string {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            currencySign: 'accounting', // Wraps negative numbers in parentheses
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b flex flex-row items-center justify-start gap-8">
                <h2 className="text-lg font-semibold">Total Cost: <span className="text-green-500">{formatAccounting(totalCost)}</span></h2>
                <h2 className="text-lg font-semibold">Total Retainer: <span className="text-orange-500">{formatAccounting(totalRetainer)}</span></h2>
                <h2 className="text-lg font-semibold">Retainer Percentage: <span className="text-blue-500">{((totalRetainer / totalCost) * 100).toFixed(2)}%</span></h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                {entries.map((entry, index) => (
                    <ServiceEntryTemplate
                        key={entryIds[index]}
                        index={index}
                        totalItems={entries.length}
                        serviceEntry={entry}
                        onChange={(idx, updatedEntry) => {
                            const updatedEntries = [...entries];
                            updatedEntries[idx] = updatedEntry;
                            setEntries(updatedEntries);
                        }}
                        onReorder={(direction, idx) => {
                            const newIndex = direction === "up" ? idx - 1 : idx + 1;
                            if (newIndex < 0 || newIndex >= entries.length) return;
                            const updatedEntries = [...entries];
                            const updatedIds = [...entryIds];
                            [updatedEntries[idx], updatedEntries[newIndex]] = [updatedEntries[newIndex], updatedEntries[idx]];
                            [updatedIds[idx], updatedIds[newIndex]] = [updatedIds[newIndex], updatedIds[idx]];
                            setEntries(updatedEntries);
                            setEntryIds(updatedIds);
                        }}
                        onDelete={(idx) => {
                            const updatedEntries = entries.filter((_, i) => i !== idx);
                            const updatedIds = entryIds.filter((_, i) => i !== idx);
                            setEntries(updatedEntries.length > 0 ? updatedEntries : []);
                            setEntryIds(updatedIds.length > 0 ? updatedIds : []);
                        }}
                        onImport={(idx) => setImportTargetIndex(idx)}
                    />
                ))}
                <button
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
                    onClick={() => {
                        setEntries([...entries, EMPTY_SERVICE]);
                        setEntryIds([...entryIds, nextId.current++]);
                    }}
                >
                    Add Service
                </button>
            </div>
            <ImportTemplateModal
                isOpen={importTargetIndex !== null}
                onClose={() => setImportTargetIndex(null)}
                onImport={(formattedText, templateName, templateCost, templateRetainer) => {
                    if (importTargetIndex === null) return;
                    const updatedEntries = [...entries];
                    const updatedIds = [...entryIds];
                    const target = updatedEntries[importTargetIndex];
                    updatedEntries[importTargetIndex] = {
                        ...target,
                        serviceName: target.serviceName || templateName,
                        scopeOfWork: formattedText,
                        ...(target.serviceCost ? {} : { serviceCost: templateCost?.toString() }),
                        ...(target.serviceRetainer ? {} : { retainerPercentage: templateRetainer?.toString() }),
                        ...(target.serviceCost && target.serviceRetainer ? {} : { 
                            serviceRetainer: templateCost ? (templateRetainer ? ((templateCost * (templateRetainer / 100))).toFixed(2) : undefined) : undefined 
                        })
                    };
                    updatedIds[importTargetIndex] = nextId.current++;
                    setEntries(updatedEntries);
                    setEntryIds(updatedIds);
                    setImportTargetIndex(null);
                }}
            />
            <div className="p-4 border-t flex justify-between">
                <Button
                    label="Back"
                    style="secondary"
                    onClick={onBack}
                >
                </Button>
                <Button
                    label="Next"
                    style="success"
                    onClick={() => {
                        const updatedClientInfo = { ...clientInfo, projectCost: totalCost.toString(), projectRetainer: totalRetainer.toString() };
                        onNext(updatedClientInfo, entries);
                    }}
                >
                </Button>
            </div>
        </div>
    )
}
