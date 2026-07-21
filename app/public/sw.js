const CACHE_NAME = "slidescribe-v2"
const STATIC_ASSETS = ["/", "/auth", "/capture", "/dashboard", "/manifest.json", "/icon-192.png", "/icon-512.png", "/icon-180.png"]
const API_CACHE = "slidescribe-api-v1"

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== API_CACHE).map((k) => caches.delete(k))),
    ),
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)

  // API requests: network first, cache fallback
  if (url.pathname.startsWith("/api/") || url.port === "8000" || url.hostname === "localhost" && url.port === "8000") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone()
          caches.open(API_CACHE).then((cache) => cache.put(request, clone))
          return res
        })
        .catch(() => caches.match(request).then((cached) => cached || new Response(JSON.stringify({ error: "offline" }), { status: 503, headers: { "Content-Type": "application/json" } }))),
    )
    return
  }

  // Navigation requests: serve cached page, update in background
  if (request.mode === "navigate") {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((res) => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return res
        }).catch(() => cached)
        return cached || fetchPromise
      }),
    )
    return
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached && url.origin === self.location.origin) return cached
      return fetch(request).then((res) => {
        const clone = res.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        return res
      }).catch(() => cached || new Response("Offline", { status: 503 }))
    }),
  )
})
