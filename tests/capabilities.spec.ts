import assert from "node:assert/strict";
import {
  attachEvidence,
  getCameraSupport,
  requestCameraAccess,
  stopCamera,
  MAX_EVIDENCE_BYTES,
  type CameraHost,
} from "../src/lib/device/camera";
import { getApproximateLocation, roundCoordinate, type GeoHost } from "../src/lib/device/geolocation";
import {
  notifyChange,
  requestNotificationPermission,
  type NotificationEnv,
  type PermissionState,
} from "../src/lib/notifications/client";

// ===== Camara y evidencia =====

{
  const none = attachEvidence(null);
  assert.ok(none.ok);
  assert.equal(none.evidence, null, "sin evidencia NO es un error: el flujo sigue");
  const undef = attachEvidence(undefined);
  assert.ok(undef.ok);
  assert.equal(undef.evidence, null);
}

{
  const good = attachEvidence({ type: "image/png", size: 1000 });
  assert.ok(good.ok);
  assert.deepEqual(good.evidence, { type: "image/png", size: 1000 }, "solo se conservan tipo y tamano");

  const exact = attachEvidence({ type: "image/jpeg", size: MAX_EVIDENCE_BYTES });
  assert.ok(exact.ok, "un archivo justo en el limite se acepta");
}

{
  const bad = attachEvidence({ type: "application/pdf", size: 1000 });
  assert.ok(!bad.ok);
  assert.equal(bad.reason, "invalid-type");

  const svg = attachEvidence({ type: "image/svg+xml", size: 1000 });
  assert.ok(!svg.ok, "SVG se rechaza (puede contener scripts)");

  const big = attachEvidence({ type: "image/png", size: MAX_EVIDENCE_BYTES + 1 });
  assert.ok(!big.ok);
  assert.equal(big.reason, "too-large");

  const empty = attachEvidence({ type: "image/png", size: 0 });
  assert.ok(!empty.ok, "un archivo vacio se rechaza");
}

{
  assert.equal(getCameraSupport({}), "file-picker", "sin API de camara se ofrece el selector de archivo");
  const withCamera: CameraHost = { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [] }) } };
  assert.equal(getCameraSupport(withCamera), "camera");
}

{
  const unsupported = await requestCameraAccess({});
  assert.ok(!unsupported.ok);
  assert.equal(unsupported.reason, "unsupported");

  const denied = await requestCameraAccess({
    mediaDevices: {
      getUserMedia: async () => {
        throw Object.assign(new Error("x"), { name: "NotAllowedError" });
      },
    },
  });
  assert.ok(!denied.ok);
  assert.equal(denied.reason, "denied");

  const noDevice = await requestCameraAccess({
    mediaDevices: {
      getUserMedia: async () => {
        throw Object.assign(new Error("x"), { name: "NotFoundError" });
      },
    },
  });
  assert.ok(!noDevice.ok);
  assert.equal(noDevice.reason, "unsupported");

  const broken = await requestCameraAccess({
    mediaDevices: {
      getUserMedia: async () => {
        throw new Error("fallo raro");
      },
    },
  });
  assert.ok(!broken.ok);
  assert.equal(broken.reason, "error");
}

{
  let stopped = 0;
  let requested: { video: unknown; audio: boolean } | null = null;
  const host: CameraHost = {
    mediaDevices: {
      getUserMedia: async (constraints) => {
        requested = constraints;
        return { getTracks: () => [{ stop: () => stopped++ }, { stop: () => stopped++ }] };
      },
    },
  };
  const granted = await requestCameraAccess(host);
  assert.ok(granted.ok);
  assert.equal(requested!.audio, false, "solo se pide video, nunca audio");
  stopCamera(granted.stream);
  assert.equal(stopped, 2, "stopCamera debe liberar todas las pistas");
}

// ===== Geolocalizacion =====

{
  assert.equal(roundCoordinate(18.462391), 18.46);
  assert.equal(roundCoordinate(-97.392011), -97.39);
}

{
  const none = await getApproximateLocation({});
  assert.ok(!none.ok);
  assert.equal(none.reason, "unsupported");
}

