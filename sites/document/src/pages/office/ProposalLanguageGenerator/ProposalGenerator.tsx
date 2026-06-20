import { useEffect, useState } from 'react';
import type { ClientInfo, ServiceEntry } from './types/proposalTypes';
import { ClientInfoStep, LanguageStep, PreviewStep, ProjectInfoSetup } from './pages';
import { useOutletContext } from 'react-router-dom';
import { OutletContext, SidebarProgressGroup } from '../../../contexts/outletContext';
import { File, Folder, List, User } from 'lucide-react';

type Stage = 'project' | 'client' | 'language' | 'preview';

const STAGES: { key: Stage; label: string; icon?: React.ReactNode }[] = [
    { key: 'project', label: 'Project Information', icon: <Folder /> },
    { key: 'client', label: 'Client Information', icon: <User /> },
    { key: 'language', label: 'Select Services', icon: <List /> },
    { key: 'preview', label: 'Preview & Download', icon: <File /> },
];

export function ProposalGenerator() {
    const [stage, setStage] = useState<Stage>('project');
    const [clientInfo, setClientInfo] = useState<ClientInfo | undefined>();
    const [services, setServices] = useState<ServiceEntry[]>([]);
    const { setSidebarItems } = useOutletContext<OutletContext>();


    // Set sidebar items based on current stage
    useEffect(() => {
        const items: SidebarProgressGroup['items'] = STAGES.map(s => ({
            id: s.key,
            label: s.label,
            onClick: () => setStage(s.key),
            disabled: s.key === 'project' ? false : STAGES.findIndex(st => st.key === s.key) > STAGES.findIndex(st => st.key === stage),
            icon: s.icon
        }));
        const progressGroup: SidebarProgressGroup = {
            type: 'progress' as const,
            currentId: stage,
            sectionDisplay: 'Proposal Generation',
            label: 'Proposal Generation',
            items: items,
        };
        setSidebarItems([progressGroup]);
    }, [stage, setSidebarItems]);

    useEffect(() => {
        console.log('Form state updated:', clientInfo, services);
    }, [clientInfo, services]);


    return (
        <div className="flex flex-col h-full">

            <>
                {stage === 'project' && (
                    <ProjectInfoSetup
                        initialValues={clientInfo}
                        onNext={(info) => {
                            setClientInfo(info);
                            setStage('client');
                        }}
                    />
                )}
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
                        clientInfo={clientInfo!}
                        services={services}
                        onBack={() => setStage('client')}
                        onNext={(info, phases) => {
                            setClientInfo(info);
                            setServices(phases);
                            setStage('preview');
                        }}
                    />
                )}

                {stage === 'preview' && clientInfo && (
                    <PreviewStep
                        clientInfo={clientInfo}
                        services={services}
                        onBack={() => setStage('language')}
                    />
                )}
            </>
        </div>
    );
}
