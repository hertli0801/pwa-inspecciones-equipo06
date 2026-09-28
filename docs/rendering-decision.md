# Decisión de renderizado — SSR para el listado, CSR para el detalle

## Estado

Aceptada — Semana 4.

## Contexto

La PWA de inspecciones de laboratorio (datos sintéticos) debe funcionar con conectividad intermitente. Esta semana se implementan dos rutas del mismo dominio con estrategias de renderizado distintas para poder compararlas:

| Ruta | Estrategia | Archivo |
|---|---|---|
| `/inspecciones` (listado) | **SSR**: se renderiza en el servidor en cada solicitud | `src/app/inspecciones/page.tsx` |
| `/inspecciones/[id]` (detalle) | **CSR**: el navegador pide y pinta los datos | `src/app/inspecciones/[id]/page.tsx` |

Ambas usan el componente compartido `src/components/loading-state.tsx` y tienen estado de error.

## Cómo se implementó cada una

**Listado (SSR).** Es un Server Component `async` (sin `"use client"`). Resuelve sus datos en el servidor y el HTML que recibe el navegador ya contiene las tres inspecciones. Exporta `dynamic = "force-dynamic"`: sin esa línea, Next.js detecta que los datos sintéticos no cambian por solicitud y prerenderiza la ruta como estática en el build, es decir, dejaría de ser SSR por solicitud. Para el estado de carga y de error usa las convenciones del framework: `loading.tsx` (que reutiliza `LoadingState`) y `error.tsx` (Client Component, requisito de Next.js).

**Detalle (CSR).** Es un Client Component (`"use client"`). Al montarse, un `useEffect` pide la inspección por `id`, con un retraso simulado de 400 ms para que el estado de carga sea observable. Maneja tres estados explícitos (`loading`, `error`, `ready`). Si el `id` no existe en los datos sintéticos, cae al estado de error en lugar de romper la página. Una bandera `cancelled` en el efecto evita actualizar el estado si el componente se desmontó o cambió el `id`.

## Métrica de carga medida

Métrica elegida: **First Load JS por ruta**, la tabla que `next build` imprime. Es determinista y se reproduce con dos comandos, sin herramientas adicionales.

Entorno: Next.js 14.2.35, Node.js v22.12.0, Windows (Git Bash). Comandos: `npm ci` y `npm run build`.

```
Route (app)                              Size     First Load JS
┌ ○ /                                    2.07 kB        89.4 kB
├ ○ /_not-found                          873 B          88.2 kB
├ ƒ /inspecciones                        8.88 kB        96.2 kB
└ ƒ /inspecciones/[id]                   939 B          88.3 kB
+ First Load JS shared by all            87.3 kB
```

| Ruta | Estrategia | JS propio de la ruta | First Load JS |
|---|---|---:|---:|
| `/inspecciones` | SSR | 8.88 kB | 96.2 kB |
| `/inspecciones/[id]` | CSR | 939 B | 88.3 kB |

Lectura: el JS compartido (87.3 kB) es igual para ambas. El listado SSR carga **7.9 kB más** que el detalle CSR (96.2 − 88.3). No se midió la causa de esa diferencia; una hipótesis por verificar es que el listado incluye el componente `Link` de Next.js para navegar a cada detalle y el detalle no. No se afirma como hecho.

Indicador de complejidad (líneas agregadas al repositorio, según `git pull`): el listado SSR con sus archivos de convención suma 48 (`page.tsx`) + 5 (`loading.tsx`) + 18 (`error.tsx`) = 71 líneas; el detalle CSR es 86 líneas en un solo archivo. El CSR concentra más lógica propia (estados, efecto, cancelación); el SSR reparte menos lógica en más archivos que el framework conecta solo.

## Comparación y trade-offs

