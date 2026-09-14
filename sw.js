const CACHE_NAME = "uta-best-v6";

const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

const SHARED_IMAGE = "/__uta-best-shared-image";
const SHARE_DEBUG = "/__uta-best-share-debug";

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {

  if (
    event.request.method === "POST" &&
    new URL(event.request.url).pathname === "/"
  ) {

    event.respondWith(
      (async () => {

        try {

          const formData =
            await event.request.formData();

          let image = null;
          const entries = [];

          for (
            const [key, value]
            of formData.entries()
          ) {

            if (value instanceof File) {

              entries.push({
                key: key,
                type: value.type || "file",
                size: value.size,
                name: value.name
              });

              if (
                !image &&
                value.type &&
                value.type.startsWith("image/")
              ) {
                image = value;
              }

            } else {

              entries.push({
                key: key,
                type: "text",
                value: String(value)
              });

            }
          }

          const cache =
            await caches.open(CACHE_NAME);

          await cache.put(
            SHARE_DEBUG,
            new Response(
              JSON.stringify({
                received: true,
                imageFound: !!image,
                entries: entries,
                time: new Date().toISOString()
              }),
              {
                headers: {
                  "Content-Type":
                    "application/json"
                }
              }
            )
          );

          if (image) {

            const imageBlob =
              await image.arrayBuffer();

            await cache.put(
              SHARED_IMAGE,
              new Response(
                imageBlob,
                {
                  headers: {
                    "Content-Type":
                      image.type || "image/jpeg"
                  }
                }
              )
            );
          }

          return Response.redirect(
            "/?share-target",
            303
          );

        } catch (error) {

          const cache =
            await caches.open(CACHE_NAME);

          await cache.put(
            SHARE_DEBUG,
            new Response(
              JSON.stringify({
                received: false,
                error: String(error),
                time: new Date().toISOString()
              }),
              {
                headers: {
                  "Content-Type":
                    "application/json"
                }
              }
            )
          );

          return Response.redirect(
            "/?share-target",
            303
          );
        }
      })()
    );

    return;
  }

  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(
      cached => cached || fetch(event.request)
    )
  );
});
