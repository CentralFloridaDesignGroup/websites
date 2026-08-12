import { useEffect, useState } from "react";
import { ProjectExtraData, QboCustomer } from 'cfdg/types';
import { NorthstarButton } from "cfdg/ui/input";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { EmptyPanel, ErrorPanel } from "./handler";
import { ProjectPhaseSummary } from "./subcomponents/ProjectPhaseSummary";
import { fetchProject, fetchProjectClient, fetchProjectExtraData } from "../../api/projects";
import { ProjectCoreInformation } from "./subcomponents/ProjectCoreInformation";

export type ProjectDetailViewProps = {
    id: string;
};

export function ProjectDetailView({ id }: ProjectDetailViewProps) {
    const [project, setProject] = useState<QboCustomer | null>(null);
    const [extraData, setExtraData] = useState<ProjectExtraData | null>(null);
    const [client, setClient] = useState<QboCustomer | null>(null);
    const [loadingMain, setLoadingMain] = useState<boolean>(true);
    const [loadingExtra, setLoadingExtra] = useState<boolean>(true);
    const [loadingClient, setLoadingClient] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [editing, setEditing] = useState<boolean>(false);
    const [error, setError] = useState<string[]>([]);

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
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setError((prev) => [...prev, `Failed to load project client: ${err.message}`]);
                    setLoadingClient(false);
                }
            });

        await Promise.all([projectInfo, projectExtraInfo, relatedClient]);
    };

    function onEdit(core: QboCustomer | null, extra: ProjectExtraData | null) {
        // Implement edit logic here
        console.log("Edit action triggered for project:", core, extra);
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
                    {editing &&
                        <NorthstarButton
                            field="save-project"
                            size="small"
                            buttonStyle="focused"
                            onClick={() => { }}
                        >
                            Save Changes
                        </NorthstarButton>
                    }
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
                    loading={loadingMain || loadingExtra || loadingClient}
                    editing={editing}
                    saving={saving}
                    onEdit={onEdit} />

                {project && !loadingMain && <ProjectPhaseSummary projectId={project.id} />}
            </div>
        </div>
    );
}