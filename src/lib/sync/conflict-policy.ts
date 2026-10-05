export type ConflictCandidate = {
  clientId: string;
  updatedAt: string;
};

export type ConflictResolution = "keep-local" | "keep-remote";

/**
 * Política Last-Write-Wins (LWW): gana quien tenga el `updatedAt` más
 * reciente. En un empate exacto, gana el remoto — se asume que el servidor es
 * la fuente de verdad cuando no hay forma de distinguir cuál edición ocurrió
 * después, para evitar que un dispositivo con reloj adelantado siempre gane.
 *
 * Riesgo explícito de esta política: si dos ediciones ocurren casi al mismo
 * tiempo en dispositivos distintos, una se pierde silenciosamente (no hay
 * fusión de campos ni aviso al usuario). Alternativas más seguras
 * (vectores de versión, fusión campo por campo, o pedir al usuario que
 * decida) quedan fuera del alcance de esta semana; se documentan como
 * trabajo futuro en docs/sync-policy.md.
 */
export function resolveConflict(
  local: ConflictCandidate,
  remote: ConflictCandidate
): ConflictResolution {
  const localTime = Date.parse(local.updatedAt);
  const remoteTime = Date.parse(remote.updatedAt);

  if (Number.isNaN(localTime)) return "keep-remote";
  if (Number.isNaN(remoteTime)) return "keep-local";

  if (localTime > remoteTime) {
    return "keep-local";
  }

  return "keep-remote";
}
