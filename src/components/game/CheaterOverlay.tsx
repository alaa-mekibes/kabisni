"use client";

import { useState } from "react";
import { Skull } from "lucide-react";
import { t } from "@/lib/i18n";
import { useGameStore } from "@/stores/game-store";

interface Drip {
  id: number;
  left: string;
  height: string;
  duration: string;
  delay: string;
}

function makeDrips(): Drip[] {
  return Array.from({ length: 14 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    height: `${40 + Math.random() * 90}px`,
    duration: `${1.6 + Math.random() * 2.2}s`,
    delay: `${(Math.random() * 2).toFixed(2)}s`,
  }));
}

// Full-screen horror scene — rendered WITHOUT header/footer (see GameBoard).
export function CheaterOverlay({ viaLahnt }: { viaLahnt: boolean }) {
  const { state } = useGameStore();
  const [drips] = useState<Drip[]>(makeDrips);
  return (
    <div className="cheaterPage">
      <div className="blood-bar" />
      <div className="blood-drips">
        {drips.map((d) => (
          <span
            key={d.id}
            className="blood-drip"
            style={{ left: d.left, height: d.height, animationDuration: d.duration, animationDelay: d.delay }}
          />
        ))}
      </div>
      <Skull size={44} color="#dc2626" aria-hidden />
      <p className="cheaterText" data-text="Why are you cheating ?">
        Why are you cheating ?
      </p>
      <p className="cheaterSub" dir={state.lang === "ar" ? "rtl" : "ltr"}>
        {t(state.lang, viaLahnt ? "cheatLahnt" : "cheatHand")}
      </p>
    </div>
  );
}
