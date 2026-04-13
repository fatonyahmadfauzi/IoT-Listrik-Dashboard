/**
 * service-worker.js — RETIRED
 * ─────────────────────────────────────────────────────────────
 * This full-site service worker has been replaced by /app/sw.js
 * which is correctly scoped to /app/ only.
 *
 * This file exists only to self-unregister any old installs.
 * DO NOT add this back to any page registration.
 * ─────────────────────────────────────────────────────────────
 */
const CACHE_NAME = "iot-listrik-retired-v1";

// Immediately unregister this SW on install
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    // Delete all old caches
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() =>
      // Unregister this SW so it stops controlling anything
      self.registration.unregister()
    ).then(() =>
      self.clients.claim()
    )
  );
});
