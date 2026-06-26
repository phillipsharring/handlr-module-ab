# Changelog

All notable changes to `handlr-module-ab` are documented here.

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
