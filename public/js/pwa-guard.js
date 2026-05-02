/**
 * pwa-guard.js
 * ─────────────────────────────────────────────────────────────
 * CLIENT-SIDE guard for marketing/public pages.
 * Redirects to /app/login if accessed in PWA standalone mode.
 *
 * NOTE: The primary guard is in service-worker.js (fetch intercept).
 * This script is a secondary fallback for browsers that don't
 * support SW navigation preload or edge cases.
 *
 * Include in: index.html, features.html, downloads.html
 * Do NOT include in: app/login.html, app/dashboard.html, app/history.html, app/settings.html
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  "use strict";

  // Detect PWA standalone mode across all browsers / display modes
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    window.navigator.standalone === true; // Safari iOS

  if (isStandalone) {
    const path = window.location.pathname || "/";
    const isAppPath = path === "/app" || path.startsWith("/app/");
    const isSimulatorPath = path === "/simulator" || path.startsWith("/simulator/");
    if (!isAppPath && !isSimulatorPath) {
      // Marketing page accessed inside installed PWA — keep app window inside app scope.
      window.location.replace("/app/login");
    }
  }
})();
