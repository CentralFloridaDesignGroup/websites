import { useEffect, useState } from 'react';
import { Button, Textbox } from '@wps/input';
import { ChevronDown, X } from 'lucide-react';
import { showNotification } from '@wps/layout';
import { ProposalTemplateEntry } from '../components/Template';
import type { TemplateEntry } from '../types/noteEntry';

interface LanguageStepProps {
    templates: TemplateEntry[];
    initialSelected?: TemplateEntry[];
    onNext: (selected: TemplateEntry[]) => void;
    onBack: () => void;
}

export function LanguageStep({ templates, initialSelected, onNext, onBack }: LanguageStepProps) {
    const [selectedTemplates, setSelectedTemplates] = useState<TemplateEntry[]>(initialSelected ?? []);
    const [filteredTemplates, setFilteredTemplates] = useState<TemplateEntry[]>(templates);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredTemplates(templates);
        } else {
            const lower = searchTerm.toLowerCase();
            setFilteredTemplates(
                templates.filter(t =>
                    t.name.toLowerCase().includes(lower) ||
                    t.description.toLowerCase().includes(lower)
                )
            );
        }
    }, [searchTerm, templates]);

    const toggleTemplate = (template: TemplateEntry) => {
        setSelectedTemplates(prev =>
            prev.some(t => t.id === template.id)
                ? prev.filter(t => t.id !== template.id)
                : [...prev, template]
        );
    };

    const moveTemplate = (id: string, direction: 'up' | 'down') => {
        setSelectedTemplates(prev => {
            const idx = prev.findIndex(t => t.id === id);
            if (idx === -1) return prev;
            const next = direction === 'up' ? idx - 1 : idx + 1;
            if (next < 0 || next >= prev.length) return prev;
            const arr = [...prev];
            [arr[idx], arr[next]] = [arr[next], arr[idx]];
            return arr;
        });
    };

    const handleTemplateChange = (updated: TemplateEntry) => {
        setSelectedTemplates(prev =>
            prev.map(t => t.id === updated.id ? { ...t, formattedLanguage: updated.formattedLanguage } : t)
        );
    };

    const handleNext = () => {
        if (selectedTemplates.length === 0) {
            showNotification({ title: 'No Services Selected', body: 'Select at least one service phase to continue.', style: 'warning' });
            return;
        }
        onNext(selectedTemplates);
    };

    return (
        <div className="flex flex-col min-h-0 flex-1">
            <div className="flex flex-row gap-2 overflow-hidden flex-1">
                {/* Index sidebar */}
                <div className="flex w-52 shrink-0 flex-col p-4 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                    <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Index</h2>
                    {filteredTemplates.map(t => (
                        <a
                            key={t.id}
                            href={`#lang-${t.id}`}
                            className="block text-sm text-blue-600 hover:underline mb-2 ml-1"
                        >
                            {t.name}
                        </a>
                    ))}
                </div>

                {/* Template list */}
                <div className="flex min-h-0 flex-1 flex-col py-4 px-6 overflow-y-auto">
                    <div className="mb-4 flex flex-row items-end gap-2">
                        <div className="flex-1">
                            <Textbox
                                field="search"
                                label="Search services"
                                placeholder="Type to search..."
                                value={searchTerm}
                                onValidChange={(_, v) => setSearchTerm(v)}
                            />
                        </div>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="text-black hover:text-red-500 transition-colors p-1 rounded cursor-pointer"
                            >
                                <X height={24} width={24} />
                            </button>
                        )}
                    </div>
                    <div className="space-y-2">
                        {filteredTemplates.map(template => (
                            <div id={`lang-${template.id}`} key={template.id}>
                                <ProposalTemplateEntry
                                    template={template}
                                    onTemplateChange={handleTemplateChange}
                                    onSelectionToggle={toggleTemplate}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Selected list */}
                <div className="flex w-64 shrink-0 flex-col p-4 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
                    <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                        Selected Phases
                    </h2>
                    {selectedTemplates.length > 0 ? (
                        <div className="space-y-2">
                            {selectedTemplates.map((t, idx) => (
                                <SelectedItem
                                    key={t.id}
                                    template={t}
                                    index={idx}
                                    max={selectedTemplates.length}
                                    onMove={moveTemplate}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No phases selected yet.</p>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <Button label="Back" style="secondary" onClick={onBack} />
                <Button label="Next: Preview Proposal" style="primary" onClick={handleNext} />
            </div>
        </div>
    );
}

function SelectedItem({
    template, index, max, onMove,
}: {
    template: TemplateEntry;
    index: number;
    max: number;
    onMove: (id: string, dir: 'up' | 'down') => void;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="border rounded-md py-1 px-3 bg-white dark:bg-gray-700">
            <div className="flex flex-row items-center justify-between">
                <p
                    className="underline font-semibold text-xs uppercase cursor-pointer flex-1"
                    onClick={() => setExpanded(e => !e)}
                >
                    Phase {(index + 1).toString().padStart(2, '0')}: {template.name}
                </p>
                <div className="flex flex-row items-center shrink-0">
                    {index > 0 && (
                        <button onClick={() => onMove(template.id, 'up')} className="cursor-pointer">
                            <ChevronDown className="rotate-180" height={14} width={14} />
                        </button>
                    )}
                    {index < max - 1 && (
                        <button onClick={() => onMove(template.id, 'down')} className="cursor-pointer">
                            <ChevronDown height={14} width={14} />
                        </button>
                    )}
                </div>
            </div>
            {expanded && template.formattedLanguage && (
                <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                    {template.formattedLanguage.map((lang, i) => (
                        <div key={i} className="mb-1">
                            {lang.type === 'paragraph' && <p>{lang.content as string}</p>}
                            {lang.type === 'list-numbered' && (
                                <ol className="list-decimal list-inside">
                                    {(lang.content as string[]).map((item, j) => <li key={j}>{item}</li>)}
                                </ol>
                            )}
                            {lang.type === 'list-bulleted' && (
                                <ul className="list-disc list-inside">
                                    {(lang.content as string[]).map((item, j) => <li key={j}>{item}</li>)}
                                </ul>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
