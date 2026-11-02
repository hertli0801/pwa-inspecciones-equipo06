# Modelo de amenazas — Semana 9


## 1. Alcance y supuestos

- Sistema: PWA de inspecciones de mantenimiento de laboratorios (Next.js 14,
  service worker propio, cola de sincronización offline y API de demostración
  en `src/app/api/sync/route.ts`).
- Contexto: sujeto obligado mexicano (universidad pública). En un despliegue
  real habría datos personales; aquí se usan únicamente datos sintéticos.
- Supuestos: el despliegue final sería por HTTPS; el servidor de sincronización
  de esta entrega es una demostración con un almacén en memoria
  (`src/lib/sync/server-store.ts`, un `Map` por `clientId`) que se pierde al reiniciar;
  los dispositivos pueden ser compartidos.

## 2. Activos

| ID | Activo | Por qué importa |
|----|--------|-----------------|
| A1 | Inspecciones (laboratorio, resumen, inspector, hallazgos, fecha) | Integridad del registro de mantenimiento |
| A2 | Ubicación aproximada (coordenadas redondeadas, `src/lib/device/geolocation.ts`) | Dato sensible por su naturaleza; se muestra en pantalla y el servidor no la almacena |
| A3 | Cola de sincronización en `localStorage` del navegador (`src/lib/sync/queue.ts`) | Contiene inspecciones sin enviar; cualquier script del mismo origen puede leerla |
| A4 | Caché del service worker | Puede conservar páginas con A1 |
| A5 | API `/api/sync` y su almacén en memoria | Punto de entrada de datos externos |
| A6 | Credenciales y variables de entorno | Acceso a servicios si existieran |

## 3. Límites de confianza

```text
[Persona usuaria] -> [Navegador: PWA + service worker + cola local]
                          |  (límite 1: red, no confiable)
                          v
                  [Servidor Next.js: páginas + /api/sync]
                          |  (límite 2: entorno de ejecución)
                          v
                  [Variables de entorno / almacén en memoria]
```

Todo lo que cruza el límite 1 (cuerpo de petición, cabeceras) se trata como no
confiable y se valida en el servidor, aunque el cliente ya valide.

## 4. Amenazas, controles y evidencia

Los nombres de prueba son los que imprimen `tests/security.spec.ts` (S) y
`tests/security-headers.spec.mjs` (H).

