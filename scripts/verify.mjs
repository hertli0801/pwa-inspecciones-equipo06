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
  "docs/cache-strategy.md",
  "src/lib/pwa/register-service-worker.ts",
  "src/components/register-service-worker.tsx",
  "tests/service-worker.spec.ts",
  "tests/offline.spec.ts"
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

