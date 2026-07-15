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

## Requires

- `phillipsharring/handlr-backend` ^0.8 (the framework release where A/B was extracted out of core)
- `@phillipsharring/handlr-frontend` ^0.8 (peer — provides `apiFetch` and the boosted-nav lifecycle hooks)

## License

MIT