| Criterio | SSR (listado) | CSR (detalle) |
|---|---|---|
| Primer contenido | Ya viene en el HTML de la respuesta | Llega el "Cargando…" y el contenido aparece después, vía JavaScript |
| Dependencia de JS para ver datos | Baja: el HTML ya los trae | Alta: sin JS no hay contenido |
| Trabajo por solicitud en el servidor | Sí, en cada solicitud (`ƒ Dynamic`) | Solo sirve el cascarón; los datos los resuelve el navegador |
| Estado de carga | `loading.tsx` automático de Next.js | Manual, con `useState` y `LoadingState` |
| Estado de error | `error.tsx` automático | Manual (`status === "error"`) |
| Complejidad de código propio | Menor lógica por archivo | Mayor lógica (efecto, cancelación, estados) |
| Interacción posterior | Requiere Client Components para interactividad | Natural: todo ya vive en el cliente |

Relación con la PWA y el service worker de la Semana 3: el service worker responde las navegaciones con *network-first* y los assets con *cache-first*. Una página SSR visitada una vez queda cacheada como documento y puede reabrirse sin red; una página CSR necesita además que su JavaScript esté en caché y que la fuente de datos esté disponible, lo que hoy funciona porque los datos sintéticos viajan dentro del bundle. Con una API real, el detalle CSR necesitaría su propia estrategia de datos offline.

## Prevención de hydration mismatch

- El primer render del detalle CSR es siempre el estado `loading`, tanto en el servidor como en el cliente; los datos llegan después del montaje, por lo que no hay diferencia entre el HTML del servidor y el primer render del cliente.
- El listado SSR no tiene estado de cliente: se renderiza una vez en el servidor.
- Ninguna de las dos rutas usa `Math.random()` ni formatea fechas con el reloj o la configuración regional del navegador. `tests/rendering.spec.ts` comprueba estas dos condiciones.

## Accesibilidad

`LoadingState` usa `role="status"` con `aria-live="polite"`; los errores usan `role="alert"`; el listado usa `<section aria-labelledby>` y una lista semántica (`<ul>`/`<li>`). No se realizó una auditoría con lector de pantalla ni con una herramienta automatizada; esto es una revisión de marcado, no una medición.

## Decisión

Se mantiene **SSR para el listado** (contenido inmediato en el HTML, poca interactividad) y **CSR para el detalle** (comparación pedida por la actividad y base para interacción futura por inspección). Si el detalle debiera poder compartirse o abrirse sin JavaScript, sería preferible pasarlo a SSR; el costo sería más trabajo por solicitud en el servidor.

## Límites y riesgos

- La métrica es **tamaño de JavaScript**, no tiempo. No se midieron LCP, TTFB ni tiempo hasta contenido; no hay una herramienta como Lighthouse en el flujo.
- El retraso de 400 ms del detalle es **simulado**: no representa una red real.
- Los datos son sintéticos y viven en un módulo local; no hay base de datos ni API, por lo que el "servidor" del SSR solo lee un arreglo en memoria.
- `tests/rendering.spec.ts` analiza el código fuente (texto), no renderiza los componentes: detecta regresiones estructurales (perder `force-dynamic`, agregar `"use client"` al listado, quitar el estado de error), pero no ejecuta el flujo en un navegador.
- El estado de error del listado (`error.tsx`) no se ejercitó en ejecución, porque los datos sintéticos no fallan.

## Validación en semanas posteriores

- Repetir `npm run build` tras cada cambio de dependencias y comparar la tabla contra la de este documento.
- Al introducir una API real, medir tiempo hasta contenido con una herramienta (por ejemplo Lighthouse) y revisar si el detalle debe pasar a SSR.
- Probar en un navegador con DevTools en modo sin conexión que ambas rutas se comporten como se describe arriba.

## Cómo reproducir

```bash
npm ci
npm run build          # imprime la tabla de First Load JS
npm test               # incluye tests/rendering.spec.ts
npm run dev            # http://localhost:3000/inspecciones
curl -s http://localhost:3000/inspecciones | head    # el HTML ya trae los datos (SSR)
```