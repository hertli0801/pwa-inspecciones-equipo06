import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const required = [
  "package.json",
  "package-lock.json",
  "src/app/layout.tsx",
  "src/app/page.tsx",
  "src/app/globals.css",
  "src/lib/data/inspections.ts",
  "docs/requirements.md",
  "docs/decision-record.md",
  "tests/starter.spec.mjs",
  "evidence/individual.md",
  "public/manifest.webmanifest",
  "public/icons/icon-192.png",
  "public/icons/icon-512.png",
  "src/components/app-shell.tsx",
  "tests/manifest.spec.ts",
  "README.md",
  "public/sw.js",
  "public/offline.html",
  "src/lib/pwa/register-service-worker.ts",
  "docs/cache-strategy.md",
  "tests/service-worker.spec.ts",
  "tests/offline.spec.ts",
  "src/app/inspecciones/page.tsx",
  "src/app/inspecciones/[id]/page.tsx",
  "src/app/inspecciones/loading.tsx",
  "src/app/inspecciones/error.tsx",
  "src/components/loading-state.tsx",
  "docs/rendering-decision.md",
  "tests/rendering.spec.ts",
  "src/lib/device/camera.ts",
  "src/lib/device/geolocation.ts",
  "src/lib/notifications/client.ts",
  "docs/capabilities.md",
  "tests/capabilities.spec.ts",

  // Semana 8: pruebas automatizadas y CI
  "Makefile",
  ".eslintrc.json",
  "playwright.config.ts",
  "scripts/run-tests.mjs",
  "docs/test-strategy.md",
  ".github/workflows/academic-evaluation.yml",
  "tests/unit/sync-queue-rules.spec.ts",
  "tests/unit/validate-inspection.spec.ts",
  "tests/integration/offline-persistence.spec.ts",
  "tests/integration/sync-idempotency.spec.ts",
  "tests/e2e/capture-sync.spec.ts"

];

const missing = required.filter((file) => !existsSync(resolve(root, file)));
const result = {
  schemaVersion: 1,
  checkedAt: new Date().toISOString(),
  status: missing.length === 0 ? "pass" : "fail",
  missing
};

const report = resolve(root, "reports/verification.json");
mkdirSync(dirname(report), { recursive: true });
writeFileSync(report, `${JSON.stringify(result, null, 2)}\n`);

if (missing.length > 0) {
  console.error(`Faltan ${missing.length} artefactos: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Starter verificable: PASS");
console.log(`Reporte: ${report}`);

