"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { t } from "@/lib/i18n";
import { getPlayerNode } from "@/lib/player-node";
import { useGameEngine } from "@/hooks/useGameEngine";
import { useGameStore } from "@/stores/game-store";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { NameGate } from "@/components/pages/NameGate";
import { StartMenu } from "@/components/pages/StartMenu";
import { PlayerShape } from "@/components/game/PlayerShape";
import { StoreDialog } from "@/components/game/StoreDialog";
import { EnemyFlyby } from "@/components/game/EnemyFlyby";
import { LahntTrap } from "@/components/game/LahntTrap";
import { BugLayer } from "@/components/game/BugLayer";
import { CheaterOverlay } from "@/components/game/CheaterOverlay";

const BossArena = dynamic(() => import("@/components/game/BossArena").then((m) => m.BossArena), {
  ssr: false,
  loading: () => <div id="bossArena" dir="rtl" aria-busy="true" />,
});

export function GameBoard() {
  const { state, boot, showGate } = useGameStore();
  const engine = useGameEngine();
  const [victory, setVictory] = useState(false);

  useEffect(() => {
    boot();
  }, [boot]);

  // The <html> root carries no lang/dir (global direction flips menus and
  // buttons), so the document language, theme, and store-title language are
  // applied here on <body> instead. No full reload needed on toggle.
  useEffect(() => {
    document.documentElement.lang = state.lang;
    document.body.dataset.lang = state.lang;
  }, [state.lang]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", state.theme === "dark");
  }, [state.theme]);

  // Light deterrent for the inspect-element route (mirrors guardDevTools).
  useEffect(() => {
    const onContext = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest?.(".score, .myPoints")) e.preventDefault();
    };
    const onDrag = (e: DragEvent) => {
      if ((e.target as HTMLElement).closest?.(".score, .myPoints")) e.preventDefault();
    };
    const onKey = (e: KeyboardEvent) => {
      const key = (e.key || "").toLowerCase();
      const combo = e.ctrlKey && e.shiftKey && "ijc".includes(key);
      if (key === "f12" || combo || (e.ctrlKey && key === "u")) {
        e.preventDefault();
      }
    };
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("dragstart", onDrag);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("dragstart", onDrag);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Clicking the player before start warns once (old `cheeter` handler).
  useEffect(() => {
    if (state.isGameRunning) return;
    const el = getPlayerNode();
    if (!el) return;
    const warn = () => {
      el.style.animation = "rotate 2s ease";
    };
    el.addEventListener("click", warn, { once: true });
    return () => el.removeEventListener("click", warn);
  }, [state.phase, state.isGameRunning]);

  // Cheater ending is full-screen: no header, no footer.
  if (state.phase === "cheater") {
    return <CheaterOverlay viaLahnt={engine.cheatViaLahnt} />;
  }

  const handleBossWin = () => {
    engine.onBossWin();
    setVictory(true);
    setTimeout(() => setVictory(false), 4000);
  };

  return (
    <>
      <Header />
      <main className="main_container">
        {/* Always-rendered heading + description: crawlers land on the name
            gate, so the H1 must not live inside a phase-gated panel. */}
        <h1 className="sr-only">كبسني — لعبة التكبيس العربية</h1>
        <p className="sr-only">{t(state.lang, "seoBlurb")}</p>
        <StoreDialog />
        <PlayerShape onTap={engine.onPlayerTap} />
        <NameGate />
        <StartMenu onStart={engine.start} onChangeName={showGate} />
        <EnemyFlyby visible={engine.invaderVisible} />
        <BugLayer bugs={engine.bugs} onKill={engine.killBug} />
        {engine.lahntVisible && <LahntTrap onYes={engine.lahntYes} onNo={engine.lahntNo} />}
        {engine.bossActive && (
          <BossArena onHit={engine.onBossHit} onDrain={engine.onBossDrain} onWin={handleBossWin} />
        )}
        {victory && (
          <div className="boss-victory" dir={state.lang === "ar" ? "rtl" : "ltr"}>
            <Trophy size={20} aria-hidden />
            <span>{t(state.lang, "bossVictory")}</span>
          </div>
        )}
      </main>
      <Footer saveEnabled={engine.saveEnabled} onSave={engine.endGame} />
    </>
  );
}
