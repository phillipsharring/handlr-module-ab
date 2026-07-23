/**
 * A/B testing module for handlr apps.
 *
 * Two integration points:
 *   - Build/render time: `registerAbHelpers(Handlebars)` adds the {{#ab}} block helper.
 *   - Runtime: the `ab` module object's init() fetches assignments, applies
 *     variant HTML, and captures conversion events. `capture` / `getAssignments`
 *     are exported for programmatic use.
 */

import { init } from './runtime.js';

export { registerAbHelpers } from './helpers.js';
export { capture, getAssignments } from './runtime.js';

const root = new URL('..', import.meta.url).pathname;

export const ab = {
    name: 'ab',
    pagesDir: root + 'pages',

    defaults: {
        adminNav: {
            label: 'A/B Tests',
            path: '/admin/ab/',
            permission: 'admin.access',
        },
    },

    config: {},

    init() {
        init();
    },
};
