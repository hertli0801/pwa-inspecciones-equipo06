"use client";

import type { ReactNode } from "react";
import styles from "./app-shell.module.css";

export type AppShellStatus = "loading" | "error" | "empty" | "ready";

type AppShellProps = {
  status: AppShellStatus;
  title: string;
  description: string;
  onRetry?: () => void;
  children: ReactNode;
};

export function AppShell({ status, title, description, onRetry, children }: AppShellProps) {
  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <img
          src="/icons/icon-192.png"
          alt=""
          width={48}
          height={48}
          className={styles.brandIcon}
        />
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>App shell instalable</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.description}>{description}</p>
        </div>
      </header>

      <div aria-live="polite">
        {status === "loading" && <LoadingState />}
        {status === "error" && <ErrorState onRetry={onRetry} />}
        {status === "empty" && <EmptyState />}
        {status === "ready" && children}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className={styles.stateBlock} role="status" aria-label="Cargando inspecciones">
      <div className={styles.spinner} aria-hidden="true" />
      <p className={styles.stateText}>Cargando inspecciones sintéticas…</p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className={styles.stateBlock} role="alert">
      <p className={styles.stateTitle}>No se pudieron cargar las inspecciones</p>
      <p className={styles.stateText}>
        Puede deberse a conectividad intermitente. Los datos son sintéticos y esta app está
        pensada para operar sin conexión una vez cacheada por el service worker.
      </p>
      {onRetry ? (
        <button type="button" className={styles.retryButton} onClick={onRetry}>
          Reintentar
        </button>
      ) : null}
    </div>
  );
}

function EmptyState() {
  return (
    <div className={styles.stateBlock}>
      <p className={styles.stateTitle}>Sin inspecciones registradas</p>
      <p className={styles.stateText}>
        Todavía no hay registros sintéticos disponibles para este periodo.
      </p>
    </div>
  );
}

export default AppShell;
