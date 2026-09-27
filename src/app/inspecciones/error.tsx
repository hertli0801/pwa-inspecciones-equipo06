"use client";

export default function InspeccionesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert" className="content-section">
      <p>No se pudo cargar el listado de inspecciones.</p>
      <button type="button" onClick={reset}>
        Reintentar
      </button>
    </div>
  );
}