// Envío por HTTP de una inspección de la cola — Semana 8.
//
// Crea la SyncFn que SyncQueue.syncAll usa para hablar con /api/sync.
// Nunca lanza: cualquier fallo (sin red, 5xx, respuesta rara) se devuelve
// como { ok: false } para que la cola marque el elemento como "failed" y
// lo reintente después. fetch se inyecta para poder probarlo sin red.

import type { SyncFn, SyncResult } from "./queue";

type HttpSyncOptions = {
  endpoint?: string;
  fetchFn?: typeof fetch;
};

export function createHttpSync(options: HttpSyncOptions = {}): SyncFn {
  const endpoint = options.endpoint ?? "/api/sync";

  return async (item): Promise<SyncResult> => {
    const fetchFn = options.fetchFn ?? globalThis.fetch;

    let response: Response;
    try {
      response = await fetchFn(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: item.clientId,
          version: item.version,
          payload: item.payload,
        }),
      });
    } catch {
      return { ok: false, reason: "network-error" };
    }

    if (!response.ok) {
      return { ok: false, reason: `http-${response.status}` };
    }

    try {
      const data = (await response.json()) as Record<string, unknown>;
      if (data.ok === true && typeof data.serverId === "string" && typeof data.updatedAt === "string") {
        return { ok: true, serverId: data.serverId, updatedAt: data.updatedAt };
      }
    } catch {
      // Cae al resultado de abajo.
    }
    return { ok: false, reason: "invalid-response" };
  };
}
