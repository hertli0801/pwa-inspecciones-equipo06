import assert from "node:assert/strict";
import { captureInspection } from "../../src/lib/sync/capture-flow";
import { createHttpSync } from "../../src/lib/sync/http-sync";
import { createMemoryStorage, SyncQueue } from "../../src/lib/sync/queue";
import { NOW, validInput, withFields } from "../fixtures/data";
import { createFakeRemote } from "../fixtures/remote";

// Reintentar la sincronización de la misma operación no debe crear
// duplicados, ni en la cola ni en el servidor.

const tests: Array<[string, () => void | Promise<void>]> = [];

function test(name: string, fn: () => void | Promise<void>) {
  tests.push([name, fn]);
}

function setup() {
  const remote = createFakeRemote();
  const queue = new SyncQueue(createMemoryStorage());
  const sync = createHttpSync({ fetchFn: remote.fetch });
  return { remote, queue, sync };
}

test("reintentar la misma operación no crea un duplicado en el servidor", async () => {
  const { remote, queue, sync } = setup();
  const result = captureInspection(queue, validInput, NOW);
  assert.ok(result.ok);

  // Se envía la misma operación dos veces a mano (p. ej. doble clic).
  await sync(result.item);
  await sync(result.item);

  assert.equal(remote.store.count(), 1);
  assert.equal(remote.store.list()[0].writes, 2);
});

test("si la respuesta se pierde después de que el servidor guardó, el reintento no duplica", async () => {
  const { remote, queue, sync } = setup();
  captureInspection(queue, validInput, NOW);

  remote.state.loseResponseNext = 1;
  await queue.syncAll(sync);
  // El servidor ya la tiene, pero el cliente cree que falló.
  assert.equal(remote.store.count(), 1);
  assert.equal(queue.list()[0].status, "failed");

  await queue.syncAll(sync);
  assert.equal(queue.list()[0].status, "synced");
  assert.equal(remote.store.count(), 1);
  assert.equal(remote.state.calls, 2);
});

test("tras un 503 se reintenta y cada inspección queda una sola vez en el servidor", async () => {
  const { remote, queue, sync } = setup();
  captureInspection(queue, validInput, NOW);
  captureInspection(queue, withFields({ location: "Laboratorio de Química" }), NOW);

  remote.state.failNext = 2;
  await queue.syncAll(sync);
  assert.deepEqual(queue.list().map((i) => i.status), ["failed", "failed"]);
  assert.equal(remote.store.count(), 0);

  await queue.syncAll(sync);
  await queue.syncAll(sync);
  assert.deepEqual(queue.list().map((i) => i.status), ["synced", "synced"]);
  assert.equal(remote.store.count(), 2);
  assert.ok(remote.store.list().every((record) => record.writes === 1));
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

console.log(`\nsync-idempotency.spec.ts: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
