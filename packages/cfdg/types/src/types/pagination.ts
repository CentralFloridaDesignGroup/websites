/** Supported page sizes for Northstar list views. */
export type NorthstarPageSize = 25 | 50 | 100 | 250;

/** Pagination metadata returned by Northstar list endpoints. */
export type NorthstarPagination = {
  /** One-based page number returned by the API. */
  page: number;
  /** Number of records requested per page. */
  pageSize: NorthstarPageSize;
  /** Total number of matching records. */
  totalRecords: number;
  /** Total number of available pages. */
  totalPages: number;
};

/** Options for paginated list requests. */
export type ListOptions = {
  /** One-based page number to request. */
  page: number;
  /** Number of records to request per page. */
  pageSize: NorthstarPageSize;
  /** Sort direction for the list. */
  direction: "asc" | "desc";
};