{
  let captured: { enableHighAccuracy?: boolean } | undefined;
  const host: GeoHost = {
    geolocation: {
      getCurrentPosition: (success, _error, options) => {
        captured = options;
        success({ coords: { latitude: 18.462391, longitude: -97.392011 } });
      },
    },
  };
  const ok = await getApproximateLocation(host);
  assert.ok(ok.ok);
  assert.equal(ok.latitude, 18.46, "las coordenadas se redondean para limitar datos");
  assert.equal(ok.longitude, -97.39);
  assert.equal(captured?.enableHighAccuracy, false, "no se pide alta precision");
}

for (const [code, reason] of [
  [1, "denied"],
  [2, "unavailable"],
  [3, "timeout"],
] as const) {
  const host: GeoHost = { geolocation: { getCurrentPosition: (_s, error) => error({ code }) } };
  const result = await getApproximateLocation(host);
  assert.ok(!result.ok);
  assert.equal(result.reason, reason, `codigo ${code} debe dar ${reason}`);
}

{
  const host: GeoHost = {
    geolocation: {
      getCurrentPosition: () => {
        throw new Error("boom");
      },
    },
  };
  const result = await getApproximateLocation(host);
  assert.ok(!result.ok, "una excepcion interna no debe romper el flujo");
  assert.equal(result.reason, "unavailable");
}

// ===== Notificaciones =====

function makeEnv(permission: PermissionState, opts: { throwOnShow?: boolean } = {}) {
  const shown: { title: string; body?: string; tag?: string }[] = [];
  let permissionRequests = 0;
  const env: NotificationEnv = {
    permission,
    requestPermission: async () => {
      permissionRequests++;
      return "granted";
    },
    show: (title, options) => {
      if (opts.throwOnShow) throw new Error("fallo");
      shown.push({ title, ...options });
    },
  };
  return { env, shown, requests: () => permissionRequests };
}

{
  const { env, shown } = makeEnv("granted");
  const result = notifyChange("Inspeccion actualizada", env);
  assert.equal(result.channel, "system");
  assert.equal(shown.length, 1);
  assert.equal(shown[0].body, "Inspeccion actualizada");
}

for (const permission of ["denied", "default"] as const) {
  const { env, shown, requests } = makeEnv(permission);
  const result = notifyChange("Cambio", env);
  if (result.channel !== "in-app") assert.fail("debe usar el aviso dentro de la app");
  assert.equal(result.reason, permission);
  assert.equal(result.message, "Cambio", "el usuario siempre recibe el aviso");
  assert.equal(shown.length, 0, "sin permiso no se muestra nada del sistema");
  assert.equal(requests(), 0, "notifyChange nunca pide permiso por su cuenta");
}

{
  const result = notifyChange("Cambio", null);
  if (result.channel !== "in-app") assert.fail("sin API debe usar el aviso dentro de la app");
  assert.equal(result.reason, "unsupported");
}

{
  const { env } = makeEnv("granted", { throwOnShow: true });
  const result = notifyChange("Cambio", env);
  if (result.channel !== "in-app") assert.fail("si falla el sistema, debe haber aviso dentro de la app");
  assert.equal(result.reason, "error");
}

{
  const long = "x".repeat(300);
  const { env, shown } = makeEnv("granted");
  notifyChange(long, env);
  assert.equal(shown[0].body?.length, 120, "el texto se recorta para limitar datos");

  const fallback = notifyChange(long, null);
  if (fallback.channel !== "in-app") assert.fail("debe ser aviso dentro de la app");
  assert.equal(fallback.message.length, 120);
}

{
  const unsupported = await requestNotificationPermission(null);
  assert.ok(!unsupported.ok);
  assert.equal(unsupported.reason, "unsupported");

  const { env } = makeEnv("default");
  const granted = await requestNotificationPermission(env);
  assert.ok(granted.ok);
  assert.equal(granted.permission, "granted");

  const failing: NotificationEnv = {
    permission: "default",
    requestPermission: async () => {
      throw new Error("x");
    },
    show: () => {},
  };
  const failed = await requestNotificationPermission(failing);
  assert.ok(!failed.ok);
  assert.equal(failed.reason, "error");
}

console.log("capabilities.spec.ts: PASS");