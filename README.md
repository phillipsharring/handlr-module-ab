# handlr-module-ab

A/B testing module for [handlr](https://github.com/phillipsharring/handlr-mono) apps. Deterministic, session-scoped variant assignment; a `{{#ab}}` Handlebars helper for variant markup; and conversion capture with aggregated daily counts.

📖 **Documentation:** https://phillipsharring.github.io/handlr-mono/modules/ab

## Install

```bash
composer require phillipsharring/handlr-module-ab
npm install @phillipsharring/handlr-module-ab
```

One module, two manifests, lockstep version. Composer installs the PHP backend (service provider, pipes, tables, migrations); npm installs the frontend (Handlebars helper + client runtime).

## Setup

**1. Register the service provider** in `backend/app/config.php`:

```php
'providers' => [
    // ...
    Handlr\Module\Ab\AbServiceProvider::class,
],
```

This auto-registers the routes (under the app's existing `api.public` and `api.admin` junctions) and the migrations. Seed data (which tests exist) stays app-owned.

**2. Wire the frontend** in your app entry (e.g. `frontend/src/app.js`):

```js
import Handlebars from 'handlebars';
import { registerAbHelpers, ab } from '@phillipsharring/handlr-module-ab';

registerAbHelpers(Handlebars);   // enables {{#ab "test" "variant"}}…{{/ab}}
ab.init();                       // fetch assignments + wire conversion capture
```

**3. Run the migrations** to create the `ab_tests` and `ab_events` tables:

```bash
composer run migrate
```

## What's included

### Backend (`Handlr\Module\Ab\`)

Routes registered on the app's junctions:

| Method | Path | Junction | Pipe |
|---|---|---|---|
| GET | `/api/ab/assignments` | `api.public` | `GetAbAssignments` |
| POST | `/api/ab/capture` | `api.public` | `CaptureAbEvent` |
| GET | `/api/admin/ab` | `api.admin` | `GetAbTests` |
| POST | `/api/admin/ab` | `api.admin` | `PostCreateAbTest` |
| GET | `/api/admin/ab/{id}` | `api.admin` | `GetAbTestResults` |
| PATCH | `/api/admin/ab/{id}` | `api.admin` | `PatchUpdateAbTest` |

- `AbService` — deterministic `assignVariant()` (crc32 of session + test name), assignment lookup, and event recording.
- `ab_tests` / `ab_events` table migrations (auto-discovered via `migrationPaths()`). Seed data (which tests to run) is app-owned — define it in your app's seeds against `Handlr\Module\Ab\Data\AbTestsTable`.
- Dispatches the `ab.event.captured` event (`AbEventCapturedEvent`) on each capture, so apps can listen.

### Frontend

- `registerAbHelpers(Handlebars)` — the `{{#ab "test" "variant"}}…{{/ab}}` block helper.
- `ab.init()` — fetches assignments once per page lifetime, re-applies after boosted navigation, and delegates `data-ab-capture` clicks.
- `capture(event)` / `getAssignments()` — programmatic conversion tracking.

Markup conventions:

```html
<!-- Static variant HTML -->
<div data-ab-test="landing-cta" data-ab-variant="a">Original CTA</div>
<div data-ab-test="landing-cta" data-ab-variant="b">New CTA</div>

<!-- Conversion tracking -->
<button data-ab-capture="signup">Sign up</button>
```

## Removal

1. Remove `AbServiceProvider::class` from `config.php`.
2. Remove the `registerAbHelpers` / `ab` imports from the app entry.
3. `composer remove phillipsharring/handlr-module-ab` and `npm uninstall @phillipsharring/handlr-module-ab`.
4. Roll back the migrations (or drop the `ab_events` and `ab_tests` tables).

## Planned

### Weighted variants

Assignment is currently an even split: `assignVariant()` is
`crc32(sessionId . ':' . testName) % count($variants)`, so two variants means
50/50 and there is no way to ask for anything else.

Weights would cover the cases an even split cannot:

- Ramping a risky variant in slowly, 95/5 then 80/20, rather than exposing half
  of all traffic to it on day one.
- Holding back a small control group once a winner is obvious but not yet
  baked into the markup.
- Testing three or more variants where the split is deliberately uneven.

Shape: the `variants` column is already JSON, today a plain list like
`["a","b"]`, so it can carry weights without a migration, for example
`{"a": 90, "b": 10}`. `assignVariant()` keeps hashing the session for
stability, then picks the bucket by cumulative weight rather than by modulo, so
a visitor's variant stays put as long as the weights do not change. Reading the
old list form as equal weights keeps every existing test working untouched.

Worth deciding at the same time: whether changing weights mid-test should be
allowed to move people between variants (simple, and pollutes the results) or
not (needs the assignment stored per session rather than derived).

### An event when variants are applied

`applyVariants()` reveals the assigned variant and removes the others, and
nothing is announced when it finishes. An app cannot tell when the page is
really laid out.

The case that surfaced it: a link to `/#pricing`, where `#pricing` sits inside a
variant wrapper. Both the browser (native hash handling on a cold load) and htmx
(`swapOptions.anchor`, during settle) try to scroll before the fetch returns,
hit an element inside a `display:none` ancestor, and silently do nothing. The
consuming app has to poll `offsetParent` until the element is laid out, which
works but is a workaround for a missing signal.

Firing something like `ab:applied` on `document.body` after `applyVariants()`,
with the assignments in the detail, would let apps wait properly. Cheap, and it
pairs with the reveal-delay issue below.

## Known issues

### Retiring a test strips its elements from whatever build is live

`getAssignments()` returns only tests with `status = 'active'`, and
`applyVariants()` calls `el.remove()` on any `[data-ab-test]` element it has no
assignment for. Those two together mean **setting a test to `completed` deletes
its markup from the page currently being served**, not from the page you are
about to deploy.

So a swap has opposite ordering requirements for its two halves:

| change | when | why |
| --- | --- | --- |
| activate the incoming test | **before** deploying the new page | its variants ship `display:none` and are removed without an assignment, so the page renders blank |
| complete the outgoing test | **after** deploying the new page | the build still being served contains those elements and will strip them |

Doing both before the deploy takes the live page down for the length of the
deploy. Hit on reuselists 2026-10-15: the old home page's hero lived inside
`data-ab-test="landing-cta"`, and completing that test made the live page delete
its own hero until the new build shipped.

Extra active tests are harmless in between. A page simply ignores assignments
for tests whose elements it does not contain.

### Variants are revealed after a network round trip

Variants ship hidden and are shown only once `/api/ab/assignments` resolves, so
a cold load shows an empty hole where the variant goes. Measured on a small
production deployment: 140ms to 480ms.

Acceptable for most uses, and worth knowing before putting a variant in a hero.
If it matters, the fix that keeps one source of truth is for the backend to
write the computed assignments into a readable cookie and for a short inline
script to apply them before first paint, leaving the fetch to confirm and record
the impression.

Recomputing the assignment client-side is the tempting shortcut and the wrong
one: `assignVariant()` is `crc32(sessionId . ':' . testName) % variants`, and a
second copy of that formula in JavaScript diverges silently the day the
server's bucketing changes, which is the worst failure an experiment can have. A genuine
first-ever visitor cannot be covered either way without deciding the variant at
the edge, since there is no session to key off yet.

### `ab_tests`.`status` is a MySQL ENUM

`migrations/20250826007000_create_ab_tests_table.php` declares:

```sql
`status` ENUM('active', 'paused', 'completed') NOT NULL DEFAULT 'active'
```

ENUM is the wrong tool here. Adding a fourth status means an `ALTER` on the
table, and the valid set ends up split between the schema and the code that
reads it.

The fix is `VARCHAR(20)` plus a PHP enum. The stored values are already the
strings the code compares against, so the migration is a column type change
with nothing to backfill. It belongs to this module rather than to any app
using it.

Noticed 2026-10-15 from the reuselists side, where it is also recorded in
`BACKLOG.md`. Not urgent: three values have been enough since 2025.

## Requires

- `phillipsharring/handlr-backend` ^0.8 (the framework release where A/B was extracted out of core)
- `@phillipsharring/handlr-frontend` ^0.8 (peer — provides `apiFetch` and the boosted-nav lifecycle hooks)

## License

MIT
