import { Textbox, Button } from "@wps/input";
import { useMemo, useState } from "react";
import { timeframes, services } from "../data/servicesProvided.json";

export function Services() {
    const [query, setQuery] = useState("");

    const filteredServices = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return services;

        return services
            .map((service) => {
                const matchedItems = service.services.filter((item) => {
                    return (
                        item.title.toLowerCase().includes(normalized) ||
                        item.description.toLowerCase().includes(normalized)
                    );
                });

                return matchedItems.length > 0
                    ? { ...service, services: matchedItems }
                    : null;
            })
            .filter((service): service is (typeof services)[number] => service !== null);
    }, [query]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-4xl font-bold text-primary mb-6 text-center">Our Services</h1>
            <p className="mb-6 bg-primary-200 border-l-4 border-primary p-4">NOTE: Timeframes and costs are approximate and may vary depending on project complexity. We will provide a detailed estimate upon request.</p>
            <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1 w-full">
                    <Textbox
                        field="searchServices"
                        label="Search Services"
                        onValidChange={(_, value) => setQuery(value)}
                        placeholder="Search for a service..."
                    />
                </div>
                <div className="flex-shrink-0">
                    <Button
                        label="Clear"
                        style={query === "" ? "secondary" : "primary"}
                        size="medium"
                        onClick={() => setQuery("")}
                    />
                </div>
            </div>
            {filteredServices.map((service, index) => (
                <div key={index} className={`mb-8 pt-6 ${index === 0 ? '' : 'border-t border-primary'}`}>
                    <h2 className="text-2xl font-semibold text-primary mb-2">{service.categoryName}</h2>
                    <p className="text-gray-600">{service.description}</p>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {service.services.map((s, i) => (
                            <ServiceCard key={i} index={i} {...s} />
                        ))}
                    </div>
                </div>
            ))}
            {filteredServices.length === 0 && (
                <p className="text-sm text-gray-500">No services match your search.</p>
            )}
        </div>
    )
}

function ServiceCard({
    index,
    title,
    description,
    timeframe,
    costLow,
    costHigh,
    serviceDiscount = false
}: {
    index: number;
    title: string;
    description: string;
    timeframe: string;
    costLow: number;
    costHigh: number | null;
    serviceDiscount?: boolean;
}) {
    const formatCurrency = (value: number | null) => {
        if (value === null) return "N/A";
        return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    return (
        <div key={index} className="bg-white border-2 border-primary rounded-lg shadow p-4 flex flex-col h-full">
            <h3 className="text-lg font-bold text-primary uppercase text-center">{title}</h3>
            {serviceDiscount && <p className="text-sm text-center my-2 bg-green-100 border border-green-300 p-1">Discounts applicable</p>}
            <p className="text-gray-600 text-sm mb-2 flex-1">{description}</p>
            <div className="flex flex-row items-center justify-between gap-2 mt-auto">

                <p className="text-sm text-gray-500">Timeframe: {timeframes[timeframe as keyof typeof timeframes]}</p>
                {costHigh !== null && (
                    <p className="text-sm text-gray-500">Cost: {formatCurrency(costLow)} - {formatCurrency(costHigh)}</p>
                )}
                {costHigh === null && (
                    <p className="text-sm text-gray-500">Cost starts at: {formatCurrency(costLow)}</p>
                )}
            </div>
        </div>
    )
}