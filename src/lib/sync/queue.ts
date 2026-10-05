import {
  parseQueue,
  serializeQueue,
  STORAGE_KEY,
  type InspectionPayload,
  type QueuedInspection,
} from "../storage/schema";

export type SyncResult =
  | { ok: true; serverId: string; updatedAt: string }
  | { ok: false; reason: string };

export type SyncFn = (item: QueuedInspection) => Promise<SyncResult>;

type MinimalStorage = Pick<Storage, "getItem" | "setItem">;

function nowIso(): string {
  return new Date().toISOString();
}

function generateClientId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createMemoryStorage(): MinimalStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

export class SyncQueue {
  private storage: MinimalStorage;

  constructor(storage?: MinimalStorage) {
    this.storage =
      storage ??
      (typeof window !== "undefined" ? window.localStorage : createMemoryStorage());
  }

  private read(): QueuedInspection[] {
    return parseQueue(this.storage.getItem(STORAGE_KEY));
  }

  private write(items: QueuedInspection[]): void {
    this.storage.setItem(STORAGE_KEY, serializeQueue(items));
  }

  enqueue(payload: InspectionPayload): QueuedInspection {
    const items = this.read();
    const timestamp = nowIso();
    const item: QueuedInspection = {
      clientId: generateClientId(),
      version: 1,
      payload,
      status: "pending",
      attempts: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    items.push(item);
    this.write(items);
    return item;
  }

  list(): QueuedInspection[] {
    return this.read();
  }

  update(clientId: string, payload: Partial<InspectionPayload>): void {
    this.mutate(clientId, (current) => ({
      ...current,
      payload: { ...current.payload, ...payload },
      version: current.version + 1,
      status: "pending",
      updatedAt: nowIso(),
    }));
  }

  async syncAll(syncFn: SyncFn): Promise<void> {
    const pending = this.read().filter(
      (item) => item.status === "pending" || item.status === "failed"
    );

    for (const item of pending) {
      const versionAtAttempt = item.version;
      this.mutate(item.clientId, (current) => ({ ...current, status: "syncing" }));

      let result: SyncResult;
      try {
        result = await syncFn(item);
      } catch (error) {
        result = {
          ok: false,
          reason: error instanceof Error ? error.message : "error desconocido",
        };
      }

      this.mutate(item.clientId, (current) => {
        if (current.version !== versionAtAttempt) {
          return current;
        }

        if (result.ok) {
          return {
            ...current,
            status: "synced",
            serverId: result.serverId,
            updatedAt: result.updatedAt,
          };
        }

        return {
          ...current,
          status: "failed",
          attempts: current.attempts + 1,
        };
      });
    }
  }

  private mutate(
    clientId: string,
    updater: (item: QueuedInspection) => QueuedInspection
  ): void {
    const items = this.read();
    const index = items.findIndex((item) => item.clientId === clientId);
    if (index === -1) return;
    items[index] = updater(items[index]);
    this.write(items);
  }
}
