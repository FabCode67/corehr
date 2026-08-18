"use client"

import "leaflet/dist/leaflet.css"

import { Fragment, useState, useEffect } from "react"
import L from "leaflet"
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet"
import Link from "next/link"

import type { Branch } from "@/lib/api/branches"
import { fetchEmployeesPaginated } from "@/lib/api/employees"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

// Leaflet's default marker image paths break under Next.js's bundler (they
// resolve relative to the JS chunk, not the site root) — pointing at the
// same version's images on a CDN sidesteps that entirely, no bundler
// asset-loader config needed. See leaflet's own "webpack" troubleshooting
// docs for why this workaround exists.
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

/** Small circular badge showing a branch's headcount, anchored to the
 *  bottom-right of the pin — a plain L.divIcon (styled HTML, not an image)
 *  so no extra asset/CDN request is needed per marker. Built once per
 *  distinct count value (not once per marker) — counts repeat often across
 *  branches, and L.divIcon instances are cheap to share. */
const countBadgeIconCache = new Map<number, L.DivIcon>()
function countBadgeIcon(count: number) {
  const cached = countBadgeIconCache.get(count)
  if (cached) return cached

  const icon = L.divIcon({
    className: "",
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      min-width:18px;height:18px;padding:0 4px;border-radius:9999px;
      background:#0A2647;color:#fff;font:600 11px/18px sans-serif;
      border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4);
    ">${count}</div>`,
    iconSize: [18, 18],
    iconAnchor: [-6, 22],
  })
  countBadgeIconCache.set(count, icon)
  return icon
}

type PinnedBranch = Branch & { latitude: number; longitude: number }

/**
 * Free OpenStreetMap tiles (no API key/billing) — only plots locations that
 * have both latitude and longitude filled in (see Branch.latitude's schema
 * doc comment); everything else is silently skipped rather than guessed at.
 * Loaded via next/dynamic with ssr:false from locations-map-client.tsx —
 * Leaflet touches `window`/`document` at import time, so this component can
 * never run server-side.
 *
 * The guard below checks more than `!== null` on purpose: a stale Prisma
 * Client on the API (schema migrated, but `prisma generate` not re-run
 * since) serves Branch rows with latitude/longitude missing entirely
 * (`undefined`, not `null`), which Leaflet's LatLng constructor throws a
 * hard, uncaught "Invalid LatLng object" error on — crashing this whole
 * page instead of falling back to the empty state below.
 */
export function LocationsMap({ branches }: { branches: Branch[] }) {
  const pinned = branches.filter(
    (branch): branch is PinnedBranch =>
      typeof branch.latitude === "number" &&
      typeof branch.longitude === "number" &&
      Number.isFinite(branch.latitude) &&
      Number.isFinite(branch.longitude)
  )

  if (pinned.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground">
        No locations have coordinates yet — edit a location and add a
        latitude/longitude to see it here.
      </div>
    )
  }

  const center: [number, number] = [pinned[0].latitude, pinned[0].longitude]

  return (
    <div className="h-96 overflow-hidden rounded-lg border border-border">
      <MapContainer
        center={center}
        zoom={7}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pinned.map((branch) => {
          const employeeCount = branch._count?.employees ?? 0
          const position: [number, number] = [branch.latitude, branch.longitude]

          return (
            <Fragment key={branch.id}>
              <Marker position={position} icon={markerIcon}>
                <Popup>
                  <p className="font-semibold">{branch.name}</p>
                  {branch.code ? <p>{branch.code}</p> : null}
                  {branch.isHeadquarters ? <p>Headquarters</p> : null}
                  <p>
                    {employeeCount}{" "}
                    {employeeCount === 1 ? "employee" : "employees"}
                  </p>
                  <div className="mt-2">
                    <ViewEmployeesButton
                      branchId={branch.id}
                      branchName={branch.name}
                    />
                  </div>
                </Popup>
              </Marker>
              {/* Non-interactive badge overlaying the pin's shoulder with the
               *  headcount, so the number is visible at a glance without
               *  opening the popup. */}
              <Marker
                position={position}
                icon={countBadgeIcon(employeeCount)}
                interactive={false}
                keyboard={false}
              />
            </Fragment>
          )
        })}
      </MapContainer>
    </div>
  )
}

function ViewEmployeesButton({
  branchId,
  branchName,
}: {
  branchId: string
  branchName: string
}) {
  const [open, setOpen] = useState(false)
  const [employees, setEmployees] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [includeInactive, setIncludeInactive] = useState(false)

  useEffect(() => {
    if (!open) return
    let mounted = true
    setLoading(true)
    setError(null)
    fetchEmployeesPaginated({ page, pageSize, branchId, includeInactive })
      .then((res) => {
        if (!mounted) return
        if (!res.ok) {
          setError(res.error ?? `Could not load employees (${res.status})`)
          setEmployees([])
        } else {
          setEmployees(res.data.data)
          setTotalPages(res.data.totalPages)
        }
      })
      .catch((err) => {
        if (!mounted) return
        setError(err instanceof Error ? err.message : String(err))
        setEmployees([])
      })
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [open, branchId, page, pageSize, includeInactive])

  function gotoPage(p: number) {
    if (p < 1) p = 1
    if (p > totalPages) p = totalPages
    setPage(p)
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        View employees
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Employees at {branchName}</DialogTitle>
            <DialogClose aria-label="Close" />
          </DialogHeader>
          <DialogBody>
            <div className="mb-4 flex items-center justify-between gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(e) => {
                    setIncludeInactive(e.target.checked)
                    setPage(1)
                  }}
                />
                <span className="text-xs text-muted-foreground">
                  Include inactive
                </span>
              </label>
              <div className="text-sm text-muted-foreground">
                Page {page} / {totalPages}
              </div>
            </div>

            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : error ? (
              <div className="py-6 text-center text-sm text-destructive">
                {error}
              </div>
            ) : employees && employees.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {employees.map((e) => (
                  <li
                    key={e.employeeNumber}
                    className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2"
                  >
                    <div>
                      <div className="font-medium">
                        <Link
                          href={`/admin/employees/${e.employeeNumber}`}
                          className="text-primary hover:underline"
                        >
                          {e.firstName} {e.lastName}
                        </Link>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {e.position?.title ?? "(No position)"}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {e.email}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No employees at this location.
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <div className="flex w-full items-center justify-between">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => gotoPage(page - 1)}
                  disabled={page <= 1}
                >
                  Prev
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => gotoPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
              <div>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
