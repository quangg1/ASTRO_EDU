const CACHE_VERSION = 'cosmolearn-v1'
const APP_SHELL_CACHE = `shell-${CACHE_VERSION}`
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`
const APP_SHELL_URLS = ['/', '/tutorial', '/courses', '/explore', '/offline']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== APP_SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  const sameOrigin = url.origin === self.location.origin

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        const offline = await caches.match('/offline')
        if (offline) return offline
        return new Response('Offline', {
          status: 503,
          statusText: 'Offline',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      })
    )
    return
  }

  if (!sameOrigin) return

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) {
            const cloned = response.clone()
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, cloned))
          }
          return response
        })
        .catch(() => cachedResponse)
      return (
        cachedResponse ||
        networkFetch.catch(
          () =>
            new Response('Network error', {
              status: 503,
              statusText: 'Network error',
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            }),
        )
      )
    }),
  )
})
