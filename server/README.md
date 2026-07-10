# NCBA Rwanda PeopleSuite — API

NestJS + Prisma + PostgreSQL backend. This first pass covers the
**Organizational Structure** module (Function → Department → Unit →
Position → Employee) plus a minimal Employee stub, as specced.

## Stack

- NestJS 11, TypeScript
- Prisma ORM 6 + PostgreSQL
- class-validator / class-transformer for DTOs
- Swagger docs at `/api/docs` once running

## Setup

Requires Node.js 20+ and a running PostgreSQL instance.

```bash
cd server
npm install

cp .env.example .env
# edit .env — set DATABASE_URL to your local Postgres connection string

npx prisma migrate dev --name init   # creates the schema in your database
npm run prisma:seed                  # loads the spec's example org structure

npm run start:dev                    # http://localhost:4000/api
```

Once running, open `http://localhost:4000/api/docs` for the interactive
Swagger UI, or try:

- `GET /api/organization/org-chart` — the full reporting tree, built
  dynamically from `Position.reportsToPositionId` (nothing hardcoded).
- `GET /api/employees` — the 5 demo employees seeded above.
- `GET /api/employees/{id}/reporting-manager` — auto-derived manager,
  resolved by walking the Position hierarchy.

## What's implemented

- **Organization module**: Functions, Departments, Units, Position Levels,
  Bands, Positions — full CRUD, soft-deleted (`isActive`) rather than hard
  deleted so historical records never dangle.
- **Positions**: enforces that a Unit (if given) belongs to the same
  Department, prevents duplicate titles within a Department/Unit scope
  (handled in the service, not the DB, since Postgres treats every `NULL`
  differently in a composite unique index), and blocks any change to
  `reportsToPositionId` that would create a reporting cycle.
- **Org Chart**: `OrgChartService.getTree()` loads all active positions in
  one query and assembles the tree in memory — no recursive queries, no
  hardcoded levels. Guards against a cycle in the data even though
  `PositionsService` should prevent one from being created in the first
  place.
- **Employees (stub)**: create, basic-field update, `POST /:id/transfer`
  (position change) and `POST /:id/band` (band change) — both write a
  `PositionHistory` row so transfers/promotions/band changes are fully
  auditable. `GET /:id/reporting-manager` auto-derives the manager from the
  position hierarchy, with `reportingManagerOverrideId` as an explicit
  escape hatch for documented exceptions (dotted-line reporting, vacant
  parent position, etc.).

## What's intentionally NOT here yet

- Auth/JWT/RBAC (org-structure endpoints are unprotected right now — do not
  point this at anything but a local dev database).
- Full Employee Management (contracts, documents, family info, ...) —
  this stub only carries the fields org-structure logic needs.
- A generic audit-log table for all mutations (separate from
  `PositionHistory`, which is scoped to position/band changes only).

## Key modelling decisions worth knowing about

- **Position = role/template, not a numbered seat.** Multiple employees can
  hold the same Position concurrently (e.g. three "Officer – Channels
  Analyst"s). This matches how the spec lists positions as fixed org-chart
  nodes. If you actually need per-seat headcount limits, that's a schema
  change (`Position` would need a `headcount` field and seat-level
  assignment) — flag it and we'll revisit.
- **Employee.departmentId/unitId don't exist as columns.** They're derived
  via `Employee -> Position -> Unit -> Department` to avoid a second source
  of truth. If department-level employee queries need to be faster at
  scale, the fix is a read-optimized view or denormalized column with a
  trigger — not a reason to duplicate the FK now.
- **`reportingManagerOverrideId` is the exception path, not the default.**
  `EmployeesService.getReportingManager()` only falls back to it when set;
  otherwise the manager is always resolved live from
  `position.reportsToPositionId`.
