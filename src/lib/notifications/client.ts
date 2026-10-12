export type PermissionState = "default" | "denied" | "granted";

export type NotificationEnv = {
  permission: PermissionState;
  requestPermission: () => Promise<PermissionState>;
  show: (title: string, options?: { body?: string; tag?: string }) => void;
};

export type PermissionResult =
  | { ok: true; permission: PermissionState }
  | { ok: false; reason: "unsupported" | "error" };

export type NotifyResult =
  | { channel: "system" }
  | {
      channel: "in-app";
      reason: "unsupported" | "denied" | "default" | "error";
      message: string;
    };

const MAX_BODY_LENGTH = 120;

export function getBrowserNotificationEnv(): NotificationEnv | null {
  if (typeof window === "undefined" || !("Notification" in window)) return null;
  return {
    get permission() {
      return Notification.permission as PermissionState;
    },
    requestPermission: () => Notification.requestPermission() as Promise<PermissionState>,
    show: (title, options) => {
      new Notification(title, options);
    },
  };
}

/** Pide permiso. Debe llamarse desde un clic del usuario, nunca al cargar la página. */
export async function requestNotificationPermission(
  env: NotificationEnv | null = getBrowserNotificationEnv()
): Promise<PermissionResult> {
  if (!env) return { ok: false, reason: "unsupported" };
  try {
    return { ok: true, permission: await env.requestPermission() };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/**
 * Muestra una notificación de cambio. NO pide permiso: si no está concedido o
 * la API no existe, devuelve un aviso dentro de la app para que el flujo siga
 * siendo útil sin la capacidad. El texto es genérico y se recorta para no
 * filtrar datos de la inspección.
 */
export function notifyChange(
  message: string,
  env: NotificationEnv | null = getBrowserNotificationEnv()
): NotifyResult {
  const body = message.slice(0, MAX_BODY_LENGTH);

  if (!env) return { channel: "in-app", reason: "unsupported", message: body };
  if (env.permission === "denied") return { channel: "in-app", reason: "denied", message: body };
  if (env.permission !== "granted") return { channel: "in-app", reason: "default", message: body };

  try {
    env.show("Inspecciones", { body, tag: "inspection-change" });
    return { channel: "system" };
  } catch {
    return { channel: "in-app", reason: "error", message: body };
  }
}