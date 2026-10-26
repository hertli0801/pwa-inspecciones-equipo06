// Flujo de captura — Semana 8.
//
// Valida y guarda una inspección en la cola local. Guardar NUNCA toca la
// red: solo escribe en el almacenamiento local (SyncQueue.enqueue). La
// sincronización con el servidor es un paso separado (syncAll), que se
// dispara cuando hay conexión.

import type { QueuedInspection } from "../storage/schema";
import {
  validateInspection,
  type InspectionInput,
  type ValidationResult,
} from "./validate-inspection";

// Solo lo que el flujo necesita de la cola; facilita usar una cola falsa.
export type CaptureQueue = {
  enqueue: (payload: Extract<ValidationResult, { ok: true }>["payload"]) => QueuedInspection;
};

export type CaptureResult =
  | { ok: true; item: QueuedInspection }
  | { ok: false; errors: Extract<ValidationResult, { ok: false }>["errors"] };

export function captureInspection(
  queue: CaptureQueue,
  input: InspectionInput,
  now: Date
): CaptureResult {
  const result = validateInspection(input, now);

  // Si la captura es inválida no se guarda nada.
  if (!result.ok) {
    return { ok: false, errors: result.errors };
  }

  const item = queue.enqueue(result.payload);
  return { ok: true, item };
}