/* Minimal service worker — required for installable PWA */
const CACHE = 'lucent-certs-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']).catch(() => undefined),
    ),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  // Network-first for API; cache-first for static shell
  if (req.url.includes('/api/')) return
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => undefined)
        return res
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('/'))),
  )
})
