import { useSearchParams } from "react-router-dom";
import { ProjectDetailView } from "./detail";
import { ProjectsListView } from "./list";

export function LoadingPanel({ label }: { label: string }) {
    return <p className="px-3 py-5 text-sm text-neutral-500 dark:text-neutral-400">{label}</p>;
}

export function EmptyPanel({ label }: { label: string }) { return <p className="px-3 py-8 text-center text-sm font-semibold tracking-wide text-neutral-500 dark:text-neutral-400">{label}</p>; }
export function ErrorPanel({ message }: { message: string | string[] }) {
    return (
        <div className="m-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-100">
            {typeof message === "string" && message}
            {typeof message !== "string" && (
                <div>
                    <p className="mb-1 text-sm font-semibold tracking-wide text-red-800 dark:text-red-100">The following errors were encountered:</p>
                    <ul className="list-inside list-disc">
                        {message.map((msg, index) => (
                            <li key={index}>{msg}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
export function Notice({ message }: { message: string }) { return <p className="rounded border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100">{message}</p>; }

/**
 * Main entry point for the project handler. This function orchestrates the loading, editing, and saving of project data, as well as handling any errors that may occur during these processes.
 */
export function ProjectHandler() {
    const searchParams = useSearchParams();
    const id = searchParams[0].get("id")?.trim() || "";

    if (id) {
        return <ProjectDetailView id={id} />;
    }
    else {
        return <ProjectsListView />;
    }
}