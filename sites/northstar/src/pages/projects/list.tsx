import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { NorthstarPageSize, NorthstarPagination, ProjectListItem } from "cfdg/types";
import { CheckCircle2, FilePlus2, RefreshCw, Settings2, SquareArrowOutUpRight } from "lucide-react";
import { fetchProjects } from "../../api/projects";
import { PaginationControls, RecordStatus, SortHeading } from "../../components/NorthstarRecords";
import { NorthstarButton } from "cfdg/ui/input";
import { EmptyPanel, ErrorPanel, LoadingPanel, Notice } from "./handler";

const EMPTY_PAGINATION: NorthstarPagination = { page: 1, pageSize: 25, totalRecords: 0, totalPages: 0 };

/** Northstar project list and independently loaded project detail sheet. */
export function ProjectsListView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const id = searchParams.get("id")?.trim() || "";
  const clientId = searchParams.get("clientId")?.trim() || "";
  const action = searchParams.get("action")?.trim() || "";
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Projects - Northstar";
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

  function changePage(page: number) { setPagination((current) => ({ ...current, page })); }
  function changePageSize(pageSize: NorthstarPageSize) { setPagination((current) => ({ ...current, page: 1, pageSize })); }

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

/** @deprecated Use {@link NorthstarButton} instead. */
function ActionButton({ label, icon, onClick, primary = false }: { label: string; icon: ReactNode; onClick: () => void; primary?: boolean }) { return <button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 rounded border px-2 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#173244]/30 ${primary ? "border-[#173244] bg-[#173244] text-white hover:bg-[#24495d] dark:border-[#9cc4c9] dark:bg-[#9cc4c9] dark:text-[#10262f]" : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"}`}><span>{icon}</span>{label}</button>; }

