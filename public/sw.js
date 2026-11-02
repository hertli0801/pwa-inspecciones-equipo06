// Service worker de la PWA de inspecciones de laboratorio.
// Estrategia: network-first para navegación, cache-first para assets estáticos.
// Ver docs/cache-strategy.md para la explicación completa de las decisiones.
//
// Endurecimiento de la semana 9 (fallos reales de la versión v1):
// 1. CACHE_VERSION sube a "v2": la caché v1 pudo guardar respuestas de /api/
//    y páginas de error; al activarse, v2 borra esa caché vieja.
// 2. El listener "fetch" ya no intercepta peticiones de otro origen ni rutas
//    /api/: los datos de inspecciones no deben quedar guardados en el
//    dispositivo por el SW, y la cola de sincronización necesita la red real.
// 3. Solo se cachean respuestas correctas del mismo origen (ok === true y
//    type === "basic"); un 500 o una respuesta opaca no reemplazan nada.

const CACHE_VERSION = "v2";
const CACHE_NAME = `inspecciones-cache-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

const PRECACHE_ASSETS = [
  "/",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// El registro (register-service-worker.ts) decide cuándo avisar de una
// actualización; este listener solo permite que, si algún día se envía el
// mensaje, el SW en espera pase a activo. No se auto-invoca desde aquí.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  // Sin respondWith: el navegador hace la petición normal, sin caché del SW.
  const url = new URL(request.url, self.location.origin);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(cacheFirst(request));
  }
});

function isCacheable(response) {
  return Boolean(response) && response.ok === true && response.type === "basic";
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || caches.match(OFFLINE_URL);
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return caches.match(OFFLINE_URL);
  }
}
