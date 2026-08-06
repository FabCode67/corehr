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
 */
export function LocationsMap({ branches }: { branches: Branch[] }) {
  const pinned = branches.filter((branch): branch is PinnedBranch => branch.latitude !== null && branch.longitude !== null)

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
