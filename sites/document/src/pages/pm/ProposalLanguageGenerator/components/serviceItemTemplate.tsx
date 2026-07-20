import { ServiceEntry, ServicePriceType } from "../types/proposalTypes";
import { Combobox, Textarea, Textbox } from "@wps/input";
import { ArrowDown, ArrowUp, Import, X } from "lucide-react";

const EMPTY_SERVICE: ServiceEntry = {
    serviceName: "",
    serviceCost: "",
    serviceRetainer: "",
    retainerPercentage: "",
    serviceType: "Fixed Fee",
    scopeOfWork: ""
}

export interface ServiceItemTemplateProps {
    index: number;
    totalItems: number;
    serviceEntry: ServiceEntry | null;
    onChange: (index: number, updatedEntry: ServiceEntry) => void;
    onReorder: (direction: "up" | "down", index: number) => void;
    onDelete: (index: number) => void;
    onImport: (index: number) => void;
}

export function ServiceEntryTemplate(props: ServiceItemTemplateProps) {
    const { index, totalItems, serviceEntry, onChange, onReorder, onDelete, onImport } = props;
    const item: ServiceEntry = { ...EMPTY_SERVICE, ...serviceEntry };
    const phaseCost = parseNumericValue(item.serviceCost);
    const phaseRetainerPercentage = parseNumericValue(item.retainerPercentage);

    function updateItem(updated: ServiceEntry) {
        onChange(index, updated);
    }

    function updateRetainerInformation(key: keyof { cost: number | null, retainer: number | null, percentage: number | null }, value: string) {
        const numericValue = parseFloat(value) || 0;
        if (key === "cost") {
            updateItem(applyCostBreakdown(item, { cost: numericValue, percentage: phaseRetainerPercentage }));
        }
        else if (key === "percentage") {
            updateItem(applyCostBreakdown(item, { cost: phaseCost, percentage: numericValue }));
        }
        else if (key === "retainer") {
            updateItem(applyCostBreakdown(item, { cost: phaseCost, retainer: numericValue }));
        }
    }

    const PRICE_TYPES: { key: string; value: ServicePriceType }[] = [
        { key: "Fixed Fee", value: "Fixed Fee" },
        { key: "Fixed Fee + Expenses", value: "Fixed Fee + Expenses" },
        { key: "Time & Materials", value: "Time & Materials (T&M)" },
        { key: "Time & Materials NTE", value: "Time & Materials Not to Exceed (NTE)" },
        { key: "Direct Expense Reimbursement", value: "Direct Expense Reimbursement" },
    ];

    return (
        <div className="bg-white dark:bg-gray-700 p-4 rounded mb-4">
            <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
                <div className="flex flex-col items-end gap-1">
                    <h2 className="text-lg font-semibold">PHASE {(index + 1).toString().padStart(2, '0')}:</h2>
                    <div className="flex-row items-center gap-2">
                        <button
                            type="button"
                            className="px-1 py-1 text-black dark:text-white hover:text-red-500 rounded"
                            onClick={() => {
                                onDelete(index);
                            }}
                        >
                            <X size={20} />
                        </button>
                        <button
                            type="button"
                            className="px-1 py-1 text-black dark:text-white hover:text-blue-500 rounded"
                            onClick={() => onImport(index)}
                        >
                            <Import size={20} />
                        </button>
                        <button
                            type="button"
                            className={`px-1 py-1 text-black dark:text-white hover:text-blue-500 rounded ${index === totalItems - 1 ? "invisible" : ""}`}
                            onClick={() => {
                                onReorder("down", index);
                            }}
                        >
                            <ArrowDown size={20} />
                        </button>
                        <button
                            type="button"
                            className={`px-1 py-1 text-black dark:text-white hover:text-blue-500 rounded ${index === 0 ? "invisible" : ""}`}
                            onClick={() => {
                                onReorder("up", index);
                            }}
                        >
                            <ArrowUp size={20} />
                        </button>
                    </div>
                </div>
                <div className="md:flex-4">
                    <Textbox colorMode="auto"
                        field={`serviceName-${index}`}
                        label="Service Name"
                        value={item.serviceName}
                        required
                        onChange={(e) => {
                            const updated = { ...item, serviceName: e.target.value };
                            updateItem(updated);
                        }}
                    />
                </div>
                <Textbox colorMode="auto"
                    field={`cost-${index}`}
                    label="Cost"
                    required
                    value={item.serviceCost || ""}
                    onChange={(e) => { updateRetainerInformation("cost", e.target.value) }}
                />
                <Textbox colorMode="auto"
                    field={`retainerPercentage-${index}`}
                    label="Retainer Percentage (%)"
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={item.retainerPercentage || ""}
                    onChange={(e) => { updateRetainerInformation("percentage", e.target.value) }}
                />
                <Textbox colorMode="auto"
                    field={`retainerCost-${index}`}
                    label="Retainer Cost"
                    value={item.serviceRetainer || ""}
                    onChange={(e) => { updateRetainerInformation("retainer", e.target.value) }}
                />
                <Combobox colorMode="auto"
                    field={`serviceType-${index}`}
                    label="Service Type"
                    selections={PRICE_TYPES}
                    value={item.serviceType}
                    onValidChange={(_field, value) => {
                        const updated = { ...item, serviceType: value as ServicePriceType };
                        updateItem(updated);
                    }}
                />
            </div>
            <Textarea colorMode="auto"
                field={`scopeOfWork-${index}`}
                label="Scope of Work"
                required
                value={item.scopeOfWork}
                allowNewlines
                onChange={(event) => {
                    const updated = { ...item, scopeOfWork: event.target.value };
                    updateItem(updated);
                }}
            />
        </div>
    )
}

function parseNumericValue(value: string): number {
    return parseFloat(value) || 0;
}

function formatNumericValue(value: number): string {
    return value === 0 ? "0" : value.toString();
}

function applyCostBreakdown(entry: ServiceEntry, values: { cost: number; percentage?: number; retainer?: number }): ServiceEntry {
    const cost = values.cost;
    const retainer = values.retainer ?? (cost * ((values.percentage ?? 0) / 100));
    const percentage = cost > 0 ? ((values.percentage ?? ((retainer / cost) * 100))) : 0;

    return {
        ...entry,
        serviceCost: formatNumericValue(cost),
        serviceRetainer: formatNumericValue(retainer),
        retainerPercentage: formatNumericValue(percentage),
    };
}
