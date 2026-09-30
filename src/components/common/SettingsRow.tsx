"use client";

import { useEffect, useState } from "react";
import { Languages, Maximize, Minimize, Moon, Sun } from "lucide-react";
import { t } from "@/lib/i18n";
import { useGameStore } from "@/stores/game-store";

// Settings live inside the store panel (not the header) so the top bar
// stays to [score | logo | store] on every screen size.
export function SettingsRow() {
  const { state, setLang, setTheme } = useGameStore();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement != null);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    try {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen().catch(() => undefined);
    } catch {
      // Fullscreen unsupported — ignore.
    }
  };

  const themeLabel = state.theme === "dark" ? t(state.lang, "themeLight") : t(state.lang, "themeDark");
  const fullscreenLabel = isFullscreen ? t(state.lang, "fullscreenOff") : t(state.lang, "fullscreenOn");

  return (
    <div className="settings-row" role="group" aria-label="settings">
      <button type="button" onClick={() => setTheme(state.theme === "dark" ? "light" : "dark")}>
        {state.theme === "dark" ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
        <span>{themeLabel}</span>
      </button>
      <button type="button" onClick={() => setLang(state.lang === "ar" ? "en" : "ar")}>
        <Languages size={16} aria-hidden />
        <span>{t(state.lang, "langLabel")}</span>
      </button>
      <button type="button" onClick={toggleFullscreen}>
        {isFullscreen ? <Minimize size={16} aria-hidden /> : <Maximize size={16} aria-hidden />}
        <span>{fullscreenLabel}</span>
      </button>
    </div>
  );
}
