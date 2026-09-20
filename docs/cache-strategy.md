# Estrategia de caché — Service Worker

## Propósito

Documentar las decisiones detrás de `public/sw.js`: qué estrategia de caché usa cada tipo de petición, cómo se versiona el cache y qué ocurre exactamente cuando el dispositivo pierde la conexión. Esto cubre el incremento de Semana 3 (Persona 1: Service Worker y estrategia de caché) sobre el proyecto de inspecciones de laboratorio, usando únicamente datos sintéticos.

## Por qué dos estrategias distintas

El service worker distingue el tipo de petición usando `request.mode`:

- **Navegación (`request.mode === "navigate"`, es decir, cargar una página) → network-first.**
  Cuando el técnico abre o recarga la app, siempre preferimos la versión más reciente del servidor: el contenido de una inspección puede cambiar entre sesiones, y servir una copia vieja del HTML por defecto sería confuso. Se intenta `fetch(request)` primero; si responde, se guarda una copia en cache (para el siguiente corte de red) y se devuelve tal cual. Solo si la red falla se recurre al cache y, si tampoco hay nada cacheado para esa ruta, a `/offline.html`.

- **Todo lo demás (assets: JS, CSS, manifest, íconos) → cache-first.**
  Estos archivos cambian solo cuando se despliega una versión nueva (y en ese caso cambia también `CACHE_VERSION`, ver abajo), así que no tiene sentido pedirlos a la red cada vez. Se sirven de inmediato desde el cache si ya existen ahí; si no están cacheados, se intentan traer de la red y se guardan para la próxima vez. Si ni el cache ni la red responden, el asset cae también a `/offline.html` como último recurso, para no dejar una petición colgada sin respuesta.

## Versionado del cache

`CACHE_NAME` se construye a partir de `CACHE_VERSION` (por ejemplo `inspecciones-cache-v1`). Cuando se publique un cambio que deba invalidar lo ya cacheado (por ejemplo, un asset renombrado o un cambio de contenido crítico), basta con subir ese número (`v1` → `v2`).

En el evento `activate`, el service worker lista todos los caches existentes (`caches.keys()`) y borra cualquiera cuyo nombre no coincida con el `CACHE_NAME` actual. Esto es lo que evita que un dispositivo se quede sirviendo una combinación mezclada de versiones viejas y nuevas ("cache corrupto") después de una actualización: en cuanto el nuevo service worker se activa, limpia todo lo anterior y solo queda la versión vigente. Justo después, `self.clients.claim()` hace que ese service worker tome control de las pestañas ya abiertas sin necesidad de recargar manualmente.

## Qué pasa exactamente sin red

| Tipo de petición | ¿Está en cache? | Resultado |
|---|---|---|
| Navegación (ej. `/`) | Sí | Se sirve la copia cacheada de esa ruta. |
| Navegación (ej. `/`) | No | Se sirve `/offline.html`. |
| Asset (JS, CSS, ícono, manifest) | Sí | Se sirve directo del cache (ni siquiera se intenta la red). |
| Asset | No | Se intenta la red; si también falla, se sirve `/offline.html` como respuesta de último recurso. |

`/offline.html` es una página estática, autocontenida (sin dependencias externas), precacheada desde el evento `install` junto con `/`, `/manifest.webmanifest` y los íconos del manifest — así siempre está disponible incluso en la primera visita sin red.

## Actualización segura

El service worker expone un listener de `message` para `{ type: "SKIP_WAITING" }`, que permite forzar que una versión nueva en espera pase a activa. Deliberadamente **no se invoca automáticamente** desde `sw.js`: la decisión de cuándo (o si) pedirle al usuario que actualice vive en el registro del lado del cliente (`register-service-worker.ts`, fuera del alcance de este archivo), para no interrumpir a alguien a media sesión con una versión distinta sin avisar.

## Supuestos y límites conocidos

- Solo se manejan peticiones `GET`; `POST`/`PUT` (por ejemplo, un futuro envío de inspección) no pasan por este service worker y no tienen manejo offline todavía.
- El precache es una lista fija y pequeña (shell + manifest + íconos). No cachea rutas dinámicas de datos; si se agregan endpoints de datos reales, su estrategia de caché deberá revisarse por separado.
- La estrategia asume que, si `/offline.html` no llegó a precachearse (por ejemplo, un primer `install` que falló a medias), no hay fallback adicional; el navegador mostrará su propio error de red.
