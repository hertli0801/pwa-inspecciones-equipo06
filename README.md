# PWA de inspecciones de laboratorio — proyecto base

Starter oficial para la materia **Aplicaciones Web Progresivas**.

Este repositorio es el punto de partida común para las actividades de las semanas 1–13. En la Semana 1 no debes construir todavía toda la PWA: debes poner en marcha este proyecto, documentar el problema y dejar una primera versión reproducible. Cada semana conservarás el mismo repositorio y agregarás la capacidad indicada por la actividad.

## Requisitos locales

- Node.js 20 LTS o superior compatible con Next.js.
- npm 10 o superior.
- Git y una cuenta de GitHub.

## Arranque verificable

```bash
npm ci
npm run dev
```

Abre <http://localhost:3000>. Debes ver la pantalla inicial de inspecciones con datos sintéticos.

Antes de entregar ejecuta:

```bash
make verify
bash public-tests/check.sh
```

`make verify` genera `reports/verification.json`; ese archivo y la corrida verde de GitHub Actions son la evidencia técnica del arranque.

## Flujo de trabajo del curso

1. Conserva este repositorio como tu proyecto personal y crea un repositorio privado en GitHub.
2. Completa únicamente los entregables de la actividad de la semana.
3. Haz cambios pequeños y descriptivos; no borres lo que ya funciona.
4. Ejecuta la verificación local y espera que GitHub Actions termine en verde.
5. Entrega en Classroom la URL del repositorio, el SHA exacto evaluado, el enlace a Actions y `evidence/individual.md`.

No uses datos reales de personas, laboratorios o estudiantes. Todo dato del starter es sintético.

## Estructura inicial

- `src/app/`: aplicación Next.js con App Router.
- `src/lib/data/`: datos sintéticos de inspecciones.
- `docs/`: plantillas de documentación de la Semana 1.
- `scripts/verify.mjs`: verificación reproducible local.
- `tests/`: prueba mínima del starter.

Las decisiones de arquitectura y las nuevas carpetas se incorporan en las actividades correspondientes; no es necesario adelantarlas.

## Semana 2 — Shell instalable y manifest

Se agregó el manifest de la PWA (`public/manifest.webmanifest`), iconos de instalación (`public/icons/`), y un componente `AppShell` (`src/components/app-shell.tsx`) que maneja los estados de carga, error y vacío alrededor del contenido principal.

### Verificación de esta semana

```bash
npm install
npm run verify
npm test
```

`npm test` corre dos pruebas: `tests/starter.spec.mjs` (Semana 1) y `tests/manifest.spec.ts` (Semana 2), que valida que el manifest tenga los campos obligatorios, que los iconos existan en disco, y que `layout.tsx` y `app-shell.tsx` estén correctamente enlazados.

### Continuidad de equipo

Este proyecto continúa como el mismo equipo asignado desde la Semana 1 (`pwa-inspecciones-equipo06`), por continuidad del repositorio.

## Semana 3 — Service Worker y estrategia de caché

Se agregó el service worker de la aplicación (`public/sw.js`) con estrategia *network-first* para la navegación y *cache-first* para assets estáticos, versionado de cache (`CACHE_VERSION`) con limpieza de versiones viejas en `activate`, y una página de respaldo sin conexión (`public/offline.html`). El registro del service worker se hace desde un componente cliente (`src/components/register-service-worker.tsx`) que usa `src/lib/pwa/register-service-worker.ts`, invocado desde `src/app/layout.tsx`.

Las decisiones técnicas de esta semana (por qué *network-first* para navegación, cómo funciona el versionado del cache, y qué pasa exactamente cuando no hay red) están documentadas en `docs/cache-strategy.md`.

### Verificación de esta semana

```bash
npm install
npm run verify
npm test
```

`npm test` ahora corre cuatro pruebas: `tests/starter.spec.mjs` (Semana 1), `tests/manifest.spec.ts` (Semana 2), `tests/service-worker.spec.ts` y `tests/offline.spec.ts` (Semana 3). Estas dos últimas ejecutan el código real de `public/sw.js` dentro de un sandbox de `node:vm`, simulando `self`, `caches` y `fetch`, para validar la instalación (precache), la limpieza de versiones viejas, y el comportamiento real cuando la red falla (no solo que los archivos existan).

## Semana 4 — Renderizado CSR y SSR

- `/inspecciones`: listado renderizado en el servidor (SSR), con `loading.tsx` y `error.tsx`.
- `/inspecciones/[id]`: detalle renderizado en el cliente (CSR), con estados de carga y error.
- `src/components/loading-state.tsx`: indicador de carga compartido por ambas rutas.
- Decisión y métrica de carga (First Load JS por ruta): ver `docs/rendering-decision.md`.

