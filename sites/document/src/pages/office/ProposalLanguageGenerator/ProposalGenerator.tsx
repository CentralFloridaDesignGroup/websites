// #region Imports

import { useEffect, useState } from "react";
import type { TemplateEntry } from "./types/noteEntry";
import { ListView } from "./pages";
import { showNotification } from "@wps/layout";

// #endregion

// #region interfaces

// #endregion

export function ProposalGenerator() {
    const [isLoading, setIsLoading] = useState(false);
    const [templates, setTemplates] = useState<TemplateEntry[]>([]);

    useEffect(() => {
        setIsLoading(true);
        import("./components/proposalLanguage.json")
            .then((data) => {
                setTemplates(data.templates as TemplateEntry[]);
                setIsLoading(false);
            })
            .catch((error) => {
                console.error("Error loading proposal language templates:", error);
                setIsLoading(false);
            });
    }, []);

    function handleAccept(selectedTemplates: TemplateEntry[]) {
        // for now, just format and copy to clipboard. In a real app, you'd likely want to show a preview and allow further edits.
        const formatted = selectedTemplates.map((template, index) => {
            let content = "";
            template.formattedLanguage?.forEach(lang => {
                content += `PHASE ${(index + 1).toString().padStart(2, "0")}: ${template.name}\n`;
                if (lang.type === "paragraph") {
                    content += lang.content + "\n\n";
                } else if (lang.type === "list-numbered") {
                    (lang.content as string[]).forEach((item, index) => {
                        content += `${index + 1}. ${item}\n`;
                    });
                    content += "\n";
                } else if (lang.type === "list-bulleted") {
                    (lang.content as string[]).forEach(item => {
                        content += `- ${item}\n`;
                    });
                    content += "\n";
                }
            });
            return content.trim();
        }).join("\n\n");
        navigator.clipboard.writeText(formatted)
            .then(() => {
                showNotification({
                    title: "Proposal Language Copied",
                    body: "The generated proposal language has been copied to your clipboard.",
                    style: "success",
                });
            })
            .catch((error) => {
                console.error("Error copying proposal language to clipboard:", error);
                showNotification({
                    title: "Copy Failed",
                    body: "There was an error copying the proposal language to your clipboard.",
                    style: "danger",
                });
            });

    }

    if (isLoading) {
        return <div className="px-4 py-2 text-sm text-slate-700">Loading...</div>;
    }

    return (
        <ListView templates={templates} onAccept={(selected) => {
            // For now, just log the selected templates. In a real app, you'd generate the proposal language here.
            handleAccept(selected);
        }} />
    );
}
