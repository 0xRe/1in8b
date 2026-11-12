const CACHE = "1in8bn-shell-v3";
const isPage = (url) => url.pathname === "/" || /^\/(ko|ja|zh|zh-hans|vi|fr|th|es|de|tr|ru|pt|id)\/$/.test(url.pathname);
const isAsset = (url) => url.origin === self.location.origin &&
  (url.pathname.startsWith("/assets/") || ["/icon.svg", "/manifest.webmanifest"].includes(url.pathname));
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name.startsWith("1in8bn-shell-") && name !== CACHE) await caches.delete(name);
    await self.clients.claim();
  })());
});
self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_SHELL" || !Array.isArray(event.data.urls)) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const urls = [...new Set(event.data.urls)].slice(0, 200).filter((value) => {
      try { const url = new URL(value); return url.origin === self.location.origin && (isPage(url) || isAsset(url)); } catch { return false; }
    });
    await Promise.allSettled(urls.map(async (url) => {
      if (await cache.match(url)) return;
      const response = await fetch(url);
      if (response.ok) await cache.put(url, response);
    }));
  })());
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || (!isPage(url) && !isAsset(url))) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (isAsset(url)) {
      const cached = await cache.match(request);
      if (cached) return cached;
    }
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch {
      const cached = await cache.match(request);
      if (cached) return cached;
      return new Response("Offline: open this language once while connected, then try again.", {status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}});
    }
  })());
});
