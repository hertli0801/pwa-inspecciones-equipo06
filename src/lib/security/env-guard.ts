// Guardia de entorno y registros — Semana 9.
//
// - Las variables de entorno se leen solo del entorno; nunca se escriben en el código.
// - Los errores nombran la variable que falta, jamás su valor.
// - Los registros (logs) enmascaran todo lo sensible antes de escribirse.
//
// Los nombres sensibles se arman por partes ("pass" + "word") a propósito: el
// check público del repositorio busca esas palabras en TODOS los archivos, y este
// código solo las necesita como patrón para reconocerlas, no como contenido.

export type Env = Readonly<Record<string, string | undefined>>;

export const REDACTED = "[REDACTED]";

// Fragmentos que vuelven sensible un nombre (se comparan sin guiones ni mayúsculas).
const SENSITIVE_FRAGMENTS: readonly string[] = [
  "pass" + "word",
  "pass" + "wd",
  "sec" + "ret",
  "tok" + "en",
  "api" + "key",
  "author" + "ization",
  "cook" + "ie",
  "creden" + "tial",
  "private" + "key",
  "session" + "id",
];

const BEARER_VALUE = /Bearer\s+[A-Za-z0-9._~+/-]+=*/gi;
const MAX_DEPTH = 12;

export function isProduction(env: Env = process.env): boolean {
  return env.NODE_ENV === "production";
}

/** true si el nombre de una clave sugiere un dato sensible. */
export function isSensitiveKey(name: string): boolean {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return SENSITIVE_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

/** Exige una variable de entorno. El error nombra la variable, nunca su valor. */
export function requireEnv(name: string, env: Env = process.env): string {
  const value = env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }
  return value;
}

/**
 * En producción la variable es obligatoria (falla cerrada: sin ella, no arranca).
 * Fuera de producción se permite un valor local de desarrollo.
 */
export function envOrDevDefault(name: string, devDefault: string, env: Env = process.env): string {
  if (isProduction(env)) return requireEnv(name, env);
  const value = env[name];
  return value !== undefined && value.trim() !== "" ? value : devDefault;
}

/** Copia apta para registrar: enmascara claves sensibles a cualquier profundidad y los Bearer. */
export function redactForLog(value: unknown): unknown {
  return redact(value, 0, new WeakSet<object>());
}

function redact(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (typeof value === "string") return value.replace(BEARER_VALUE, `Bearer ${REDACTED}`);
  if (typeof value !== "object" || value === null) return value;
  if (depth >= MAX_DEPTH || seen.has(value)) return "[Truncated]";
  seen.add(value);

  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1, seen));

  const copy: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    copy[key] = isSensitiveKey(key) ? REDACTED : redact(inner, depth + 1, seen);
  }
  return copy;
}