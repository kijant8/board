/* Сервис-воркер: держит приложение доступным без сети. */
var CACHE = "atom-board-v4";
var ASSETS = [
  "./",
  "./index.html",
  "./calendar.html",
  "./manifest-calendar.webmanifest",
  "./icon-cal-192.png",
  "./icon-cal-512.png",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ASSETS).catch(function () { /* частичный кеш лучше, чем никакого */ });
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);

  /* Запросы к API синхронизации никогда не кешируем. */
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== "GET") return;

  /* Оболочка приложения: сначала сеть, при неудаче — кеш. */
  e.respondWith(
    fetch(e.request).then(function (resp) {
      var copy = resp.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return resp;
    }).catch(function () {
      return caches.match(e.request).then(function (hit) {
        return hit || caches.match("./index.html");
      });
    })
  );
});
