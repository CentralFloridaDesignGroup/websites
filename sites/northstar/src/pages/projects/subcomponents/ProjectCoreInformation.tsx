import { ProjectExtraData, QboCustomer } from "cfdg/types";
import { SectionSpinner } from "../../../components/sectionSpinner";
import { formatAddress } from "cfdg/scripts";

export type ProjectCoreInformationProps = {
    data: {
        projectData: QboCustomer | null;
        projectExtraData: ProjectExtraData | null;
        projectClient: QboCustomer | null;
    }
    loading: boolean;
    editing: boolean;
    saving: boolean;
    onEdit: (core: QboCustomer | null, extra: ProjectExtraData | null) => void;
};

export function ProjectCoreInformation({ data, loading, editing, onEdit }: ProjectCoreInformationProps) {
    if (loading) {
        return <SectionSpinner label="Loading project information..." />;
    }
    if (!data.projectData || !data.projectExtraData || !data.projectClient) {
        return <p>No project data available.</p>;
    }
    if (!editing) {
        return (
            <div>
                <h2>{data.projectData.displayName}</h2>
                <p>QBO ID: {data.projectData.id}</p>
                <p>Fully Qualified Name: {data.projectData.fullyQualifiedName || "N/A"}</p>
                <p>Project Type: {data.projectExtraData.status || "N/A"}</p>
                <p>Project Address: {formatAddress({
                    line1: data.projectData.shipAddrLine1,
                    line2: data.projectData.shipAddrLine2,
                    city: data.projectData.shipAddrCity,
                    state: data.projectData.shipAddrState,
                    postalCode: data.projectData.shipAddrPostalCode
                })}</p>
                <p>Client: <a href={`/clients?id=${data.projectClient.id}`} className="font-semibold text-blue-600 dark:text-blue-400 cursor-pointer">{data.projectClient.displayName}</a></p>
            </div>
        );
    };

    return (
        <div>

        </div>
    )
}