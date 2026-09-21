import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import vm from "node:vm";

const root = resolve(import.meta.dirname, "..");
const swSource: string = await readFile(resolve(root, "public/sw.js"), "utf8");

function createFakeCaches() {
  const store = new Map<string, Map<string, any>>();
  const keyOf = (request: any) => (typeof request === "string" ? request : request.url);

  const caches = {
    async open(name: string) {
      if (!store.has(name)) store.set(name, new Map());
      const cacheMap = store.get(name)!;
      return {
        async addAll(urls: string[]) {
          for (const url of urls) cacheMap.set(url, { url, body: `precached:${url}` });
        },
        async put(request: any, response: any) {
          cacheMap.set(keyOf(request), response);
        },
        async match(request: any) {
          return cacheMap.get(keyOf(request));
        },
      };
    },
    async keys() {
      return [...store.keys()];
    },
    async delete(name: string) {
      return store.delete(name);
    },
    async match(request: any) {
      const key = keyOf(request);
      for (const cacheMap of store.values()) {
        if (cacheMap.has(key)) return cacheMap.get(key);
      }
      return undefined;
    },
  };

  return { caches, store };
}

function createFetchEvent(request: any) {
  let responsePromise: Promise<any> | undefined;
  return {
    request,
    respondWith(p: Promise<any>) {
      responsePromise = p;
    },
    get response() {
      return responsePromise;
    },
  };
}

const fakeResponse = (url: string) => ({
  url,
  body: `live:${url}`,
  clone() {
    return { ...this };
  },
});

// Bandera mutable para simular que la red sube y baja durante la prueba.
let networkOnline = true;
async function networkFetch(request: any) {
  if (!networkOnline) throw new TypeError("network down (simulado)");
  return fakeResponse(request.url);
}

const { caches, store } = createFakeCaches();
const listeners: Record<string, Function[]> = {};
const self = {
  addEventListener(type: string, handler: Function) {
    (listeners[type] ??= []).push(handler);
  },
  skipWaiting() {},
  clients: { claim: async () => {} },
};
const context = vm.createContext({ self, caches, fetch: networkFetch, console });
vm.runInContext(swSource, context, { filename: "public/sw.js" });

// Precachear primero (instala + activa), igual que en un arranque real.
const installEvent = { waitUntil: (p: Promise<any>) => p, settled: () => Promise.resolve() };
await Promise.resolve(listeners.install[0]({ waitUntil: (p: any) => p }));

// --- A. navigate + red disponible: sirve de la red y la guarda en cache ---
networkOnline = true;
{
  const event = createFetchEvent({ url: "/inspeccion/1", method: "GET", mode: "navigate" });
  listeners.fetch[0](event);
  const response = await event.response;
  assert.equal(response.body, "live:/inspeccion/1", "con red disponible debe servir la respuesta de red");
  assert.ok(store.get("inspecciones-cache-v1")!.has("/inspeccion/1"), "la respuesta de red debe guardarse en cache");
}

// --- B. navigate + sin red + URL nunca visitada: cae al offline.html ---
networkOnline = false;
{
  const event = createFetchEvent({ url: "/inspeccion/2", method: "GET", mode: "navigate" });
  listeners.fetch[0](event);
  const response = await event.response;
  assert.equal(response.body, "precached:/offline.html", "sin red y sin cache debe caer a offline.html");
}

// --- C. navigate + sin red + URL ya cacheada (de A): sirve el cache, no offline.html ---
networkOnline = false;
{
  const event = createFetchEvent({ url: "/inspeccion/1", method: "GET", mode: "navigate" });
  listeners.fetch[0](event);
  const response = await event.response;
  assert.equal(response.body, "live:/inspeccion/1", "sin red pero con cache previo debe servir el cache, no el offline");
}

// --- D. asset (no navigate) + sin red + no cacheado: también cae a offline.html ---
networkOnline = false;
{
  const event = createFetchEvent({ url: "/icons/nuevo.png", method: "GET", mode: "no-cors" });
  listeners.fetch[0](event);
  const response = await event.response;
  assert.equal(response.body, "precached:/offline.html", "un asset sin red y sin cache también cae a offline.html");
}

// --- E. método distinto de GET: el service worker no debe intervenir ---
{
  const event = createFetchEvent({ url: "/api/inspecciones", method: "POST", mode: "same-origin" });
  listeners.fetch[0](event);
  assert.equal(event.response, undefined, "las peticiones que no son GET no deben pasar por respondWith");
}

console.log("offline.spec.ts: PASS");