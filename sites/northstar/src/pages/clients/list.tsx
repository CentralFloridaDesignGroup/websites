import { ClientListItem, ListOptions } from "cfdg/types/v2";
import { useEffect, useState } from "react";
import { fetchClients } from "../../api/clients";
import { LoadingOverlay } from "../../components/LoadingOverlay";

const DEFAULT_OPTIONS: ListOptions = {
    page: 1,
    pageSize: 25,
    direction: "asc",
};

/** Renders the paginated client sheet. */
export function ClientListView() {
    const [clients, setClients] = useState<ClientListItem[]>([]);
    const [options] = useState<ListOptions>(DEFAULT_OPTIONS);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        const timeout = new Promise<never>((_, reject) => {
            window.setTimeout(
                () => reject(new Error("Client request timed out. Check the API and Microsoft sign-in connection.")),
                10000,
            );
        });

        void Promise.race([fetchClients(options), timeout])
            .then((response) => {
                if (!cancelled) setClients(response.clients);
            })
            .catch((error: unknown) => {
                if (!cancelled) setError(error instanceof Error ? error.message : String(error));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [options]);

    if (loading) {
        return <LoadingOverlay header="Loading clients..." />;
    }

    if (error) {
        return <div className="text-red-500">Error: {error}</div>;
    }

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Clients</h1>
            {clients.length === 0 ? (
                <p>No clients found.</p>
            ) : (
                <div className="flex flex-col gap-2">
                    {clients.map((client) => (
                        <div key={client.id} className="p-4 border rounded shadow-sm hover:shadow-md transition">
                            <h2 className="text-lg font-semibold">{client.fullName}</h2>
                            <p className="text-sm text-gray-600">{client.status}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// App.tsx lazy-loads this module through the named ClientsPage export.
export const ClientsPage = ClientListView;