"use client";

import { useEffect, useState } from "react";
import { LoadingState } from "../../../components/loading-state";
import type { Inspection } from "../../../lib/data/inspections";

type FetchStatus = "loading" | "error" | "ready";

async function fetchInspectionOnClient(id: string): Promise<Inspection | null> {
  // Simula una petición desde el cliente (por ejemplo, a una API interna).
  // El import dinámico + el retraso son intencionales: obligan a que esta
  // ruta pase de verdad por un estado "loading" observable, en vez de
  // resolver instantáneamente.
  const { inspections } = await import("../../../lib/data/inspections");
  await new Promise((resolve) => setTimeout(resolve, 400));
  return inspections.find((item) => item.id === id) ?? null;
}

export default function InspectionDetailPage({ params }: { params: { id: string } }) {
  const [status, setStatus] = useState<FetchStatus>("loading");
  const [inspection, setInspection] = useState<Inspection | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    fetchInspectionOnClient(params.id)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setStatus("error");
          return;
        }
        setInspection(result);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (status === "loading") {
    return <LoadingState label="Cargando inspección (cliente)…" />;
  }

  if (status === "error" || !inspection) {
    return (
      <div role="alert" className="content-section">
        <p>No se encontró esa inspección, o hubo un error al cargarla.</p>
      </div>
    );
  }

  return (
    <main className="page-shell">
      <header className="hero">
        <p className="eyebrow">Renderizado en cliente (CSR)</p>
        <h1>{inspection.location}</h1>
        <p className="lead">{inspection.summary}</p>
      </header>

      <section className="content-section">
        <dl>
          <div>
            <dt>Responsable</dt>
            <dd>{inspection.inspector}</dd>
          </div>
          <div>
            <dt>Hallazgos</dt>
            <dd>{inspection.findings}</dd>
          </div>
          <div>
            <dt>Fecha</dt>
            <dd>{inspection.date}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
