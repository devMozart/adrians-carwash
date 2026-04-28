const SHELL_CACHE = 'adrians-carwash-shell-v1'
const ASSET_CACHE = 'adrians-carwash-assets-v1'
const APP_SHELL_URLS = ['/', '/index.html', '/site.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') {
    return
  }

  const requestUrl = new URL(request.url)

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request))
    return
  }

  if (requestUrl.origin !== self.location.origin) {
    return
  }

  if (
    ['script', 'style', 'image', 'font', 'audio', 'manifest'].includes(request.destination) ||
    requestUrl.pathname.startsWith('/assets/')
  ) {
    event.respondWith(handleStaticAssetRequest(request))
  }
})

async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request)
    const cache = await caches.open(SHELL_CACHE)
    cache.put('/', response.clone())
    return response
  } catch {
    return (
      (await caches.match(request)) ||
      (await caches.match('/')) ||
      (await caches.match('/index.html'))
    )
  }
}

async function handleStaticAssetRequest(request) {
  const cachedResponse = await caches.match(request)
  const fetchPromise = fetch(request)
    .then(async (networkResponse) => {
      if (networkResponse.ok) {
        const cache = await caches.open(ASSET_CACHE)
        cache.put(request, networkResponse.clone())
      }

      return networkResponse
    })
    .catch(() => cachedResponse)

  return cachedResponse || fetchPromise
}
