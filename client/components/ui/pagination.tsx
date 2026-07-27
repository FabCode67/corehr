import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  /** The page's own path, e.g. "/admin/employees". */
  basePath: string
  /** Current query params (as read from searchParams) — preserved on
   *  Prev/Next links, only the `page` param is overridden. */
  searchParams?: Record<string, string | undefined>
  /** Query param name to use, in case a page has more than one paginated
   *  table on it (see admin/leave/approvals). Defaults to "page". */
  paramName?: string
}

function hrefFor(basePath: string, searchParams: Record<string, string | undefined>, paramName: string, page: number) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== "" && key !== paramName) params.set(key, value)
  }
  params.set(paramName, String(page))
  return `${basePath}?${params.toString()}`
}

/** Server-renderable — plain links, no client JS needed, consistent with
 *  the filter bars used across the admin tables (see
 *  admin/leave/approvals/page.tsx for the same GET-form pattern). */
export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  basePath,
  searchParams = {},
  paramName = "page",
}: PaginationProps) {
  if (totalPages <= 1) return null

  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1
  const lastRow = Math.min(total, page * pageSize)

  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
      <p className="text-xs text-muted-foreground">
        {firstRow}–{lastRow} of {total}
      </p>
      <div className="flex items-center gap-1">
        <PageLink
          href={hrefFor(basePath, searchParams, paramName, page - 1)}
          disabled={page <= 1}
          label="Previous"
        >
          <ChevronLeft className="size-3.5" />
        </PageLink>
        <span className="px-2 text-xs text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <PageLink
          href={hrefFor(basePath, searchParams, paramName, page + 1)}
          disabled={page >= totalPages}
          label="Next"
        >
          <ChevronRight className="size-3.5" />
        </PageLink>
      </div>
    </div>
  )
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string
  disabled: boolean
  label: string
  children: React.ReactNode
}) {
  if (disabled) {
    return (
      <span
        aria-disabled
        className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground/40"
      >
        {children}
      </span>
    )
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "flex size-7 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted"
      )}
    >
      {children}
    </Link>
  )
}
