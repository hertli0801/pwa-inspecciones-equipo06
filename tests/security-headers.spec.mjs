// Pruebas de headers de seguridad, robots.txt y service worker — Semana 9.
// Corre con node, sin TypeScript: node tests/security-headers.spec.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import vm from "node:vm";
import { buildCsp, securityHeaders } from "../src/lib/security/headers.mjs";

const root = resolve(import.meta.dirname, "..");
const ORIGIN = "http://localhost:3000";

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

const headerMap = (list) => new Map(list.map(({ key, value }) => [key.toLowerCase(), value]));
const directive = (csp, name) =>
  csp
    .split(";")
    .map((part) => part.trim())
    .find((part) => part === name || part.startsWith(`${name} `));

// --- CSP ---

test("CSP de producción es restrictiva y no permite 'unsafe-eval'", () => {
  const csp = buildCsp({ dev: false });
  assert.equal(directive(csp, "default-src"), "default-src 'self'");
  assert.equal(directive(csp, "object-src"), "object-src 'none'");
  assert.equal(directive(csp, "frame-ancestors"), "frame-ancestors 'none'");
  assert.equal(directive(csp, "base-uri"), "base-uri 'self'");
  assert.equal(directive(csp, "form-action"), "form-action 'self'");
  assert.equal(directive(csp, "connect-src"), "connect-src 'self'");
  assert.equal(directive(csp, "worker-src"), "worker-src 'self'");
  assert.ok(!csp.includes("'unsafe-eval'"), "producción no debe permitir eval");
  assert.ok(!/\bws:|\bwss:/.test(csp), "producción no debe abrir websockets");
  assert.ok(!csp.includes("*"), "ninguna directiva debe usar comodines");
  assert.ok(!csp.includes("upgrade-insecure-requests"), "no va por defecto (rompe http://localhost)");
});

test("CSP de desarrollo permite 'unsafe-eval' y websockets para el refresco en caliente", () => {
  const csp = buildCsp({ dev: true });
  assert.ok(directive(csp, "script-src").includes("'unsafe-eval'"));
  assert.ok(directive(csp, "connect-src").includes("ws:"));
  assert.equal(directive(csp, "object-src"), "object-src 'none'");
});

// --- Headers ---

test("headers básicos: nosniff, DENY y Referrer-Policy", () => {
  const headers = headerMap(securityHeaders({ dev: false }));
  assert.equal(headers.get("x-content-type-options"), "nosniff");
  assert.equal(headers.get("x-frame-options"), "DENY");
  assert.equal(headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.equal(headers.get("content-security-policy"), buildCsp({ dev: false }));
});

test("Strict-Transport-Security de al menos un año y COOP same-origin", () => {
  const headers = headerMap(securityHeaders({ dev: false }));
  const maxAge = Number(headers.get("strict-transport-security").match(/max-age=(\d+)/)?.[1]);
  assert.ok(maxAge >= 31536000, "HSTS debe durar al menos un año");
  assert.equal(headers.get("cross-origin-opener-policy"), "same-origin");
});

test("Permissions-Policy solo concede lo que la app usa", () => {
  const policy = headerMap(securityHeaders()).get("permissions-policy");
  for (const off of ["microphone=()", "payment=()", "usb=()"]) {
    assert.ok(policy.includes(off), `debe apagar ${off}`);
  }
  // La pantalla de captura usa cámara y ubicación: solo para el propio origen.
  assert.ok(policy.includes("camera=(self)"));
  assert.ok(policy.includes("geolocation=(self)"));
  assert.ok(!policy.includes("*"), "ningún permiso abierto a cualquier origen");
});

// --- next.config ---

test("next.config aplica headers a /:path*, apaga poweredByHeader y no cachea /sw.js", async () => {
  const { default: config } = await import("../next.config.mjs");
  assert.equal(config.poweredByHeader, false);
  assert.equal(config.reactStrictMode, true);

  const rules = await config.headers();
  const all = rules.find((rule) => rule.source === "/:path*");
  assert.ok(all, "debe existir una regla para /:path*");
  const headers = headerMap(all.headers);
  assert.ok(headers.has("content-security-policy"));
  assert.equal(headers.get("x-frame-options"), "DENY");

  const sw = rules.find((rule) => rule.source === "/sw.js");
  assert.ok(sw, "debe existir una regla para /sw.js");
  assert.equal(headerMap(sw.headers).get("cache-control"), "no-cache");
});

// --- robots.txt ---

test("robots.txt pide no rastrear /api/ ni /inspecciones/", async () => {
  const robots = await readFile(resolve(root, "public/robots.txt"), "utf8");
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Disallow: \/api\/$/m);
  assert.match(robots, /^Disallow: \/inspecciones\/$/m);
});

// --- Service worker en un contexto aislado (node:vm) ---

const swSource = await readFile(resolve(root, "public/sw.js"), "utf8");

