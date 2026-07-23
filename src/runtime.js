// ---------------------------
// A/B Testing — client runtime
// ---------------------------
// Fetches variant assignments once per page lifetime from the backend,
// then re-applies them after each boosted navigation (new #app content).
//
// Pages only need to:
//   1. Use data-ab-test / data-ab-variant attributes for static variant HTML
//   2. Use data-ab-capture="event-name" on clickable elements for conversion tracking
//   3. Or call capture('event-name') programmatically
//
// Call init() once at app startup to wire the lifecycle hooks and the
// delegated click handler (handlr-build's initModules() does this for the
// `ab` module object exported from ./index.js).

import { apiFetch, onPageLoad, onAfterSettle, onClick, registerAction } from '@phillipsharring/handlr-frontend';

let assignments = null;
let fetched = false;

/**
 * Fetch assignments from the backend (once per page lifetime).
 * Stores them in module scope for capture() and getAssignments().
 */
function fetchAssignments() {
    if (fetched) {
        applyVariants();
        return;
    }
    fetched = true;

    apiFetch('/api/ab/assignments')
        .then(function (r) { return r.json(); })
        .then(function (res) {
            assignments = (res.data && res.data.assignments) || {};
            applyVariants();
        })
        .catch(function () {
            assignments = {};
            // Fallback: show variant "a" elements
            var els = document.querySelectorAll('[data-ab-variant="a"]');
            els.forEach(function (el) { el.style.display = ''; });
        });
}

/**
 * Show/hide elements with data-ab-test / data-ab-variant attributes
 * based on current assignments.
 */
function applyVariants() {
    if (!assignments) return;

    var els = document.querySelectorAll('[data-ab-test]');
    if (!els.length) return;

    els.forEach(function (el) {
        var testName = el.getAttribute('data-ab-test');
        var variant = el.getAttribute('data-ab-variant');
        if (assignments[testName] === variant) {
            el.style.display = '';
        } else {
            el.remove();
        }
    });

    // Auto-capture impression when variant elements are on the page
    if (Object.keys(assignments).length) {
        capture('impression');
    }
}

/**
 * Record a conversion event with current assignments.
 * No-op if there are no active assignments.
 * @param {string} event - Event name (e.g. 'signup', 'purchase')
 */
export function capture(event) {
    if (!assignments || !Object.keys(assignments).length) return;

    apiFetch('/api/ab/capture', {
        method: 'POST',
        body: { event: event, assignments: assignments },
    }).catch(function () {});
}

/**
 * Get current assignments (may be null if not yet fetched).
 * @returns {{ [testName: string]: string } | null}
 */
export function getAssignments() {
    return assignments;
}

let started = false;

/**
 * Wire up the A/B runtime: fetch assignments on page load + after each
 * boosted navigation, delegate clicks for data-ab-capture elements, and
 * register the admin `ab-new-test` action. Idempotent — safe to call
 * more than once.
 */
export function init() {
    if (started) return;
    started = true;

    onPageLoad(fetchAssignments);
    onAfterSettle(fetchAssignments);

    // Conversion tracking: data-ab-capture="event-name" on any clickable.
    onClick('[data-ab-capture]', function (el) {
        capture(el.getAttribute('data-ab-capture'));
    });

    // Admin: the "New Test" button (data-action="ab-new-test") opens the
    // create-test modal via the host app's modal API.
    registerAction('ab-new-test', function () {
        if (window.App && window.App.ui && typeof window.App.ui.openFormModal === 'function') {
            window.App.ui.openFormModal({
                templateId: 'create-ab-test-template',
                title: 'New A/B Test',
            });
        }
    });
}
