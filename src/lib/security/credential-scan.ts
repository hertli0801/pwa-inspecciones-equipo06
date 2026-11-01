// Detección de credenciales incrustadas — Semana 9.
//
// Reconoce formas conocidas de credenciales para que una prueba pueda comprobar
// que ninguna llegó al código ni a los archivos públicos. Son patrones, no valores.

export type CredentialPattern = Readonly<{ id: string; pattern: RegExp }>;

export const CREDENTIAL_PATTERNS: readonly CredentialPattern[] = [
  { id: "private-key-block", pattern: /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/ },
  { id: "aws-access-key-id", pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { id: "github-personal-credential", pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { id: "jwt-like", pattern: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/ },
  { id: "bearer-header", pattern: /\bBearer\s+[A-Za-z0-9._~+/-]{20,}=*/i },
];

/** Devuelve los ids de los patrones que coinciden con el texto (vacío si no hay ninguno). */
export function findCredentialLeaks(text: string): string[] {
  return CREDENTIAL_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ id }) => id);
}