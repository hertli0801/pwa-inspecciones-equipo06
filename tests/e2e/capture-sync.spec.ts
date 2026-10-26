import { expect, test, type Page } from "@playwright/test";

// E2E del flujo crítico: capturar → guardar sin conexión → recargar →
// reconectar → sincronizar. Solo datos sintéticos.

const FORM = {
  location: "Laboratorio de Redes",
  summary: "Revisión sintética E2E",
  inspector: "Técnica A",
  findings: "2",
  date: "2026-01-15",
};

async function openForm(page: Page) {
  await page.goto("/inspecciones/nueva");
  // Espera a que React hidrate la página; antes, lo escrito podría perderse.
  await expect(page.locator("main[data-ready='true']")).toBeVisible();
}

async function fillForm(page: Page, values: typeof FORM = FORM) {
  await page.getByTestId("field-location").fill(values.location);
  await page.getByTestId("field-summary").fill(values.summary);
  await page.getByTestId("field-inspector").fill(values.inspector);
  await page.getByTestId("field-findings").fill(values.findings);
  await page.getByTestId("field-date").fill(values.date);
}

function watchSyncRequests(page: Page) {
  const urls: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/sync")) urls.push(req.method());
  });
  return urls;
}

test.beforeEach(async ({ request }) => {
  // Cada prueba empieza con el servidor de demostración vacío.
  const response = await request.delete("/api/sync");
  expect(response.ok()).toBe(true);
});

test("flujo completo: guarda sin conexión, recarga, reconecta y sincroniza", async ({
  page,
  context,
  request,
}) => {
  const syncRequests = watchSyncRequests(page);
  await openForm(page);

  // 1. Sin conexión: guardar funciona y no toca la red.
  await context.setOffline(true);
  await fillForm(page);
  await page.getByTestId("submit-inspection").click();

  await expect(page.getByTestId("save-message")).toBeVisible();
  await expect(page.getByTestId("queue-item")).toHaveCount(1);
  await expect(page.getByTestId("queue-status")).toHaveText("Pendiente");
  expect(syncRequests).toHaveLength(0);

  // 2. Sincronizar sin conexión falla, pero no se pierde nada.
  await page.getByTestId("sync-now").click();
  await expect(page.getByTestId("queue-status")).toHaveText(
    "Falló — se reintentará"
  );
  const beforeReconnect = await (await request.get("/api/sync")).json();
  expect(beforeReconnect.count).toBe(0);

  // 3. Se recupera la conexión y se recarga: la inspección sigue ahí.
  await context.setOffline(false);
  await page.reload();
  await expect(page.locator("main[data-ready='true']")).toBeVisible();
  await expect(page.getByTestId("queue-item")).toHaveCount(1);
  await expect(page.getByTestId("queue-summary")).toHaveText(FORM.summary);
  const clientId = await page
    .getByTestId("queue-item")
    .getAttribute("data-client-id");
  expect(clientId).toBeTruthy();

  // 4. Con conexión, sincronizar funciona.
  await page.getByTestId("sync-now").click();
  await expect(page.getByTestId("queue-status")).toHaveText("Sincronizado");
  await expect(page.getByTestId("sync-message")).toBeVisible();

  // 5. El servidor recibió exactamente una vez la inspección.
  const afterSync = await (await request.get("/api/sync")).json();
  expect(afterSync.count).toBe(1);
  expect(afterSync.items[0].clientId).toBe(clientId);
  expect(afterSync.items[0].payload.location).toBe(FORM.location);
  expect(afterSync.items[0].writes).toBe(1);
});

test("ubicación denegada: avisa y la captura se completa igual", async ({
  page,
}) => {
  // Se simula que el usuario negó el permiso antes de que cargue la página.
  await page.addInitScript(() => {
    const denied = {
      code: 1,
      message: "User denied Geolocation",
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (
          _success: unknown,
          error?: (e: typeof denied) => void
        ) => error?.(denied),
        watchPosition: () => 0,
        clearWatch: () => undefined,
      },
    });
  });

  await openForm(page);
  await page.getByTestId("use-location").click();
  await expect(page.getByTestId("location-status")).toContainText(/denegado/i);

  await fillForm(page);
  await page.getByTestId("submit-inspection").click();
  await expect(page.getByTestId("queue-item")).toHaveCount(1);
  await expect(page.getByTestId("queue-status")).toHaveText("Pendiente");
});

test("ubicación ausente: avisa y la captura se completa igual", async ({
  page,
}) => {
  // Se simula un dispositivo sin geolocalización.
  await page.addInitScript(() => {
    delete (Navigator.prototype as unknown as Record<string, unknown>)
      .geolocation;
  });

  await openForm(page);
  await page.getByTestId("use-location").click();
  await expect(page.getByTestId("location-status")).toContainText(
    /no disponible/i
  );

  await fillForm(page);
  await page.getByTestId("submit-inspection").click();
  await expect(page.getByTestId("queue-item")).toHaveCount(1);
});

test("captura inválida: muestra los errores y no guarda nada", async ({
  page,
}) => {
  const syncRequests = watchSyncRequests(page);
  await openForm(page);

  await fillForm(page, {
    location: "ab", // menos de 3 caracteres
    summary: "",
    inspector: "",
    findings: "1000", // más de 999
    date: "2099-01-01", // futura
  });
  await page.getByTestId("submit-inspection").click();

  for (const field of [
    "location",
    "summary",
    "inspector",
    "findings",
    "date",
  ]) {
    await expect(page.getByTestId(`error-${field}`)).toBeVisible();
  }
  await expect(page.getByTestId("queue-item")).toHaveCount(0);
  await expect(page.getByTestId("save-message")).toHaveCount(0);
  expect(syncRequests).toHaveLength(0);
});
