import type {
  Contact,
  EntraUserAccount,
  NorthstarClient,
  NorthstarProject,
  ProjectContact,
  ProjectExtraData,
} from "cfdg/types/v2";
import {
  NorthstarCheckbox,
  NorthstarDropdown,
  NorthstarTextbox,
} from "cfdg/ui/input";
import { SectionSpinner } from "../../../components/sectionSpinner";

type Address = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
};

export type CoreDraft = {
  address: Address;
  projectManagerId: string;
  contactIds: string[];
  status: ProjectExtraData["status"];
  purchaseOrder: string;
};

type Props = {
  data: {
    projectData: NorthstarProject | null;
    projectExtraData: ProjectExtraData | null;
    projectClient: NorthstarClient | null;
  };
  clientContacts: Contact[];
  assignedContacts: ProjectContact[];
  managers: EntraUserAccount[];
  draft: CoreDraft | null;
  loading: boolean;
  editing: boolean;
  saving: boolean;
  onDraftChange: (draft: CoreDraft) => void;
};

const STATUS_OPTIONS = [
  { value: "proposal", label: "Proposal" },
  { value: "active", label: "Active" },
  { value: "hold", label: "Hold" },
  { value: "complete", label: "Complete" },
  { value: "cancelled", label: "Cancelled" },
];

export function ProjectCoreInformation({
  data,
  clientContacts,
  assignedContacts,
  managers,
  draft,
  loading,
  editing,
  saving,
  onDraftChange,
}: Props) {
  if (loading) {
    return <SectionSpinner label="Loading project information..." />;
  }

  if (!data.projectData || !data.projectExtraData || !data.projectClient) {
    return <p>No project data available.</p>;
  }

  const project = data.projectData;
  const extra = data.projectExtraData;
  const manager = managers.find(
    (candidate) => candidate.id === (extra.projectManagerId || ""),
  );
  const activeContacts = clientContacts.filter((contact) => contact.active);

  function updateAddress(key: keyof Address, value: string) {
    if (!draft) return;
    onDraftChange({
      ...draft,
      address: { ...draft.address, [key]: value },
    });
  }

  function toggleContact(id: string) {
    if (!draft) return;
    const contactIds = draft.contactIds.includes(id)
      ? draft.contactIds.filter((value) => value !== id)
      : [...draft.contactIds, id];
    onDraftChange({ ...draft, contactIds });
  }

  return (
    <section className="grid gap-4 rounded-md border border-neutral-300 bg-neutral-50 p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Project Information</h2>
      </div>

      {!editing ? (
        <div className="grid gap-2 text-sm">
          <p>
            <b>QBO ID:</b> {project.id}
          </p>
          <p>
            <b>Fully Qualified Name:</b> {project.fullyQualifiedName || "N/A"}
          </p>
          <p>
            <b>Project Type:</b> {extra.status || "N/A"}
          </p>
          <p>
            <b>Purchase Order:</b> {extra.purchaseOrder || "N/A"}
          </p>
          <p>
            <b>Project Address:</b>{" "}
            {formatAddress(
              project.shipAddrLine1,
              project.shipAddrLine2,
              project.shipAddrCity,
              project.shipAddrState,
              project.shipAddrPostalCode,
            ) || "Not set"}
          </p>
          <p>
            <b>Client:</b>{" "}
            <a
              href={`/clients?id=${data.projectClient.id}`}
              className="font-semibold text-blue-600 dark:text-blue-400"
            >
              {data.projectClient.displayName}
            </a>
          </p>
          <p>
            <b>Internal PM:</b>{" "}
            {manager?.displayName || extra.projectManagerId || "Not assigned"}
          </p>
          <p>
            <b>Point(s) of contact:</b>{" "}
            {assignedContacts.length
              ? assignedContacts.map((contact) => contact.name).join(", ")
              : "Not assigned"}
          </p>
        </div>
      ) : draft ? (
        <div className="grid gap-4">
          <NorthstarDropdown
            field="projectStatus"
            label="Project status"
            options={STATUS_OPTIONS}
            value={draft.status}
            disabled={saving}
            onChange={(event) =>
              onDraftChange({
                ...draft,
                status: event.target.value as CoreDraft["status"],
              })
            }
          />

          <NorthstarTextbox
            field="purchaseOrder"
            label="Purchase order number"
            value={draft.purchaseOrder}
            disabled={saving}
            onChange={(event) =>
              onDraftChange({ ...draft, purchaseOrder: event.target.value })
            }
          />

          <NorthstarDropdown
            field="projectManager"
            label="Internal project manager"
            options={[
              { value: "", label: "No manager assigned" },
              ...managers.map((candidate) => ({
                value: candidate.id,
                label: `${candidate.displayName}${candidate.jobTitle ? ` · ${candidate.jobTitle}` : ""}`,
              })),
            ]}
            value={draft.projectManagerId}
            disabled={saving}
            onChange={(event) =>
              onDraftChange({ ...draft, projectManagerId: event.target.value })
            }
          />

          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold">
              Project point(s) of contact
            </legend>
            {activeContacts.length === 0 ? (
              <p className="text-sm text-neutral-500">
                No active contacts are available for this client.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {activeContacts.map((contact) => (
                  <NorthstarCheckbox
                    key={contact.id}
                    field={`projectContact-${contact.id}`}
                    label={`${contact.name} · ${contact.email}`}
                    checked={draft.contactIds.includes(contact.id)}
                    onChange={() => toggleContact(contact.id)}
                    disabled={saving}
                  />
                ))}
              </div>
            )}
          </fieldset>

          <fieldset className="grid gap-3">
            <legend className="text-sm font-semibold">Project address</legend>
            <div className="grid gap-3 md:grid-cols-2">
              {(
                [
                  ["line1", "Address line 1"],
                  ["line2", "Address line 2"],
                  ["city", "City"],
                  ["state", "State"],
                  ["postalCode", "Postal code"],
                ] as Array<[keyof Address, string]>
              ).map(([key, label]) => (
                <NorthstarTextbox
                  key={key}
                  field={`projectAddress-${key}`}
                  label={label}
                  value={draft.address[key]}
                  onChange={(event) => updateAddress(key, event.target.value)}
                  disabled={saving}
                />
              ))}
            </div>
          </fieldset>
        </div>
      ) : null}
    </section>
  );
}

function formatAddress(
  line1: string,
  line2: string,
  city: string,
  state: string,
  postalCode: string,
): string {
  return [line1, line2, [city, state].filter(Boolean).join(", "), postalCode]
    .filter(Boolean)
    .join(" · ");
}