| ID | Amenaza (STRIDE) | Activo | Control aplicado | Dónde | Prueba | Riesgo residual |
|----|------------------|--------|------------------|-------|--------|-----------------|
| T1 | Inyección de marcado / XSS en campos libres (T/I) | A1 | Rechazo de marcado activo + escape de React + CSP | `src/lib/security/input-guard.ts`, `headers.mjs` | S: "rechaza marcado activo (etiquetas y esquemas peligrosos)"; S: "un '<' suelto es una observación válida" | CSP con `'unsafe-inline'` en `script-src` (§6); un XSS podría leer la cola en `localStorage` (T11) |
| T2 | Campos inesperados, `__proto__`, tipos incorrectos (T) | A5 | Lista cerrada de campos y comprobación de tipos | `input-guard.ts` | S: "rechaza campos extra", "rechaza __proto__ y constructor como claves", "rechaza cuerpos que no son un objeto simple", "rechaza tipos incorrectos" | `handleSyncPost` solo exige un `clientId` de texto no vacío (`handlers.ts`); su longitud solo la limita el tope de 16 KiB del cuerpo |
| T3 | Cuerpos gigantes, agotamiento de recursos (D) | A5 | Tope de 16 KiB con lectura cortada; tope duro por campo | `readJsonBody`, `input-guard.ts` | S: "readJsonBody responde 413 y corta la lectura sin confiar en Content-Length", "un campo gigante se rechaza por el tope duro" | Sin límite de tasa por cliente (§7) |
| T4 | Confusión de tipo de contenido / JSON roto (T) | A5 | Solo `application/json` (415); JSON inválido (400) | `readJsonBody` | S: "readJsonBody responde 415 si el tipo de contenido no es JSON", "responde 400 con JSON roto o cuerpo vacío" | Bajo |
| T5 | Datos de la API quedan en la caché del dispositivo (I) | A1, A4 | El service worker no intercepta `/api/` ni otros orígenes; solo guarda respuestas correctas del mismo origen; caché v2 borra la v1 | `public/sw.js` | H: "el SW no intercepta /api/, otros orígenes ni métodos distintos de GET", "el SW sí cachea assets propios con respuesta correcta", "el SW no cachea errores 5xx ni respuestas opacas", "la versión de caché es v2 o mayor y activate borra la v1" | Las páginas de navegación sí se cachean para uso offline |
| T6 | Clickjacking (S) | A1 | `frame-ancestors 'none'` y `X-Frame-Options: DENY` | `headers.mjs` | H: "headers básicos: nosniff, DENY y Referrer-Policy" | Bajo |
| T7 | Carga de recursos o exfiltración a terceros (I) | A1, A2 | `default-src 'self'`, `connect-src 'self'`, `object-src 'none'` | `headers.mjs` | H: "CSP de producción es restrictiva y no permite 'unsafe-eval'" | Depende de que el navegador respete la CSP |
| T8 | Abuso de permisos del navegador (E) | A2 | `Permissions-Policy`: micrófono, pagos y USB apagados; cámara y geolocalización solo del propio origen | `headers.mjs` | H: "Permissions-Policy solo concede lo que la app usa" | La cámara y la ubicación siguen habilitadas porque la captura las usa |
| T9 | Credenciales en el repositorio (I) | A6 | Lectura desde entorno, falla cerrada en producción, `.env` ignorado, detector de patrones | `src/lib/security/env-guard.ts`, `credential-scan.ts`, `.gitignore` | S: "requireEnv nombra la variable y nunca su valor", "envOrDevDefault: valor local en desarrollo y falla cerrada en producción", "findCredentialLeaks detecta los patrones conocidos y no da falsos positivos", "src/ y public/ no contienen credenciales incrustadas", ".gitignore excluye los archivos .env" | El detector cubre patrones conocidos, no todo |
| T10 | Datos sensibles en registros (I) | A1, A6 | `redactForLog` enmascara claves sensibles y encabezados Bearer | `env-guard.ts` | S: "redactForLog enmascara claves sensibles a cualquier profundidad y los Bearer", "isSensitiveKey reconoce nombres sensibles y no marca los datos normales" | Hay que usarlo en cada `console.*` nuevo |
| T11 | Dispositivo compartido o robado: cola y caché legibles (I) | A3, A4 | **Sin control en esta entrega**: la cola vive en `localStorage` sin cifrar (`src/lib/sync/queue.ts`); riesgo aceptado | — | — | Alto en un caso real; ver §7 |
| T12 | Suplantación de inspector en `/api/sync` (S) | A5 | **Sin autenticación en la API de demostración**: la validación comprueba forma, no identidad; `handleSyncPost` solo exige un `clientId` de texto no vacío | `src/app/api/sync/route.ts` | — | Alto en un caso real; ver §7 |
| T13 | Indexación de rutas internas (I) | A1 | `robots.txt` (cortesía, no control de acceso) | `public/robots.txt` | H: "robots.txt pide no rastrear /api/ ni /inspecciones/" | Cualquiera puede ignorarlo |
| T14 | Lectura o borrado de todos los registros sin autenticar (I/T/D) | A5 | **Sin control**: `GET /api/sync` lista todo y `DELETE /api/sync` vacía el almacén; ambos existen para preparar pruebas | `route.ts` | — | Alto en un caso real. Mitigación posible: limitar `DELETE` y `?fail=1` a entornos que no sean producción Se acepta como límite en esta entrega. |
| T15 | Gancho de pruebas `?fail=1` permite a cualquier cliente forzar un fallo (D) | A5 | **Sin control** (mismo origen que T14) | `route.ts` | — | Bajo con datos sintéticos; alto en un caso real |
| T16 | Dependencias con vulnerabilidades conocidas (varias) | A5 | Documentado; sin actualización esta semana (ver §7) | `package.json`, `package-lock.json` | Salida de `npm audit --omit=dev` | Alto: ver §7 |

