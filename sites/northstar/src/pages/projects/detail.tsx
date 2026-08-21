import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type {
    Contact,
    EntraUserAccount,
    NorthstarClient,
    NorthstarProject,
    ProjectContact,
    ProjectExtraData,
} from 'cfdg/types/v2';
import { NorthstarButton } from "cfdg/ui/input";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { EmptyPanel, ErrorPanel } from "./handler";
import { ProjectPhaseSummary } from "./subcomponents/ProjectPhaseSummary";
import { fetchClientContacts } from "../../api/clients";
import { fetchEligibleProjectManagers } from "../../api/entra";
import { fetchProject, fetchProjectClient, fetchProjectContacts, fetchProjectExtraData, updateProjectContacts, updateProjectCore } from "../../api/projects";
import { ProjectCoreInformation, type CoreDraft } from "./subcomponents/ProjectCoreInformation";

export type ProjectDetailViewProps = {
    id: string;
};

export function ProjectDetailView({ id }: ProjectDetailViewProps) {
    const [project, setProject] = useState<NorthstarProject | null>(null);
    const [extraData, setExtraData] = useState<ProjectExtraData | null>(null);
    const [client, setClient] = useState<NorthstarClient | null>(null);
    const [loadingMain, setLoadingMain] = useState<boolean>(true);
    const [loadingExtra, setLoadingExtra] = useState<boolean>(true);
    const [loadingClient, setLoadingClient] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [editing, setEditing] = useState<boolean>(false);
    const [error, setError] = useState<string[]>([]);
    const [clientContacts, setClientContacts] = useState<Contact[]>([]);
    const [assignedContacts, setAssignedContacts] = useState<ProjectContact[]>([]);
    const [managers, setManagers] = useState<EntraUserAccount[]>([]);
    const [coreDraft, setCoreDraft] = useState<CoreDraft | null>(null);

    useEffect(() => {
        if (!editing && project && extraData) {
            setCoreDraft({
                address: {
                    line1: project.shipAddrLine1,
                    line2: project.shipAddrLine2,
                    city: project.shipAddrCity,
                    state: project.shipAddrState,
                    postalCode: project.shipAddrPostalCode,
                },
                projectManagerId: extraData.projectManagerId || "",
                contactIds: assignedContacts.map((contact) => contact.id),
                status: extraData.status,
                purchaseOrder: extraData.purchaseOrder,
            });
        }
    }, [assignedContacts, editing, extraData, project]);

    useEffect(() => {
        if (project) {
            document.title = `${project.displayName} - Northstar`;
        }
    }, [project]);

    // Effect to load project details when the component mounts or when the id changes
    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        if (!id) {
            setProject(null);
            setLoadingMain(false);
            setLoadingExtra(false);
            setSaving(false);
            setEditing(false);
            setError([]);
            return;
        }
        let cancelled = false;
        setLoadingMain(true);
        setLoadingExtra(true);
        setLoadingClient(true);
        setClientContacts([]);
        setAssignedContacts([]);
        setCoreDraft(null);
        setError([]);
        const projectInfo = fetchProject(id)
            .then((data) => {
                if (!cancelled) {
                    setProject(data);
                    setLoadingMain(false);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setError((prev) => [...prev, `Failed to load project: ${err.message}`]);
                    setLoadingMain(false);
                }
            });
        const projectExtraInfo = fetchProjectExtraData(id)
            .then((data) => {
                if (!cancelled) {
                    setExtraData(data);
                    setLoadingExtra(false);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setError((prev) => [...prev, `Failed to load project extra data: ${err.message}`]);
                    setLoadingExtra(false);
                }
            });
        const relatedClient = fetchProjectClient(id)
            .then((data) => {
                if (!cancelled) {
                    setClient(data);
                    setLoadingClient(false);
                    if (data) {
                        void fetchClientContacts(data.id)
                            .then(setClientContacts)
                            .catch((err: unknown) => setError((prev) => [...prev, `Failed to load client contacts: ${String(err)}`]));
                    }
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setError((prev) => [...prev, `Failed to load project client: ${err.message}`]);
                    setLoadingClient(false);
                }
            });
        const assigned = fetchProjectContacts(id)
            .then(setAssignedContacts)
            .catch((err: unknown) => setError((prev) => [...prev, `Failed to load project contacts: ${String(err)}`]));
        const eligibleManagers = fetchEligibleProjectManagers()
            .then(setManagers)
            .catch((err: unknown) => setError((prev) => [...prev, `Failed to load project managers: ${String(err)}`]));

        await Promise.all([projectInfo, projectExtraInfo, relatedClient, assigned, eligibleManagers]);
    };

    async function saveCore(draft: CoreDraft) {
        setSaving(true);
        try {
            const [updated, contacts] = await Promise.all([updateProjectCore(id, draft), updateProjectContacts(id, draft.contactIds)]);
            setProject(updated.project);
            setExtraData(updated.extraData);
            setAssignedContacts(contacts);
            setEditing(false);
        } catch (err: unknown) {
            setError((prev) => [...prev, `Failed to save project details: ${String(err)}`]);
        } finally { setSaving(false); }
    }

    function onCloseout() {
        // Implement closeout logic here
        console.log("Closeout action triggered for project ID:", id);
    }

    if (!id) {
        return <EmptyPanel label="No project ID provided." />;
    }

    return (
        <div className="grid gap-4 text-neutral-950 dark:text-neutral-50">
            {/* Back button, name, and quick actions. */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <NorthstarButton
                        field="back"
                        size="small"
                        onClick={() => window.history.back()}
                    >
                        <ArrowLeft className="size-4" />
                        Back
                    </NorthstarButton>
                    <div className="flex flex-col">
                        <h1 className="ml-2 text-2xl font-semibold tracking-tight">
                            {loadingMain ? "Loading..." : project?.displayName || "No Project Found"}
                        </h1>
                    </div>
                </div>
                {project && <div className="flex flex-wrap gap-2">
                    {editing && (
                        <NorthstarButton
                            field="save-project"
                            size="small"
                            buttonStyle="focused"
                            disabled={saving || !coreDraft}
                            onClick={() => {
                                if (coreDraft) void saveCore(coreDraft);
                            }}
                        >
                            Save Project
                        </NorthstarButton>
                    )}
                    <NorthstarButton
                        field="edit-project"
                        buttonStyle={editing ? "secondary" : "focused"}
                        size="small"
                        onClick={() => { setEditing((prev) => !prev); }}
                    >
                        {editing ? "Cancel Edit" : "Edit Project"}
                    </NorthstarButton>
                    <NorthstarButton
                        field="create-contact"
                        size="small"
                        onClick={() => { }}
                    >
                        Create Contact
                    </NorthstarButton>
                    <NorthstarButton
                        field='closeout'
                        size="small"
                        onClick={onCloseout}
                    >
                        <CheckCircle2 className="size-4" />
                        Closeout
                    </NorthstarButton>
                    <Link
                        className="inline-flex items-center justify-center rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium dark:border-neutral-600"
                        to={`/invoices?projectId=${encodeURIComponent(id)}`}
                    >
                        Invoices
                    </Link>
                </div>}
            </div>
            {error.length > 0 && <ErrorPanel message={error} />}

            <div className="grid xl:grid-cols-2 [@media(min-width:2000px)]:grid-cols-3 gap-4">
                <ProjectCoreInformation
                    data={{
                        projectData: project,
                        projectExtraData: extraData,
                        projectClient: client
                    }}
                    clientContacts={clientContacts}
                    assignedContacts={assignedContacts}
                    managers={managers}
                    draft={coreDraft}
                    loading={loadingMain || loadingExtra || loadingClient}
                    editing={editing}
                    saving={saving}
                    onDraftChange={setCoreDraft} />

                {project && !loadingMain && <ProjectPhaseSummary projectId={project.id} managers={managers} />}
            </div>
        </div>
    );
}
