import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";

type ManifestIcon = {
  src: string;
  sizes: string;
  type?: string;
  purpose?: string;
};

type WebManifest = {
  name: string;
  short_name: string;
  start_url: string;
  display: string;
  icons: ManifestIcon[];
};

const root = resolve(import.meta.dirname, "..");

const manifestPath = resolve(root, "public/manifest.webmanifest");
const manifest: WebManifest = JSON.parse(await readFile(manifestPath, "utf8"));

assert.ok(manifest.name?.length > 0, "manifest.name es obligatorio");
assert.ok(manifest.short_name?.length > 0, "manifest.short_name es obligatorio");
assert.equal(manifest.start_url, "/", "start_url debe apuntar a la raíz");
assert.equal(manifest.display, "standalone", "display debe ser 'standalone' para instalabilidad");
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2, "se requieren al menos 2 iconos");

const sizes = manifest.icons.map((icon) => icon.sizes);
assert.ok(sizes.includes("192x192"), "falta un icono de 192x192");
assert.ok(sizes.includes("512x512"), "falta un icono de 512x512");

for (const icon of manifest.icons) {
  await access(resolve(root, "public", icon.src.replace(/^\//, "")));
}

const layout: string = await readFile(resolve(root, "src/app/layout.tsx"), "utf8");
assert.match(layout, /manifest:\s*["'`]\/manifest\.webmanifest["'`]/, "layout.tsx debe enlazar el manifest");

const appShell: string = await readFile(resolve(root, "src/components/app-shell.tsx"), "utf8");
for (const state of ["loading", "error", "empty", "ready"]) {
  assert.match(appShell, new RegExp(state), `app-shell.tsx debe manejar el estado "${state}"`);
}

console.log("manifest.spec.ts: PASS");