import { useEffect, useState } from 'react';
import { Modal } from '@wps/layout';
import { Combobox, Multiselect, Textarea, Textbox } from '@wps/input';
import type { ParamEntry, TemplateEntry } from '../types/proposalTypes';
import templatesData from './proposalLanguage.json';

interface ImportTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (formattedText: string, templateName: string, serviceCost?: number, serviceRetainer?: number) => void;
}

function substituteParams(text: string, params: Record<string, string>): string {
    return text.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? '');
}

function formatTemplate(template: TemplateEntry, params: Record<string, string>): string {
    const blocks: string[] = [];
    for (const block of template.language) {
        if (block.type === 'paragraph') {
            blocks.push(substituteParams(block.content as string, params));
        } else {
            const items = block.content as string[];
            const formatted = items.map((item, i) =>
                (block.type === 'list-numbered' ? `${i + 1}. ` : '• ') + substituteParams(item, params)
            );
            blocks.push(formatted.join('\n'));
        }
    }
    return blocks.join('\n\n');
}

function initParamValues(template: TemplateEntry): Record<string, string> {
    const values: Record<string, string> = {};
    (template.params ?? []).forEach(p => {
        values[p.key] = p.type === 'list' && p.options?.length ? p.options[0].value : '';
    });
    return values;
}

function ParamField({ param, value, onChange }: {
    param: ParamEntry;
    value: string;
    onChange: (key: string, val: string) => void;
}) {
    if (param.type === 'list') {
        const selections = param.options!.map(o => ({ key: o.label, value: o.value }));
        const defaultIdx = Math.max(0, value ? selections.findIndex(s => s.value === value) : 0);
        return (
            <Combobox
                field={param.key}
                label={param.label}
                selections={selections}
                defaultIndex={defaultIdx}
                onValidChange={(_, v) => onChange(param.key, v)}
            />
        );
    }

    if (param.type === 'multipleChoice') {
        return (
            <Multiselect
                field={param.key}
                label={param.label}
                columns={param.columns}
                options={param.options!.map(o => ({ key: o.label, value: o.value }))}
                exportType="value"
                onChange={(_, v) => onChange(param.key, v)}
            />
        );
    }

    if (param.textarea) {
        return (
            <Textarea
                field={param.key}
                label={param.label}
                onValidChange={(_, v) => onChange(param.key, v)}
            />
        );
    }

    return (
        <Textbox
            id={param.key}
            field={param.key}
            label={param.label}
            required={!param.allowBlank}
            value={value}
            onChange={e => onChange(param.key, e.target.value)}
        />
    );
}

export function ImportTemplateModal({ isOpen, onClose, onImport }: ImportTemplateModalProps) {
    const templates = (templatesData as { templates: TemplateEntry[] }).templates;
    const [step, setStep] = useState<'select' | 'params'>('select');
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateEntry | null>(null);
    const [paramValues, setParamValues] = useState<Record<string, string>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredTemplates, setFilteredTemplates] = useState<TemplateEntry[]>(templates);

    function handleClose() {
        setStep('select');
        setSelectedTemplate(null);
        setParamValues({});
        onClose();
    }

    function handleAccept() {
        if (step === 'select') {
            if (!selectedTemplate) return;
            setParamValues(initParamValues(selectedTemplate));
            setStep('params');
            setSearchTerm(''); // Clear search when moving to params step
        } else {
            if (!selectedTemplate) return;
            onImport(formatTemplate(selectedTemplate, paramValues), selectedTemplate.name, selectedTemplate.defaultCost, selectedTemplate.defaultRetainer);
            handleClose();
        }
    }

    useEffect(() => {
        if (!searchTerm) {
            setFilteredTemplates(templates);
        } else {
            const lower = searchTerm.toLowerCase();
            setFilteredTemplates(
                templates.filter(t => 
                    t.name.toLowerCase().includes(lower) 
                    || t.description.toLowerCase().includes(lower)
                    || t.tags?.some(tag => tag.toLowerCase().includes(lower))
            ));
        }
    }, [searchTerm, templates]);

    const canAdvance = step === 'select'
        ? selectedTemplate !== null
        : (selectedTemplate?.params ?? []).every(p => p.allowBlank || !!paramValues[p.key]);

    return (
        <Modal
            title={step === 'select' ? 'Select a Template' : `Configure: ${selectedTemplate?.name}`}
            isOpen={isOpen}
            onAccept={handleAccept}
            onClose={handleClose}
            acceptText={step === 'select' ? 'Next →' : 'Insert'}
            acceptDisabled={!canAdvance}
            size="3xl"
        >
            {step === 'select' ? (
                <>
                    <Textbox
                        field="search"
                        label="Search Templates"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <div className="grid grid-cols-1 gap-3 mt-4 max-h-[800px] overflow-y-auto">
                        {filteredTemplates.map(t => (
                            <button
                                key={t.id}
                                className={`text-left text-gray-900 dark:text-white p-4 border-2 rounded transition-all cursor-pointer ${selectedTemplate?.id === t.id
                                        ? 'border-primary bg-primary/10 dark:border-primary-500'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                onClick={() => setSelectedTemplate(t as unknown as TemplateEntry)}
                            >
                                <p className="font-semibold text-gray-900 dark:text-white">{t.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t.description}</p>
                                {t.tags && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {t.tags.map(tag => (
                                            <span key={tag} className="text-xs bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            ) : (
                <div>
                    <button
                        className="mb-4 text-sm text-blue-500 hover:underline"
                        onClick={() => setStep('select')}
                    >
                        &larr; Back to templates
                    </button>
                    <div className="flex flex-col gap-4">
                        {(selectedTemplate?.params ?? []).map(param => (
                            <ParamField
                                key={param.key}
                                param={param}
                                value={paramValues[param.key] ?? ''}
                                onChange={(key, val) => setParamValues(prev => ({ ...prev, [key]: val }))}
                            />
                        ))}
                    </div>
                </div>
            )}
        </Modal>
    );
}
