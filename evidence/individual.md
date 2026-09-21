# Evidencia individual — completar antes de entregar

## Alberto Herrera
- Nombre: José Alberto Herrera Flores
- Repositorio y commit evaluado: https://github.com/hertli0801/dmi-equipo06 (Commit: be254dbda18f2451e4cc9119ace443f4d36af75d)
- Mi contribución concreta: Configuración del entorno de desarrollo local en macOS, verificación reproducibilidad con `npm ci`, ejecución de la suite de pruebas sintéticas y estructuración de la documentación del proyecto (`docs/requirements.md` y `docs/decision-record.md`).
- Decisión técnica que puedo explicar: Uso estricto de `npm ci` con `package-lock.json` para garantizar una instalación determinista de dependencias sin alterar las versiones del starter entre los entornos de los integrantes del equipo.
- Comando o prueba que ejecuté y resultado: Ejecuté `npm run verify` obteniendo `Starter verificable: PASS` y la generación correcta del reporte en `reports/verification.json`.
- Limitación o riesgo que encontré: Dependencia del soporte del navegador local y de la API de Web Storage/Service Worker para simular y validar estados offline antes de la implementación formal en semanas posteriores.
- Uso de IA (herramienta, propósito, fragmentos influenciados y validación humana): 
  - Herramienta: ChatGPT / Claude.
  - Propósito: Asistencia en la estructuración de la documentación y formato Markdown.
  - Fragmentos influenciados: Formato de la sección de evidencia individual y redacción técnica de requisitos.
  - Validación humana: Revisión y adecuación manual de las salidas para coincidir exactamente con el entorno de desarrollo local (Node.js v22.18.0) y los resultados reales obtenidos.

 ## Óscar Yael Hernández Rodríguez — Semana 2 (Persona 1: Manifest e instalabilidad)

- Nombre: Óscar Yael Hernández Rodríguez
- Repositorio y commit evaluado: https://github.com/hertli0801/pwa-inspecciones-equipo06 
 (Commit: 40ae77ae99bab79edfc0999cea318305098c9ceb)
- Mi contribución concreta: Creación de public/manifest.webmanifest con los campos obligatorios (name, short_name, icons, start_url, display), generación de los íconos 192x192 y 512x512, y actualización de src/app/layout.tsx para enlazar el manifest mediante la metadata API de Next.js, separando themeColor en el export viewport.
- Decisión técnica que puedo explicar: Se usó display: "standalone" en lugar de "browser" o "minimal-ui" para que la app se comporte como aplicación instalada, sin controles del navegador, y se separó themeColor en un export viewport propio porque Next 14.2 dejó de aceptarlo dentro de metadata.
- Comando o prueba que ejecuté y resultado: Ejecuté npm run dev y verifiqué en Chrome DevTools > Application > Manifest que todos los campos obligatorios cargaran sin errores, y que ambos íconos (192x192 y 512x512) se mostraran correctamente.
- Limitación o riesgo que encontré: El prompt de instalación completo en la barra de direcciones no aparece todavía porque depende también de un Service Worker activo, que corresponde a una tarea posterior fuera de esta semana.
- Uso de IA (herramienta, propósito, fragmentos influenciados y validación humana):
  - Herramienta: Claude.
  - Propósito: Asistencia para redactar el manifest.webmanifest y adaptar layout.tsx a la sintaxis de metadata/viewport de Next.js 14.
  - Fragmentos influenciados: Estructura del JSON del manifest y separación de themeColor en viewport.
  - Validación humana: Prueba local en DevTools confirmando que el manifest carga sin errores y los íconos se muestran correctamente antes de subir los cambios.


