"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // In production or development with service worker support
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          registration.addEventListener("updatefound", () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener("statechange", () => {
                if (
                  installingWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  // A new version is available
                }
              });
            }
          });
        })
        .catch((error) => {
          // Log or ignore service worker registration errors in unsupported contexts
          console.debug("Service worker registration ignored:", error);
        });
    }
  }, []);

  return null;
}
