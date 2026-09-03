import { useCallback, useEffect, useMemo, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { useSearchParams } from "react-router-dom";
import { Button, Combobox, Textbox } from "cfdg/input";
import { Modal, showNotification } from "cfdg/layout";
import {
  State,
  type EntraUserAccount,
  type Invoice,
  type ProjectBillingProfile,
  type ProjectInvoiceDocument,
  type ProjectManager,
  type ProjectStatus,
  type ProjectTask,
  type QboCustomer,
} from "cfdg/types";
import { COUNTIES, STATES } from "cfdg/types/constants";
import { ArrowLeft, Plus, RefreshCw } from "lucide-react";
import { fetchEligibleProjectManagers } from "../../../api/entra";
import { fetchInvoices } from "../../../api/invoices";
import {
  createProject,
  createProjectTask,
  createClient,
  createClientContact,
  deleteProjectInvoiceDocument,
  downloadProjectInvoiceDocument,
  fetchClients,
  fetchProjectDetails,
  fetchProjects,
  fetchNextProjectNumber,
  moveProject,
  saveProjectManager,
  saveProjectBillingProfile,
  updateProject,
  updateProjectTask,
  updateProjectStatus,
  uploadProjectInvoiceDocument,
  type ProjectCreatePayload,
  type ProjectUpdatePayload,
  type ProjectSummary,
} from "../../../api/projectManagement";
import { ClientContactForm } from "../clients/ClientContactForm";
import { emptyClient, emptyContact } from "../clients/clientForms";
import type { ClientForm, ContactForm } from "../clients/types";
import { ProjectDetailPane } from "./ProjectDetailPane";
import { ProjectList } from "./ProjectList";

const projectNumberPattern = /^\d{2}-\d{4}$/;
const projectDisplayNamePattern = /^(\d{2}-\d{4}) - (.+)$/;

type ProjectForm = {
  parentCustomerId: string;
  projectNumber: string;
  projectName: string;
  address: ProjectCreatePayload["address"];
  parcelId: string;
  county: string;
};

const emptyProject: ProjectForm = {
  parentCustomerId: "",
  projectNumber: "",
  projectName: "",
  address: {
    line1: "",
    line2: "",
    city: "",
    state: "FL",
    postalCode: "",
  },
  parcelId: "",
  county: "",
};

function splitProjectDisplayName(
  displayName: string,
): Pick<ProjectForm, "projectNumber" | "projectName"> {
  const match = displayName.match(projectDisplayNamePattern);
  if (!match) {
    return { projectNumber: "", projectName: displayName };
  }
  return { projectNumber: match[1], projectName: match[2] };
}

function buildProjectDisplayName(form: ProjectForm): string {
  return `${form.projectNumber.trim()} - ${form.projectName.trim()}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",").pop() || "" : result);
    };
    reader.onerror = () =>
      reject(reader.error || new Error("File failed to read"));
    reader.readAsDataURL(file);
  });
}

export function ProjectsManager() {
  const { accounts } = useMsal();
  const [searchParams, setSearchParams] = useSearchParams();
  const editorName =
    accounts[0]?.name ?? accounts[0]?.username ?? "unknown-user";
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [clients, setClients] = useState<QboCustomer[]>([]);
  const [relatedInvoices, setRelatedInvoices] = useState<Invoice[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [mode, setMode] = useState<"overview" | "detail">(() =>
    searchParams.get("projectId") ? "detail" : "overview",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    ProjectStatus | "current" | "all"
  >("current");
  const [loading, setLoading] = useState(false);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [manager, setManager] = useState<ProjectManager | null>(null);
  const [managerName, setManagerName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [billingProfile, setBillingProfile] =
    useState<ProjectBillingProfile | null>(null);
  const [billingPoNumber, setBillingPoNumber] = useState("");
  const [billingDocumentNote, setBillingDocumentNote] = useState("");
  const [invoiceDocuments, setInvoiceDocuments] = useState<
    ProjectInvoiceDocument[]
  >([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [billingSaving, setBillingSaving] = useState(false);
  const [documentBusy, setDocumentBusy] = useState(false);
  const [eligibleManagers, setEligibleManagers] = useState<EntraUserAccount[]>(
    [],
  );
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [managersLoading, setManagersLoading] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState("");
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectStatusSaving, setProjectStatusSaving] = useState(false);
  const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProject);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [clientSaving, setClientSaving] = useState(false);
  const [clientForm, setClientForm] = useState<ClientForm>(emptyClient);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactForm, setContactForm] = useState<ContactForm>(emptyContact);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveSaving, setMoveSaving] = useState(false);
  const [moveClientId, setMoveClientId] = useState("");

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );
  const canSaveProject = Boolean(
    projectForm.parentCustomerId &&
    projectNumberPattern.test(projectForm.projectNumber.trim()) &&
    projectForm.projectName.trim() &&
    projectForm.address.line1.trim() &&
    projectForm.address.city.trim() &&
    projectForm.address.state.trim() &&
    projectForm.address.postalCode.trim(),
  );
  const canMoveProject = Boolean(
    selectedProject &&
    moveClientId &&
    moveClientId !== selectedProject.parentId,
  );

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchProjects({
        search: searchTerm,
        status: statusFilter,
      });
      setProjects(data);
      const projectIdParam = searchParams.get("projectId") || "";
      setSelectedProjectId((previous) => previous || projectIdParam);
    } catch (error) {
      showNotification({
        title: "Projects Failed To Load",
        body: String(error),
        style: "danger",
      });
    } finally {
      setLoading(false);
    }
  }, [searchParams, searchTerm, statusFilter]);

  const loadProjectDetails = useCallback(async () => {
    if (!selectedProjectId) {
      setManager(null);
      setManagerName("");
      setManagerEmail("");
      setBillingProfile(null);
      setBillingPoNumber("");
      setBillingDocumentNote("");
      setInvoiceDocuments([]);
      setTasks([]);
      return;
    }
    try {
      const data = await fetchProjectDetails(selectedProjectId);
      setProjects((previous) =>
        [
          data.project,
          ...previous.filter((project) => project.id !== data.project.id),
        ].sort((a, b) => a.displayName.localeCompare(b.displayName)),
      );
      setManager(data.manager);
      setManagerName(data.manager?.managerName || "");
      setManagerEmail(data.manager?.managerEmail || "");
      setBillingProfile(data.billingProfile);
      setBillingPoNumber(data.billingProfile.poNumber);
      setBillingDocumentNote(data.billingProfile.invoiceDocumentNote);
      setInvoiceDocuments(data.invoiceDocuments);
      setTasks(data.tasks);
      setSelectedManagerId("");
    } catch (error) {
      showNotification({
        title: "Project Details Failed To Load",
        body: String(error),
        style: "warning",
      });
    }
  }, [selectedProjectId]);

  const loadRelatedInvoices = useCallback(async () => {
    if (!selectedProjectId) {
      setRelatedInvoices([]);
      return;
    }
    setRelatedLoading(true);
    try {
      setRelatedInvoices(
        await fetchInvoices({ qboProjectId: selectedProjectId }),
      );
    } catch (error) {
      showNotification({
        title: "Project Invoices Failed To Load",
        body: String(error),
        style: "warning",
      });
    } finally {
      setRelatedLoading(false);
    }
  }, [selectedProjectId]);

  const loadEligibleManagers = useCallback(async () => {
    setManagersLoading(true);
    try {
      const data = await fetchEligibleProjectManagers();
      setEligibleManagers(data);
    } catch (error) {
      showNotification({
        title: "Eligible PMs Failed To Load",
        body: String(error),
        style: "warning",
      });
    } finally {
      setManagersLoading(false);
    }
  }, []);

  const loadClients = useCallback(async () => {
    try {
      setClients(await fetchClients());
    } catch (error) {
      showNotification({
        title: "Clients Failed To Load",
        body: String(error),
        style: "warning",
      });
    }
  }, []);

  useEffect(() => {
    document.title = "Projects - The Compass";
    loadEligibleManagers();
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  useEffect(() => {
    void loadProjectDetails();
  }, [loadProjectDetails]);

  useEffect(() => {
    void loadRelatedInvoices();
  }, [loadRelatedInvoices]);

  useEffect(() => {
    const projectIdParam = searchParams.get("projectId") || "";
    if (projectIdParam && projectIdParam !== selectedProjectId) {
      setSelectedProjectId(projectIdParam);
      setMode("detail");
    }
  }, [searchParams, selectedProjectId]);

  useEffect(() => {
    const existing = eligibleManagers.find(
      (user) =>
        (user.mail || user.userPrincipalName).toLowerCase() ===
        managerEmail.toLowerCase(),
    );
    setSelectedManagerId(existing?.id || "");
  }, [eligibleManagers, managerEmail]);

  async function saveManager() {
    if (!selectedProjectId) return;
    setSaving(true);
    try {
      const saved = await saveProjectManager(
        selectedProjectId,
        managerName.trim(),
        managerEmail.trim(),
      );
      setManager(saved);
      setManagerName(saved?.managerName || "");
      setManagerEmail(saved?.managerEmail || "");
      showNotification({
        title: "Project Manager Saved",
        body: saved?.managerEmail || "Manager cleared",
        style: "success",
      });
    } catch (error) {
      showNotification({
        title: "Project Manager Save Failed",
        body: String(error),
        style: "danger",
      });
    } finally {
      setSaving(false);
    }
  }

  async function saveBillingProfile() {
    if (!selectedProjectId) return;
    setBillingSaving(true);
    try {
      const saved = await saveProjectBillingProfile(selectedProjectId, {
        poNumber: billingPoNumber.trim(),
        invoiceDocumentNote: billingDocumentNote.trim(),
      });
      setBillingProfile(saved);
      setBillingPoNumber(saved.poNumber);
      setBillingDocumentNote(saved.invoiceDocumentNote);
      showNotification({
        title: "Billing Profile Saved",
        body: saved.poNumber || "No PO number set",
        style: "success",
      });
    } catch (error) {
      showNotification({
        title: "Billing Save Failed",
        body: String(error),
        style: "danger",
      });
    } finally {
      setBillingSaving(false);
    }
  }

  async function uploadBillingDocument(file: File | null) {
    if (!selectedProjectId || !file) return;
    setDocumentBusy(true);
    try {
      const data = await fileToBase64(file);
      const documents = await uploadProjectInvoiceDocument(selectedProjectId, {
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        data,
      });
      setInvoiceDocuments(documents);
      showNotification({
        title: "Document Uploaded",
        body: file.name,
        style: "success",
      });
    } catch (error) {
      showNotification({
        title: "Upload Failed",
        body: String(error),
        style: "danger",
      });
    } finally {
      setDocumentBusy(false);
    }
  }

  async function downloadBillingDocument(document: ProjectInvoiceDocument) {
    if (!selectedProjectId) return;
    setDocumentBusy(true);
    try {
      const blob = await downloadProjectInvoiceDocument(
        selectedProjectId,
        document.id,
      );
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = document.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      showNotification({
        title: "Download Failed",
        body: String(error),
        style: "danger",
      });
    } finally {
      setDocumentBusy(false);
    }
  }

  async function removeBillingDocument(document: ProjectInvoiceDocument) {
    if (!selectedProjectId) return;
    setDocumentBusy(true);
    try {
      await deleteProjectInvoiceDocument(selectedProjectId, document.id);
      setInvoiceDocuments((previous) =>
        previous.filter((entry) => entry.id !== document.id),
      );
      showNotification({
        title: "Document Removed",
        body: document.filename,
        style: "success",
      });
    } catch (error) {
      showNotification({
        title: "Remove Failed",
        body: String(error),
        style: "danger",
      });
    } finally {
      setDocumentBusy(false);
    }
  }

  function selectManager(userId: string) {
    setSelectedManagerId(userId);
    const user = eligibleManagers.find((entry) => entry.id === userId);
    if (!user) {
      setManagerName("");
      setManagerEmail("");
      return;
    }
    setManagerName(user.displayName);
    setManagerEmail(user.mail || user.userPrincipalName);
  }

  function selectProject(projectId: string) {
    setSelectedProjectId(projectId);
    setMode("detail");
    setSearchParams(projectId ? { projectId } : {}, { replace: false });
  }

  function returnToOverview() {
    setMode("overview");
    setSearchParams({}, { replace: false });
  }

  function updateProjectField(
    field: keyof Omit<ProjectForm, "address">,
    value: string,
  ) {
    setProjectForm((previous) => ({ ...previous, [field]: value }));
  }

  function updateProjectAddressField(
    field: keyof ProjectForm["address"],
    value: string,
  ) {
    setProjectForm((previous) => ({
      ...previous,
      address: {
        ...previous.address,
        [field]: value,
      },
    }));
  }

  async function refreshProjectNumber() {
    try {
      const projectNumber = await fetchNextProjectNumber(
        String(new Date().getFullYear()).slice(2, 4),
      );
      setProjectForm((previous) => ({ ...previous, projectNumber }));
    } catch (error) {
      showNotification({
        title: "Project Number Failed",
        body: String(error),
        style: "warning",
      });
    }
  }

  function openNewProjectDialog() {
    setEditingProjectId("");
    setProjectForm(emptyProject);
    setProjectDialogOpen(true);
    void refreshProjectNumber();
  }

  function updateClientField(
    field: keyof Omit<ClientForm, "address">,
    value: string,
  ) {
    setClientForm((previous) => ({ ...previous, [field]: value }));
  }

  function updateClientAddressField(
    field: keyof ClientForm["address"],
    value: string,
  ) {
    setClientForm((previous) => ({
      ...previous,
      address: { ...previous.address, [field]: value },
    }));
  }

  function openContactDialog() {
    if (!projectForm.parentCustomerId) return;
    setContactForm(emptyContact);
    setContactDialogOpen(true);
  }

  async function saveClientFromProject() {
    if (
      !clientForm.name.trim() ||
      !clientForm.address.line1.trim() ||
      !clientForm.address.city.trim() ||
      !clientForm.address.state.trim() ||
      !clientForm.address.postalCode.trim()
    )
      return;
    setClientSaving(true);
    try {
      const saved = await createClient({
        name: clientForm.name.trim(),
        address: {
          ...clientForm.address,
          line1: clientForm.address.line1.trim(),
          line2: clientForm.address.line2.trim(),
          city: clientForm.address.city.trim(),
          state:
            clientForm.address.state.trim() as ClientForm["address"]["state"],
          postalCode: clientForm.address.postalCode.trim(),
        },
        phone: clientForm.phone.trim(),
        email: clientForm.email.trim(),
      });
      setClients((previous) =>
        [...previous, saved].sort((a, b) =>
          a.displayName.localeCompare(b.displayName),
        ),
      );
      setProjectForm((previous) => ({
        ...previous,
        parentCustomerId: saved.id,
      }));
      setClientForm(emptyClient);
      setClientDialogOpen(false);
      showNotification({
        title: "Client Created",
        body: saved.displayName,
        style: "success",
      });
    } catch (error) {
      showNotification({
        title: "Client Create Failed",
        body: String(error),
        style: "danger",
      });
    } finally {
      setClientSaving(false);
    }
  }

  async function saveContactFromProject() {
    if (
      !projectForm.parentCustomerId ||
      !contactForm.name.trim() ||
      !contactForm.email.trim()
    )
      return;
    setContactSaving(true);
    try {
      const saved = await createClientContact(projectForm.parentCustomerId, {
        name: contactForm.name.trim(),
        email: contactForm.email.trim(),
        phone: contactForm.phone.trim(),
        role: contactForm.role.trim(),
        isInvoiceRecipient: contactForm.isInvoiceRecipient,
        active: contactForm.active,
        notes: contactForm.notes.trim(),
      });
      setContactForm(emptyContact);
      setContactDialogOpen(false);
      showNotification({
        title: "Contact Created",
        body: `${saved.name} is available for invoices.`,
        style: "success",
      });
    } catch (error) {
      showNotification({
        title: "Contact Create Failed",
        body: String(error),
        style: "danger",
      });
    } finally {
      setContactSaving(false);
    }
  }

  function openEditProjectDialog() {
    if (!selectedProject) return;
    const displayNameParts = splitProjectDisplayName(
      selectedProject.displayName,
    );
    setEditingProjectId(selectedProject.id);
    setProjectForm({
      parentCustomerId: selectedProject.parentId,
      projectNumber: displayNameParts.projectNumber,
      projectName: displayNameParts.projectName,
      address: {
        line1: selectedProject.shipAddrLine1 || selectedProject.billAddrLine1,
        line2: selectedProject.shipAddrLine2 || selectedProject.billAddrLine2,
        city: selectedProject.shipAddrCity || selectedProject.billAddrCity,
        state:
          (selectedProject.shipAddrState as State) ||
          (selectedProject.billAddrState as State),
        postalCode:
          selectedProject.shipAddrPostalCode ||
          selectedProject.billAddrPostalCode,
      },
      parcelId: selectedProject.parcelId,
      county: "",
    });
    setProjectDialogOpen(true);
  }

  async function saveProject() {
    if (!canSaveProject) return;
    setProjectSaving(true);
    try {
      const projectPayload: ProjectUpdatePayload = {
        parentCustomerId: projectForm.parentCustomerId,
        name: buildProjectDisplayName(projectForm),
        address: {
          line1: projectForm.address.line1.trim(),
          line2: projectForm.address.line2.trim(),
          city: projectForm.address.city.trim(),
          state: projectForm.address.state.trim() as State,
          postalCode: projectForm.address.postalCode.trim(),
        },
        parcelId: projectForm.parcelId.trim(),
      };
      const saved = editingProjectId
        ? await updateProject(editingProjectId, projectPayload)
        : await createProject(projectPayload);
      setProjects((previous) =>
        [saved, ...previous.filter((project) => project.id !== saved.id)].sort(
          (a, b) => a.displayName.localeCompare(b.displayName),
        ),
      );
      setSelectedProjectId(saved.id);
      setMode("detail");
      setSearchParams({ projectId: saved.id }, { replace: false });
      setProjectForm(emptyProject);
      setEditingProjectId("");
      setProjectDialogOpen(false);
      showNotification({
        title: editingProjectId ? "Project Updated" : "Project Created",
        body: saved.displayName,
        style: "success",
      });
    } catch (error) {
      showNotification({
        title: editingProjectId
          ? "Project Update Failed"
          : "Project Create Failed",
        body: String(error),
        style: "danger",
      });
    } finally {
      setProjectSaving(false);
    }
  }

  async function saveTask(task: ProjectTask) {
    if (!selectedProjectId) return;
    setSaving(true);
    try {
      const payload = {
        name: task.name,
        scopeOfWork: task.scopeOfWork,
        contractAmountCents: task.contractAmountCents,
        retainerCents: task.retainerCents,
        priceType: task.priceType,
        sortOrder: task.sortOrder,
        active: task.active,
      };
      const saved = task.id
        ? await updateProjectTask(selectedProjectId, task.id, payload)
        : await createProjectTask(selectedProjectId, payload);
      setTasks((current) =>
        [...current.filter((entry) => entry.id !== saved.id), saved].sort(
          (a, b) => a.sortOrder - b.sortOrder,
        ),
      );
      showNotification({
        title: "Task Saved",
        body: saved.name,
        style: "success",
      });
    } catch (error) {
      showNotification({
        title: "Task Save Failed",
        body: String(error),
        style: "danger",
      });
    } finally {
      setSaving(false);
    }
  }

  async function saveProjectStatus(status: ProjectStatus) {
    if (!selectedProject) return;
    setProjectStatusSaving(true);
    try {
      const saved = await updateProjectStatus(selectedProject.id, status);
      setProjects((previous) =>
        previous.map((project) => (project.id === saved.id ? saved : project)),
      );
      showNotification({
        title: "Project Status Saved",
        body: `${saved.displayName} is now ${saved.status}.`,
        style: "success",
      });
    } catch (error) {
      showNotification({
        title: "Project Status Save Failed",
        body: String(error),
        style: "danger",
      });
    } finally {
      setProjectStatusSaving(false);
    }
  }

  function openMoveDialog() {
    if (!selectedProject) return;
    setMoveClientId(selectedProject.parentId);
    setMoveDialogOpen(true);
  }

  async function saveProjectMove() {
    if (!selectedProject || !canMoveProject) return;
    setMoveSaving(true);
    try {
      const moved = await moveProject(selectedProject.id, moveClientId);
      setProjects((previous) =>
        previous
          .map((project) => (project.id === moved.id ? moved : project))
          .sort((a, b) => a.displayName.localeCompare(b.displayName)),
      );
      setSelectedProjectId(moved.id);
      setMoveDialogOpen(false);
      showNotification({
        title: "Project Moved",
        body: `${moved.displayName} now belongs to ${moved.parentDisplayName || moved.parentId}.`,
        style: "success",
      });
    } catch (error) {
      showNotification({
        title: "Project Move Failed",
        body: String(error),
        style: "danger",
      });
    } finally {
      setMoveSaving(false);
    }
  }

  return (
    <div className="h-full min-h-0 text-gray-900 dark:text-gray-100">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          {mode === "detail" && (
            <Button
              label="Back"
              style="textonly"
              icon={ArrowLeft}
              onClick={returnToOverview}
              colorMode="auto"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">
              {mode === "detail" && selectedProject
                ? selectedProject.displayName
                : "Projects"}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              QuickBooks sub-customers with Compass property details.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            label="Refresh"
            style="secondary"
            icon={RefreshCw}
            onClick={() => void loadProjects()}
            properties={{ disabled: loading }}
          />
          <Button
            label="New Project"
            style="primary"
            icon={Plus}
            onClick={openNewProjectDialog}
            properties={{ disabled: projectSaving }}
          />
          <Button
            label="Refresh PMs"
            style="secondary"
            icon={RefreshCw}
            onClick={() => void loadEligibleManagers()}
            properties={{ disabled: managersLoading }}
          />
        </div>
      </div>

      <Modal
        title={editingProjectId ? "Edit Project" : "New Project"}
        isOpen={projectDialogOpen}
        onAccept={() => void saveProject()}
        onClose={() => {
          if (!projectSaving) setProjectDialogOpen(false);
        }}
        acceptText={
          projectSaving
            ? "Saving"
            : editingProjectId
              ? "Save Project"
              : "Create Project"
        }
        acceptDisabled={!canSaveProject || projectSaving}
        colorMode="auto"
        size="2xl"
      >
        <div className="grid gap-5 md:grid-cols-8">
          <div className="md:col-span-8">
            <Combobox
              field="new-project-client"
              label="Client"
              colorMode="auto"
              portal
              selections={clients.map((client) => ({
                key: client.displayName,
                value: client.id,
              }))}
              value={projectForm.parentCustomerId}
              placeholder={
                clients.length > 0 ? "Select client" : "No clients loaded"
              }
              disabled={clients.length === 0}
              onChange={(_, value) =>
                updateProjectField("parentCustomerId", value)
              }
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {!editingProjectId && (
                <Button
                  label="New Client"
                  style="secondary"
                  icon={Plus}
                  onClick={() => {
                    setClientForm(emptyClient);
                    setClientDialogOpen(true);
                  }}
                />
              )}
              {!editingProjectId && (
                <Button
                  label="New Contact"
                  style="secondary"
                  icon={Plus}
                  onClick={openContactDialog}
                  properties={{ disabled: !projectForm.parentCustomerId }}
                />
              )}
            </div>
          </div>
          <div className="md:col-span-3">
            <div className="flex flex-col w-full gap-2">
              <div className="min-w-0 flex-1">
                <Textbox
                  field="new-project-number"
                  label="Project Number"
                  colorMode="auto"
                  value={projectForm.projectNumber}
                  onChange={(event) =>
                    updateProjectField("projectNumber", event.target.value)
                  }
                  placeholder="26-0001"
                  required
                />
              </div>
              {!editingProjectId && (
                <Button
                  label="Refresh number"
                  style="textonly"
                  colorMode="auto"
                  icon={RefreshCw}
                  onClick={() => void refreshProjectNumber()}
                />
              )}
            </div>
            {projectForm.projectNumber.trim() &&
              !projectNumberPattern.test(projectForm.projectNumber.trim()) && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  Use YY-####.
                </p>
              )}
          </div>
          <div className="md:col-span-5">
            <Textbox
              field="new-project-name"
              label="Project Name"
              colorMode="auto"
              value={projectForm.projectName}
              onChange={(event) =>
                updateProjectField("projectName", event.target.value)
              }
              placeholder="Project Name"
              required
            />
          </div>
          <div className="md:col-span-4">
            <Textbox
              field="new-project-parcel-id"
              label="Parcel ID"
              colorMode="auto"
              required
              value={projectForm.parcelId}
              onChange={(event) =>
                updateProjectField("parcelId", event.target.value)
              }
              placeholder="Parcel ID number"
            />
          </div>
          <div className="md:col-span-4">
            <Textbox
              field="new-project-address-line1"
              label="Address Line 1"
              colorMode="auto"
              value={projectForm.address.line1}
              onChange={(event) =>
                updateProjectAddressField("line1", event.target.value)
              }
              required
            />
          </div>
          <div className="md:col-span-2">
            <Textbox
              field="new-project-city"
              label="City"
              colorMode="auto"
              value={projectForm.address.city}
              onChange={(event) =>
                updateProjectAddressField("city", event.target.value)
              }
              required
            />
          </div>
          <div className="md:col-span-2">
            <Combobox
              field="new-project-county"
              label="County"
              colorMode="auto"
              portal
              selections={Object.values(COUNTIES).map((county) => ({
                key: county,
                value: county,
              }))}
              value={projectForm.county}
              placeholder="Select county"
              onChange={(_, value) => updateProjectField("county", value)}
            />
          </div>
          <div className="md:col-span-2">
            <Combobox
              field="new-project-state"
              label="State"
              colorMode="auto"
              portal
              selections={Object.entries(STATES).map(([code, name]) => ({
                key: `${name} (${code})`,
                value: code,
              }))}
              value={projectForm.address.state}
              placeholder="Select state"
              onChange={(_, value) =>
                updateProjectAddressField("state", value)
              }
              required
            />
          </div>
          <div className="md:col-span-2">
            <Textbox
              field="new-project-postal-code"
              label="Postal Code"
              colorMode="auto"
              value={projectForm.address.postalCode}
              onChange={(event) =>
                updateProjectAddressField("postalCode", event.target.value)
              }
              required
            />
          </div>
        </div>
      </Modal>

      <Modal
        title="New Client"
        isOpen={clientDialogOpen}
        onAccept={() => void saveClientFromProject()}
        onClose={() => {
          if (!clientSaving) setClientDialogOpen(false);
        }}
        acceptText={clientSaving ? "Saving" : "Create Client"}
        acceptDisabled={
          clientSaving ||
          !clientForm.name.trim() ||
          !clientForm.address.line1.trim() ||
          !clientForm.address.city.trim() ||
          !clientForm.address.state.trim() ||
          !clientForm.address.postalCode.trim()
        }
        colorMode="auto"
        size="lg"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Textbox
              field="project-new-client-name"
              label="Client Name"
              colorMode="auto"
              value={clientForm.name}
              onChange={(event) =>
                updateClientField("name", event.target.value)
              }
              required
            />
          </div>
          <div className="md:col-span-2">
            <Textbox
              field="project-new-client-address-line1"
              label="Address Line 1"
              colorMode="auto"
              value={clientForm.address.line1}
              onChange={(event) =>
                updateClientAddressField("line1", event.target.value)
              }
              required
            />
          </div>
          <div className="md:col-span-2">
            <Textbox
              field="project-new-client-address-line2"
              label="Address Line 2"
              colorMode="auto"
              value={clientForm.address.line2}
              onChange={(event) =>
                updateClientAddressField("line2", event.target.value)
              }
            />
          </div>
          <Textbox
            field="project-new-client-city"
            label="City"
            colorMode="auto"
            value={clientForm.address.city}
            onChange={(event) =>
              updateClientAddressField("city", event.target.value)
            }
            required
          />
          <Combobox
            field="project-new-client-state"
            label="State"
            colorMode="auto"
            portal
            selections={Object.entries(STATES).map(([code, name]) => ({
              key: `${name} (${code})`,
              value: code,
            }))}
            value={clientForm.address.state}
            placeholder="Select state"
            onChange={(_, value) =>
              updateClientAddressField("state", value)
            }
            required
          />
          <Textbox
            field="project-new-client-postal-code"
            label="Postal Code"
            colorMode="auto"
            value={clientForm.address.postalCode}
            onChange={(event) =>
              updateClientAddressField("postalCode", event.target.value)
            }
            required
          />
          <Textbox
            field="project-new-client-phone"
            label="Phone"
            colorMode="auto"
            value={clientForm.phone}
            onChange={(event) => updateClientField("phone", event.target.value)}
          />
          <Textbox
            field="project-new-client-email"
            label="Email"
            colorMode="auto"
            type="email"
            value={clientForm.email}
            onChange={(event) => updateClientField("email", event.target.value)}
          />
        </div>
      </Modal>

      <Modal
        title="New Contact"
        isOpen={contactDialogOpen}
        onAccept={() => void saveContactFromProject()}
        onClose={() => {
          if (!contactSaving) {
            setContactForm(emptyContact);
            setContactDialogOpen(false);
          }
        }}
        acceptText={contactSaving ? "Saving" : "Create Contact"}
        acceptDisabled={
          contactSaving ||
          !projectForm.parentCustomerId ||
          !contactForm.name.trim() ||
          !contactForm.email.trim()
        }
        colorMode="auto"
        size="lg"
      >
        <ClientContactForm
          contactForm={contactForm}
          editorName={editorName}
          onUpdateField={(field, value) =>
            setContactForm((previous) => ({ ...previous, [field]: value }))
          }
        />
      </Modal>

      <Modal
        title="Move Project"
        isOpen={moveDialogOpen}
        onAccept={() => void saveProjectMove()}
        onClose={() => {
          if (!moveSaving) setMoveDialogOpen(false);
        }}
        acceptText={moveSaving ? "Moving" : "Move Project"}
        acceptDisabled={!canMoveProject || moveSaving}
        colorMode="auto"
        size="md"
      >
        <div className="space-y-3">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            This updates the project parent in QuickBooks. Existing Compass
            invoices keep their stored client and project IDs.
          </p>
          <Combobox
            field="move-project-client"
            label="New Client"
            colorMode="auto"
            selections={clients.map((client) => ({
              key: client.displayName,
              value: client.id,
            }))}
            value={moveClientId}
            placeholder={
              clients.length > 0 ? "Select client" : "No clients loaded"
            }
            disabled={clients.length === 0}
            onChange={(_, value) => setMoveClientId(value)}
          />
        </div>
      </Modal>

      {mode === "overview" ? (
        <ProjectList
          projects={projects}
          loading={loading}
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          selectedProjectId={selectedProjectId}
          onSearchTermChange={setSearchTerm}
          onStatusFilterChange={setStatusFilter}
          onSelectProject={selectProject}
        />
      ) : (
        <ProjectDetailPane
          selectedProject={selectedProject}
          manager={manager}
          managerName={managerName}
          managerEmail={managerEmail}
          billingProfile={billingProfile}
          billingPoNumber={billingPoNumber}
          billingDocumentNote={billingDocumentNote}
          invoiceDocuments={invoiceDocuments}
          tasks={tasks}
          relatedInvoices={relatedInvoices}
          relatedLoading={relatedLoading}
          documentBusy={documentBusy}
          eligibleManagers={eligibleManagers}
          selectedManagerId={selectedManagerId}
          managersLoading={managersLoading}
          saving={saving}
          billingSaving={billingSaving}
          projectStatusSaving={projectStatusSaving}
          editorName={editorName}
          onEditProject={openEditProjectDialog}
          onProjectStatusChange={(status) => void saveProjectStatus(status)}
          onOpenMoveDialog={openMoveDialog}
          onSelectManager={selectManager}
          onSaveManager={() => void saveManager()}
          onBillingPoNumberChange={setBillingPoNumber}
          onBillingDocumentNoteChange={setBillingDocumentNote}
          onSaveBillingProfile={() => void saveBillingProfile()}
          onUploadDocument={(file) => void uploadBillingDocument(file)}
          onDownloadDocument={(document) =>
            void downloadBillingDocument(document)
          }
          onRemoveDocument={(document) => void removeBillingDocument(document)}
          onSaveTask={(task) => void saveTask(task)}
        />
      )}
    </div>
  );
}
