"use client";

import { t } from "@/lib/i18n";
import { useGameStore } from "@/stores/game-store";
import { useAlert } from "@/hooks/useAlert";

interface FooterProps {
  saveEnabled: boolean;
  onSave: () => void;
}

export function Footer({ saveEnabled, onSave }: FooterProps) {
  const { state } = useGameStore();
  const alertUser = useAlert();

  const handleSave = () => {
    // Old behavior: the save listener was only attached after 10s, so early
    // clicks did nothing. Same gate here, plus a hint toast.
    if (!saveEnabled) {
      alertUser(t(state.lang, "saveWaitAlert"));
      return;
    }
    onSave();
  };

  return (
    <footer className="footer_container">
      <p>
        &copy; <a href="https://github.com/alaa-mekibes/kabisni">Alaa MEKIBES</a>
      </p>
      <div id="timer" style={{ fontWeight: 500, display: state.isGameRunning ? "block" : "none" }}>
        {state.elapsed.toFixed(1)}
      </div>
      <button
        id="save"
        type="button"
        title={saveEnabled ? undefined : t(state.lang, "saveWait")}
        style={{ display: state.isGameRunning || state.phase === "ended" ? "block" : "none", cursor: saveEnabled ? undefined : "no-drop" }}
        onClick={handleSave}
      >
        {t(state.lang, "saveBtn")}
      </button>
    </footer>
  );
}
