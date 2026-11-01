// Guardia de entradas del servidor — Semana 9.
//
// Primera línea de defensa de /api/sync. Falla cerrada: ante cualquier duda
// rechaza con un mensaje genérico y NUNCA repite lo que mandó el cliente
// (ni nombres de campos ni valores), para no reflejar el ataque en la respuesta.
//
// Se valida en el servidor aunque la pantalla ya valide: el navegador lo controla
// quien lo usa, así que todo lo que cruza la red es no confiable.

import type { InspectionPayload } from "../storage/schema";
import { validateInspection, type InspectionField } from "../sync/validate-inspection";

export const MAX_BODY_BYTES = 16 * 1024;
export const SUMMARY_MAX_LENGTH = 500;
export const INSPECTOR_MAX_LENGTH = 80;
// Tope duro por campo, antes de cualquier otra regla: evita trabajar con textos enormes.
export const HARD_FIELD_LIMIT = 2000;
const FINDINGS_TEXT_MAX_LENGTH = 16;

export const ALLOWED_INSPECTION_KEYS = ["location", "summary", "inspector", "findings", "date"] as const;

const TEXT_FIELDS = ["location", "summary", "inspector", "date"] as const;

export type GuardErrorCode =
  | "not-object"
  | "unknown-field"
  | "bad-type"
  | "too-long"
  | "control-chars"
  | "active-markup"
  | "invalid-values";

export type ParseResult =
  | { ok: true; payload: InspectionPayload }
  | { ok: false; code: GuardErrorCode; error: string; fields?: InspectionField[] };

const GENERIC_MESSAGES: Record<GuardErrorCode, string> = {
  "not-object": "Datos inválidos.",
  "unknown-field": "Datos inválidos.",
  "bad-type": "Datos inválidos.",
  "too-long": "Datos inválidos.",
  "control-chars": "Datos inválidos.",
  "active-markup": "Datos inválidos.",
  "invalid-values": "Datos inválidos.",
};

function fail(code: GuardErrorCode, fields?: InspectionField[]): ParseResult {
  return fields
    ? { ok: false, code, error: GENERIC_MESSAGES[code], fields }
    : { ok: false, code, error: GENERIC_MESSAGES[code] };
}

/** Objeto simple: no arreglo, no null, prototipo Object o null. */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Quita caracteres de control. Los saltos de línea y tabulaciones solo se
 * conservan cuando `allowWhitespace` es true (el resumen puede tener varias líneas).
 */
export function stripControlChars(text: string, allowWhitespace: boolean): string {
  let result = "";
  for (const char of text) {
    const code = char.codePointAt(0) as number;
    const isControl = code <= 0x1f || (code >= 0x7f && code <= 0x9f);
    const isWhitespace = code === 0x09 || code === 0x0a || code === 0x0d;
    if (!isControl || (allowWhitespace && isWhitespace)) result += char;
  }
  return result;
}

const ACTIVE_TAGS =
  /<\s*\/?\s*(script|iframe|object|embed|img|svg|style|link|meta|base|form|input|button|video|audio|math|body|html)\b/i;
const ACTIVE_SCHEMES = /(javascript|vbscript)\s*:|data\s*:\s*text\/html/i;

/**
 * Detecta marcado activo (etiquetas que ejecutan o cargan cosas, y esquemas peligrosos).
 * No rechaza un "<" suelto: "Voltaje < 5V" es una observación válida.
 */
export function containsActiveMarkup(text: string): boolean {
  return ACTIVE_TAGS.test(text) || ACTIVE_SCHEMES.test(text);
}

/**
 * Valida el objeto con los 5 campos de la inspección y lo entrega limpio.
 * Se rechaza el marcado activo en vez de codificarlo al guardar: el escape se
 * hace al mostrar (React lo hace), y guardar datos ya "escapados" los corrompe.
 */
export function parseInspectionPayload(raw: unknown, now: Date): ParseResult {
  // 1. Debe ser un objeto simple.
  if (!isPlainObject(raw)) return fail("not-object");

  // 2. Ninguna clave fuera de la lista (incluye "__proto__" y "constructor").
  for (const key of Object.keys(raw)) {
    if (!(ALLOWED_INSPECTION_KEYS as readonly string[]).includes(key)) return fail("unknown-field");
  }

  // 3. Campos de texto: tipo, tope duro, sin caracteres de control y sin marcado activo.
  const text: Record<string, string> = {};
  for (const field of TEXT_FIELDS) {
    const value = raw[field];
    if (typeof value !== "string") return fail("bad-type");
    if (value.length > HARD_FIELD_LIMIT) return fail("too-long");
    if (stripControlChars(value, field === "summary") !== value) return fail("control-chars");
    if (containsActiveMarkup(value)) return fail("active-markup");
    text[field] = value;
  }

  // 4. Hallazgos: texto corto o número.
  const findings = raw.findings;
  if (typeof findings === "string") {
    if (findings.length > FINDINGS_TEXT_MAX_LENGTH) return fail("too-long");
  } else if (typeof findings !== "number") {
    return fail("bad-type");
  }

  // 5. Topes de resumen e inspector (después de quitar espacios).
  if (text.summary.trim().length > SUMMARY_MAX_LENGTH) return fail("too-long");
  if (text.inspector.trim().length > INSPECTOR_MAX_LENGTH) return fail("too-long");

  // 6. Reglas de la semana 8: laboratorio, hallazgos 0–999 y fecha real y no futura.
  const result = validateInspection(
    {
      location: text.location,
      summary: text.summary,
      inspector: text.inspector,
      findings,
      date: text.date,
    },
    now
  );
  if (!result.ok) {
    return fail("invalid-values", Object.keys(result.errors) as InspectionField[]);
  }
  return { ok: true, payload: result.payload };
}

export type BodyResult =
  | { ok: true; value: unknown }
  | { ok: false; status: 400 | 413 | 415; error: string };

/**
 * Lee el cuerpo JSON de una petición con tope de tamaño.
 * - 415 si el tipo de contenido no es application/json.
 * - 413 si el cuerpo excede el límite: se cuentan los bytes REALMENTE recibidos y se
 *   corta la lectura; no se confía en Content-Length (el cliente puede mentir u omitirlo).
 * - 400 si el JSON está roto o vacío.
 */
export async function readJsonBody(request: Request, maxBytes: number = MAX_BODY_BYTES): Promise<BodyResult> {
  const contentType = (request.headers.get("content-type") ?? "").toLowerCase();
  if (!/^application\/json\s*(;|$)/.test(contentType)) {
    return { ok: false, status: 415, error: "unsupported-media-type" };
  }

  if (!request.body) return { ok: false, status: 400, error: "invalid-json" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        return { ok: false, status: 413, error: "payload-too-large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400, error: "invalid-json" };
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const textBody = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (textBody.trim().length === 0) return { ok: false, status: 400, error: "invalid-json" };
    return { ok: true, value: JSON.parse(textBody) as unknown };
  } catch {
    return { ok: false, status: 400, error: "invalid-json" };
  }
}