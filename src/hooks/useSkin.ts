"use client";

import { useCallback, useEffect } from "react";
import { readRaw, writeRaw } from "@/lib/storage";
import { useGameStore } from "@/stores/game-store";

// rememberTheSkin(): restores shape/color/animation from localStorage keys.
// Applies color via --bg-shape var, animation via inline style — same as old.
export function useSkin() {
  const { state, applySkin } = useGameStore();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.querySelector(":root") as HTMLElement | null;
    if (state.skinColor && root) root.style.setProperty("--bg-shape", state.skinColor);
  }, [state.skinColor]);

  const rememberSkin = useCallback(() => {
    applySkin({
      shape: readRaw("shape") ?? "circle",
      color: readRaw("color"),
      animation: readRaw("animation"),
    });
  }, [applySkin]);

  const chooseShape = useCallback(
    (shape: string) => {
      applySkin({ shape });
      writeRaw("shape", shape);
    },
    [applySkin],
  );

  const chooseColor = useCallback(
    (color: string) => {
      applySkin({ color });
      writeRaw("color", color);
    },
    [applySkin],
  );

  const chooseAnimation = useCallback(
    (animation: string) => {
      applySkin({ animation });
      writeRaw("animation", animation);
    },
    [applySkin],
  );

  return { shape: state.shape, color: state.skinColor, animation: state.skinAnimation, rememberSkin, chooseShape, chooseColor, chooseAnimation };
}
