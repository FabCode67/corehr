/**
 * Shared pagination helpers, used by every list endpoint that's rendered as
 * a table in the admin UI (Employees, Positions, Departments, Leave
 * Requests, Public Holidays, and any future one).
 *
 * Deliberately additive, not a breaking change to existing `findAll()`
 * methods: those keep returning a plain array for callers that need the
 * full unpaginated list (dropdowns, cascading selects, client-side
 * filtering — e.g. the Position Assignment step's department->position
 * cascade). A sibling `findAllPaginated()` method is added alongside each
 * `findAll()` for the table views specifically, so nothing that already
 * depends on getting everything back silently starts only seeing 20 rows.
 */

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface NormalizedPagination {
  page: number
  pageSize: number
  skip: number
  take: number
}

export function normalizePagination(page?: number, pageSize?: number): NormalizedPagination {
  const normalizedPage = Number.isFinite(page) && (page as number) > 0 ? Math.floor(page as number) : 1
  const normalizedPageSize =
    Number.isFinite(pageSize) && (pageSize as number) > 0
      ? Math.min(Math.floor(pageSize as number), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE

  return {
    page: normalizedPage,
    pageSize: normalizedPageSize,
    skip: (normalizedPage - 1) * normalizedPageSize,
    take: normalizedPageSize,
  }
}

export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResult<T> {
  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}
