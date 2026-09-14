"use client";

import type { ReactNode } from "react";
import styles from "./app-shell.module.css";

export type AppShellStatus = "loading" | "error" | "empty" | "ready";

interface AppShellProps {
  status: AppShellStatus;
  onRetry?: () => void;
  children: ReactNode;
}

export function AppShell({ status, onRetry, children }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <nav className={styles.nav} aria-label="Navegación principal">
        <span className={styles.brand}>Inspecciones de laboratorio</span>
        <a href="/">Inicio</a>
      </nav>

      {status === "loading" && (
        <div role="status" aria-live="polite" className={styles.state}>
          Cargando inspecciones…
        </div>
      )}

      {status === "error" && (
        <div role="alert" className={styles.state}>
          <p>No se pudieron cargar las inspecciones. Verifica tu conexión.</p>
          {onRetry && (
            <button type="button" onClick={onRetry} className={styles.retryButton}>
              Reintentar
            </button>
          )}
        </div>
      )}

      {status === "empty" && (
        <div className={styles.state}>Todavía no hay inspecciones registradas.</div>
      )}

      {status === "ready" && children}
    </div>
  );
}