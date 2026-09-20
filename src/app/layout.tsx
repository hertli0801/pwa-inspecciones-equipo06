import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterServiceWorker } from "@/components/register-service-worker";


export const metadata: Metadata = {
  title: "Inspecciones de laboratorio",
  description: "Proyecto base de Aplicaciones Web Progresivas",
  manifest: "/manifest.webmanifest",
  icons:{
    icon: [
    {url: "/icons/icon-192.png", sizes: "192x192", type: "image/png"},
    {url: "/icons/icon-512.png", sizes: "512x512", type: "image/png"}
    ],
    apple: "/icons/icon-192.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#0f4c81",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX">
      <body><RegisterServiceWorker />{children}</body>
    </html>
  );
}

