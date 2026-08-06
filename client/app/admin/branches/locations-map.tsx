"use client"

import "leaflet/dist/leaflet.css"

import L from "leaflet"
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet"

import type { Branch } from "@/lib/api/branches"

// Leaflet's default marker image paths break under Next.js's bundler (they
// resolve relative to the JS chunk, not the site root) — pointing at the
// same version's images on a CDN sidesteps that entirely, no bundler
// asset-loader config needed. See leaflet's own "webpack" troubleshooting
// docs for why this workaround exists.
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

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
        No locations have coordinates yet — edit a location and add a latitude/longitude to see it here.
      </div>
    )
  }

  const center: [number, number] = [pinned[0].latitude, pinned[0].longitude]

  return (
    <div className="h-96 overflow-hidden rounded-lg border border-border">
      <MapContainer center={center} zoom={7} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pinned.map((branch) => (
          <Marker key={branch.id} position={[branch.latitude, branch.longitude]} icon={markerIcon}>
            <Popup>
              <p className="font-semibold">{branch.name}</p>
              {branch.code ? <p>{branch.code}</p> : null}
              {branch.isHeadquarters ? <p>Headquarters</p> : null}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
