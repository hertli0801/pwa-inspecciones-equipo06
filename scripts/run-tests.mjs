// Ejecuta los specs de tests/unit y tests/integration, uno por uno,
// y guarda un resumen en reports/. Uso: node scripts/run-tests.mjs unit|integration|all
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const mode = process.argv[2] ?? "all";
const DIRS = {
  unit: ["tests/unit"],
  integration: ["tests/integration"],
  all: ["tests/unit", "tests/integration"],
};

if (!DIRS[mode]) {
  console.error(`Modo desconocido: ${mode}. Usa unit, integration o all.`);
  process.exit(2);
}

function collect(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return collect(path);
    return path.endsWith(".spec.ts") ? [path] : [];
  });
}

const files = DIRS[mode].flatMap(collect).sort();

if (files.length === 0) {
  console.warn(`AVISO: no hay specs para "${mode}" todavia.`);
  process.exit(0);
}

const results = [];
for (const file of files) {
  console.log(`\n=== ${file} ===`);
  const started = Date.now();
  const run = spawnSync(process.execPath, ["--import", "tsx", file], {
    stdio: "inherit",
  });
  results.push({ file, ok: run.status === 0, ms: Date.now() - started });
}

mkdirSync("reports", { recursive: true });
writeFileSync(
  join("reports", `tests-${mode}.json`),
  JSON.stringify({ mode, results }, null, 2)
);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} specs en PASS`);
for (const r of failed) console.error(`FAIL: ${r.file}`);
process.exit(failed.length ? 1 : 0);