## Lilia
- **Nombre:** Lilia Hernandez Tun
- **Repositorio y commit evaluado:** https://github.com/hertli0801/pwa-inspecciones-equipo06 (Commit: 8acd321472588d24168145d966ad9fd51346b6cf)
- **Mi contribución concreta:** Verificación del entorno local (Node.js v22.12.0, npm) y arranque del starter (`npm ci`, `npm run dev`), confirmando las tres inspecciones sintéticas en `http://localhost:3000`. Resolución del conflicto de fusión en `evidence/individual.md` al integrar las dos partes de la contribución de Óscar (PR #2) sin perder ninguna. Redacción completa de `docs/decision-record.md`: comparación de PWA, web tradicional, app nativa y multiplataforma, y justificación de la estrategia PWA para el proyecto.
- **Decisión técnica que puedo explicar:** Elegimos PWA con Next.js porque reutiliza el stack que ya enseña el curso y evita depender de una tienda de aplicaciones, mientras ofrece un camino claro hacia soporte offline para el escenario de conectividad intermitente.
- **Comando o prueba que ejecuté y resultado:** Ejecuté `npm ci && npm run dev` y confirmé en el navegador que se muestran las tres inspecciones sintéticas (Laboratorio de Redes, Laboratorio de Electrónica, Laboratorio de Software) con sus respectivos estados. También ejecuté `npm run verify`, obteniendo `[pega aquí el resultado real: PASS/FAIL]` y la generación del reporte en `reports/verification.json`.
- **Qué comprueba y qué no:** Esto comprueba que el proyecto se instala y arranca de forma reproducible y que la interfaz muestra los datos de demostración esperados. No comprueba el comportamiento offline real ni la sincronización de datos, ya que esas funciones no están implementadas en esta entrega.
- **Limitación o riesgo que encontré:** Al fusionar el PR #2, GitHub marcó conflicto porque dos ramas agregaron una sección "## Óscar" al mismo tiempo en `evidence/individual.md`; tuve que combinarlas manualmente en el editor web para no perder ninguna de las dos aportaciones.
- **Uso de IA (herramienta, propósito, fragmentos influenciados y validación humana):**
  - Herramienta: Claude.
  - Propósito: Asistencia para redactar el borrador de `docs/decision-record.md`, entender el flujo de resolución de conflictos de Git/GitHub, y estructurar esta evidencia individual.
  - Fragmentos influenciados: Contenido inicial de `docs/decision-record.md` (tabla comparativa y justificación).
  - Validación humana: Revisé el contenido generado, lo comparé con lo definido por el equipo en `requirements.md`, y confirmé manualmente los resultados de los comandos ejecutados en mi propio entorno antes de aceptarlo.

## José Alberto Herrera Flores — Semana 2 (Persona 2: App Shell y estados)

- Nombre: José Alberto Herrera Flores
- Repositorio y commit evaluado: https://github.com/hertli0801/pwa-inspecciones-equipo06 (Commit: 19f0a5d23e0b67c037e395961cadc03ec031b1f3)
- Mi contribución concreta: Creación de `src/components/app-shell.tsx` (componente cliente) y `src/components/app-shell.module.css`, que implementan los 4 estados del shell (`loading`, `error`, `empty`, `ready`) con un header de marca reutilizando los íconos del manifest. Reemplazo de `src/app/page.tsx` para que orqueste una carga simulada de los datos sintéticos existentes (`src/lib/data/inspections.ts`) mediante `useState`/`useEffect` y alimente el `AppShell` con el estado correspondiente, incluyendo `?demo=error` y `?demo=empty` como parámetros de URL para forzar cada estado en una demostración en vivo.
- Decisión técnica que puedo explicar: `app-shell.tsx` requiere `"use client"` porque renderiza un botón interactivo (`onClick` de "Reintentar") y depende de estado de React; un Server Component no puede manejar event handlers. Además, la lógica de obtención de datos vive en `page.tsx` y no en el componente de presentación (`AppShell`), para separar el "shell" (chrome visual reutilizable) de la fuente de datos, siguiendo el patrón de app shell. Usé un CSS Module propio (`app-shell.module.css`) en vez de extender `globals.css` para no arriesgar el diseño ya validado por el resto del equipo y evitar conflictos de fusión con el trabajo de Persona 1 sobre `layout.tsx`.
- Comando o prueba que ejecuté y resultado: Ejecuté `npm ci` (instalación limpia) y `npm run build`, que compiló y prerenderizó sin errores. Ejecuté `npm run test`, y la prueba existente `tests/starter.spec.mjs` siguió en verde (`PASS`) porque el título y la mención a "sintéticos" se conservaron en `page.tsx`. Verifiqué con `curl` el HTML servido por `npm run dev` en `/`, `/?demo=error` y `/?demo=empty` para confirmar que el marcado inicial (estado `loading` durante el renderizado en servidor) se sirve correctamente en los tres casos.
- Limitación o riesgo que encontré: El proyecto todavía no tiene una librería de pruebas de componentes (por ejemplo React Testing Library), así que no pude escribir una prueba automatizada que verifique los 4 estados del `AppShell` en esta rama; lo validé manualmente en el navegador y por inspección del HTML servido. El estado `error` real depende de `navigator.onLine`, que no siempre refleja fallos reales de red (solo detecta que el dispositivo está desconectado), por lo que agregué el parámetro `?demo=error` para poder forzarlo en la defensa en vivo.
- Uso de IA (herramienta, propósito, fragmentos influenciados y validación humana):
  - Herramienta: Claude Code (Claude Sonnet 5).
  - Propósito: Asistencia para diseñar la estructura del componente `AppShell` (los 4 estados y su separación de `page.tsx`), redactar el CSS Module y el mensaje de coordinación para el equipo.
  - Fragmentos influenciados: Estructura completa de `app-shell.tsx`, `app-shell.module.css` y la reescritura de `page.tsx`.
  - Validación humana: Revisé que no se tocaran `layout.tsx`, `manifest.webmanifest` ni `package.json` (fuera de mi alcance), ejecuté `npm run build` y `npm run test` en mi propio entorno, y verifiqué manualmente los 3 estados navegables (`/`, `?demo=error`, `?demo=empty`) antes de subir los cambios.

## José Alberto Herrera Flores — Semana 3 (Persona 1: Service Worker y estrategia de caché)

- Nombre: José Alberto Herrera Flores
- Repositorio y commit evaluado: https://github.com/hertli0801/pwa-inspecciones-equipo06 (Commit: 3609c69397c6f0ed278ec8611586e45abab7d288)
- Mi contribución concreta: Creación de `public/sw.js` (service worker) con estrategia *network-first* para peticiones de navegación y *cache-first* para assets estáticos, versionado del cache mediante `CACHE_VERSION` con limpieza de versiones viejas en `activate`, y un listener de `message` para `SKIP_WAITING` (soportado pero no autoinvocado). Creación de `public/offline.html` como página de fallback estática, precacheada en `install` junto con `/`, el manifest y los íconos. Redacción de `docs/cache-strategy.md` documentando el razonamiento detrás de cada estrategia, el versionado/limpieza del cache y la tabla de comportamiento exacto sin red (navegación vs. asset, con y sin cache).
- Decisión técnica que puedo explicar: Distinguí la estrategia por `request.mode === "navigate"` en vez de por extensión de archivo, porque es la señal nativa del Fetch API para saber si una petición es una carga de página o un subrecurso, sin necesidad de mantener listas de rutas. Elegí *network-first* solo para navegación porque el contenido de una inspección puede cambiar entre sesiones y no queremos servir por defecto una copia vieja del HTML; en cambio los assets (JS, CSS, íconos, manifest) casi no cambian entre despliegues, así que *cache-first* evita peticiones de red innecesarias. El `activate` borra cualquier cache cuyo nombre no coincida con `CACHE_NAME` actual (que incluye `CACHE_VERSION`), que es justamente lo que previene que un dispositivo quede sirviendo una mezcla de versiones viejas y nuevas tras una actualización.
- Comando o prueba que ejecuté y resultado: Ejecuté `node --check public/sw.js` (sintaxis válida). Escribí y corrí un script propio con `node:vm` que carga el código real de `sw.js` dentro de un `self`/`caches`/`fetch` simulados y ejecuta los eventos `install`, `activate` y `fetch` con la red arriba y abajo: confirmé que `install` precachea las 5 rutas esperadas (incluyendo `/offline.html`), que `activate` borra un cache viejo simulado y conserva solo el actual, que una navegación con red responde desde la red, que una navegación sin red y sin cache cae a `/offline.html`, que un asset cacheado se sirve sin tocar la red, y que un asset no cacheado sin red también cae a `/offline.html` — los 6 casos pasaron. Además ejecuté `npm ci && npm run build` (compiló y prerenderizó sin errores), `npm test` (`starter.spec.mjs: PASS`, `manifest.spec.ts: PASS`) y `npm run verify` (`Starter verificable: PASS`) sobre el repo completo, para confirmar que mis archivos nuevos no rompen nada existente.
- Limitación o riesgo que encontré: `public/sw.js` no maneja peticiones que no sean `GET` (por ejemplo, un futuro envío de inspección por `POST`), así que hoy no tiene comportamiento offline para escritura de datos, solo para lectura/navegación. El fallback a `/offline.html` para un asset sin cache y sin red es una simplificación: en ese caso concreto se le devuelve HTML en vez de, por ejemplo, un JS vacío, lo cual es aceptable para este proyecto de datos sintéticos pero no sería ideal en un sitio con más assets críticos en tiempo de ejecución. No pude probar el comportamiento en un navegador real con DevTools > Application > Service Workers porque el registro (`register-service-worker.ts`) todavía no existe en esta rama; lo validé con la simulación en Node descrita arriba.
- Uso de IA (herramienta, propósito, fragmentos influenciados y validación humana):
  - Herramienta: Claude Code.
  - Propósito: Asistencia para diseñar la estructura.
  - Fragmentos influenciados: Estructura de algunos archivos y hacer pruebas locales.
  - Validación humana: Revisé que no se tocaran `layout.tsx`, `register-service-worker.ts`, `package.json` ni `tests/`, corrí yo mismo `node --check`, el smoke test, `npm ci`, `npm run build`, `npm test` y `npm run verify` en mi propio entorno, y confirmé cada resultado (`PASS`/compilación exitosa) antes de hacer commit.

## Evidencia Yael Hernández Rodríguez --Semana 3
- Nombre: Óscar Yael Hernández Rodríguez
- Repositorio y commit evaluado: https://github.com/hertli0801/pwa-inspecciones-equipo06 (Commit: [SHA final de main que compartan en el grupo])
- Mi contribución concreta (Persona 2, rama sw/register, commit ace4ebeb76977044db0fb6c84e67b8b7bc3b552f): Creación de src/lib/pwa/register-service-worker.ts (función que verifica soporte de service workers, registra /sw.js y escucha updatefound), creación de src/components/register-service-worker.tsx (componente cliente que ejecuta el registro desde useEffect) y edición de src/app/layout.tsx únicamente para agregar <RegisterServiceWorker /> dentro del body.
- Decisión técnica que puedo explicar: El registro va en un componente cliente separado con "use client" porque layout.tsx es un Server Component y no puede usar hooks ni navigator. Ante updatefound solo se informa por consola y no se fuerza skipWaiting(), para no reemplazar la versión de un usuario a media sesión sin avisar; la versión nueva se activa al cerrar las pestañas abiertas. Además, si el navegador no soporta service workers ("serviceWorker" in navigator), la función termina sin error y la app funciona normal sin offline. Se registra de inmediato si document.readyState ya es "complete", porque en Next.js el componente puede montarse después del evento load.
- Comando o prueba que ejecuté y resultado: Ejecuté npm run build y compiló sin errores (Compiled successfully, linting y validación de tipos correctos, 4/4 páginas estáticas generadas). Revisé con git status que solo cambiaran mis 3 archivos y con git diff que layout.tsx tuviera únicamente el import y el componente agregados. [Agregar aquí el resultado de npm test, npm run verify y de la prueba en DevTools > Application > Service Workers una vez que main esté completo.]
- Limitación o riesgo que encontré: Mientras public/sw.js (Persona 1) no esté fusionado en main, el registro devuelve un 404 en consola, porque mi código depende de ese archivo. Además, la notificación de versión nueva es solo un mensaje en consola, no hay aviso visible al usuario.
- Uso de IA (herramienta, propósito, fragmentos influenciados y validación humana):
  - Herramienta: Claude.
  - Propósito: Apoyo para entender la tarea y redactar el código de registro del service worker, además de explicarme cada archivo y los comandos.
  - Fragmentos influenciados: La estructura de register-service-worker.ts (verificación de soporte, manejo de updatefound y comprobación de readyState) y el componente register-service-worker.tsx.
  - Validación humana: Compilé el proyecto con npm run build sin errores, revisé git status y git diff para confirmar que solo cambié mis archivos, y [probé el registro en DevTools cuando sw.js estuvo en main].
  
## Lilia Hernández Tun — Semana 3 (Persona 3: Pruebas, CI y documentación)

- Nombre: Lilia Hernández Tun
- Repositorio y commit evaluado: https://github.com/hertli0801/pwa-inspecciones-equipo06 (Commit: 99132efcedb831a65662e762c0e6642f3339fd55)
- Mi contribución concreta: Creación de `tests/service-worker.spec.ts` y `tests/offline.spec.ts` (pruebas del service worker), actualización de `scripts/verify.mjs` y del script `test` en `package.json`, copia del workflow de GitHub Actions `.github/workflows/week-03-w03-service-worker-offline.yml`, reemplazo de `public-tests/check.sh`, y adición de la sección "Semana 3" en `README.md`.
- Decisión técnica que puedo explicar: Usé `node:vm` para crear un `self`, `caches` y `fetch` falsos y ejecutar el código REAL de `public/sw.js` dentro de ese sandbox, en vez de reimplementar su lógica por separado. Esto permite probar el comportamiento real del service worker (instalación/precache, limpieza de versiones viejas en `activate`, y las estrategias network-first/cache-first ante fallos de red) sin depender de un navegador real.
- Comando o prueba que ejecuté y resultado: Ejecuté `npm run build` (compiló exitosamente), `npm test` (las 4 pruebas —starter, manifest, service-worker y offline— dieron PASS) y `npm run verify` (PASS, sin artefactos faltantes).
- Limitación o riesgo que encontré: El paso AC-03 del workflow de GitHub Actions ejecuta `npm run test --if-present -- --run`, pero mi script `test` es una cadena de comandos (`node ... && tsx ... && tsx ...`), no un test-runner que reconozca `--run`. Verifiqué localmente que la bandera se pasa sin efecto al último comando (`tsx tests/offline.spec.ts --run`) y no rompe la ejecución, pero es un acoplamiento frágil si en el futuro cambia el runner.
- Uso de IA (herramienta, propósito, fragmentos influenciados y validación humana):
  - Herramienta: Claude.
  - Propósito: Asistencia para diseñar el harness de `node:vm` (fakes de `self` y `caches`) y redactar los casos de prueba de `service-worker.spec.ts` y `offline.spec.ts`.
  - Fragmentos influenciados: La estructura completa de ambos archivos de prueba, y el arreglo `required` agregado en `scripts/verify.mjs`.
  - Validación humana: Corrí yo misma `npx tsx tests/service-worker.spec.ts`, `npx tsx tests/offline.spec.ts`, `npm run build`, `npm test` y `npm run verify`, confirmando PASS en todos antes de subir.