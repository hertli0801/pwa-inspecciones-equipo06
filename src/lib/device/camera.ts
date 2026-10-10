export const MAX_EVIDENCE_BYTES = 2 * 1024 * 1024;
export const ALLOWED_EVIDENCE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type EvidenceFileLike = { type: string; size: number };

/** Solo se conserva tipo y tamaño: sin nombre de archivo ni metadatos de la foto. */
export type EvidenceMeta = { type: string; size: number };

export type EvidenceResult =
  | { ok: true; evidence: EvidenceMeta | null }
  | { ok: false; reason: "invalid-type" | "too-large" };

/**
 * Valida una evidencia opcional. Sin archivo (null/undefined) NO es un error:
 * la inspección sigue su flujo normal sin evidencia.
 */
export function attachEvidence(
  file: EvidenceFileLike | null | undefined,
  maxBytes: number = MAX_EVIDENCE_BYTES
): EvidenceResult {
  if (!file) return { ok: true, evidence: null };
  if (!ALLOWED_EVIDENCE_TYPES.includes(file.type)) {
    return { ok: false, reason: "invalid-type" };
  }
  if (!(file.size > 0) || file.size > maxBytes) {
    return { ok: false, reason: "too-large" };
  }
  return { ok: true, evidence: { type: file.type, size: file.size } };
}

export type MediaStreamLike = { getTracks(): { stop(): void }[] };

export type CameraHost = {
  mediaDevices?: {
    getUserMedia?: (constraints: {
      video: boolean | { facingMode: string };
      audio: boolean;
    }) => Promise<MediaStreamLike>;
  };
};

export type CameraSupport = "camera" | "file-picker";

/** Si no hay cámara, la interfaz debe ofrecer el selector de archivo normal. */
export function getCameraSupport(host: CameraHost = defaultHost()): CameraSupport {
  return typeof host.mediaDevices?.getUserMedia === "function" ? "camera" : "file-picker";
}

export type CameraAccessResult =
  | { ok: true; stream: MediaStreamLike }
  | { ok: false; reason: "unsupported" | "denied" | "error" };

/**
 * Pide acceso a la cámara. Debe llamarse desde un clic del usuario, nunca al
 * cargar la página. Solo video, sin audio.
 */

export async function requestCameraAccess(
  host: CameraHost = defaultHost()
): Promise<CameraAccessResult> {
  const getUserMedia = host.mediaDevices?.getUserMedia;
  if (typeof getUserMedia !== "function") return { ok: false, reason: "unsupported" };

  try {
    const stream = await getUserMedia.call(host.mediaDevices, {
      video: { facingMode: "environment" },
      audio: false,
    });
    return { ok: true, stream };
  } catch (error) {
    const name = (error as { name?: string } | null)?.name;
    if (name === "NotAllowedError" || name === "SecurityError") {
      return { ok: false, reason: "denied" };
    }
    if (name === "NotFoundError" || name === "OverconstrainedError") {
      return { ok: false, reason: "unsupported" };
    }
    return { ok: false, reason: "error" };
  }
}

/** Libera la cámara en cuanto ya no se necesita. */
export function stopCamera(stream: MediaStreamLike): void {
  stream.getTracks().forEach((track) => track.stop());
}

function defaultHost(): CameraHost {
  return typeof navigator !== "undefined" ? (navigator as unknown as CameraHost) : {};
}
