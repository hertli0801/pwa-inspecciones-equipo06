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
