"use client";

// Pantalla de captura — Semana 8.
//
// Conecta las piezas ya probadas:
// - captureInspection: valida y guarda en la cola local. Guardar NUNCA toca
//   la red; solo escribe en localStorage.
// - createHttpSync + SyncQueue.syncAll: envían a /api/sync cuando el usuario
//   pulsa "Sincronizar ahora".
// - Cámara, ubicación y notificaciones: capacidades opcionales; si se niegan
//   o no existen, la captura se completa igual.
import { useEffect, useState } from "react";
import { SyncQueue } from "../../../lib/sync/queue";
import type { QueuedInspection } from "../../../lib/storage/schema";
import { captureInspection } from "../../../lib/sync/capture-flow";
import { createHttpSync } from "../../../lib/sync/http-sync";
import {
  toDateString,
  type InspectionField,
} from "../../../lib/sync/validate-inspection";
import {
  attachEvidence,
  getCameraSupport,
  requestCameraAccess,
  stopCamera,
  type EvidenceMeta,
} from "../../../lib/device/camera";
import { getApproximateLocation } from "../../../lib/device/geolocation";
import { notifyChange } from "../../../lib/notifications/client";
import styles from "./nueva.module.css";

const queue = new SyncQueue();
const syncViaApi = createHttpSync();

const STATUS_LABEL: Record<QueuedInspection["status"], string> = {
  pending: "Pendiente",
  syncing: "Sincronizando…",
  synced: "Sincronizado",
  failed: "Falló — se reintentará",
};

type FieldErrors = Partial<Record<InspectionField, string>>;

