// Service worker : cache des fichiers pour un fonctionnement 100 % hors ligne.
// Service worker: caches app files so the app works fully offline.

// IMPORTANT : incrémenter ce numéro à chaque modification des fichiers pour forcer la mise à jour.
// IMPORTANT: bump this number whenever files change to force an update.
const CACHE_VERSION = 'buvette-v7';

const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/base.css',
  './css/components.css',
  './js/app.js',
  './js/storage.js',
  './js/utils.js',
  './js/icons.js',
  './js/tab-caisse.js',
  './js/tab-articles.js',
  './js/tab-stats.js',
  './js/tab-config.js',
  './js/devdata.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    // cache: 'reload' = on ignore le cache HTTP du navigateur pour ne jamais stocker d'anciens fichiers
    // cache: 'reload' = bypass the browser HTTP cache so old files are never stored
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(FILES_TO_CACHE.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  // Supprime les anciens caches / Remove old caches
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Cache d'abord, réseau en secours / Cache first, network as fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => cached || fetch(event.request))
  );
});
