import { useEffect, useState } from 'react';
import type { ClientInfo, TemplateEntry } from './types/noteEntry';
import { ClientInfoStep, LanguageStep, PreviewStep } from './pages';

type Stage = 'client' | 'language' | 'preview';

const STAGES: { key: Stage; label: string }[] = [
    { key: 'client', label: 'Client Information' },
    { key: 'language', label: 'Select Services' },
    { key: 'preview', label: 'Preview & Download' },
];

export function ProposalGenerator() {
    const [stage, setStage] = useState<Stage>('client');
    const [templates, setTemplates] = useState<TemplateEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [clientInfo, setClientInfo] = useState<ClientInfo | undefined>();
    const [selectedPhases, setSelectedPhases] = useState<TemplateEntry[]>([]);

    useEffect(() => {
        import('./components/proposalLanguage.json')
            .then(data => {
                setTemplates(data.templates as TemplateEntry[]);
                setIsLoading(false);
            })
            .catch(err => {
                console.error('Error loading proposal templates:', err);
                setIsLoading(false);
            });
    }, []);

    const stageIndex = STAGES.findIndex(s => s.key === stage);

    return (
        <div className="flex flex-col h-full">
            {/* Stage indicator */}
            <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-3">
                <div className="flex items-center gap-6">
                    {STAGES.map((s, i) => {
                        const isDone = i < stageIndex;
                        const isActive = i === stageIndex;
                        return (
                            <button
                                key={s.key}
                                onClick={() => isDone && setStage(s.key)}
                                disabled={!isDone}
                                className={[
                                    'flex items-center gap-2 text-sm font-medium transition-colors',
                                    isActive ? 'text-blue-600 dark:text-blue-400' : '',
                                    isDone ? 'text-gray-500 hover:text-blue-600 dark:text-gray-400 cursor-pointer' : '',
                                    !isDone && !isActive ? 'text-gray-300 dark:text-gray-600 cursor-default' : '',
                                ].join(' ')}
                            >
                                <span className={[
                                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                                    isActive ? 'bg-blue-600 text-white' : '',
                                    isDone ? 'bg-green-500 text-white' : '',
                                    !isDone && !isActive ? 'bg-gray-200 dark:bg-gray-700 text-gray-400' : '',
                                ].join(' ')}>
                                    {isDone ? '✓' : i + 1}
                                </span>
                                {s.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Stage content */}
            {isLoading ? (
                <div className="px-4 py-6 text-sm text-gray-500">Loading templates...</div>
            ) : (
                <>
                    {stage === 'client' && (
                        <ClientInfoStep
                            initialValues={clientInfo}
                            onNext={info => {
                                setClientInfo(info);
                                setStage('language');
                            }}
                        />
                    )}

                    {stage === 'language' && (
                        <LanguageStep
                            templates={templates}
                            initialSelected={selectedPhases}
                            onBack={() => setStage('client')}
                            onNext={phases => {
                                setSelectedPhases(phases);
                                setStage('preview');
                            }}
                        />
                    )}

                    {stage === 'preview' && clientInfo && (
                        <PreviewStep
                            clientInfo={clientInfo}
                            phases={selectedPhases}
                            onBack={() => setStage('language')}
                        />
                    )}
                </>
            )}
        </div>
    );
}
