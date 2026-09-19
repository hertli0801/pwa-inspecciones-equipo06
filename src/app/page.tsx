"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell, type AppShellStatus } from "../components/app-shell";
import { inspections as syntheticInspections, type Inspection } from "../lib/data/inspections";

const SIMULATED_DELAY_MS = 600;

function readDemoParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("demo");
}

async function fetchSyntheticInspections(): Promise<Inspection[]> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_DELAY_MS));

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error("Sin conexión disponible");
  }

  return syntheticInspections;
}

export default function HomePage() {
  const [status, setStatus] = useState<AppShellStatus>("loading");
  const [inspections, setInspections] = useState<Inspection[]>([]);

  const loadInspections = useCallback(() => {
    setStatus("loading");

    const demo = readDemoParam();

    if (demo === "error") {
      window.setTimeout(() => setStatus("error"), SIMULATED_DELAY_MS);
      return;
    }

    if (demo === "empty") {
      window.setTimeout(() => {
        setInspections([]);
        setStatus("empty");
      }, SIMULATED_DELAY_MS);
      return;
    }

    fetchSyntheticInspections()
      .then((data) => {
        setInspections(data);
        setStatus(data.length === 0 ? "empty" : "ready");
      })
      .catch(() => {
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    loadInspections();
  }, [loadInspections]);

  return (
    <main className="page-shell">
      <AppShell
        status={status}
        title="Inspecciones de laboratorio"
        description="Registro de mantenimiento para trabajar con conectividad intermitente. Los datos mostrados son sintéticos. Agrega ?demo=error o ?demo=empty en la URL para revisar esos estados."
        onRetry={loadInspections}
      >
        <section aria-labelledby="inspections-heading" className="content-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Datos de demostración</p>
              <h2 id="inspections-heading">Inspecciones recientes</h2>
            </div>
            <span className="count">{inspections.length} registros</span>
          </div>

          <div className="inspection-grid">
            {inspections.map((inspection) => (
              <article className="inspection-card" key={inspection.id}>
                <div className="card-topline">
                  <span className={`badge badge-${inspection.status}`}>{inspection.statusLabel}</span>
                  <span className="muted">{inspection.date}</span>
                </div>
                <h3>{inspection.location}</h3>
                <p>{inspection.summary}</p>
                <dl>
                  <div>
                    <dt>Responsable</dt>
                    <dd>{inspection.inspector}</dd>
                  </div>
                  <div>
                    <dt>Hallazgos</dt>
                    <dd>{inspection.findings}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      </AppShell>

        <footer className="footer">
          <p>Aplicaciones Web Progresivas · Universidad Tecnológica de Tehuacán</p>
        </footer>
      </main>
   
  );
}