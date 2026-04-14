/**
 * /simulator/sw.js — Simulator-scoped Service Worker
 * ─────────────────────────────────────────────────────────────
 * Served from /simulator/sw.js → default scope is /simulator/
 * ONLY controls pages under /simulator/*
 * ─────────────────────────────────────────────────────────────
 */

const CACHE_NAME = "iot-simulator-v3";

// Simulator app shell
const CACHE_URLS = [
  "/simulator",
  "/simulator/login",
  "/simulator/dashboard",
  "/simulator/settings",
  "/simulator/manifest.json",
  "/css/style.css",
  "/js/firebase-config.js",
  "/js/auth.js",
  "/js/app.js",
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
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = request.url;

  if (request.method !== "GET") return;

  if (
    url.startsWith("chrome-extension") ||
    url.includes("firebaseio.com") ||
    url.includes("googleapis.com/identitytoolkit") ||
    url.includes("firebase.googleapis.com") ||
    url.includes("firebasefunctions.net") ||
    url.includes("gstatic.com/firebasejs")
  ) {
    return;
  }

  // Navigation: network-first
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/simulator/login"))
        )
    );
    return;
  }

  // Static assets: cache-first
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
        .catch(() => {});

      return cached || networkFetch;
    })
  );
});

// ─── Push Notification ──────────────────────────
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
