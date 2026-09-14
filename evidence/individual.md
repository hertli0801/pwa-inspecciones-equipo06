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