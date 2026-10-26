// Almacén del servidor de demostración — Semana 8.
//
// Guarda las inspecciones recibidas en memoria (datos sintéticos, sin base
// de datos real). La clave es el clientId que genera la cola local: si la
// misma operación llega dos veces (reintento, respuesta perdida), se
// actualiza el registro existente en lugar de crear un duplicado.

import type { InspectionPayload } from "../storage/schema";

export type ServerRecord = {
  clientId: string;
  serverId: string;
  version: number;
  payload: InspectionPayload;
  receivedAt: string;
  updatedAt: string;
  // Cuántas veces llegó esta operación; sirve para ver los reintentos.
  writes: number;
};

export type UpsertResult = {
  record: ServerRecord;
  created: boolean;
};

export type ServerStore = {
  upsert: (clientId: string, version: number, payload: InspectionPayload) => UpsertResult;
  list: () => ServerRecord[];
  count: () => number;
  clear: () => void;
};

export function createServerStore(now: () => Date = () => new Date()): ServerStore {
  const records = new Map<string, ServerRecord>();

  return {
    upsert(clientId, version, payload) {
      const timestamp = now().toISOString();
      // Protección contra duplicados del lado del servidor: la clave es clientId.
      const key = clientId;
      const existing = records.get(key);

      if (!existing) {
        const record: ServerRecord = {
          clientId,
          serverId: `srv-${clientId}`,
          version,
          payload,
          receivedAt: timestamp,
          updatedAt: timestamp,
          writes: 1,
        };
        records.set(key, record);
        return { record, created: true };
      }

      // Una versión más vieja (llegó tarde) no pisa a la más reciente.
      const isNewer = version >= existing.version;
      const record: ServerRecord = {
        ...existing,
        version: isNewer ? version : existing.version,
        payload: isNewer ? payload : existing.payload,
        updatedAt: isNewer ? timestamp : existing.updatedAt,
        writes: existing.writes + 1,
      };
      records.set(key, record);
      return { record, created: false };
    },

    list() {
      return Array.from(records.values());
    },

    count() {
      return records.size;
    },

    clear() {
      records.clear();
    },
  };
}
