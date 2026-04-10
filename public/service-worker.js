/**
 * service-worker.js
 * ─────────────────────────────────────────────────────────────
 * PWA Service Worker — Cache-First strategy for static assets.
 * Enables offline shell display when connectivity is lost.
 * ─────────────────────────────────────────────────────────────
 */

const CACHE_NAME = "iot-listrik-v7";
const CACHE_URLS = [
  "/",
  "/login",
  "/dashboard",
  "/history",
  "/settings",
  "/pwa-simulator.html",
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
  "/js/simulator.js",
  "/js/version-manager.js",
  "/manifest.json",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png",
  // Google Fonts (cached after first load)
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap",
];

// ─── Install: pre-cache shell ─────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// ─── Activate: clean old caches ──────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ─── Fetch: Network-first with cache fallback ─────────────────
// Firebase RTDB requests are NEVER cached (always network).
// Static assets use cache-first.
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Skip Firebase API calls, analytics, Chrome extensions, and non-GET requests
  if (
    event.request.method !== "GET" ||
    url.startsWith("chrome-extension") ||
    url.includes("firebaseio.com") ||
    url.includes("googleapis.com/identitytoolkit") ||
    url.includes("firebase.googleapis.com") ||
    url.includes("firebasefunctions.net")
  ) {
    return; // let browser handle normally
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Serve from cache, update cache in background
        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
            }
            return response;
          })
          .catch(() => {
            /* offline */
          });
        return cached;
      }

      // Not in cache — fetch from network and cache it
      return fetch(event.request).then((response) => {
        if (
          !response ||
          response.status !== 200 ||
          response.type === "opaque"
        ) {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        return response;
      });
    }),
  );
});

// ─── Push Notification handler (future FCM integration) ───────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || "IoT Alert", {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-96.png",
    tag: data.tag || "iot-push",
    vibrate: [200, 100, 200],
  });
});
