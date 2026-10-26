import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 7_000 },
  // El servidor de demostración guarda los registros en memoria y todas las
  // pruebas lo comparten: se ejecutan una por una para que no se pisen.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Un service worker podría servir páginas desde su caché y ocultar si la
    // app realmente funciona sin conexión; en E2E se bloquea para que
    // "sin conexión" signifique sin red de verdad.
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // En CI se prueba el build de producción; en local, el servidor de
    // desarrollo (o el que ya tengas abierto en ese puerto).
    command: process.env.CI
      ? `npm run build && npm run start -- -p ${PORT}`
      : `npm run dev -- -p ${PORT}`,
    url: `http://localhost:${PORT}/inspecciones/nueva`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
