import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import vm from "node:vm";

const root = resolve(import.meta.dirname, "..");
const swSource: string = await readFile(resolve(root, "public/sw.js"), "utf8");

// --- Harness: un "self" y un "caches" falsos que imitan lo mínimo del
// entorno real de un Service Worker, para ejecutar el código REAL de
// sw.js (no una copia de su comportamiento) dentro de un sandbox de node:vm.

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

function createFakeSelf() {
  const listeners: Record<string, Function[]> = {};
  const calls = { skipWaiting: 0, clientsClaim: 0 };

  const self = {
    addEventListener(type: string, handler: Function) {
      (listeners[type] ??= []).push(handler);
    },
    skipWaiting() {
      calls.skipWaiting += 1;
    },
    clients: {
      async claim() {
        calls.clientsClaim += 1;
      },
    },
  };

  return { self, listeners, calls };
}

function createLifecycleEvent() {
  const promises: Promise<any>[] = [];
  return {
    waitUntil(p: Promise<any>) {
      promises.push(p);
    },
    settled: () => Promise.all(promises),
  };
}

async function runInSandbox(networkFetch: (request: any) => Promise<any>) {
  const { caches, store } = createFakeCaches();
  const { self, listeners, calls } = createFakeSelf();
  const context = vm.createContext({ self, caches, fetch: networkFetch, console });
  vm.runInContext(swSource, context, { filename: "public/sw.js" });
  return { listeners, store, calls };
}

const notCalled = async () => {
  throw new Error("La red no debería llamarse en esta prueba");
};

// --- 1. install: debe precachear los assets estáticos ---
{
  const { listeners, store } = await runInSandbox(notCalled);
  assert.ok(listeners.install?.length, "sw.js debe registrar un listener de 'install'");

  const installEvent = createLifecycleEvent();
  listeners.install[0](installEvent);
  await installEvent.settled();

  const cacheNames = [...store.keys()];
  assert.deepEqual(cacheNames, ["inspecciones-cache-v1"], "install debe crear el cache de la versión actual");

  const precached = store.get("inspecciones-cache-v1")!;
  for (const url of ["/", "/offline.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"]) {
    assert.ok(precached.has(url), `install debe precachear "${url}"`);
  }
}

// --- 2. activate: debe borrar versiones viejas y llamar a clients.claim() ---
{
  const { listeners, store, calls } = await runInSandbox(notCalled);
  store.set("inspecciones-cache-v0-vieja", new Map());
  store.set("inspecciones-cache-v1", new Map());

  assert.ok(listeners.activate?.length, "sw.js debe registrar un listener de 'activate'");
  const activateEvent = createLifecycleEvent();
  listeners.activate[0](activateEvent);
  await activateEvent.settled();

  assert.ok(!store.has("inspecciones-cache-v0-vieja"), "activate debe borrar caches de versiones anteriores");
  assert.ok(store.has("inspecciones-cache-v1"), "activate NO debe borrar el cache de la versión actual");
  assert.equal(calls.clientsClaim, 1, "activate debe llamar a self.clients.claim()");
}

// --- 3. message: SKIP_WAITING debe invocar self.skipWaiting() ---
{
  const { listeners, calls } = await runInSandbox(notCalled);
  assert.ok(listeners.message?.length, "sw.js debe registrar un listener de 'message'");

  listeners.message[0]({ data: { type: "SKIP_WAITING" } });
  assert.equal(calls.skipWaiting, 1, "el mensaje SKIP_WAITING debe invocar self.skipWaiting()");
}

console.log("service-worker.spec.ts: PASS");