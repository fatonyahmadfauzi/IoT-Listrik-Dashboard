/**
 * /app/sw.js — App-scoped Service Worker
 * ─────────────────────────────────────────────────────────────
 * Served from /app/sw.js → default scope is /app/
 * ONLY controls pages under /app/* — public marketing site
 * is completely outside this SW's scope.
 *
 * iOS/Safari safety:
 *   - NO Response.redirect() calls (causes "redirect loop" error on iOS)
 *   - NO navigation fallback redirects
 *   - Navigation to /app/* is handled cleanly: network-first, cache fallback
 *   - Login page handles auth-state redirect to /app/dashboard if already signed in
 * ─────────────────────────────────────────────────────────────
 */

const CACHE_NAME = "iot-app-v1";

// App shell — only /app/* pages and shared assets used by the app
const CACHE_URLS = [
  "/app/login",
  "/app/dashboard",
  "/app/history",
  "/app/settings",
  "/app/manifest.json",
  "/css/style.css",
  "/js/firebase-config.js",
  "/js/auth.js",
  "/js/app.js",
  "/js/history.js",
  "/js/settings.js",
  "/js/charts.js",
  "/js/notifications.js",
  "/js/client-config.js",
  "/js/hybrid-listrik.js",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png",
];

// ─── Install: pre-cache app shell ────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate: clean old caches ──────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch: Stale-while-revalidate for app assets ────────────
// Rules:
//   1. Firebase real-time API calls → always network, never cache
//   2. App navigation (/app/*) → network-first, cache fallback
//   3. Static assets → cache-first, update in background
//   4. NO Response.redirect() — safe for iOS Safari
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = request.url;

  // Only handle GET requests
  if (request.method !== "GET") return;

  // Skip Firebase & external API calls — always go to network
  if (
    url.startsWith("chrome-extension") ||
    url.includes("firebaseio.com") ||
    url.includes("googleapis.com/identitytoolkit") ||
    url.includes("firebase.googleapis.com") ||
    url.includes("firebasefunctions.net") ||
    url.includes("gstatic.com/firebasejs")
  ) {
    return; // browser handles these natively
  }

  // App navigation: network-first so auth state is always fresh
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache a fresh copy in background
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          // Offline fallback: serve cached page if available
          caches.match(request).then((cached) => cached || caches.match("/app/login"))
        )
    );
    return;
  }

  // Static assets (CSS, JS, images): cache-first, refresh in background
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type !== "opaque") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(() => {/* offline */ });

      return cached || networkFetch;
    })
  );
});

// ─── Push Notification (future FCM) ──────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || "IoT Alert", {
    body:    data.body  || "",
    icon:    "/assets/icons/icon-192.png",
    badge:   "/assets/icons/icon-96.png",
    tag:     data.tag   || "iot-push",
    vibrate: [200, 100, 200],
  });
});
