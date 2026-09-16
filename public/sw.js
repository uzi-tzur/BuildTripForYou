/**
 * Minimal service worker for BuildTripForYou (PRD Rule 9 — PWA-ready).
 * Goal: if you open the app with no/weak signal (common in the mountains),
 * you still see the last version you loaded, instead of a browser error
 * page. Deliberately NOT a full precache/offline-first setup — Next.js's
 * hashed build output changes every deploy, and a stale precache list is
 * exactly the kind of bug that's caused real problems in this project
 * before. Runtime "network first, fall back to cache" avoids that.
 */
const CACHE_NAME = "gettrip4u-runtime-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle same-origin GET requests — leave API calls, cross-origin
  // requests (maps, weather assets, etc.), and non-GET requests alone.
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  if (request.url.includes("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || Response.error())),
  );
});
