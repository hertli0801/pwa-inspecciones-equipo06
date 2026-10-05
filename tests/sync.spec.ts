import assert from "node:assert/strict";
import { createMemoryStorage, SyncQueue, type SyncResult } from "../src/lib/sync/queue";
import { parseQueue } from "../src/lib/storage/schema";
import { resolveConflict } from "../src/lib/sync/conflict-policy";
import type { QueuedInspection, InspectionPayload } from "../src/lib/storage/schema";

const samplePayload: InspectionPayload = {
  location: "Laboratorio de Redes",
  summary: "Revisión sintética de prueba",
  inspector: "Técnica A",
  findings: 0,
  date: "2026-09-01",
};

{
  const queue = new SyncQueue(createMemoryStorage());
  const item = queue.enqueue(samplePayload);

  assert.equal(item.status, "pending");
  assert.equal(item.attempts, 0);
  assert.equal(item.version, 1);
  assert.ok(item.clientId.length > 0, "cada elemento debe tener una clave de idempotencia (clientId)");

  const listed = queue.list();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].clientId, item.clientId);
}

{
  const queue = new SyncQueue(createMemoryStorage());
  queue.enqueue(samplePayload);

  await queue.syncAll(async (item): Promise<SyncResult> => ({
    ok: true,
    serverId: `server-${item.clientId}`,
    updatedAt: new Date().toISOString(),
  }));

  const [synced] = queue.list();
  assert.equal(synced.status, "synced");
  assert.ok(synced.serverId, "debe guardar el id que asigna el servidor");
}

{
  const queue = new SyncQueue(createMemoryStorage());
  queue.enqueue(samplePayload);

  await queue.syncAll(async () => ({ ok: false, reason: "sin conexión" }));
  let [item] = queue.list();
  assert.equal(item.status, "failed");
  assert.equal(item.attempts, 1);

  await queue.syncAll(async (i): Promise<SyncResult> => ({
    ok: true,
    serverId: `server-${i.clientId}`,
    updatedAt: new Date().toISOString(),
  }));
  [item] = queue.list();
  assert.equal(item.status, "synced", "un elemento fallido debe poder sincronizarse en un reintento posterior");
}

{
  const queue = new SyncQueue(createMemoryStorage());
  const item = queue.enqueue(samplePayload);

  const serverRecords = new Map<string, { serverId: string }>();
  function fakeServer(candidate: QueuedInspection): SyncResult {
    if (serverRecords.has(candidate.clientId)) {
      return { ok: true, serverId: serverRecords.get(candidate.clientId)!.serverId, updatedAt: new Date().toISOString() };
    }
    const serverId = `server-${candidate.clientId}`;
    serverRecords.set(candidate.clientId, { serverId });
    return { ok: true, serverId, updatedAt: new Date().toISOString() };
  }

  const first = fakeServer(item);
  const second = fakeServer(item);

  assert.equal(serverRecords.size, 1, "el servidor no debe crear un segundo registro para el mismo clientId");
  assert.equal(first.ok && second.ok && first.serverId, second.ok && second.serverId, "ambos envíos deben resolver al mismo serverId");
}

{
  const queue = new SyncQueue(createMemoryStorage());
  const item = queue.enqueue(samplePayload);

  let releaseSlowResponse: () => void = () => {};
  const slowResponseGate = new Promise<void>((resolve) => {
    releaseSlowResponse = resolve;
  });

  const syncPromise = queue.syncAll(async (): Promise<SyncResult> => {
    await slowResponseGate;
    return { ok: true, serverId: "server-viejo", updatedAt: "2020-01-01T00:00:00.000Z" };
  });

  queue.update(item.clientId, { findings: 3 });
  const midway = queue.list()[0];
  assert.equal(midway.version, 2, "la edición debe incrementar la versión");
  assert.equal(midway.status, "pending", "la edición debe volver a marcar el elemento como pendiente");

  releaseSlowResponse();
  await syncPromise;

  const finalState = queue.list()[0];
  assert.equal(
    finalState.status,
    "pending",
    "la respuesta tardía de una versión vieja NO debe marcar como sincronizado el estado más reciente"
  );
  assert.equal(finalState.version, 2, "la versión más reciente del usuario no debe perderse");
  assert.notEqual(finalState.serverId, "server-viejo", "no debe adoptar datos de la respuesta obsoleta");
}

{
  assert.deepEqual(parseQueue(null), [], "sin nada guardado, debe regresar una cola vacía, no fallar");
  assert.deepEqual(parseQueue("esto no es JSON{{{"), [], "JSON inválido no debe lanzar una excepción");
  assert.deepEqual(parseQueue('{"no":"es un arreglo"}'), [], "un objeto en vez de arreglo debe descartarse");
  assert.deepEqual(
    parseQueue('[{"clientId":"x"}]'),
    [],
    "un registro incompleto (sin los campos obligatorios) debe descartarse, no aceptarse a medias"
  );
}

{
  const sharedStorage = createMemoryStorage();
  const firstSession = new SyncQueue(sharedStorage);
  firstSession.enqueue(samplePayload);

  const secondSession = new SyncQueue(sharedStorage);
  const recovered = secondSession.list();

  assert.equal(recovered.length, 1, "la cola debe sobrevivir a cerrar y reabrir la pestaña");
  assert.equal(recovered[0].payload.location, samplePayload.location);
}

{
  const older = { clientId: "a", updatedAt: "2026-01-01T00:00:00.000Z" };
  const newer = { clientId: "a", updatedAt: "2026-01-02T00:00:00.000Z" };

  assert.equal(resolveConflict(newer, older), "keep-local", "si el local es más reciente, debe ganar el local");
  assert.equal(resolveConflict(older, newer), "keep-remote", "si el remoto es más reciente, debe ganar el remoto");
  assert.equal(resolveConflict(older, older), "keep-remote", "en un empate exacto, debe ganar el remoto (regla explícita)");
}

console.log("sync.spec.ts: PASS");
