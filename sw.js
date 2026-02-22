const CACHE_NAME = "notiva";

// Assets para cache offline
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/assets/css/style.css",
  "/assets/js/main.js",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png"
];

// Instalação do Service Worker
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// Ativação: limpa caches antigos
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
});

// Intercepta requisições e serve do cache quando disponível
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
