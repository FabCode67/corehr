"use client"

import dynamic from "next/dynamic"

import type { Branch } from "@/lib/api/branches"

// next/dynamic's ssr:false option can only be called from a Client
// Component in the App Router — this thin wrapper is what lets the
// (async, server-rendered) branches page.tsx import a Leaflet map without
// ever trying to render it on the server.
const LocationsMap = dynamic(() => import("./locations-map").then((mod) => mod.LocationsMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
})

export function LocationsMapLoader({ branches }: { branches: Branch[] }) {
  return <LocationsMap branches={branches} />
}
