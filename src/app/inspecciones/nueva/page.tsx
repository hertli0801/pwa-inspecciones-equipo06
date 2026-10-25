"use client";

// Pantalla de captura — Semana 8.
//
// Conecta las piezas existentes:
// - SyncQueue: guardado local y sincronización.
// - Cámara y geolocalización: capacidades opcionales.
// - Notificaciones: aviso al terminar de sincronizar.

import { useEffect, useState } from "react";
import { SyncQueue, type SyncFn } from "../../../lib/sync/queue";
import type {
  InspectionPayload,
  QueuedInspection,
} from "../../../lib/storage/schema";
import {
  attachEvidence,
  getCameraSupport,
  requestCameraAccess,
  stopCamera,
  type EvidenceMeta,
} from "../../../lib/device/camera";
import { getApproximateLocation } from "../../../lib/device/geolocation";
import { notifyChange } from "../../../lib/notifications/client";

const queue = new SyncQueue();

const syncViaApi: SyncFn = async (item) => {
  const response = await fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: item.clientId,
      payload: item.payload,
    }),
  });

  if (!response.ok) {
    return { ok: false, reason: `http-${response.status}` };
  }

  const data = (await response.json()) as
    | { ok: true; serverId: string; updatedAt: string }
    | { ok: false; reason: string };

  return data;
};

const STATUS_LABEL: Record<QueuedInspection["status"], string> = {
  pending: "Pendiente",
  syncing: "Sincronizando…",
  synced: "Sincronizado",
  failed: "Falló — se reintentará",
};

export default function NuevaInspeccionPage() {
  const [items, setItems] = useState<QueuedInspection[]>([]);
  const [location, setLocation_] = useState("");
  const [summary, setSummary] = useState("");
  const [inspector, setInspector] = useState("");
  const [findings, setFindings] = useState("0");
  const [date, setDate] = useState("2026-10-23");
  const [formError, setFormError] = useState<string | null>(null);

  const [evidence, setEvidence] = useState<EvidenceMeta | null>(null);
  const [cameraStatus, setCameraStatus] = useState(
    "Sin evidencia adjunta."
  );
  const [locationStatus, setLocationStatus] = useState(
    "Sin ubicación adjunta."
  );
  const [syncMessage, setSyncMessage] = useState("");

  useEffect(() => {
    setItems(queue.list());
  }, []);

  function refresh() {
    setItems(queue.list());
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const findingsNumber = Number(findings);

    if (
      !location.trim() ||
      !summary.trim() ||
      !inspector.trim() ||
      !date.trim()
    ) {
      setFormError(
        "Ubicación, resumen, inspector y fecha son obligatorios."
      );
      return;
    }

    if (!Number.isFinite(findingsNumber) || findingsNumber < 0) {
      setFormError(
        "Hallazgos debe ser un número mayor o igual a 0."
      );
      return;
    }

    const payload: InspectionPayload = {
      location: location.trim(),
      summary: summary.trim(),
      inspector: inspector.trim(),
      findings: findingsNumber,
      date,
    };

    queue.enqueue(payload);
    refresh();

    setLocation_("");
    setSummary("");
    setInspector("");
    setFindings("0");
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

    const result = attachEvidence({
      type: "image/jpeg",
      size: 120_000,
    });

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

    const pendingOrFailed = queue
      .list()
      .some((i) => i.status !== "synced");

    const notification = notifyChange(
      pendingOrFailed
        ? "Algunas inspecciones no pudieron sincronizarse todavía."
        : "Todas las inspecciones están sincronizadas."
    );

    setSyncMessage(
      notification.channel === "system"
        ? "Sincronización terminada (aviso del sistema enviado)."
        : `Sincronización terminada (aviso dentro de la app: ${notification.message})`
    );
  }

  return (
    <main>
      <h1>Nueva inspección</h1>

      <form onSubmit={handleSubmit} data-testid="inspection-form">
        {formError && (
          <p role="alert" data-testid="form-error">
            {formError}
          </p>
        )}

        <label>
          Ubicación / laboratorio
          <input
            data-testid="field-location"
            value={location}
            onChange={(e) => setLocation_(e.target.value)}
          />
        </label>

        <label>
          Resumen
          <input
            data-testid="field-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </label>

        <label>
          Inspector
          <input
            data-testid="field-inspector"
            value={inspector}
            onChange={(e) => setInspector(e.target.value)}
          />
        </label>

        <label>
          Hallazgos
          <input
            data-testid="field-findings"
            type="number"
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
          />
        </label>

        <label>
          Fecha
          <input
            data-testid="field-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <section aria-label="Capacidades opcionales del dispositivo">
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
      </form>

      <section aria-label="Cola de sincronización">
        <h2>Inspecciones en la cola ({items.length})</h2>

        <button
          type="button"
          data-testid="sync-now"
          onClick={handleSyncNow}
        >
          Sincronizar ahora
        </button>

        {syncMessage && (
          <p data-testid="sync-message">{syncMessage}</p>
        )}

        <ul>
          {items.map((item) => (
            <li
              key={item.clientId}
              data-testid="queue-item"
              data-client-id={item.clientId}
            >
              <span data-testid="queue-summary">
                {item.payload.summary}
              </span>
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