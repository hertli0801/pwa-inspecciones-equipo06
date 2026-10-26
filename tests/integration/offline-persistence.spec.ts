import assert from "node:assert/strict";
import { captureInspection } from "../../src/lib/sync/capture-flow";
import { createHttpSync } from "../../src/lib/sync/http-sync";
import { createMemoryStorage, SyncQueue } from "../../src/lib/sync/queue";
import { NOW, validInput } from "../fixtures/data";
import { createFakeRemote } from "../fixtures/remote";

// Integra captura → cola → almacenamiento → http-sync → handlers → almacén
// del servidor. Solo se reemplaza la red por el remoto falso.

const tests: Array<[string, () => void | Promise<void>]> = [];

function test(name: string, fn: () => void | Promise<void>) {
  tests.push([name, fn]);
}

test("guardar sin conexión persiste la inspección y no toca la red", () => {
  const remote = createFakeRemote();
  remote.state.offline = true;
  const storage = createMemoryStorage();

  const result = captureInspection(new SyncQueue(storage), validInput, NOW);

  assert.equal(result.ok, true);
  assert.equal(remote.state.calls, 0);
  const saved = new SyncQueue(storage).list();
  assert.equal(saved.length, 1);
  assert.equal(saved[0].status, "pending");
  assert.equal(saved[0].payload.location, "Laboratorio de Redes");
});

test("al recargar (nueva cola sobre el mismo almacenamiento) la inspección sigue ahí", () => {
  const storage = createMemoryStorage();
  const result = captureInspection(new SyncQueue(storage), validInput, NOW);
  assert.ok(result.ok);

  const afterReload = new SyncQueue(storage).list();
  assert.equal(afterReload.length, 1);
  assert.equal(afterReload[0].clientId, result.item.clientId);
  assert.equal(afterReload[0].payload.findings, 2);
});

test("sincronizar sin conexión la deja failed; al reconectar queda una sola en el servidor", async () => {
  const remote = createFakeRemote();
  const storage = createMemoryStorage();
  const sync = createHttpSync({ fetchFn: remote.fetch });
  captureInspection(new SyncQueue(storage), validInput, NOW);

  remote.state.offline = true;
  await new SyncQueue(storage).syncAll(sync);
  const offline = new SyncQueue(storage).list();
  assert.equal(offline.length, 1);
  assert.equal(offline[0].status, "failed");
  assert.equal(remote.store.count(), 0);

  remote.state.offline = false;
  await new SyncQueue(storage).syncAll(sync);
  const [online] = new SyncQueue(storage).list();
  assert.equal(online.status, "synced");
  assert.equal(online.serverId, `srv-${online.clientId}`);
  assert.equal(remote.store.count(), 1);
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

console.log(`\noffline-persistence.spec.ts: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
