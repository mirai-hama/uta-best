const CACHE_NAME = "uta-best-v5";
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
            .filter(k => k !== CACHE_NAME)
            .map(k => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {

  /*
    DAM★とも → うたベスト
    共有された画像を受け取る処理
  */
  if (
    event.request.method === "POST" &&
    new URL(event.request.url).pathname === "/"
  ) {

    event.respondWith(
      (async () => {

        try {

          const formData = await event.request.formData();

          /*
            まず「image」という名前で送られてきた
            ファイルを探す
          */
          let image = formData.get("image");

          /*
            Android側の共有方法によっては、
            files の中に入っている場合があるため、
            image が取れなかった場合は全項目を確認する。
          */
          if (!image) {

            for (const [key, value] of formData.entries()) {

              if (
                value instanceof File &&
                value.type &&
                value.type.startsWith("image/")
              ) {
                image = value;
                break;
              }

            }

          }

          const cache = await caches.open(CACHE_NAME);

          /*
            デバッグ情報も保存する。
            これで「画像が届いていない」のか
            「保存に失敗した」のかを切り分けられる。
          */
          const entries = [];

          for (const [key, value] of formData.entries()) {

            if (value instanceof File) {

              entries.push({
                key: key,
                type: value.type,
                size: value.size,
                name: value.name
              });

            } else {

              entries.push({
                key: key,
                type: "text",
                value: String(value)
              });

            }

          }

          await cache.put(
            SHARE_DEBUG,
            new Response(
              JSON.stringify({
                received: true,
                entries: entries,
                imageFound: !!image,
                time: new Date().toISOString()
              }),
              {
                headers: {
                  "Content-Type": "application/json"
                }
              }
            )
          );

          /*
            画像が見つかった場合
          */
          if (image) {

            const imageBlob = await image.arrayBuffer();

            await cache.put(
              SHARED_IMAGE,
              new Response(imageBlob, {
                headers: {
                  "Content-Type": image.type || "image/jpeg"
                }
              })
            );

          }

          /*
            共有処理が終わったら
            うたベストを開く
          */
          return Response.redirect(
            "/?share-target",
            303
          );

        } catch (e) {

          /*
            エラー内容も保存
          */
          try {

            const cache = await caches.open(CACHE_NAME);

            await cache.put(
              SHARE_DEBUG,
              new Response(
                JSON.stringify({
                  received: false,
                  error: String(e),
                  time: new Date().toISOString()
                }),
                {
                  headers: {
                    "Content-Type": "application/json"
                  }
                }
              )
            );

          } catch (_) {}

          return Response.redirect(
            "/?share-target",
            303
          );
        }

      })()
    );

    return;
  }

  /*
    GET処理
  */
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(
      cached => cached || fetch(event.request)
    )
  );
});