function loadServiceWorker(networkFetch) {
  const store = new Map();
  const keyOf = (request) => (typeof request === "string" ? request : request.url);
  const caches = {
    async open(name) {
      if (!store.has(name)) store.set(name, new Map());
      const cacheMap = store.get(name);
      return {
        async addAll(urls) {
          for (const url of urls) cacheMap.set(url, { url, body: `precached:${url}` });
        },
        async put(request, response) {
          cacheMap.set(keyOf(request), response);
        },
      };
    },
    async keys() {
      return [...store.keys()];
    },
    async delete(name) {
      return store.delete(name);
    },
    async match(request) {
      for (const cacheMap of store.values()) {
        if (cacheMap.has(keyOf(request))) return cacheMap.get(keyOf(request));
      }
      return undefined;
    },
  };
  const listeners = {};
  const self = {
    location: { origin: ORIGIN },
    addEventListener(type, handler) {
      (listeners[type] ??= []).push(handler);
    },
    skipWaiting() {},
    clients: { claim: async () => {} },
  };
  const context = vm.createContext({ self, caches, fetch: networkFetch, URL, console });
  vm.runInContext(swSource, context, { filename: "public/sw.js" });
  return { listeners, store, context };
}

function dispatchFetch(listeners, request) {
  let response;
  const event = {
    request,
    respondWith(promise) {
      response = promise;
    },
  };
  listeners.fetch[0](event);
  return response;
}

const fakeResponse = (url, { status = 200, type = "basic" } = {}) => ({
  url,
  status,
  ok: status >= 200 && status < 300,
  type,
  body: `live:${url}`,
  clone() {
    return { ...this };
  },
});

const cachedUrls = (store) => [...store.values()].flatMap((cacheMap) => [...cacheMap.keys()]);

test("el SW no intercepta /api/, otros orígenes ni métodos distintos de GET", () => {
  let networkCalls = 0;
  const { listeners } = loadServiceWorker(async (request) => {
    networkCalls += 1;
    return fakeResponse(request.url);
  });
  const ignored = [
    { url: `${ORIGIN}/api/sync`, method: "GET", mode: "cors" },
    { url: `${ORIGIN}/api/sync?since=0`, method: "GET", mode: "navigate" },
    { url: "https://cdn.ejemplo.test/lib.js", method: "GET", mode: "no-cors" },
    { url: `${ORIGIN}/api/sync`, method: "POST", mode: "cors" },
    { url: `${ORIGIN}/inspecciones`, method: "DELETE", mode: "same-origin" },
  ];
  for (const request of ignored) {
    assert.equal(
      dispatchFetch(listeners, request),
      undefined,
      `${request.method} ${request.url} no debe pasar por respondWith`
    );
  }
  assert.equal(networkCalls, 0, "el SW no debe pedir nada a la red por estas peticiones");
});

test("el SW sí cachea assets propios con respuesta correcta", async () => {
  const { listeners, store } = loadServiceWorker(async (request) => fakeResponse(request.url));
  const url = `${ORIGIN}/_next/static/chunks/app.js`;
  const response = await dispatchFetch(listeners, { url, method: "GET", mode: "no-cors" });
  assert.equal(response.body, `live:${url}`);
  assert.ok(cachedUrls(store).includes(url), "un asset 200 del mismo origen debe quedar en caché");
});

test("el SW no cachea errores 5xx ni respuestas opacas", async () => {
  const { listeners, store } = loadServiceWorker(async (request) =>
    request.url.endsWith("/opaco.png")
      ? fakeResponse(request.url, { status: 0, type: "opaque" })
      : fakeResponse(request.url, { status: 500 })
  );
  const page = `${ORIGIN}/inspecciones`;
  const asset = `${ORIGIN}/icons/opaco.png`;
  const pageResponse = await dispatchFetch(listeners, { url: page, method: "GET", mode: "navigate" });
  const assetResponse = await dispatchFetch(listeners, { url: asset, method: "GET", mode: "no-cors" });
  assert.equal(pageResponse.status, 500, "el error se entrega al usuario tal cual");
  assert.equal(assetResponse.type, "opaque");
  assert.deepEqual(cachedUrls(store), [], "ninguna de las dos respuestas debe guardarse");
});

test("la versión de caché es v2 o mayor y activate borra la v1", async () => {
  const match = swSource.match(/const CACHE_VERSION = "v(\d+)"/);
  assert.ok(match, "sw.js debe declarar CACHE_VERSION");
  assert.ok(Number(match[1]) >= 2, "la versión debe ser v2 o mayor para descartar la caché v1");

  const { listeners, store } = loadServiceWorker(async () => {
    throw new Error("sin red");
  });
  store.set("inspecciones-cache-v1", new Map([[`${ORIGIN}/api/sync`, {}]]));
  const pending = [];
  listeners.activate[0]({ waitUntil: (promise) => pending.push(promise) });
  await Promise.all(pending);
  assert.ok(!store.has("inspecciones-cache-v1"), "activate debe borrar la caché v1");
});

let passed = 0;
for (const { name, fn } of tests) {
  try {
    await fn();
    passed += 1;
    console.log(`  ok - ${name}`);
  } catch (error) {
    console.error(`  FALLA - ${name}`);
    console.error(error);
  }
}

if (passed !== tests.length) {
  console.error(`${passed}/${tests.length} pruebas de headers y service worker en PASS`);
  process.exit(1);
}
console.log(`${passed}/${tests.length} pruebas de headers y service worker en PASS`);
