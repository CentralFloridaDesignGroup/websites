// #region Imports

import { useEffect, useState } from "react";
import { TemplateEntry } from "../types/noteEntry";
import { ProposalTemplateEntry } from "../components/Template";
import { Textbox } from "@wps/input";
import { ChevronDown, Copy, X } from "lucide-react";
import { showNotification } from "@wps/layout";

// #endregion

// #region interfaces

export interface ListViewProps {
    templates: TemplateEntry[];
    onAccept: (templates: TemplateEntry[]) => void;
}

// #endregion

export function ListView(props: ListViewProps) {
    const [selectedTemplates, setSelectedTemplates] = useState<TemplateEntry[]>([]);
    const [filteredTemplates, setFilteredTemplates] = useState<TemplateEntry[]>(props.templates);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (searchTerm.trim() === "") {
            setFilteredTemplates(props.templates);
        } else {
            const lowerSearchTerm = searchTerm.toLowerCase();
            setFilteredTemplates(
                props.templates.filter(template =>
                    template.name.toLowerCase().includes(lowerSearchTerm) ||
                    template.description.toLowerCase().includes(lowerSearchTerm)
                )
            );
        }
    }, [searchTerm, props.templates]);


    const toggleTemplateSelection = (template: TemplateEntry) => {
        setSelectedTemplates((prevSelected) => {
            if (prevSelected.some((t) => t.id === template.id)) {
                return prevSelected.filter((t) => t.id !== template.id);
            } else {
                return [...prevSelected, template];
            }
        });
        console.log("Toggled template selection:", template);
    };

    const moveTemplateItem = (templateId: string, direction: "up" | "down") => {
        setSelectedTemplates((prevSelected) => {
            const index = prevSelected.findIndex(t => t.id === templateId);
            if (index === -1) return prevSelected;
            const newIndex = direction === "up" ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= prevSelected.length) return prevSelected;
            const lang = [...prevSelected];
            [lang[index], lang[newIndex]] = [lang[newIndex], lang[index]];
            return lang;
        });
    };

    const handleTemplateChange = (updatedTemplate: TemplateEntry) => {
        setSelectedTemplates((prevSelected) =>
            prevSelected.map((template) =>
                template.id === updatedTemplate.id ? { ...template, formattedLanguage: updatedTemplate.formattedLanguage } : template
            )
        );
    };

    return (
        <div>

            <div className="flex flex-row gap-2 overflow-hidden">
                <div className="flex w-100 shrink-0 flex-col p-4 border-r border-gray-300 overflow-y-auto">
                    <h2 className="text-xl font-semibold mb-2">Template Index</h2>
                    {filteredTemplates.map((template) => (
                        <div key={template.id} className="mb-2 ml-2">
                            <a href={`#${template.id}`} className="text-blue-600 hover:underline">
                                {template.name}
                            </a>
                        </div>
                    ))}
                </div>
                <div className="flex min-h-0 flex-1 flex-col py-4 px-6 overflow-y-auto">
                    <div className="mb-4 flex flex-row items-end gap-2">
                        <div className="flex-1">
                            <Textbox
                                field="search"
                                label="Search templates"
                                placeholder="Type to search..."
                                value={searchTerm}
                                onValidChange={(_, value) => setSearchTerm(value)}
                            />
                        </div>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="text-black hover:text-red-500 transition-colors p-1 rounded cursor-pointer"
                            >
                                <X height={24} width={24} />
                            </button>
                        )}
                    </div>
                    <div className="space-y-2">
                        {filteredTemplates.map((template) => (
                            <div id={template.id} key={template.id}>
                                <ProposalTemplateEntry
                                    key={template.id}
                                    template={template}
                                    onTemplateChange={handleTemplateChange}
                                    onSelectionToggle={toggleTemplateSelection}
                                />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex w-100 shrink-0 flex-col p-4 border-l border-gray-300 overflow-y-auto">
                    <h2 className="text-xl font-semibold mb-2">Selected Templates</h2>
                    {(selectedTemplates.length > 0) ? (
                        <div className="flex flex-col h-full">
                            <div className="space-y-2 mb-auto">
                                {selectedTemplates.map((template, index) => (
                                    <SelectedTemplateItem key={template.id} template={template} index={index} max={selectedTemplates.length} moveTemplateItem={moveTemplateItem} />
                                ))}
                            </div>
                            <div className="mt-auto">
                                <button
                                    onClick={() => props.onAccept(selectedTemplates)}
                                    className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 transition-colors"
                                >
                                    Accept Selection
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-600">No templates selected.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function SelectedTemplateItem({ template, index, max, moveTemplateItem }: { template: TemplateEntry, index: number, max: number, moveTemplateItem: (templateId: string, direction: "up" | "down") => void }) {
    const [expanded, setExpanded] = useState(false);
    return (
        <div key={template.id} className="border rounded-md py-1 px-3 bg-white dark:bg-gray-700">
            <div className="flex flex-row items-center justify-between">
                <div className="flex flex-row items-center gap-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                    <Copy className="text-gray-500 dark:text-gray-400" height={16} width={16} onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(template.formattedLanguage ? template.formattedLanguage.map(line => typeof line.content === 'string' ? line.content : (line.content as string[]).join('\n')).join('\n') : "");
                        showNotification({
                            title: "Template Copied",
                            body: `${template.name} language has been copied to clipboard.`,
                            style: "success",
                        })
                    }}/>
                    <p onClick={() => setExpanded(!expanded)} className="underline font-semibold text-sm uppercase">Phase {(index + 1).toString().padStart(2, '0')}: {template.name}</p>
                </div>

                <div className="flex flex-row items-center">
                    {index > 0 && (
                        <button onClick={() => moveTemplateItem(template.id, "up")} className="cursor-pointer">
                            <ChevronDown className="rotate-180" height={16} width={16} />
                        </button>
                    )}
                    {index < max - 1 && (
                        <button onClick={() => moveTemplateItem(template.id, "down")} className="cursor-pointer">
                            <ChevronDown height={16} width={16} />
                        </button>
                    )}
                </div>
            </div>
            {expanded && (
                template.formattedLanguage ? (
                    <div className="mt-2 p-1 text-sm text-slate-700 dark:text-slate-400 text-justify">
                        <pre className="whitespace-pre-wrap">{template.formattedLanguage.map((line, index) => (
                            <div key={index}>
                                {line.type === 'paragraph' && (
                                    <p>{line.content}</p>
                                )}
                                {line.type === 'list-numbered' && (
                                    <ol className="list-decimal list-inside">
                                        {(line.content as string[]).map((item, idx) => (
                                            <li key={idx}>{item}</li>
                                        ))}
                                    </ol>
                                )}
                                {line.type === 'list-bulleted' && (
                                    <ul className="list-disc list-inside">
                                        {(line.content as string[]).map((item, idx) => (
                                            <li key={idx}>{item}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}</pre>
                    </div>
                ) : (
                    <p className="text-sm text-slate-600 mt-2">No language generated yet.</p>
                )
            )}
        </div>
    );
}