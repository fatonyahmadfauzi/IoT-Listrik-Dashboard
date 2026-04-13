/**
 * pwa-guard.js
 * ─────────────────────────────────────────────────────────────
 * CLIENT-SIDE guard for marketing/public pages.
 * Redirects to /login if accessed in PWA standalone mode.
 *
 * NOTE: The primary guard is in service-worker.js (fetch intercept).
 * This script is a secondary fallback for browsers that don't
 * support SW navigation preload or edge cases.
 *
 * Include in: index.html, features.html, downloads.html
 * Do NOT include in: login.html, dashboard.html, history.html, settings.html
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  "use strict";

  // Detect PWA standalone mode across all browsers / display modes
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches  ||
    window.matchMedia("(display-mode: minimal-ui)").matches  ||
    window.matchMedia("(display-mode: fullscreen)").matches  ||
    window.navigator.standalone === true; // Safari iOS

  if (isStandalone) {
    // Marketing page accessed inside installed PWA — redirect to login
    window.location.replace("/login");
  }
})();
