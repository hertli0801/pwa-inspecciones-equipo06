export type SyncStatus = "pending" | "syncing" | "synced" | "failed";

export type InspectionPayload = {
  location: string;
  summary: string;
  inspector: string;
  findings: number;
  date: string;
};

export type QueuedInspection = {
  clientId: string;
  version: number;
  payload: InspectionPayload;
  status: SyncStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  serverId?: string;
};

export const STORAGE_KEY = "pwa-inspecciones:sync-queue:v1";

export function serializeQueue(items: QueuedInspection[]): string {
  return JSON.stringify(items);
}

/**
 * Deserializa la cola de forma defensiva: si el contenido de localStorage está
 * corrupto (JSON inválido, estructura inesperada, un registro incompleto por
 * un cierre de pestaña a medio guardar), se descarta lo inválido en vez de
 * lanzar una excepción que tumbe la aplicación al arrancar.
 */
export function parseQueue(raw: string | null): QueuedInspection[] {
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter(isValidQueuedInspection);
}

function isValidQueuedInspection(value: unknown): value is QueuedInspection {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;

  if (typeof v.clientId !== "string" || v.clientId.length === 0) return false;
  if (typeof v.version !== "number" || v.version < 1) return false;
  if (typeof v.status !== "string") return false;
  if (!["pending", "syncing", "synced", "failed"].includes(v.status)) return false;
  if (typeof v.attempts !== "number" || v.attempts < 0) return false;
  if (typeof v.createdAt !== "string") return false;
  if (typeof v.updatedAt !== "string") return false;

  const payload = v.payload as Record<string, unknown> | undefined;
  if (typeof payload !== "object" || payload === null) return false;
  if (typeof payload.location !== "string") return false;
  if (typeof payload.summary !== "string") return false;
  if (typeof payload.inspector !== "string") return false;
  if (typeof payload.findings !== "number") return false;
  if (typeof payload.date !== "string") return false;

  return true;
}
