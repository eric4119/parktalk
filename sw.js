const CACHE = "parktalk-v46-20261126";
const APP_FILES = [
  "./", "./index.html", "./app.html", "./style.css",
  "./auth.css", "./visitor.css", "./theme.css", "./cast-features.css", "./fresh-ui.css",
  "./ui-icons.js", "./park-data.js", "./cast-menu.json", "./places.js", "./park-search.js", "./facilities.json", "./official-faq.json", "./lost-match.js", "./lost-ai.js", "./boards.js", "./profiles.js", "./pets.js", "./pets.css", "./script.js", "./visitor.js", "./auth.js", "./pwa.js",
  "./assets/pets/panda-worn-base.png", "./assets/pets/panda-worn-feed.png", "./assets/pets/panda-worn-play.png", "./assets/pets/panda-worn-sleep.png", "./assets/pets/panda-worn-pet.png",
  "./assets/pets/panda-reactions.png", "./assets/pets/capybara-reactions.png", "./assets/pets/tiger-reactions.png", "./assets/pets/penguin-reactions.png",
  "./assets/pets/hat-v2.png", "./assets/pets/glasses-v2.png", "./assets/pets/necklace-v2.png",
  "./assets/pets/room-cream.png", "./assets/pets/room-front.png", "./assets/pets/panda.png", "./assets/pets/capybara.png", "./assets/pets/tiger.png", "./assets/pets/penguin.png",
  "./assets/pets/bed.png", "./assets/pets/plant.png", "./assets/pets/sofa.png", "./assets/pets/lamp.png",
  "./manifest.webmanifest", "./icons/icon.svg", "./assets/parktalk-logo-transparent.png"
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
  if (url.pathname.includes("/api/")) return;
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
