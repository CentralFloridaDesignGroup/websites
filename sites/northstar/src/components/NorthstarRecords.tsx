import type { ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
import type { PageSize, Pagination } from "cfdg/types/v2";

/** Shared status badge used by Northstar client/project rows and detail sheets. */
export function RecordStatus({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const tone = normalized === "active" ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"
    : normalized === "proposal" ? "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-200"
      : normalized === "complete" ? "border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-200"
        : normalized === "cancelled" || normalized === "inactive" ? "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200";
  return <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold capitalize ${tone}`}>{value || "Unknown"}</span>;
}

/** A compact page-size and previous/next control row for Northstar tables. */
export function PaginationControls({ pagination, onPageChange, onPageSizeChange }: {
  pagination: Pagination;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
}) {
  const canPrevious = pagination.page > 1;
  const canNext = pagination.totalPages > 0 && pagination.page < pagination.totalPages;
  return (
    <div className="flex flex-col gap-3 border-t border-neutral-200 px-3 py-3 text-xs text-neutral-600 dark:border-neutral-700 dark:text-neutral-300 sm:flex-row sm:items-center sm:justify-between">
      <label className="flex items-center gap-2">
        <span>Rows per page</span>
        <span className="relative">
          <select
            value={pagination.pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value) as PageSize)}
            className="appearance-none rounded border border-neutral-300 bg-white py-1 pl-2 pr-7 font-semibold text-neutral-900 outline-none focus:border-[#173244] focus:ring-2 focus:ring-[#173244]/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-50"
          >
            {[25, 50, 100, 250].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1.5 size-3.5" aria-hidden="true" />
        </span>
      </label>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span>Page {pagination.totalPages === 0 ? 0 : pagination.page} of {pagination.totalPages}</span>
        <button type="button" disabled={!canPrevious} onClick={() => onPageChange(pagination.page - 1)} className="inline-flex size-7 items-center justify-center rounded border border-neutral-300 bg-white text-neutral-800 transition hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#173244]/30 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700" aria-label="Previous page">
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <button type="button" disabled={!canNext} onClick={() => onPageChange(pagination.page + 1)} className="inline-flex size-7 items-center justify-center rounded border border-neutral-300 bg-white text-neutral-800 transition hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#173244]/30 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700" aria-label="Next page">
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** A full-name table heading that communicates the current sort direction. */
export function SortHeading({ direction, onToggle }: { direction: "asc" | "desc"; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="inline-flex items-center gap-1 font-semibold text-neutral-700 outline-none hover:text-neutral-950 focus:ring-2 focus:ring-[#173244]/30 dark:text-neutral-200 dark:hover:text-white" aria-label={`Sort by name ${direction === "asc" ? "descending" : "ascending"}`}>
      Name
      {direction === "asc" ? <ChevronsUpDown className="size-3.5" aria-hidden="true" /> : <ChevronDown className="size-3.5 rotate-180" aria-hidden="true" />}
    </button>
  );
}

/** Renders property rows as a quiet, scannable detail sheet. */
export function PropertyList({ properties }: { properties: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="divide-y divide-neutral-200 rounded border border-neutral-200 bg-white dark:divide-neutral-700 dark:border-neutral-700 dark:bg-neutral-900">
      {properties.map((property) => (
        <div key={property.label} className="grid gap-1 px-3 py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
          <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">{property.label}</dt>
          <dd className="min-w-0 break-words text-sm text-neutral-900 dark:text-neutral-100">{property.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
