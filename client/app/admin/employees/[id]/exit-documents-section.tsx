// Superseded by ./exit-clearance-section.tsx — see schema.prisma's "EXIT
// CLEARANCE WORKFLOW" module note. The exit-documents API this depended on
// (lib/api/exit-documents.ts) still exists but is no longer wired to any
// backend routes (server/src/modules/exit-documents is now a no-op — see
// its own module comments). Left as an intentional no-op rather than
// deleted; safe to remove this file.
export {}