## 5. Fallos encontrados durante la semana

1. **Sin headers de seguridad.** Al empezar la semana `next.config.mjs` solo
   tenía `reactStrictMode`; no definía CSP, permisos ni protección contra
   clickjacking. Corregido en `src/lib/security/headers.mjs`.
2. **El service worker v1 era demasiado permisivo.** Podía guardar respuestas de
   `/api/`, páginas de error y recursos de otros orígenes. Corregido en
   `public/sw.js` (versión v2) y cubierto por pruebas que cargan el SW en un
   contexto aislado.
3. **La API de demostración no tiene autenticación y expone ganchos de prueba.**
   `GET` lista todo, `DELETE` vacía el almacén y `?fail=1` fuerza un fallo
   (T12, T14, T15). **No corregido esta semana**; se declara como límite.
4. **Dependencias vulnerables.** `npm audit --omit=dev` reporta 3 vulnerabilidades,
   una crítica (T16, §7).

## 6. Decisiones y trade-offs

- **`'unsafe-inline'` en `script-src`.** Next 14 inyecta scripts en línea.
  Usar nonces exige middleware y renderizado dinámico en todas las páginas, lo
  que choca con el pre-caché offline. Se acepta y se documenta; mitigan el
  rechazo de marcado y el escape de React.
- **No se codifica HTML al guardar.** Se rechaza marcado activo en la entrada y
  se escapa al mostrar (React). Codificar al guardar corrompe los datos.
- **`upgrade-insecure-requests` fuera por defecto.** Rompe las pruebas E2E en
  `http://localhost`; se activa en el host de producción.
- **La cámara queda permitida para el propio origen.** La primera idea era
  desactivarla, pero la pantalla de captura permite adjuntar foto y con
  `camera=()` siempre fallaría como "permiso denegado". Se usa `camera=(self)`.
- **`robots.txt` no es seguridad.** Se incluye por higiene.

## 7. Límites y trabajo futuro

- **Sin autenticación ni autorización** en la API de demostración (T12, T14).
- Sin límite de tasa por cliente (T3).
- Cola y caché locales sin cifrar (T11).
- **Dependencias.** `npm audit --omit=dev` (1 de noviembre de 2026, sobre `main` en `a3a4277`)
  reportó 3 vulnerabilidades: `next` (crítica; instalada 14.2.35, 25 avisos), `postcss`
  (alta, depende de `next`) y `source-map-js` (alta). La corrección que propone npm es
  `next@16.4.3`, un **cambio mayor**. No se aplicó `npm audit fix --force`: rompería el
  build y las pruebas, y no hay tiempo de validarlo esta semana.
- **Análisis por el título de cada aviso** (la búsqueda en `src/` y `next.config.mjs` no
  encontró `next/image`, Server Actions, rewrites ni i18n, y la salida de `next build` no
  lista middleware):
  - Parecen no aplicar por el código de la app: Server Actions, middleware, rewrites e i18n.
  - Los avisos de XSS con nonces no aplican: el proyecto no usa nonces (ver §6).
  - **No se pueden descartar:** los de componentes de servidor, porque la app usa App
    Router con páginas dinámicas (`/inspecciones`); y los del optimizador de imágenes,
    porque `/_next/image` puede estar activo por defecto (no verificado).
  - **Decisión:** la actualización mayor de `next` queda como trabajo futuro. Con datos
    sintéticos y sin despliegue público, el riesgo se acepta de forma explícita; no se
    afirma que las vulnerabilidades no sean explotables.
- El detector de credenciales es básico; no reemplaza una herramienta dedicada.

## 8. Cómo reproducir la evidencia

```bash
npm ci
npm test
make verify
```