export default function NuevaInspeccionPage() {
  const [items, setItems] = useState<QueuedInspection[]>([]);
  const [location, setLocation_] = useState("");
  const [summary, setSummary] = useState("");
  const [inspector, setInspector] = useState("");
  const [findings, setFindings] = useState("0");
  const [date, setDate] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saveMessage, setSaveMessage] = useState("");
  const [evidence, setEvidence] = useState<EvidenceMeta | null>(null);
  const [cameraStatus, setCameraStatus] = useState("Sin evidencia adjunta.");
  const [locationStatus, setLocationStatus] = useState("Sin ubicación adjunta.");
  const [syncMessage, setSyncMessage] = useState("");
  // Indica que React ya hidrató la página; las pruebas E2E esperan esto antes
  // de escribir en el formulario.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(queue.list());
    // La fecha de hoy se calcula en el cliente para no desfasar el HTML
    // generado en el servidor.
    setDate(toDateString(new Date()));
    setReady(true);
  }, []);

  function refresh() {
    setItems(queue.list());
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaveMessage("");

    // `new Date()` se inyecta aquí, en el borde de la app; la validación en
    // sí es una función pura que recibe `now`.
    const result = captureInspection(
      queue,
      { location, summary, inspector, findings, date },
      new Date()
    );

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    refresh();
    setSaveMessage("Inspección guardada en este dispositivo.");
    setLocation_("");
    setSummary("");
    setInspector("");
    setFindings("0");
    setDate(toDateString(new Date()));
    setEvidence(null);
    setCameraStatus("Sin evidencia adjunta.");
    setLocationStatus("Sin ubicación adjunta.");
  }

  async function handleAttachPhoto() {
    if (getCameraSupport() !== "camera") {
      setCameraStatus(
        "Este dispositivo no tiene cámara disponible; usa el selector de archivo."
      );
      return;
    }
    const access = await requestCameraAccess();
    if (!access.ok) {
      const reasonLabel =
        access.reason === "denied"
          ? "Permiso de cámara denegado. La inspección se puede guardar sin foto."
          : access.reason === "unsupported"
            ? "Cámara no disponible en este dispositivo. La inspección se puede guardar sin foto."
            : "No se pudo acceder a la cámara. La inspección se puede guardar sin foto.";
      setCameraStatus(reasonLabel);
      return;
    }
    stopCamera(access.stream);
    const result = attachEvidence({ type: "image/jpeg", size: 120_000 });
    if (result.ok) {
      setEvidence(result.evidence);
      setCameraStatus("Foto adjuntada (sintética, 120 KB).");
    }
  }

  async function handleUseLocation() {
    const result = await getApproximateLocation();
    if (!result.ok) {
      const reasonLabel =
        result.reason === "denied"
          ? "Permiso de ubicación denegado. La inspección se puede guardar sin ubicación."
          : result.reason === "timeout"
            ? "Se agotó el tiempo esperando la ubicación. La inspección se puede guardar sin ubicación."
            : result.reason === "unsupported"
              ? "Geolocalización no disponible en este dispositivo."
              : "Ubicación no disponible en este momento.";
      setLocationStatus(reasonLabel);
      return;
    }
    setLocationStatus(
      `Ubicación aproximada: ${result.latitude}, ${result.longitude}`
    );
  }

  async function handleSyncNow() {
    setSyncMessage("");
    await queue.syncAll(syncViaApi);
    refresh();
    const notSynced = queue.list().some((i) => i.status !== "synced");
    const notification = notifyChange(
      notSynced
        ? "Algunas inspecciones no pudieron sincronizarse todavía."
        : "Todas las inspecciones están sincronizadas."
    );
    setSyncMessage(
      notification.channel === "system"
        ? "Sincronización terminada (aviso del sistema enviado)."
        : `Sincronización terminada (aviso dentro de la app: ${notification.message})`
    );
  }

  function fieldError(field: InspectionField) {
    const message = errors[field];
    if (!message) return null;
    return (
      <span
        role="alert"
        className={styles.error}
        data-testid={`error-${field}`}
      >
        {message}
      </span>
    );
  }

  return (
    <main className={styles.page} data-ready={ready ? "true" : "false"}>
      <h1>Nueva inspección</h1>
      <p className={styles.hint}>
        Guardar funciona sin conexión: la inspección queda en este dispositivo
        y se envía cuando pulsas «Sincronizar ahora».
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        className={styles.form}
        data-testid="inspection-form"
      >
        <label className={styles.field}>
          Ubicación / laboratorio
          <input
            data-testid="field-location"
            value={location}
            aria-invalid={errors.location ? true : undefined}
            onChange={(e) => setLocation_(e.target.value)}
          />
          {fieldError("location")}
        </label>
        <label className={styles.field}>
          Resumen
          <input
            data-testid="field-summary"
            value={summary}
            aria-invalid={errors.summary ? true : undefined}
            onChange={(e) => setSummary(e.target.value)}
          />
          {fieldError("summary")}
        </label>
        <label className={styles.field}>
          Inspector
          <input
            data-testid="field-inspector"
            value={inspector}
            aria-invalid={errors.inspector ? true : undefined}
            onChange={(e) => setInspector(e.target.value)}
          />
          {fieldError("inspector")}
        </label>
        <label className={styles.field}>
          Hallazgos
          <input
            data-testid="field-findings"
            type="number"
            value={findings}
            aria-invalid={errors.findings ? true : undefined}
            onChange={(e) => setFindings(e.target.value)}
          />
          {fieldError("findings")}
        </label>
        <label className={styles.field}>
          Fecha
          <input
            data-testid="field-date"
            type="date"
            value={date}
            aria-invalid={errors.date ? true : undefined}
            onChange={(e) => setDate(e.target.value)}
          />
          {fieldError("date")}
        </label>

        <section
          aria-label="Capacidades opcionales del dispositivo"
          className={styles.optional}
        >
          <button
            type="button"
            data-testid="attach-photo"
            onClick={handleAttachPhoto}
          >
            Adjuntar foto (opcional)
          </button>
          <p data-testid="camera-status">{cameraStatus}</p>
          {evidence && (
            <p data-testid="evidence-meta">
              Evidencia: {evidence.type}, {evidence.size} bytes
            </p>
          )}
          <button
            type="button"
            data-testid="use-location"
            onClick={handleUseLocation}
          >
            Usar mi ubicación (opcional)
          </button>
          <p data-testid="location-status">{locationStatus}</p>
        </section>

        <button type="submit" data-testid="submit-inspection">
          Guardar inspección
        </button>
        {saveMessage && (
          <p role="status" data-testid="save-message">
            {saveMessage}
          </p>
        )}
      </form>

      <section aria-label="Cola de sincronización" className={styles.queue}>
        <h2>Inspecciones en la cola ({items.length})</h2>
        <button type="button" data-testid="sync-now" onClick={handleSyncNow}>
          Sincronizar ahora
        </button>
        {syncMessage && <p data-testid="sync-message">{syncMessage}</p>}
        <ul>
          {items.map((item) => (
            <li
              key={item.clientId}
              data-testid="queue-item"
              data-client-id={item.clientId}
            >
              <span data-testid="queue-summary">{item.payload.summary}</span>
              {" — "}
              <span data-testid="queue-status">
                {STATUS_LABEL[item.status]}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
