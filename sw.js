const CACHE_NAME = "uta-best-v6";
const APP_SHELL = ["/", "/index.html", "/manifest.json", "/icon-192.png", "/icon-512.png"];
const SHARED_IMAGE = "/__uta-best-shared-image";

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method === "POST" && new URL(event.request.url).pathname === "/") {
    event.respondWith((async () => {
      try {
        const formData = await event.request.formData();
        const image = formData.get("image");
        if (image) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(SHARED_IMAGE, new Response(image));
        }
        return Response.redirect("/?share-target", 303);
      } catch (e) {
        return Response.redirect("/", 303);
      }
    })());
    return;
  }

  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
