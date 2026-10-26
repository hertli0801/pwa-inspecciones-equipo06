// Servidor remoto falso para las pruebas de la Semana 8. Solo datos sintéticos.
//
// Devuelve un fetch que, en vez de ir a la red, llama a los mismos handlers
// que usa /api/sync con un almacén en memoria. Permite controlar la
// respuesta remota: sin conexión, fallo 503 o respuesta perdida después de
// que el servidor ya guardó.

import { handleSyncPost } from "../../src/lib/sync/handlers";
import { createServerStore } from "../../src/lib/sync/server-store";

export type FakeRemote = ReturnType<typeof createFakeRemote>;

export function createFakeRemote() {
  const store = createServerStore(() => new Date("2026-10-24T18:00:00.000Z"));

  const state = {
    // Peticiones que salieron del cliente (lleguen o no al servidor).
    calls: 0,
    offline: false,
    // Cuántas de las próximas peticiones responden 503 sin guardar.
    failNext: 0,
    // Cuántas de las próximas peticiones se guardan pero pierden la respuesta.
    loseResponseNext: 0,
  };

  const fetchFn = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    state.calls++;

    if (state.offline) {
      throw new TypeError("Failed to fetch");
    }

    if (state.failNext > 0) {
      state.failNext--;
      const failed = handleSyncPost(store, null, { forceFailure: true });
      return Response.json(failed.body, { status: failed.status });
    }

    const body = JSON.parse(String(init?.body ?? "null"));
    const result = handleSyncPost(store, body);

    if (state.loseResponseNext > 0) {
      state.loseResponseNext--;
      // El servidor ya guardó, pero la respuesta nunca llega al cliente.
      throw new TypeError("Failed to fetch");
    }

    return Response.json(result.body, { status: result.status });
  }) as typeof fetch;

  return { store, state, fetch: fetchFn };
}
