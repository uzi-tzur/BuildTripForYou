"use client";

import { useEffect } from "react";

/** Registers the service worker in production only — leaves dev's hot reload alone. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline caching is a nice-to-have — the app still works without it.
    });
  }, []);

  return null;
}
