const CACHE = "parktalk-v14-20261119";
const APP_FILES = [
  "./", "./index.html", "./app.html", "./style.css",
  "./auth.css", "./visitor.css", "./theme.css", "./cast-features.css", "./fresh-ui.css",
  "./ui-icons.js", "./script.js", "./visitor.js", "./auth.js", "./pwa.js",
  "./manifest.webmanifest", "./icons/icon.svg", "./assets/parktalk-logo.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith("parktalk-") && key !== CACHE)
      .map((key) => caches.delete(key))
  )));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL("./", self.registration.scope).pathname)) return;
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, copy)));
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      if (event.request.mode === "navigate") return caches.match("./index.html");
      return Response.error();
    })
  );
});
