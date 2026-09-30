"use client";

import { useCallback } from "react";

// Mirrors old alertUser(): toast span.alert in .main_container + alert.mp3,
// auto fade after 5s. Scoped to the board so SSR never touches document.
// `exclusive` clears any visible toast first so confirmations (e.g. save)
// can never hide behind an older message.
export function useAlert() {
  return useCallback((msg: string, exclusive = false) => {
    if (typeof document === "undefined") return;
    const host = document.querySelector(".main_container");
    if (!host) return;
    if (exclusive) host.querySelectorAll(".alert").forEach((el) => el.remove());
    const el = document.createElement("span");
    el.className = "alert";
    el.dir = "rtl";
    el.textContent = msg ?? "null";
    el.style.display = "block";
    el.style.userSelect = "none";
    host.appendChild(el);
    try {
      const sound = new Audio("/sounds/alert.mp3");
      void sound.play().catch(() => undefined);
    } catch {
      // Audio unavailable — toast still shows.
    }
    setTimeout(() => {
      el.style.animation = "fade-out 1s";
      setTimeout(() => el.remove(), 999);
    }, 5000);
  }, []);
}
