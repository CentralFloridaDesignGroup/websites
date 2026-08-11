import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { NorthstarPageSize, NorthstarPagination, NorthstarProject, ProjectExtraData, ProjectListItem, ProjectStatus } from "cfdg/types";
import { ArrowLeft, CheckCircle2, FilePlus2, RefreshCw, Settings2, SquareArrowOutUpRight } from "lucide-react";
import { fetchProject, fetchProjectClient, fetchProjectExtraData, fetchProjects, updateProjectStatus } from "../../api/projects";
import { NorthstarApiError } from "../../api/client";
import { PaginationControls, PropertyList, RecordStatus, SortHeading } from "../../components/NorthstarRecords";
import { NorthstarButton } from "cfdg/ui/input";

const EMPTY_PAGINATION: NorthstarPagination = { page: 1, pageSize: 25, totalRecords: 0, totalPages: 0 };
const PROJECT_STATUSES: ProjectStatus[] = ["proposal", "active", "hold", "complete", "cancelled"];

/** Northstar project list and independently loaded project detail sheet. */
export function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const id = searchParams.get("id")?.trim() || "";
  const clientId = searchParams.get("clientId")?.trim() || "";
  const action = searchParams.get("action")?.trim() || "";
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [selectedProject, setSelectedProject] = useState<NorthstarProject | null>(null);
  const [extraData, setExtraData] = useState<ProjectExtraData | null>(null);
  const [client, setClient] = useState<NorthstarProject | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [extraLoading, setExtraLoading] = useState(false);
  const [clientLoading, setClientLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [actionNotice, setActionNotice] = useState("");
  const [statusEditorOpen, setStatusEditorOpen] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = id ? "Project Detail - Northstar" : "Projects - Northstar";
  }, [id]);

  useEffect(() => {
    if (id) return;
    let cancelled = false;
    setListLoading(true);
    setListError("");
    void fetchProjects({ page: pagination.page, pageSize: pagination.pageSize, direction, clientId: clientId || undefined })
      .then((response) => {
        if (!cancelled) {
          setProjects(response.projects);
          setPagination(response.pagination);
        }
      })
      .catch((error: unknown) => { if (!cancelled) setListError(String(error)); })
      .finally(() => { if (!cancelled) setListLoading(false); });
    return () => { cancelled = true; };
  }, [clientId, direction, id, pagination.page, pagination.pageSize, refreshKey]);

  useEffect(() => {
    if (!id) {
      setSelectedProject(null);
      setExtraData(null);
      setClient(null);
      setNotFound(false);
      setDetailError("");
      setStatusEditorOpen(false);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setExtraLoading(false);
    setClientLoading(false);
    setSelectedProject(null);
    setExtraData(null);
    setClient(null);
    setNotFound(false);
    setDetailError("");
    setStatusEditorOpen(false);
    setActionNotice(action === "create" ? "Project creation is queued for the next Northstar workflow slice." : action === "closeout" ? "Use Closeout to confirm completion of this project." : "");

    void fetchProject(id)
      .then((project) => {
        if (cancelled) return;
        setSelectedProject(project);
        setDetailLoading(false);
        setStatusEditorOpen(action === "status");
        setExtraLoading(true);
        void fetchProjectExtraData(id)
          .then((data) => { if (!cancelled) setExtraData(data); })
          .catch((error: unknown) => { if (!cancelled) setDetailError(`Project status failed to load: ${String(error)}`); })
          .finally(() => { if (!cancelled) setExtraLoading(false); });
        setClientLoading(true);
        void fetchProjectClient(id)
          .then((relatedClient) => { if (!cancelled) setClient(relatedClient); })
          .catch((error: unknown) => { if (!cancelled) setDetailError(`Project client failed to load: ${String(error)}`); })
          .finally(() => { if (!cancelled) setClientLoading(false); });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setDetailLoading(false);
        if (error instanceof NorthstarApiError && error.status === 404) setNotFound(true);
        else setDetailError(String(error));
      });
    return () => { cancelled = true; };
  }, [action, id]);

  const projectProperties = useMemo(() => {
    if (!selectedProject) return [];
    return [
      { label: "QBO ID", value: selectedProject.id },
      { label: "Name", value: selectedProject.displayName || selectedProject.fullyQualifiedName },
      { label: "Full name", value: selectedProject.fullyQualifiedName },
      { label: "Client", value: client ? <Link className="font-semibold text-[#173244] underline-offset-2 hover:underline dark:text-[#9cc4c9]" to={`/clients?id=${encodeURIComponent(client.id)}`}>{client.displayName || client.fullyQualifiedName}</Link> : clientLoading ? "Loading client..." : "No linked client" },
      { label: "Billing address", value: formatAddress(selectedProject.billAddrLine1, selectedProject.billAddrLine2, selectedProject.billAddrCity, selectedProject.billAddrState, selectedProject.billAddrPostalCode) },
      { label: "Shipping address", value: formatAddress(selectedProject.shipAddrLine1, selectedProject.shipAddrLine2, selectedProject.shipAddrCity, selectedProject.shipAddrState, selectedProject.shipAddrPostalCode) },
      { label: "QBO active", value: selectedProject.active ? "Yes" : "No" },
      { label: "Last synced", value: selectedProject.lastSyncedDate },
    ];
  }, [client, clientLoading, selectedProject]);

  function changePage(page: number) { setPagination((current) => ({ ...current, page })); }
  function changePageSize(pageSize: NorthstarPageSize) { setPagination((current) => ({ ...current, page: 1, pageSize })); }
  function returnToList() { setSearchParams(clientId ? { clientId } : {}); }

  async function saveStatus(status: ProjectStatus) {
    if (!id) return;
    setStatusSaving(true);
    try {
      const saved = await updateProjectStatus(id, status);
      setExtraData(saved);
      setStatusEditorOpen(false);
      setActionNotice(`Project status saved as ${status}.`);
    } catch (error: unknown) {
      setDetailError(String(error));
    } finally {
      setStatusSaving(false);
    }
  }

  function closeout() {
    if (!window.confirm("Close out this project and set its status to Complete?")) return;
    void saveStatus("complete");
  }

  if (id) {
    return (
      <div className="grid gap-4 text-neutral-950 dark:text-neutral-50">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <ActionButton label="Back" icon={<ArrowLeft className="size-4" />} onClick={returnToList} />
            <div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{selectedProject?.displayName || (detailLoading ? "Loading project" : "Project detail")}</h1>
            </div>
          </div>
          {selectedProject && <div className="flex flex-wrap gap-2">
            <ActionButton label="Create Invoice" icon={<FilePlus2 className="size-4" />} onClick={() => navigate(`/invoices?projectId=${encodeURIComponent(selectedProject.id)}`)} primary />
            <ActionButton label="Set Status" icon={<Settings2 className="size-4" />} onClick={() => setStatusEditorOpen((current) => !current)} />
            <ActionButton label="Closeout" icon={<CheckCircle2 className="size-4" />} onClick={closeout} />
          </div>}
        </div>
        {detailLoading && <LoadingPanel label="Loading project record..." />}
        {notFound && <EmptyPanel label="NO ID FOUND" />}
        {detailError && <ErrorPanel message={detailError} />}
        {selectedProject && !detailLoading && <section className="grid gap-4 rounded-md border border-neutral-300 bg-neutral-50 p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          {actionNotice && <Notice message={actionNotice} />}
          {statusEditorOpen && <div className="flex flex-wrap items-end gap-3 rounded border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900">
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Project status<select value={extraData?.status || "active"} disabled={statusSaving} onChange={(event) => void saveStatus(event.target.value as ProjectStatus)} className="mt-1 rounded border border-neutral-300 bg-white px-2 py-2 text-sm font-normal normal-case tracking-normal text-neutral-900 outline-none focus:ring-2 focus:ring-[#173244]/30 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-50">
              {PROJECT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            </label>
            <span className="text-xs text-neutral-500">Saving updates project extra data only.</span>
          </div>
          }
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3 dark:border-neutral-700">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-neutral-500 dark:text-neutral-400">Project status</p>
              <div className="mt-1">
                {extraLoading ? <span className="text-sm text-neutral-500">Loading status...</span> : <RecordStatus value={extraData?.status || "active"} />}
              </div>
            </div>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">Base record loaded independently from project extra data</span>
          </div>
          <PropertyList properties={projectProperties} />
        </section>}
      </div>
    );
  }

  return (
    <div className="grid gap-4 text-neutral-950 dark:text-neutral-50">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight uppercase tracking-[0.25em]">Projects</h1>
        </div>
        <NorthstarButton
          field="refresh"
          buttonStyle="secondary"
          onClick={() => setRefreshKey((current) => current + 1)}
          disabled={listLoading}
        >
          <RefreshCw className={`size-4 ${listLoading ? "animate-spin" : ""}`} />
          Refresh
        </NorthstarButton>
      </header>
      {clientId && <div className="flex items-center justify-between gap-3 rounded border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100">
        <span>Showing projects for client {clientId}.</span>
        <button type="button" onClick={() => setSearchParams({})} className="font-semibold underline underline-offset-2">Clear filter</button>
      </div>}
      {action === "create" && <Notice message="Project creation is queued for the next Northstar workflow slice." />}
      <section className="overflow-hidden rounded-md border border-neutral-300 bg-neutral-50 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        {listError && <ErrorPanel message={listError} />}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-300 text-left dark:border-neutral-700">
                <th className="px-3 py-2">
                  <SortHeading direction={direction} onToggle={() => { setDirection((current) => current === "asc" ? "desc" : "asc"); setPagination((current) => ({ ...current, page: 1 })); }} />
                </th>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Quick actions</th>
              </tr>
            </thead>
            <tbody>
              {listLoading && <tr>
                <td colSpan={4}><LoadingPanel label="Loading projects..." />
                </td>
              </tr>}
              {!listLoading && projects.length === 0 && <tr>
                <td colSpan={4}>
                  <EmptyPanel label="No projects found." />
                </td>
              </tr>}
              {!listLoading && projects.map((project) =>
                <tr key={project.id} className="border-b border-neutral-200 align-middle last:border-0 dark:border-neutral-700">
                  <td className="px-3 py-3">
                    <Link to={`/projects?id=${encodeURIComponent(project.id)}`} className="inline-flex items-center gap-2 font-semibold hover:text-[#173244] focus:outline-none focus:ring-2 focus:ring-[#173244]/30 dark:hover:text-[#9cc4c9]">
                      <span>{project.fullName}</span>
                      <SquareArrowOutUpRight className="size-3.5 opacity-50" />
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-neutral-600 dark:text-neutral-300">
                    {project.parentDisplayName || "—"}
                  </td>
                  <td className="px-3 py-3">
                    <RecordStatus value={project.status} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      <ActionButton label="Create Invoice" icon={<FilePlus2 className="size-3.5" />} onClick={() => navigate(`/invoices?projectId=${encodeURIComponent(project.id)}`)} />
                      <ActionButton label="Set Status" icon={<Settings2 className="size-3.5" />} onClick={() => setSearchParams({ id: project.id, action: "status" })} />
                      <ActionButton label="Closeout" icon={<CheckCircle2 className="size-3.5" />} onClick={() => setSearchParams({ id: project.id, action: "closeout" })} />
                    </div>
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
        <PaginationControls pagination={pagination} onPageChange={changePage} onPageSizeChange={changePageSize} />
      </section>
    </div>
  );
}

function formatAddress(line1: string, line2: string, city: string, state: string, postalCode: string) { return [line1, line2, [city, state].filter(Boolean).join(", "), postalCode].filter(Boolean).join(" · "); }
function ActionButton({ label, icon, onClick, primary = false }: { label: string; icon: ReactNode; onClick: () => void; primary?: boolean }) { return <button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 rounded border px-2 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#173244]/30 ${primary ? "border-[#173244] bg-[#173244] text-white hover:bg-[#24495d] dark:border-[#9cc4c9] dark:bg-[#9cc4c9] dark:text-[#10262f]" : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"}`}><span>{icon}</span>{label}</button>; }
function LoadingPanel({ label }: { label: string }) { return <p className="px-3 py-5 text-sm text-neutral-500 dark:text-neutral-400">{label}</p>; }
function EmptyPanel({ label }: { label: string }) { return <p className="px-3 py-8 text-center text-sm font-semibold tracking-wide text-neutral-500 dark:text-neutral-400">{label}</p>; }
function ErrorPanel({ message }: { message: string }) { return <p className="m-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-100">{message}</p>; }
function Notice({ message }: { message: string }) { return <p className="rounded border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100">{message}</p>; }
