## Óscar Yael Hernández Rodríguez — Semana 2 (Persona 1: Manifest e instalabilidad)

- Nombre: Óscar Yael Hernández Rodríguez
- Repositorio y commit evaluado: https://github.com/hertli0801/pwa-inspecciones-equipo06 (Commit: 40ae77ae99bab79edfc0999cea318305098c9ceb)
- Mi contribución concreta: Creación de public/manifest.webmanifest con los campos obligatorios (name, short_name, icons, start_url, display), generación de los íconos 192x192 y 512x512, y actualización de src/app/layout.tsx para enlazar el manifest mediante la metadata API de Next.js, separando themeColor en el export viewport.
- Decisión técnica que puedo explicar: Se usó display: "standalone" en lugar de "browser" o "minimal-ui" para que la app se comporte como aplicación instalada, sin controles del navegador, y se separó themeColor en un export viewport propio porque Next 14.2 dejó de aceptarlo dentro de metadata.
- Comando o prueba que ejecuté y resultado: Ejecuté npm run dev y verifiqué en Chrome DevTools > Application > Manifest que todos los campos obligatorios cargaran sin errores, y que ambos íconos (192x192 y 512x512) se mostraran correctamente.
- Limitación o riesgo que encontré: El prompt de instalación completo en la barra de direcciones no aparece todavía porque depende también de un Service Worker activo, que corresponde a una tarea posterior fuera de esta semana.
- Uso de IA (herramienta, propósito, fragmentos influenciados y validación humana):
  - Herramienta: Claude.
  - Propósito: Asistencia para redactar el manifest.webmanifest y adaptar layout.tsx a la sintaxis de metadata/viewport de Next.js 14.
  - Fragmentos influenciados: Estructura del JSON del manifest y separación de themeColor en viewport.
  - Validación humana: Prueba local en DevTools confirmando que el manifest carga sin errores y los íconos se muestran correctamente antes de subir los cambios.

## Lilia Hernandez Tun Semana: 02
- **Nombre:** Lilia Hernandez Tun
- **Commit SHA evaluado:** https://github.com/hertli0801/pwa-inspecciones-equipo06 (Commit evaludado: fcf60546c47b5d4fd11e650032ca525bf0ed1743)
- **Decisión técnica que puedo explicar:** Implementé `AppShell` como un componente separado con 4 estados (`loading`, `error`, `empty`, `ready`), usando un CSS Module propio (`app-shell.module.css`) en vez de reutilizar `globals.css`, para no arriesgar el diseño ya existente de `page.tsx`. También decidí usar `tsx` para ejecutar `tests/manifest.spec.ts` en vez de una función experimental de Node, porque el workflow de GitHub Actions no fija una versión de Node con `actions/setup-node`, y `tsx` como dependencia del proyecto garantiza que funcione igual en cualquier máquina que corra `npm ci`.
- Prueba que ejecuté y resultado: Ejecuté `npm test` (obteniendo `starter.spec.mjs: PASS` y `manifest.spec.ts: PASS`) y `npm run verify` (obteniendo `Starter verificable: PASS`), ambos sobre la rama ya fusionada con el manifest y el app-shell.
- **Limitación o fallo diagnosticado:** Al fusionar `main` a mi rama, tuve un conflicto local en `evidence/individual.md` por tener cambios sin commitear; lo resolví haciendo commit de mi trabajo antes de fusionar. También detecté que `public-tests/check.sh` usa `rg` (ripgrep), que no viene preinstalado en Git Bash de Windows — tuve que instalarlo aparte para poder confirmar honestamente que no había secretos, ya que sin `rg` el script reporta `PUBLIC_OK` de forma falsa (por el uso de `!` frente a un comando inexistente).
- **Cambio que podría defender o modificar en vivo:** Podría explicar cómo cambiar el estado por defecto de `AppShell` de `ready` a `loading` simulando una carga asíncrona con `useEffect` y `setTimeout`, ya que ahora mismo los datos son síncronos (importados directamente) y siempre resuelven a `ready` o `empty`.
- **Uso declarado de IA (herramienta, propósito, validación):**
 Herramienta: Claude (Anthropic).
 Propósito: asistencia para redactar el componente `AppShell`, el test `manifest.spec.ts`, diagnosticar errores de configuración de TypeScript en `tests/tsconfig.json`, y entender el comportamiento de `!` frente a comandos inexistentes en Bash.
 Validación humana: ejecuté cada comando yo misma en mi terminal, confirmé los resultados reales (`PASS`/`FAIL`), y resolví manualmente el conflicto de fusión en mi propio editor antes de aceptar cualquier código sugerido.

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
