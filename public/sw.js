/* FitClub service worker: makes the installed app open without a network.
 *
 * - Navigations: network first, falling back to the cached app shell, so a
 *   new release shows up as soon as there is a connection.
 * - Built assets (/static/…, hashed names), icons and exercise media: cache
 *   first; those files never change under the same name.
 * - The exercise catalog: stale-while-revalidate.
 * - Google Fonts: stale-while-revalidate, so type still renders offline.
 * - Everything else (the messenger server, the coach API) goes straight to
 *   the network and is never cached.
 * - Push (supabase/migrations/0008, api/push-*.js): a notification per
 *   message or reminder; tapping it opens or focuses the app at its link.
 */
const VERSION = "fitclub-v3";
const SHELL = ["/", "/index.html", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const cacheFirst = async (request) => {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(VERSION)).put(request, response.clone());
  return response;
};

const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(request);
  const fresh = fetch(request)
    .then((response) => { if (response.ok || response.type === "opaque") cache.put(request, response.clone()); return response; })
    .catch(() => cached);
  return cached || fresh;
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put("/index.html", copy));
          return response;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  if (url.origin === self.location.origin && (url.pathname.startsWith("/static/") || url.pathname.startsWith("/icons/"))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // The exercise library: the catalog refreshes in the background, and a GIF
  // once seen stays available offline.
  if (url.origin === self.location.origin && url.pathname === "/exercises/catalog.json") {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  if (url.origin === self.location.origin && url.pathname.startsWith("/exercises/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : "" }; }
  const title = data.title || "FitClub";
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || undefined,
    renotify: !!data.tag,
    data: { url: data.url || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of open) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.focus();
        client.postMessage({ type: "fitclub:open", url });
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
