import { useState, type ReactNode } from "react";
import { LanguageEntry, TemplateEntry } from "../types/noteEntry";
import { Checkbox, Combobox, Textarea, Textbox } from "@wps/input";
import { ChevronDown } from "lucide-react";

export interface ProposalTemplateEntryProps {
    template: TemplateEntry;
    onTemplateChange: (updated: TemplateEntry) => void;
    onSelectionToggle: (updated: TemplateEntry) => void;
}

export function ProposalTemplateEntry(props: ProposalTemplateEntryProps) {
    const [paramValues, setParamValues] = useState<Record<string, string>>({});
    const [activeParamKey, setActiveParamKey] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);
    const [selected, setSelected] = useState(false);
    const { template, onTemplateChange, onSelectionToggle } = props;

    function resolveTokensInText(
        input: string,
        values: Record<string, string>,
        visiting: Set<string>
    ): string {
        const tokenRegex = /{([^}]+)}/g;
        return input.replace(tokenRegex, (_: string, nestedParamKey: string): string => {
            return getResolvedParamValue(nestedParamKey, values, visiting);
        });
    }

    function getResolvedParamValue(
        paramKey: string,
        values: Record<string, string>,
        visiting: Set<string> = new Set<string>()
    ): string {
        if (visiting.has(paramKey)) {
            return `{${paramKey}}`;
        }

        visiting.add(paramKey);
        const rawValue = values[paramKey] ?? "";
        const allowedBlank = (template.params || []).find(param => param.key === paramKey)?.allowBlank;
        if (rawValue.trim() === "") {
            visiting.delete(paramKey);
            return allowedBlank ? rawValue : `{${paramKey}}`;
        }

        const resolvedValue = resolveTokensInText(rawValue, values, visiting);
        visiting.delete(paramKey);
        return resolvedValue;
    }

    const formatLanguage = (values: Record<string, string>) => {
        return template.language.map(lang => {
            if (lang.type === "paragraph") {
                let content = lang.content as string;
                (template.params || []).forEach((param) => {
                    const paramKey = param.key;
                    const regex = new RegExp(`{${paramKey}}`, "g");
                    content = content.replace(regex, getResolvedParamValue(paramKey, values));
                });
                return { ...lang, content };
            } else if (lang.type === "list-numbered" || lang.type === "list-bulleted") {
                const content = (lang.content as string[]).map(item => {
                    let newItem = item;
                    (template.params || []).forEach((param) => {
                        const paramKey = param.key;
                        const regex = new RegExp(`{${paramKey}}`, "g");
                        newItem = newItem.replace(regex, getResolvedParamValue(paramKey, values));
                    });
                    return newItem;
                });
                return { ...lang, content };
            }
            return lang;
        });
    };

    const renderContentWithHighlights = (content: string) => {
        const parts: ReactNode[] = [];
        let cursor = 0;
        let partIndex = 0;
        const tokenRegex = /{([^}]+)}/g;
        let match: RegExpExecArray | null;

        while ((match = tokenRegex.exec(content)) !== null) {
            const [token, paramKey] = match;
            const start = match.index;

            if (start > cursor) {
                const textKey = `text-${partIndex}`;
                partIndex += 1;
                parts.push(<span key={textKey}>{content.slice(cursor, start)}</span>);
            }

            const resolvedValue = getResolvedParamValue(paramKey, paramValues);
            const isActive = activeParamKey === paramKey;

            const valueKey = `value-${partIndex}`;
            partIndex += 1;

            parts.push(
                <span
                    key={valueKey}
                    className={isActive ? "rounded bg-yellow-200 dark:bg-yellow-600 px-1" : "rounded bg-yellow-100 dark:bg-yellow-500 px-1"}
                >
                    {resolvedValue}
                </span>
            );

            cursor = start + token.length;
        }

        if (cursor < content.length) {
            const tailKey = `text-${partIndex}`;
            parts.push(<span key={tailKey}>{content.slice(cursor)}</span>);
        }

        return parts.length > 0 ? parts : [<span key="raw">{content}</span>];
    };

    const handleParamChange = (key: string, value: string) => {
        const normalizedValue = value.trim() === "" ? "" : value;
        const nextValues = { ...paramValues, [key]: normalizedValue };
        const formattedLanguage = formatLanguage(nextValues);

        setParamValues(nextValues);
        setActiveParamKey(key);
        onTemplateChange({ ...template, formattedLanguage });
    };

    function renderLanguage(lang: LanguageEntry, index: number) {
        const languageKey = `${template.id}.language.${index}.${lang.type}`;

        if (lang.type === "paragraph") {
            return <p key={languageKey}>{renderContentWithHighlights(lang.content as string)}</p>;
        }
        else if (lang.type === "list-numbered") {
            return (
                <ol key={languageKey} className="list-decimal list-inside space-y-2">
                    {(lang.content as string[]).map((item, index) => (
                        <li key={index}>{renderContentWithHighlights(item)}</li>
                    ))}
                </ol>
            );
        }
        else if (lang.type === "list-bulleted") {
            return (
                <ul key={languageKey} className="list-disc list-inside space-y-2">
                    {(lang.content as string[]).map((item, index) => (
                        <li key={index}>{renderContentWithHighlights(item)}</li>
                    ))}
                </ul>
            );
        }
        return "";
    }

    return (
        <div className={`border rounded-md p-3 mb-4 ${selected && 'border-primary'}`}>
            <div onClick={() => setExpanded(!expanded)} className="cursor-pointer flex flex-row items-center justify-between dark:text-white">
                <div className="flex shrink-0 flex-row items-center mr-4">
                    <ChevronDown className={`transition-transform ${expanded ? "rotate-180" : "rotate-0"}`} height={24} width={24} />
                </div>
                <div className="flex flex-col items-start flex-1">
                    <h3 className="text-lg font-semibold">{template.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{template.description}</p>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        const formattedLanguage = formatLanguage(paramValues);
                        setSelected(!selected);
                        onSelectionToggle({ ...template, formattedLanguage });
                    }}
                    className={`ml-4 px-3 py-1 rounded ${selected ? 'bg-red-500 text-white' : 'bg-gray-300 text-black'} transition-colors`}
                >
                    {selected ? "Remove from List" : "Add to List"}
                </button>
            </div>
            <div className={`transition-max-height duration-300 ease-in-out overflow-hidden ${expanded ? "max-h-screen" : "max-h-0"}`}>
                <p className="mt-4">Language:</p>
                <div className="mb-4">
                    {template.language.map(renderLanguage)}
                </div>
                {template.params && template.params.map(param => (
                    <div key={template.id + "." + param.key} className="mb-3">
                        {param.type === "text" && (
                            param.textarea ? (
                                <Textarea
                                    field={param.key}
                                    label={param.label}
                                    defaultValue={paramValues[param.key] || ""}
                                    onValidChange={(_, value) => handleParamChange(param.key, value)}
                                />
                            ) : (
                                <Textbox
                                    field={param.key}
                                    label={param.label}
                                    defaultValue={paramValues[param.key] || ""}
                                    onValidChange={(_, value) => handleParamChange(param.key, value)}
                                />
                            )
                        )}
                        {param.type === "list" && (
                            <Combobox
                                field={param.key}
                                label={param.label}
                                selections={(param.options || []).map((option) => ({ key: option.label, value: option.value }))}
                                onValidChange={(_, value) => handleParamChange(param.key, value)}
                            />
                        )}
                        {param.type === "multipleChoice" && (
                            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${param.columns || 1}, minmax(0, 1fr))` }}>
                                {(param.options || []).map((option) => (
                                    <Checkbox
                                        type="switch"
                                        key={option.value}
                                        field={param.key + "." + option.value}
                                        label={option.label}
                                        checked={paramValues[param.key]?.split(", ").includes(option.value) || false}
                                        onChange={(_, value) => {
                                            const currentValues = paramValues[param.key] ? paramValues[param.key].split(", ") : [];
                                            let nextValues: string[];
                                            if (value) {
                                                nextValues = [...currentValues, option.value];
                                            }
                                            else {
                                                nextValues = currentValues.filter(v => v !== option.value);
                                            }
                                            handleParamChange(param.key, nextValues.join(", "));
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}