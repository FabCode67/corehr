"use client"

import * as React from "react"
import { useMemo, useState } from "react"
import { Download } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { employeeExportUrl, type EmployeeExportColumn } from "@/lib/api/employees"
import { cn } from "@/lib/utils"

/**
 * "Export" button + column-picker dialog for the Employees admin table.
 * `columns` is the full catalog fetched server-side (see
 * lib/api/employees.ts's fetchEmployeeExportColumns() — apiFetchSafe only
 * runs in a Server Component/Action, so the page fetches it and hands it
 * down here rather than this client component fetching it itself).
 */
export function ExportColumnsDialog({ columns }: { columns: EmployeeExportColumn[] }) {
  const [open, setOpen] = useState(false)
  const allKeys = useMemo(() => columns.map((c) => c.key), [columns])
  const [selected, setSelected] = useState<Set<string>>(() => new Set(allKeys))

  const groups = useMemo(() => {
    const map = new Map<string, EmployeeExportColumn[]>()
    for (const column of columns) {
      const list = map.get(column.group) ?? []
      list.push(column)
      map.set(column.group, list)
    }
    return Array.from(map.entries())
  }, [columns])

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectedKeys = allKeys.filter((key) => selected.has(key))
  const canExport = selectedKeys.length > 0

  function handleDownloadClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!canExport) {
      e.preventDefault()
      return
    }
    // Downloads happen via a plain navigation (Content-Disposition:
    // attachment on the response means the browser never leaves the page),
    // so just close the dialog right away rather than waiting on anything.
    setOpen(false)
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Download className="mr-1.5 size-4" />
        Export
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div>
              <DialogTitle>Export Employees</DialogTitle>
              <DialogDescription>Choose which columns to include, then download.</DialogDescription>
            </div>
          </DialogHeader>

          <DialogBody className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {selectedKeys.length} of {allKeys.length} columns selected
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelected(new Set(allKeys))}
                  className="font-medium text-primary hover:underline"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="font-medium text-primary hover:underline"
                >
                  Select none
                </button>
              </div>
            </div>

            <div className="flex max-h-96 flex-col gap-4 overflow-y-auto pr-1">
              {groups.map(([group, groupColumns]) => (
                <div key={group}>
                  <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{group}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {groupColumns.map((column) => (
                      <label
                        key={column.key}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm text-foreground hover:bg-muted/60"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(column.key)}
                          onChange={() => toggle(column.key)}
                          className="size-4 rounded border-border accent-primary"
                        />
                        {column.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {!canExport ? <p className="text-sm text-destructive">Select at least one column to export.</p> : null}
          </DialogBody>

          <DialogFooter>
            <DialogClose className={buttonVariants({ variant: "outline", size: "sm" })}>Cancel</DialogClose>
            <a
              href={canExport ? employeeExportUrl(selectedKeys, "csv") : undefined}
              aria-disabled={!canExport}
              onClick={handleDownloadClick}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), !canExport && "pointer-events-none opacity-50")}
            >
              Export CSV
            </a>
            <a
              href={canExport ? employeeExportUrl(selectedKeys, "xlsx") : undefined}
              aria-disabled={!canExport}
              onClick={handleDownloadClick}
              className={cn(buttonVariants({ size: "sm" }), !canExport && "pointer-events-none opacity-50")}
            >
              Export Excel
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
