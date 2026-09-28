import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

const listingPage = await readFile(resolve(root, "src/app/inspecciones/page.tsx"), "utf8");
const detailPage = await readFile(resolve(root, "src/app/inspecciones/[id]/page.tsx"), "utf8");
const loadingComponent = await readFile(resolve(root, "src/components/loading-state.tsx"), "utf8");
const loadingFile = await readFile(resolve(root, "src/app/inspecciones/loading.tsx"), "utf8");
const errorFile = await readFile(resolve(root, "src/app/inspecciones/error.tsx"), "utf8");

// --- El listado debe ser SSR: sin "use client", con obtención async de datos ---
assert.doesNotMatch(
  listingPage,
  /"use client"/,
  "src/app/inspecciones/page.tsx debe ser un Server Component (SSR): no debe llevar 'use client'"
);
assert.match(
  listingPage,
  /\basync function\b/,
  "el listado debe resolver sus datos de forma asíncrona en el servidor (async function)"
);
assert.match(
  listingPage,
  /dynamic\s*=\s*["']force-dynamic["']/,
  "el listado debe forzar renderizado dinámico; sin esto Next.js lo optimiza como estático y deja de ser SSR por solicitud"
);

// --- El detalle debe ser CSR: con "use client" y carga en el navegador ---
assert.match(
  detailPage,
  /"use client"/,
  "src/app/inspecciones/[id]/page.tsx debe ser un Client Component (CSR): debe llevar 'use client'"
);
assert.match(
  detailPage,
  /useEffect/,
  "el detalle debe cargar sus datos en el cliente usando useEffect, no en el render inicial del servidor"
);

// --- Ambas rutas deben usar el LoadingState compartido ---
assert.match(loadingFile, /LoadingState/, "el listado (loading.tsx) debe usar el componente LoadingState compartido");
assert.match(detailPage, /LoadingState/, "el detalle debe usar el componente LoadingState compartido");
assert.match(loadingComponent, /role="status"/, "LoadingState debe exponer role=\"status\" para accesibilidad");

// --- Ambas rutas deben manejar un estado de error explícito y verificable ---
assert.match(detailPage, /status === "error"/, "el detalle debe tener una rama explícita para el estado de error");
assert.match(errorFile, /"use client"/, "error.tsx de Next.js debe ser un Client Component (requisito del framework)");
assert.match(errorFile, /role="alert"/, "error.tsx debe exponer role=\"alert\" para accesibilidad");

// --- Contenido verificable: ambas rutas usan los datos sintéticos reales, no placeholders ---
assert.match(listingPage, /lib\/data\/inspections/, "el listado debe leer de la fuente real de datos sintéticos");
assert.match(detailPage, /lib\/data\/inspections/, "el detalle debe leer de la fuente real de datos sintéticos");

// --- Prevención de hydration mismatch: nada de valores no deterministas en el render ---
for (const [name, code] of [
  ["listado (SSR)", listingPage],
  ["detalle (CSR)", detailPage],
] as const) {
  assert.doesNotMatch(code, /Math\.random\(/, `${name} no debe usar Math.random() (causa hydration mismatch entre servidor y cliente)`);
  assert.doesNotMatch(code, /new Date\(\)\.toLocaleString/, `${name} no debe formatear fechas dependientes del reloj/local del navegador directamente en el render`);
}

console.log("rendering.spec.ts: PASS");