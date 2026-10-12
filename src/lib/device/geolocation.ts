export type PositionLike = { coords: { latitude: number; longitude: number } };

export type GeoHost = {
  geolocation?: {
    getCurrentPosition(
      success: (position: PositionLike) => void,
      error: (error: { code: number }) => void,
      options?: { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number }
    ): void;
  };
};

export type LocationResult =
  | { ok: true; latitude: number; longitude: number }
  | { ok: false; reason: "unsupported" | "denied" | "unavailable" | "timeout" };

/** 2 decimales equivalen a ~1 km: suficiente para ubicar un edificio del campus sin rastrear a la persona. */
export function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Ubicación aproximada y opcional. Debe llamarse desde un clic. Sin
 * ubicación, la inspección se guarda igual.
 */
export function getApproximateLocation(
  host: GeoHost = defaultHost()
): Promise<LocationResult> {
  const geo = host.geolocation;
  if (!geo || typeof geo.getCurrentPosition !== "function") {
    return Promise.resolve({ ok: false, reason: "unsupported" });
  }

  return new Promise((resolve) => {
    try {
      geo.getCurrentPosition(
        (position) =>
          resolve({
            ok: true,
            latitude: roundCoordinate(position.coords.latitude),
            longitude: roundCoordinate(position.coords.longitude),
          }),
        (error) => {
          if (error.code === 1) resolve({ ok: false, reason: "denied" });
          else if (error.code === 3) resolve({ ok: false, reason: "timeout" });
          else resolve({ ok: false, reason: "unavailable" });
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
      );
    } catch {
      resolve({ ok: false, reason: "unavailable" });
    }
  });
}

function defaultHost(): GeoHost {
  return typeof navigator !== "undefined" ? (navigator as unknown as GeoHost) : {};
}
