import type { UnknownPartial } from "cfdg/types/v2";
import type { ListOptions, PageSize, Pagination } from "cfdg/types/v2";

/** 
 * Validates and normalizes a list request. 
 * @param query The query parameters to validate.
 * @returns The normalized list options or an error message.
 */
export function parseListQuery(query: UnknownPartial<ListOptions>): ListOptions | string {
  const page = Number(query.page ?? 1);
  const pageSize = Number(query.pageSize ?? 25);
  const direction = String(query.direction ?? "asc").trim().toLowerCase();

  if (!Number.isInteger(page) || page < 1) return "page must be a positive integer";
  if (![25, 50, 100, 250].includes(pageSize)) return "pageSize must be 25, 50, 100, or 250";
  if (direction !== "asc" && direction !== "desc") return "direction must be asc or desc";

  return { page, pageSize: pageSize as PageSize, direction };
}

/** 
 * Builds a Pagination object from the given parameters.
 * @param page The current page number.
 * @param pageSize The number of records per page.
 * @param totalRecords The total number of matching records.
 * @returns A Pagination object containing the pagination metadata.
 */
export function buildPagination(page: number, pageSize: PageSize, totalRecords: number): Pagination {
  return {
    page,
    pageSize,
    totalRecords,
    totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / pageSize),
  };
}
