import assert from "node:assert/strict";
import type { InspectionPayload, QueuedInspection } from "../../src/lib/storage/schema";
import { createMemoryStorage, SyncQueue, type SyncFn } from "../../src/lib/sync/queue";
import { createServerStore } from "../../src/lib/sync/server-store";
import { handleSyncGet, handleSyncPost } from "../../src/lib/sync/handlers";
import { createHttpSync } from "../../src/lib/sync/http-sync";

const tests: Array<[string, () => void | Promise<void>]> = [];

function test(name: string, fn: () => void | Promise<void>) {
  tests.push([name, fn]);
}

const payload: InspectionPayload = {
  location: "Laboratorio de Redes",
  summary: "Revisión sintética de prueba",
  inspector: "Técnica A",
  findings: 2,
  date: "2026-10-20",
};

// SyncFn falsa que siempre responde bien y registra qué se envió.
function okSync() {
  const sent: string[] = [];
  const fn: SyncFn = async (item) => {
    sent.push(item.clientId);
    return { ok: true, serverId: `srv-${item.clientId}`, updatedAt: "2026-10-24T18:00:00.000Z" };
  };
  return { fn, sent };
}

const failSync: SyncFn = async () => ({ ok: false, reason: "http-503" });

function newQueue() {
  return new SyncQueue(createMemoryStorage());
}

// --- Reglas de la cola ---

test("enqueue deja la inspección pendiente, versión 1 y sin intentos", () => {
  const item = newQueue().enqueue(payload);
  assert.equal(item.status, "pending");
  assert.equal(item.version, 1);
  assert.equal(item.attempts, 0);
});

test("syncAll con éxito marca synced y guarda el serverId", async () => {
  const queue = newQueue();
  const item = queue.enqueue(payload);
  await queue.syncAll(okSync().fn);
  const [after] = queue.list();
  assert.equal(after.status, "synced");
  assert.equal(after.serverId, `srv-${item.clientId}`);
});

test("syncAll con fallo marca failed y suma un intento", async () => {
  const queue = newQueue();
  queue.enqueue(payload);
  await queue.syncAll(failSync);
  const [after] = queue.list();
  assert.equal(after.status, "failed");
  assert.equal(after.attempts, 1);
});

test("una excepción en la SyncFn cuenta como fallo y no rompe la cola", async () => {
  const queue = newQueue();
  queue.enqueue(payload);
  await queue.syncAll(async () => {
    throw new Error("sin red");
  });
  const [after] = queue.list();
  assert.equal(after.status, "failed");
  assert.equal(queue.list().length, 1);
});

test("un elemento failed se reintenta en el siguiente syncAll", async () => {
  const queue = newQueue();
  queue.enqueue(payload);
  await queue.syncAll(failSync);
  const remote = okSync();
  await queue.syncAll(remote.fn);
  assert.equal(remote.sent.length, 1);
  assert.equal(queue.list()[0].status, "synced");
});

test("syncAll no vuelve a enviar lo que ya está synced", async () => {
  const queue = newQueue();
  const first = queue.enqueue(payload);
  await queue.syncAll(okSync().fn);
  const second = queue.enqueue({ ...payload, location: "Laboratorio de Química" });
  const remote = okSync();
  await queue.syncAll(remote.fn);
  assert.deepEqual(remote.sent, [second.clientId]);
  assert.notEqual(remote.sent[0], first.clientId);
});

test("tres syncAll seguidos envían la inspección una sola vez", async () => {
  const queue = newQueue();
  queue.enqueue(payload);
  const remote = okSync();
  await queue.syncAll(remote.fn);
  await queue.syncAll(remote.fn);
  await queue.syncAll(remote.fn);
  assert.equal(remote.sent.length, 1);
});

test("update vuelve a pending y sube la versión", async () => {
  const queue = newQueue();
  const item = queue.enqueue(payload);
  await queue.syncAll(okSync().fn);
  queue.update(item.clientId, { findings: 5 });
  const [after] = queue.list();
  assert.equal(after.status, "pending");
  assert.equal(after.version, 2);
  assert.equal(after.payload.findings, 5);
});

test("si se edita mientras se sincroniza, no se marca synced la versión vieja", async () => {
  const queue = newQueue();
  const item = queue.enqueue(payload);
  await queue.syncAll(async (sent: QueuedInspection) => {
    queue.update(sent.clientId, { findings: 9 });
    return { ok: true, serverId: "srv-x", updatedAt: "2026-10-24T18:00:00.000Z" };
  });
  const [after] = queue.list();
  assert.equal(after.clientId, item.clientId);
  assert.equal(after.status, "pending");
  assert.equal(after.version, 2);
});

// --- Idempotencia en el servidor ---

test("el servidor guarda una sola vez el mismo clientId aunque llegue dos veces", () => {
  const store = createServerStore();
  assert.equal(store.upsert("c-1", 1, payload).created, true);
  assert.equal(store.upsert("c-1", 1, payload).created, false);
  assert.equal(store.count(), 1);
  assert.equal(store.list()[0].writes, 2);
});

test("el servidor guarda por separado clientId distintos", () => {
  const store = createServerStore();
  store.upsert("c-1", 1, payload);
  store.upsert("c-2", 1, payload);
  assert.equal(store.count(), 2);
});

test("una versión vieja que llega tarde no pisa a la nueva", () => {
  const store = createServerStore();
  store.upsert("c-1", 2, { ...payload, findings: 7 });
  store.upsert("c-1", 1, { ...payload, findings: 1 });
  const [record] = store.list();
  assert.equal(record.version, 2);
  assert.equal(record.payload.findings, 7);
});

test("POST sin clientId responde 400 y no guarda nada", () => {
  const store = createServerStore();
  const result = handleSyncPost(store, { payload });
  assert.equal(result.status, 400);
  assert.deepEqual(result.body, { ok: false, reason: "missing-clientId" });
  assert.equal(store.count(), 0);
});

test("POST con payload incompleto responde 400", () => {
  const store = createServerStore();
  const result = handleSyncPost(store, { clientId: "c-1", payload: { location: "Lab" } });
  assert.equal(result.status, 400);
  assert.equal(store.count(), 0);
});

test("GET en el estado inicial responde count 0 e items vacío", () => {
  const result = handleSyncGet(createServerStore());
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { count: 0, items: [] });
});

// --- Envío HTTP ---

test("http-sync sin red devuelve ok:false en lugar de lanzar", async () => {
  const sync = createHttpSync({
    fetchFn: (async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof fetch,
  });
  const item = newQueue().enqueue(payload);
  assert.deepEqual(await sync(item), { ok: false, reason: "network-error" });
});

test("http-sync convierte un 503 en ok:false con el código", async () => {
  const sync = createHttpSync({
    fetchFn: (async () => Response.json({ ok: false }, { status: 503 })) as typeof fetch,
  });
  const item = newQueue().enqueue(payload);
  assert.deepEqual(await sync(item), { ok: false, reason: "http-503" });
});

let passed = 0;
let failed = 0;
for (const [name, fn] of tests) {
  try {
    await fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (error) {
    failed++;
    console.log(`  FAIL ${name}`);
    console.log(`       ${(error as Error).message}`);
  }
}

console.log(`\nsync-queue-rules.spec.ts: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