### Verificación de esta semana

```bash
npm ci
npm run build
npm test
npm run verify
bash public-tests/check.sh
```

`npm test` incluye `tests/rendering.spec.ts`, que comprueba que el listado sea un Server Component con `force-dynamic`, que el detalle sea un Client Component con `useEffect`, que ambos usen `LoadingState`, que exista un estado de error, y que no haya `Math.random()` ni fechas dependientes del navegador en el render.

## Semana 6: capacidades del dispositivo y notificaciones

Evidencia opcional (camara), ubicacion aproximada y notificaciones de cambio, con permisos minimos y fallback. Detalle de decisiones y limites en `docs/capabilities.md`.

### Ejecucion y verificacion

Requiere Node 20 o superior (probado con Node 22, ver `.nvmrc`). Equivalente exacto de `make verify`:

    npm ci
    npm run build
    npm test
    npm run verify

`npm run verify` genera `reports/verification.json`. El check publico se ejecuta con `bash public-tests/check.sh`.

### Supuestos

- Solo datos sinteticos.
- Las capacidades se piden bajo una accion del usuario, nunca al cargar la pagina.
- Los modulos exponen la logica con sus fallbacks; las pruebas simulan las APIs del navegador.

### Evidencia

- Pruebas: `tests/capabilities.spec.ts` (casos soportados, no soportados, denegados y entradas invalidas).
- Reporte de CI: enlace a la corrida de GitHub Actions del commit final.
- Evidencia individual: `evidence/individual.md`.

## Seguridad y privacidad (semana 9)

Modelo de amenazas y controles de validación, credenciales, CSP, permisos y privacidad.
Todos los datos son sintéticos.

### Requisitos

- Node según `.nvmrc` (22). Se recomienda 22.13 o superior: con 22.12 `npm ci` muestra un
  aviso `EBADENGINE` de ESLint, que no impide instalar ni compilar.

### Instalación y ejecución

```bash
npm ci
npm run dev        # desarrollo en http://localhost:3000
```

### Verificación

```bash
npm test                    # 9 specs, incluidos tests/security.spec.ts y tests/security-headers.spec.mjs
npm run typecheck
npm run build
make verify
npm run test:unit
npm run test:integration
npm run test:e2e            # requiere: npx playwright install chromium
```

Comprobación de los artefactos de la actividad (debe terminar en `0`):

```bash
test -e docs/threat-model.md && test -e docs/privacy-data-inventory.md && test -e src/lib/security/ && test -e tests/security.spec.ts && test -e public/robots.txt; echo "exit: $?"
```

### Qué se implementó

| Control | Archivo | Prueba |
|---|---|---|
| Validación de entradas del servidor (campos permitidos, tipos, tamaño, marcado activo) | `src/lib/security/input-guard.ts`, `src/app/api/sync/route.ts` | `tests/security.spec.ts` |
| Variables de entorno y registros sin datos sensibles | `src/lib/security/env-guard.ts` | `tests/security.spec.ts` |
| Detección de credenciales incrustadas | `src/lib/security/credential-scan.ts` | `tests/security.spec.ts` |
| CSP y headers de seguridad | `src/lib/security/headers.mjs`, `next.config.mjs` | `tests/security-headers.spec.mjs` |
| Service worker que no cachea la API | `public/sw.js` | `tests/security-headers.spec.mjs` |
| `robots.txt` (no es un control de acceso) | `public/robots.txt` | `tests/security-headers.spec.mjs` |

### Documentación

- [Modelo de amenazas](docs/threat-model.md)
- [Inventario de datos y privacidad](docs/privacy-data-inventory.md)

### Evidencia

- Commit evaluado y corrida de GitHub Actions: ver `evidence/individual.md` (el SHA final se fija al congelar `main`).
- Evidencia individual: `evidence/individual.md`

### Supuestos y límites

- La API de sincronización es una demostración: sin autenticación, con almacén en
  memoria y con ganchos de prueba (`DELETE /api/sync`, `?fail=1`). Ver T12, T14 y T15 en
  el modelo de amenazas.
- La CSP mantiene `'unsafe-inline'` en `script-src` (trade-off de Next 14).
- La cola de sincronización vive en `localStorage` sin cifrar.
- `npm audit --omit=dev` reporta vulnerabilidades en `next` y dependencias; la
  actualización mayor queda como trabajo futuro. Ver §7 del modelo de amenazas.
- El check público `public-tests/check.sh` termina con `PUBLIC_OK` aunque falten artefactos;
  la verificación real es el comando de la sección anterior. Marca coincidencias en archivos
  del paquete del profesor, en el lockfile y en evidencia de semanas anteriores, que no se
  editan.
