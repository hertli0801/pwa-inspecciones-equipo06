# Capacidades del dispositivo y notificaciones

## Alcance

Esta semana se agregan tres capacidades opcionales a la PWA de inspecciones: evidencia fotografica, ubicacion aproximada y notificaciones de cambio. Ninguna es necesaria para registrar una inspeccion: si la capacidad no existe o el permiso se deniega, el flujo sigue funcionando sin ella.

## Principios comunes

- **Permiso minimo y bajo accion del usuario.** Ningun permiso se solicita al cargar la pagina. Las funciones `requestCameraAccess`, `getApproximateLocation` y `requestNotificationPermission` deben invocarse desde un clic.
- **Resultados tipados, sin excepciones.** Cada funcion devuelve `ok: true` o `ok: false` con un `reason`, para que la interfaz decida que mostrar sin bloques try/catch.
- **Entorno inyectable.** El objeto del navegador entra como parametro opcional. Asi las pruebas simulan "no existe", "denegado" y "concedido" de forma determinista, sin navegador.
- **Datos limitados.** Solo se conserva lo necesario para la inspeccion.

## Camara y evidencia (`src/lib/device/camera.ts`)

| Situacion | Resultado |
|---|---|
| Sin archivo adjunto | `ok: true`, `evidence: null` (la evidencia es opcional) |
| Imagen JPEG, PNG o WebP hasta 2 MB | `ok: true`, solo `type` y `size` |
| Otro tipo (PDF, SVG) | `ok: false`, `invalid-type` |
| Archivo vacio o mayor a 2 MB | `ok: false`, `too-large` |
| Sin API de camara | `getCameraSupport` devuelve `file-picker` |
| Permiso denegado | `ok: false`, `denied` |

Decisiones: se rechaza SVG porque puede contener scripts; no se guarda el nombre del archivo ni metadatos de la foto; se pide solo video, nunca audio; `stopCamera` libera la camara al terminar.

## Ubicacion (`src/lib/device/geolocation.ts`)

| Situacion | Resultado |
|---|---|
| Sin API de geolocalizacion | `unsupported` |
| Permiso denegado | `denied` |
| Tiempo agotado | `timeout` |
| Posicion no disponible o error interno | `unavailable` |
| Exito | coordenadas redondeadas a 2 decimales |

Decisiones: 2 decimales equivalen a unos 1.1 km, suficiente para ubicar un edificio del campus sin rastrear a la persona; no se pide alta precision; el tiempo maximo es de 8 segundos; la promesa nunca se rechaza.

## Notificaciones (`src/lib/notifications/client.ts`)

| Estado | Canal de `notifyChange` |
|---|---|
| Permiso concedido | `system` (notificacion del sistema) |
| Permiso denegado | `in-app`, `reason: denied` |
| Permiso sin decidir | `in-app`, `reason: default` |
| API inexistente | `in-app`, `reason: unsupported` |
| La notificacion falla | `in-app`, `reason: error` |

Decisiones: `notifyChange` no solicita permiso por su cuenta; el texto se recorta a 120 caracteres y es generico para no filtrar datos de la inspeccion; el usuario siempre recibe algo (notificacion del sistema o aviso dentro de la app).

## Pruebas

`tests/capabilities.spec.ts` cubre casos soportados, no soportados, denegados y entradas invalidas de los tres modulos. Son deterministas: usan entornos simulados y no dependen de servicios externos.

Ejecucion: `npm ci`, `npm run build`, `npm test`, `npm run verify`.

## Limites y riesgos

- No se probo en navegadores reales ni en dispositivos moviles: las pruebas simulan las APIs. Safari en iOS solo permite notificaciones en PWA instaladas.
- Estos modulos aun no estan conectados a la interfaz; exponen la logica con sus fallbacks.
- Las notificaciones locales (`new Notification`) no son notificaciones push del servidor: no llegan con la app cerrada. Push real requeriria service worker y un servidor, fuera del alcance de esta semana.
- La validacion usa el tipo MIME que declara el navegador, que puede no coincidir con el contenido real del archivo.
- Las coordenadas redondeadas siguen siendo un dato personal; no se envian a ningun servidor.