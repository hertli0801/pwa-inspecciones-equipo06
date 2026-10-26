// Lógica del endpoint /api/sync — Semana 8.
//
// Funciones puras que reciben el almacén y el cuerpo ya leído, y devuelven
// { status, body }. route.ts solo las adapta a Next; así las pruebas de
// integración usan exactamente la misma lógica sin levantar un servidor.

import type { InspectionPayload } from "../storage/schema";
import type { ServerRecord, ServerStore } from "./server-store";

export type HandlerResponse<T = unknown> = {
  status: number;
  body: T;
};

export type SyncPostBody =
  | { ok: true; serverId: string; updatedAt: string; created: boolean }
  | { ok: false; reason: string };

export type SyncListBody = {
  count: number;
  items: ServerRecord[];
};

type PostOptions = {
  // Permite simular una caída del servidor (?fail=1) en pruebas manuales.
  forceFailure?: boolean;
};

function isPayload(value: unknown): value is InspectionPayload {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.location === "string" &&
    typeof p.summary === "string" &&
    typeof p.inspector === "string" &&
    typeof p.findings === "number" &&
    typeof p.date === "string"
  );
}

export function handleSyncPost(
  store: ServerStore,
  body: unknown,
  options: PostOptions = {}
): HandlerResponse<SyncPostBody> {
  if (options.forceFailure) {
    return { status: 503, body: { ok: false, reason: "forced-failure" } };
  }

  if (typeof body !== "object" || body === null) {
    return { status: 400, body: { ok: false, reason: "invalid-body" } };
  }

  const { clientId, version, payload } = body as Record<string, unknown>;

  if (typeof clientId !== "string" || clientId.length === 0) {
    return { status: 400, body: { ok: false, reason: "missing-clientId" } };
  }

  if (!isPayload(payload)) {
    return { status: 400, body: { ok: false, reason: "invalid-payload" } };
  }

  const safeVersion = typeof version === "number" && version >= 1 ? version : 1;
  const { record, created } = store.upsert(clientId, safeVersion, payload);

  return {
    status: created ? 201 : 200,
    body: { ok: true, serverId: record.serverId, updatedAt: record.updatedAt, created },
  };
}

export function handleSyncGet(store: ServerStore): HandlerResponse<SyncListBody> {
  return { status: 200, body: { count: store.count(), items: store.list() } };
}

export function handleSyncDelete(store: ServerStore): HandlerResponse<{ ok: true }> {
  store.clear();
  return { status: 200, body: { ok: true } };
}
