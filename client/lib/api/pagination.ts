/** Mirrors server/src/common/pagination.ts's PaginatedResult<T> shape. */
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export const DEFAULT_PAGE_SIZE = 20
