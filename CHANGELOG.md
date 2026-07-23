# Changelog

All notable changes to `handlr-module-ab` are documented here.

## [0.2.0] - 2026-07-22

### Added

- Admin UI pages, now owned by the module: `pages/admin/ab/` (test list + create
  modal) and `pages/admin/ab/[id]/` (results view). Discovered via the module's
  new `pagesDir`. Previously these lived in the app skeleton; they are removed
  from the default app install.
- `defaults.adminNav` entry ("A/B Tests" → `/admin/ab/`) so host apps surface the
  admin link automatically.
- `package.json` `files` now ships `pages`.

### Changed

- Adopt the handlr-frontend declarative behavior layer (ADR 0003): the
  `data-ab-capture` conversion-tracking click now uses the shared `onClick`
  delegation instead of a standalone `document` listener; the admin "New Test"
  button is `data-action="ab-new-test"` (registered via `registerAction` in the
  runtime) instead of an inline `addEventListener`. The `[id]` results page keeps
  its own scoped click delegation but renames `data-action` → `data-ab-action` to
  stay out of the global action-registry namespace.
- **BREAKING (peer):** the runtime now imports `onClick` / `registerAction` from
  `@phillipsharring/handlr-frontend`, which exist only in the ADR-0003 behavior-layer
  release. The `peerDependencies` range **must be tightened** from `>=0.8.0 <1.0.0` to
  `>=<behavior-layer-minor> <1.0.0` at publish — older frontends lack those exports and
  the runtime `init()` would fail.

## [0.1.0] - 2026-06-25

### Added

- Initial extraction of A/B testing into a standalone dual-published module
  (npm `@phillipsharring/handlr-module-ab` + composer `phillipsharring/handlr-module-ab`),
  per ADR 0001 step 7.
- Backend (`Handlr\Module\Ab\`): `AbService`, six pipes (assignments, capture,
  list, create, results, update), `AbTestsTable` / `AbEventsTable` / `AbResultsQuery`,
  domain records, and `AbEventCapturedEvent`.
- `AbServiceProvider` — self-registers routes (on the `api.public` / `api.admin`
  junctions) and migrations. Seed data stays app-owned (the module ships
  schema, not opinionated rows).
- `ab_tests`, `ab_events`, and the aggregate `event_date`/`count` migrations.
- Frontend: `registerAbHelpers` ({{#ab}} Handlebars helper) and the client
  runtime (`ab.init()`, `capture`, `getAssignments`).

### Notes

- Namespace moved from the core framework's `Handlr\Ab\` to `Handlr\Module\Ab\`
  to follow the module convention (matches `Handlr\Module\Landing\`).
- The same code previously shipped inside `phillipsharring/handlr-backend`
  (`src/Ab`) and each app wired the routes + owned the migrations by hand.
