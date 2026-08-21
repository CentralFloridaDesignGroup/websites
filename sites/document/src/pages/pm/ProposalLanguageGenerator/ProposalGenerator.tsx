import { useEffect, useRef, useState } from 'react';
import type { ClientInfo, ServiceEntry } from './types/proposalTypes';
import { ClientInfoStep, LanguageStep, PreviewStep, ProjectInfoSetup } from './pages';
import { useOutletContext } from 'react-router-dom';
import { OutletContext, SidebarProgressGroup } from '../../../contexts/outletContext';
import { File, Folder, List, User } from 'lucide-react';
import type { EntraUserAccount } from 'cfdg/types/v1';

type Stage = 'client' | 'project' | 'language' | 'preview';

const STAGES: { key: Stage; label: string; icon?: React.ReactNode }[] = [
    { key: 'client', label: 'Client & Contact', icon: <User /> },
    { key: 'project', label: 'Project Details', icon: <Folder /> },
    { key: 'language', label: 'Contract Scope', icon: <List /> },
    { key: 'preview', label: 'Preview & Download', icon: <File /> },
];

export function ProposalGenerator() {
    const [stage, setStage] = useState<Stage>('client');
    const [clientInfo, setClientInfo] = useState<ClientInfo | undefined>();
    const [services, setServices] = useState<ServiceEntry[]>([]);
    const [clientId, setClientId] = useState('');
    const [contactId, setContactId] = useState('');
    const [manager, setManager] = useState<EntraUserAccount | null>(null);
    const [createdProjectId, setCreatedProjectId] = useState('');
    const [createdRetainerInvoiceId, setCreatedRetainerInvoiceId] = useState('');
    const { setSidebarItems } = useOutletContext<OutletContext>();
    const setSidebarItemsRef = useRef(setSidebarItems);

    useEffect(() => {
        setSidebarItemsRef.current = setSidebarItems;
    }, [setSidebarItems]);


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
        setSidebarItemsRef.current([progressGroup]);
    }, [stage]);


    return (
        <div className="flex flex-col h-full">

            <>
                {stage === 'client' && (
                    <ClientInfoStep initialValues={clientInfo} onNext={(info, selectedClientId, selectedContactId) => { setClientInfo(info); setClientId(selectedClientId); setContactId(selectedContactId); setStage('project'); }} />
                )}
                {stage === 'project' && (
                    <ProjectInfoSetup
                        initialValues={clientInfo}
                        onNext={(info, selectedManager) => {
                            setClientInfo(info);
                            setManager(selectedManager);
                            setStage('language');
                        }}
                    />
                )}

                {stage === 'language' && (
                    <LanguageStep
                        clientInfo={clientInfo!}
                        services={services}
                        onBack={() => setStage('project')}
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
                        clientId={clientId}
                        contactId={contactId}
                        manager={manager}
                        createdProjectId={createdProjectId}
                        onProjectCreated={setCreatedProjectId}
                        createdRetainerInvoiceId={createdRetainerInvoiceId}
                        onRetainerInvoiceCreated={setCreatedRetainerInvoiceId}
                    />
                )}
            </>
        </div>
    );
}
