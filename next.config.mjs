import { securityHeaders } from "./src/lib/security/headers.mjs";

const dev = process.env.NODE_ENV !== "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No anunciar "X-Powered-By: Next.js": no aporta nada y da pistas a un atacante.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders({ dev }),
      },
      {
        // El navegador debe revisar siempre si hay un service worker nuevo;
        // si se cacheara, una corrección de sw.js tardaría en llegar.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
};

export default nextConfig;
