/* ============================================================
   MARAK — SERVICE WORKER
   Strategy: network-first for the app itself.
   - Online: always fetch the latest marak.html from GitHub Pages,
     and refresh the offline cache with it in the background.
   - Offline: serve the last cached copy so the app still opens.
   This means pushing changes to GitHub = the installed app updates
   itself next time it's opened with signal. No reinstall needed.
   ============================================================ */

const CACHE_NAME = "marak-cache-v1";
const APP_SHELL = "./index.html"; // adjust if you rename the file

self.addEventListener("install", (event) => {
  self.skipWaiting(); // activate this SW immediately, don't wait for old tabs to close
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(APP_SHELL))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim()) // take control of open tabs right away
  );
});

self.addEventListener("fetch", (event) => {
  // Only handle navigation (the app shell itself); let other requests pass through normally
  if (event.request.mode === "navigate" || event.request.url.includes("marak.html")) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Got a fresh copy from GitHub — update the offline cache with it
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(APP_SHELL, clone));
          return networkResponse;
        })
        .catch(() => {
          // No network — serve last cached version so the app still opens
          return caches.match(APP_SHELL);
        })
    );
  }
});
