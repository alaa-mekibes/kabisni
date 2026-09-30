"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import { saveNickname } from "@/lib/nickname";
import { useGameStore } from "@/stores/game-store";
import { useAlert } from "@/hooks/useAlert";

export function NameGate() {
  const { state, setNickname } = useGameStore();
  const alertUser = useAlert();
  const [value, setValue] = useState("");

  if (state.phase !== "gate") return null;

  const submit = () => {
    const nickname = saveNickname(value);
    if (!nickname) {
      alertUser(t(state.lang, "needNickname"));
      return;
    }
    setValue("");
    setNickname(nickname);
  };

  return (
    <div dir={state.lang === "ar" ? "rtl" : "ltr"} id="nickname" className="start box" style={{ display: "flex" }}>
      <h2>{t(state.lang, "gateTitle")}</h2>
      <div className="inputs">
        <input
          id="nicknameInput"
          type="text"
          maxLength={16}
          placeholder={t(state.lang, "gatePlaceholder")}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          autoFocus
        />
      </div>
      <p className="ask">{t(state.lang, "gateAsk")}</p>
      <div className="buttons">
        <button id="saveNickname" type="button" onClick={submit}>
          {t(state.lang, "gateSave")}
        </button>
      </div>
    </div>
  );
}
