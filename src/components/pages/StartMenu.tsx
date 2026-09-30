"use client";

import { t } from "@/lib/i18n";
import { currentNickname } from "@/lib/nickname";
import { useGameStore } from "@/stores/game-store";

interface StartMenuProps {
  onStart: () => void;
  onChangeName: () => void;
}

export function StartMenu({ onStart, onChangeName }: StartMenuProps) {
  const { state } = useGameStore();
  if (state.phase !== "menu") return null;

  return (
    <div dir={state.lang === "ar" ? "rtl" : "ltr"} id="start_menu" className="start box" style={{ display: "flex" }}>
      <h2>{t(state.lang, "menuTitle")}</h2>
      <span id="username-display">{state.nickname || currentNickname()}</span>
      <p className="ask">
        {state.lang === "ar" ? "مستعجل؟ " : "In a hurry? "}
        <button id="changeName" type="button" onClick={onChangeName}>
          {t(state.lang, "changeName")}
        </button>
      </p>
      <div className="buttons">
        <button id="start" type="button" onClick={onStart}>
          {t(state.lang, "startBtn")}
        </button>
      </div>
    </div>
  );
}
