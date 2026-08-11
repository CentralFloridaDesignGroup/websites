import type { NorthstarPageSize, NorthstarPagination } from "cfdg/types";

/** Validates and normalizes a Northstar list request. */
export function parseNorthstarListQuery(query: {
  page?: unknown;
  pageSize?: unknown;
  direction?: unknown;
}): { page: number; pageSize: NorthstarPageSize; direction: "asc" | "desc" } | string {
  const page = Number(query.page ?? 1);
  const pageSize = Number(query.pageSize ?? 25);
  const direction = String(query.direction ?? "asc").trim().toLowerCase();

  if (!Number.isInteger(page) || page < 1) return "page must be a positive integer";
  if (![25, 50, 100, 250].includes(pageSize)) return "pageSize must be 25, 50, 100, or 250";
  if (direction !== "asc" && direction !== "desc") return "direction must be asc or desc";

  return { page, pageSize: pageSize as NorthstarPageSize, direction };
}

/** Creates the common pagination metadata for a Northstar list response. */
export function buildPagination(page: number, pageSize: NorthstarPageSize, totalRecords: number): NorthstarPagination {
  return {
    page,
    pageSize,
    totalRecords,
    totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / pageSize),
  };
}
