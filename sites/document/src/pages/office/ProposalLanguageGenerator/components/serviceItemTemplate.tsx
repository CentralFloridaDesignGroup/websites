import { useState } from "react";
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
    const [item, setItem] = useState<ServiceEntry>({ ...EMPTY_SERVICE, ...serviceEntry });
    const [intCost, setIntCost] = useState<{ cost: number | null, retainer: number | null, percentage: number | null }>({
        cost: parseFloat(item.serviceCost) || null,
        retainer: parseFloat(item.serviceRetainer) || null,
        percentage: parseFloat(item.retainerPercentage) || null
    });

    function updateRetainerInformation(key: keyof { cost: number | null, retainer: number | null, percentage: number | null }, value: string) {
        const numericValue = parseFloat(value) || 0;
        if (key === "cost") {
            const retainer = numericValue * (intCost.percentage || 0);
            const updated = { ...item, serviceCost: numericValue.toString(), serviceRetainer: retainer.toString() };
            setIntCost({ ...intCost, cost: numericValue, retainer });
            setItem(updated);
            onChange(index, updated);
        }
        else if (key === "percentage") {
            const retainer = (intCost.cost || 0) * (numericValue / 100);
            const updated = { ...item, retainerPercentage: numericValue.toString(), serviceRetainer: retainer.toString() };
            setIntCost({ ...intCost, percentage: numericValue, retainer });
            setItem(updated);
            onChange(index, updated);
        }
        else if (key === "retainer") {
            const percentage = (intCost.cost || 0) > 0 ? (numericValue / (intCost.cost || 0)) * 100 : 0;
            const updated = { ...item, retainerPercentage: percentage.toString(), serviceRetainer: numericValue.toString() };
            setIntCost({ ...intCost, retainer: numericValue, percentage });
            setItem(updated);
            onChange(index, updated);
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
                            className="px-1 py-1 text-black dark:text-white hover:text-red-500 rounded"
                            onClick={() => {
                                onDelete(index);
                            }}
                        >
                            <X size={20} />
                        </button>
                        <button
                            className="px-1 py-1 text-black dark:text-white hover:text-blue-500 rounded"
                            onClick={() => onImport(index)}
                        >
                            <Import size={20} />
                        </button>
                        <button
                            className={`px-1 py-1 text-black dark:text-white hover:text-blue-500 rounded ${index === totalItems - 1 ? "invisible" : ""}`}
                            onClick={() => {
                                onReorder("down", index);
                            }}
                        >
                            <ArrowDown size={20} />
                        </button>
                        <button
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
                    <Textbox
                        field={`serviceName-${index}`}
                        label="Service Name"
                        value={item.serviceName}
                        required
                        onChange={(e) => {
                            const updated = { ...item, serviceName: e.target.value };
                            setItem(updated);
                            onChange(index, updated);
                        }}
                    />
                </div>
                <Textbox
                    field={`cost-${index}`}
                    label="Cost"
                    required
                    value={intCost.cost || ""}
                    onChange={(e) => { updateRetainerInformation("cost", e.target.value) }}
                />
                <Textbox
                    field={`retainerPercentage-${index}`}
                    label="Retainer Percentage (%)"
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={intCost.percentage || ""}
                    onChange={(e) => { updateRetainerInformation("percentage", e.target.value) }}
                />
                <Textbox
                    field={`retainerCost-${index}`}
                    label="Retainer Cost"
                    value={intCost.retainer || ""}
                    onChange={(e) => { updateRetainerInformation("retainer", e.target.value) }}
                />
                <Combobox
                    field={`serviceType-${index}`}
                    label="Service Type"
                    selections={PRICE_TYPES}
                    defaultIndex={PRICE_TYPES.findIndex(p => p.value === item.serviceType)}
                    onValidChange={(_field, value) => {
                        const updated = { ...item, serviceType: value as ServicePriceType };
                        setItem(updated);
                        onChange(index, updated);
                    }}
                />
            </div>
            <Textarea
                field={`scopeOfWork-${index}`}
                label="Scope of Work"
                required
                defaultValue={item.scopeOfWork}                
                onValidChange={(_, v) => {
                    const updated = { ...item, scopeOfWork: v };
                    setItem(updated);
                    onChange(index, updated);
                }}
            />
        </div>
    )
}