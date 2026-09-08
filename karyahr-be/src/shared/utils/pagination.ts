export type PaginationQuery = {
  readonly page?: number;
  readonly pageSize?: number;
};

export type PaginationParams = {
  readonly skip: number;
  readonly take: number;
  readonly page: number;
  readonly pageSize: number;
};

export type PaginationMeta = {
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Converts page/pageSize query values into Prisma skip/take.
 */
export function parsePagination(query: PaginationQuery = {}): PaginationParams {
  const page = Math.max(DEFAULT_PAGE, Math.trunc(query.page ?? DEFAULT_PAGE));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.trunc(query.pageSize ?? DEFAULT_PAGE_SIZE)),
  );
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

/**
 * Builds pagination metadata for list responses.
 */
export function paginationMeta(
  total: number,
  page: number,
  pageSize: number,
): PaginationMeta {
  return {
    total,
    page,
    pageSize,
    totalPages: pageSize === 0 ? 0 : Math.ceil(total / pageSize),
  };
}
