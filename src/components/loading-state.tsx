import styles from "./loading-state.module.css";

type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = "Cargando…" }: LoadingStateProps) {
  return (
    <div role="status" aria-live="polite" className={styles.wrapper}>
      <span aria-hidden="true" className={styles.spinner} />
      <p>{label}</p>
    </div>
  );
}