"use client";

import Image from "next/image";
import { t } from "@/lib/i18n";
import { useGameStore } from "@/stores/game-store";

interface LahntTrapProps {
  onYes: () => void;
  onNo: () => void;
}

export function LahntTrap({ onYes, onNo }: LahntTrapProps) {
  const { state } = useGameStore();
  return (
    <div className="lahnt-trap" dir={state.lang === "ar" ? "rtl" : "ltr"} role="dialog" aria-label="عرض لهنت">
      <Image src="/img/lahnt.webp" alt="لهنت" width={110} height={110} style={{ height: "auto" }} />
      <p>
        {t(state.lang, "trapWant")} <strong>+9999</strong> {t(state.lang, "trapIllegal")}
      </p>
      <div className="lahnt-buttons">
        <button type="button" className="lahnt-yes" onClick={onYes}>
          {t(state.lang, "trapYes")}
        </button>
        <button type="button" className="lahnt-no" onClick={onNo}>
          {t(state.lang, "trapNo")}
        </button>
      </div>
    </div>
  );
}
