// Headers de seguridad y Content-Security-Policy — Semana 9.
//
// Este módulo es JavaScript plano (.mjs) a propósito: next.config.mjs se
// ejecuta con Node sin compilar y no puede importar TypeScript. Las pruebas
// (tests/security-headers.spec.mjs) importan este mismo archivo, así que lo que
// se prueba es exactamente lo que Next envía.
//
// Trade-offs documentados:
//
// - script-src 'unsafe-inline': Next 14 inyecta scripts en línea para hidratar
//   la página (self.__next_f.push(...)). La alternativa segura son los nonces,
//   pero exigen un middleware que genere uno por petición y obligan a renderizar
//   todas las páginas de forma dinámica. Eso choca con el modo offline: el
//   service worker sirve HTML guardado en caché, y ese HTML llevaría un nonce
//   viejo que ya no coincide con la cabecera. Se acepta el riesgo; la defensa
//   contra XSS sigue siendo que React escapa al mostrar y que el servidor
//   rechaza marcado activo (src/lib/security/input-guard.ts).
//
// - 'unsafe-eval' y ws:/wss: solo en desarrollo: el modo dev de Next usa eval
//   para el refresco en caliente y un websocket para recargar. En producción
//   no hacen falta y se quitan.
//
// - upgrade-insecure-requests NO va por defecto: obligaría al navegador a pedir
//   todo por https, y las pruebas E2E y `npm run start` corren en
//   http://localhost. Se activa con { upgradeInsecure: true } detrás de HTTPS.
//
// - Permissions-Policy deja camera=(self) y geolocation=(self) porque la
//   pantalla de captura (src/app/inspecciones/nueva) usa la cámara y la
//   ubicación. Con camera=() el botón "Adjuntar foto" siempre fallaría como
//   "permiso denegado". Micrófono, pagos y USB no se usan y quedan apagados.

/**
 * Construye la CSP como una sola cadena.
 * @param {{ dev?: boolean, upgradeInsecure?: boolean }} [options]
 * @returns {string}
 */
export function buildCsp({ dev = false, upgradeInsecure = false } = {}) {
  const directives = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...(dev ? ["ws:", "wss:"] : [])],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  const parts = Object.entries(directives).map(
    ([name, values]) => `${name} ${values.join(" ")}`
  );
  if (upgradeInsecure) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

/**
 * Lista de headers en el formato que espera `headers()` de next.config.
 * @param {{ dev?: boolean, upgradeInsecure?: boolean }} [options]
 * @returns {{ key: string, value: string }[]}
 */
export function securityHeaders({ dev = false, upgradeInsecure = false } = {}) {
  return [
    { key: "Content-Security-Policy", value: buildCsp({ dev, upgradeInsecure }) },
    // Impide que el navegador "adivine" el tipo de un archivo (p. ej. ejecutar
    // como script algo servido como texto).
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Respaldo de frame-ancestors para navegadores viejos: nadie nos enmarca.
    { key: "X-Frame-Options", value: "DENY" },
    // A otros sitios solo se les manda el origen, nunca la ruta (que puede
    // contener el id de una inspección).
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(self), microphone=(), payment=(), usb=(), geolocation=(self)",
    },
    // Aísla la ventana de la app de ventanas abiertas desde otros orígenes.
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    // El navegador lo ignora en http://localhost; aplica cuando hay HTTPS.
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  ];
}
