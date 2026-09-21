export function registerServiceWorker(): void {
  // En el servidor no existe "window": no hacer nada
  if (typeof window === "undefined") return;

  // Navegadores sin soporte: salir sin error
  if (!("serviceWorker" in navigator)) {
    console.info("[PWA] Este navegador no soporta service workers.");
    return;
  }

  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");

      // Se detectó una versión nueva del service worker
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            console.info(
              "[PWA] Hay una versión nueva. Se activará cuando se cierren las pestañas abiertas."
            );
          }
        });
      });
    } catch (error) {
      console.error("[PWA] No se pudo registrar el service worker:", error);
    }
  };

  // Si la página ya terminó de cargar, registrar de inmediato
  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register, { once: true });
  }
}