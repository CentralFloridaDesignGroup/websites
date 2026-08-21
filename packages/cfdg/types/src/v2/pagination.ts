/** Supported V2 page sizes for Northstar list views. */
export type PageSize = 25 | 50 | 100 | 250;

/** Pagination metadata returned by Northstar list endpoints. */
export type Pagination = {
  /** One-based page number returned by the API. */
  page: number;
  /** Number of records requested per page. */
  pageSize: PageSize;
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
  pageSize: PageSize;
  /** Sort direction for the list. */
  direction: "asc" | "desc";
};
