/*
 * Service Worker do Treino Força.
 * Estratégia: cache-first para todos os assets do app.
 * Após o primeiro carregamento, o app abre e funciona 100% sem internet.
 * Para publicar uma nova versão, incremente CACHE_VERSION.
 */
const CACHE_VERSION = 'treino-forca-v1.0.0-r9';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './assets/exercicios/supino.svg',
  './assets/exercicios/agachamento.svg',
  './assets/exercicios/terra.svg',
  './assets/exercicios/ohp.svg',
  './assets/exercicios/remada.svg',
  './assets/exercicios/barra-fixa.svg',
  './assets/exercicios/generic.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Navegação: responde com o index em cache (funciona offline e em qualquer rota).
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cached) => cached || fetch(req).catch(() => caches.match('./')))
    );
    return;
  }

  // Assets: cache-first, com preenchimento do cache em caso de novo arquivo same-origin.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok && new URL(req.url).origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
