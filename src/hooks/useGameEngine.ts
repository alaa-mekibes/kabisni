"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { currentAmbience, startAmbience, stopAmbience } from "@/lib/ambience";
import { detectTampering, isScoreValid } from "@/lib/anticheat";
import { randomPosition } from "@/lib/game-utils";
import { t, type Lang, type TxtKey } from "@/lib/i18n";
import { TIMINGS } from "@/lib/constants";
import { getPlayerNode } from "@/lib/player-node";
import { getUserColumnData, saveProgress } from "@/lib/progress";
import { useAlert } from "@/hooks/useAlert";
import { useClickLedger } from "@/hooks/useClickLedger";
import { useGameStore } from "@/stores/game-store";

export interface Bug {
  id: number;
  /** Fixed at spawn — never recomputed, so kills/spawns can't shift survivors. */
  x: number;
  y: number;
}

interface FloatPoint {
  x: number;
  y: number;
}

function pointPlus(p: string, clientX: number, clientY: number): void {
  if (typeof document === "undefined") return;
  const point = document.createElement("span");
  point.textContent = p;
  point.style.cssText = `position: fixed; left: ${clientX}px; top: ${clientY}px; color: red; font-weight: bold; z-index: 10; user-select: none; pointer-events: none; transition: all 0.5s ease-out;`;
  document.body.appendChild(point);
  setTimeout(() => {
    point.style.opacity = "0";
    point.style.transform = "translateY(-20px)";
  }, 0);
  setTimeout(() => point.remove(), 500);
}

function pointMinus(p: string, target: Element | FloatPoint): void {
  if (typeof document === "undefined") return;
  let x: number;
  let y: number;
  if (target && typeof (target as FloatPoint).x === "number") {
    const fp = target as FloatPoint;
    x = fp.x;
    y = fp.y;
  } else {
    const r = (target as Element).getBoundingClientRect();
    x = r.left + r.width / 2;
    y = r.top - 6;
  }
  const point = document.createElement("span");
  point.textContent = p;
  point.style.cssText = `position: fixed; left: ${x}px; top: ${y}px; transform: translate(-50%, -100%); color: #ff2d2d; font-size: 1.5rem; font-weight: 900; text-shadow: 0 2px 3px rgba(0,0,0,0.85), 0 0 8px rgba(0,0,0,0.6); z-index: 10; user-select: none; pointer-events: none; transition: all 0.5s ease-out;`;
  document.body.appendChild(point);
  setTimeout(() => {
    point.style.opacity = "0";
    point.style.transform = "translate(-50%, calc(-100% - 20px))";
  }, 600);
  setTimeout(() => point.remove(), 1100);
}

function playSound(src: string): void {
  try {
    void new Audio(src).play().catch(() => undefined);
  } catch {
    // Audio unavailable — game continues silently.
  }
}

// Orchestrates one run, mirroring the old startGame() closure 1:1:
// ledger-mirrored score, 10s save gate, 2s invader pass, 20s Lahnt trap,
// 50s bug wave (1 score/s drain, floor 0), then the 3D boss. Boss hits and
// boss-bug drains flow through the same ledger/sync path so the
// `score == storePoints - oldStorePoints` invariant always holds.
export function useGameEngine() {
  const { state, startRun, syncScore, drainScore, tick, endRun, markCheater } = useGameStore();
  const alertUser = useAlert();
  const ledger = useClickLedger();

  const [bugs, setBugs] = useState<Bug[]>([]);
  const [lahntVisible, setLahntVisible] = useState(false);
  const [invaderVisible, setInvaderVisible] = useState(false);
  const [bossActive, setBossActive] = useState(false);
  const [saveEnabled, setSaveEnabled] = useState(false);
  const [cheatViaLahnt, setCheatViaLahnt] = useState(false);

  const runningRef = useRef(false);
  const scoreRef = useRef(0);
  const storeRef = useRef(0);
  const oldStoreRef = useRef(0);
  const preScoreRef = useRef(0);
  const startTimeRef = useRef(0);
  const timers = useRef<number[]>([]);
  const intervals = useRef<number[]>([]);
  const bugSpawns = useRef(0);
  const bugsKilled = useRef(0);
  const lahntShown = useRef(false);
  const ended = useRef(false);

  useEffect(() => {
    runningRef.current = state.isGameRunning;
  }, [state.isGameRunning]);

  // UI language for toasts/banners. Ref-mirrored so long-lived timer
  // callbacks always read the current language without re-subscribing.
  const langRef = useRef<Lang>(state.lang);
  useEffect(() => {
    langRef.current = state.lang;
  }, [state.lang]);
  const ta = useCallback((key: TxtKey, vars?: Record<string, string | number>) => {
    return t(langRef.current, key, vars);
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);

  const clearAllTimers = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    intervals.current.forEach((i) => clearInterval(i));
    timers.current = [];
    intervals.current = [];
  }, []);

  const updateScore = useCallback(() => {
    const score = scoreRef.current;
    if (preScoreRef.current !== score) {
      storeRef.current += score - preScoreRef.current;
      preScoreRef.current = score;
      syncScore(score, storeRef.current);
    }
  }, [syncScore]);

  const movePlayer = useCallback(() => {
    const post = randomPosition();
    const player = getPlayerNode();
    if (player) {
      player.style.cssText = `left: calc(${Math.abs(post.randX)}% - 50px); top: calc(${Math.abs(post.randY)}% - 50px)`;
    }
  }, []);

  const triggerBoss = useCallback(() => {
    if (!runningRef.current || ended.current) return;
    const player = getPlayerNode();
    if (player) player.style.display = "none";
    setInvaderVisible(false);
    setBugs([]);
    setBossActive(true);
  }, []);

  const onWaveCleared = useCallback(() => {
    alertUser(ta("waveCleared"));
    later(() => {
      if (!runningRef.current || ended.current) return;
      triggerBoss();
    }, TIMINGS.bossDelayAfterWaveMs);
  }, [alertUser, later, ta, triggerBoss]);

  const killBug = useCallback(
    (id: number) => {
      setBugs((prev) => prev.filter((b) => b.id !== id));
      bugsKilled.current += 1;
      if (bugsKilled.current >= TIMINGS.maxBugs && runningRef.current && !ended.current) {
        onWaveCleared();
      }
    },
    [onWaveCleared],
  );

  const spawnBug = useCallback(() => {
    if (!runningRef.current || ended.current) return;
    const id = bugSpawns.current;
    // Position is rolled once here and stored on the bug — rendering never
    // re-rolls it, so killing or spawning a bug can't teleport the rest.
    const post = randomPosition();
    setBugs((prev) => [...prev, { id, x: Math.abs(post.randX), y: Math.abs(post.randY) }]);
    playSound("/sounds/Yippee.mp3");
    if (bugSpawns.current === 0) {
      alertUser(ta("bugsWarn"));
    }

    // Drain 1 score/sec while alive; floor at 0 preserves score==delta invariant.
    const drainId = window.setInterval(() => {
      if (!runningRef.current || ended.current) {
        clearInterval(drainId);
        return;
      }
      const el = typeof document !== "undefined" ? document.querySelector(`[data-bug="${id}"]`) : null;
      if (!el) {
        clearInterval(drainId);
        return;
      }
      if (scoreRef.current > 0) {
        scoreRef.current -= 1;
        storeRef.current -= 1;
        drainScore(scoreRef.current, storeRef.current);
        pointMinus("-1", el);
      }
    }, 1000);
    intervals.current.push(drainId);
  }, [alertUser, drainScore, ta]);

  const caughtCheating = useCallback(
    (viaLahnt = false) => {
      if (ended.current) return;
      ended.current = true;
      runningRef.current = false;
      clearAllTimers();
      stopAmbience();
      setBossActive(false);
      setLahntVisible(false);
      setCheatViaLahnt(viaLahnt);
      markCheater();
      try {
        const audio = new Audio("/sounds/cheater.mp3");
        void audio.play().catch(() => undefined);
        audio.addEventListener("ended", () => window.location.reload());
      } catch {
        // ignore
      }
      later(() => window.location.reload(), TIMINGS.cheatReloadMs);
    },
    [clearAllTimers, later, markCheater],
  );

  const endGame = useCallback(() => {
    if (!runningRef.current || ended.current) return;
    ended.current = true;
    runningRef.current = false;
    const duration = (performance.now() - startTimeRef.current) / 1000;
    clearAllTimers();
    stopAmbience();
    setBossActive(false);
    endRun();
    later(() => window.location.reload(), TIMINGS.endReloadMs);

    const shownScore = Number(document.querySelector(".score span")?.textContent ?? scoreRef.current);
    const shownStore = Number(document.querySelector("#pointStore")?.textContent ?? storeRef.current);
    const tampered = detectTampering({
      score: scoreRef.current,
      clicksLength: ledger.getClicksLength(),
      shownScore,
      shownStorePoints: shownStore,
      storePoints: storeRef.current,
      peakClicksPerSecond: ledger.getPeak(),
      duration,
    });
    if (
      isScoreValid(scoreRef.current, duration, storeRef.current, oldStoreRef.current) &&
      tampered.length === 0
    ) {
      saveProgress(scoreRef.current, storeRef.current);
      alertUser(ta("saveUpdated"), true);
    } else {
      caughtCheating(false);
    }
  }, [alertUser, caughtCheating, clearAllTimers, endRun, later, ledger, ta]);

  const onPlayerTap = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!runningRef.current || ended.current) return;
      const native = (e as unknown as { nativeEvent?: MouseEvent }).nativeEvent;
      if (native && "isTrusted" in native && !native.isTrusted) return;
      const score = ledger.registerClick();
      scoreRef.current = score;
      updateScore();
      pointPlus("+1", e.clientX, e.clientY);
    },
    [ledger, updateScore],
  );

  // Boss-arena hit: same ledger/sync path as a shape tap.
  const onBossHit = useCallback(
    (e: { clientX: number; clientY: number }) => {
      if (!runningRef.current || ended.current) return false;
      const score = ledger.registerClick();
      scoreRef.current = score;
      updateScore();
      pointPlus("+1", e.clientX, e.clientY);
      return true;
    },
    [ledger, updateScore],
  );

  // Boss-arena bug drain: 1 score/s each, floored at 0 (same invariant guard).
  const onBossDrain = useCallback(
    (anchor: { x: number; y: number }) => {
      if (!runningRef.current || ended.current || scoreRef.current <= 0) return false;
      scoreRef.current -= 1;
      storeRef.current -= 1;
      drainScore(scoreRef.current, storeRef.current);
      pointMinus("-1", anchor);
      return true;
    },
    [drainScore],
  );

  const start = useCallback(() => {
    if (runningRef.current) return;
    ended.current = false;
    runningRef.current = true;
    ledger.reset();
    bugSpawns.current = 0;
    bugsKilled.current = 0;
    lahntShown.current = false;
    scoreRef.current = 0;
    preScoreRef.current = 0;
    const oldStore = getUserColumnData("storePoints");
    oldStoreRef.current = oldStore;
    storeRef.current = oldStore;
    startRun(oldStore);
    startTimeRef.current = performance.now();
    startAmbience(currentAmbience());

    // Invader flyby: in at 2s (16s pass), out at 18s — 2s before Lahnt at 20s.
    later(() => {
      setInvaderVisible(true);
      playSound("/sounds/space-sound.mp3");
    }, TIMINGS.invaderInMs);
    later(() => setInvaderVisible(false), TIMINGS.invaderOutMs);

    later(() => alertUser(ta("saveReminder")), 5000);

    // Level 1 wander, then Lv2 interval.
    let count = 1;
    let vittese = 100;
    let loop = window.setInterval(function randomly() {
      count++;
      movePlayer();
      if (count % 3 === 0 && vittese > 100) {
        clearInterval(loop);
        vittese = Math.max(vittese - 100, 100);
        loop = window.setInterval(randomly, vittese);
        intervals.current.push(loop);
      }
      if (vittese === 100) {
        clearInterval(loop);
        const lv2 = window.setInterval(movePlayer, 900);
        intervals.current.push(lv2);
      }
    }, vittese);
    intervals.current.push(loop);

    // Save unlocks after 10s.
    later(() => setSaveEnabled(true), TIMINGS.saveUnlockMs);

    // Lahnt honeypot at 20s, once per run.
    later(() => {
      if (lahntShown.current) return;
      lahntShown.current = true;
      setLahntVisible(true);
      playSound("/sounds/Hi.mp3");
      later(() => setLahntVisible(false), TIMINGS.lahntAutoLeaveMs);
    }, TIMINGS.lahntInMs);

    // Hoarding bugs from 50s: one every 2s, up to 10.
    later(function bugLoop() {
      if (bugSpawns.current >= TIMINGS.maxBugs) return;
      spawnBug();
      bugSpawns.current += 1;
      later(bugLoop, TIMINGS.bugIntervalMs);
    }, TIMINGS.bugStartMs);

    // Timer ticker mirrors updateGameTimer.
    const ticker = window.setInterval(() => {
      tick((performance.now() - startTimeRef.current) / 1000);
    }, 100);
    intervals.current.push(ticker);
  }, [alertUser, later, ledger, movePlayer, spawnBug, ta, tick, startRun]);

  // Lahnt answers.
  const lahntYes = useCallback(() => {
    setLahntVisible(false);
    caughtCheating(true);
  }, [caughtCheating]);

  const lahntNo = useCallback(() => {
    setLahntVisible(false);
    alertUser(ta("trapThanks"));
  }, [alertUser, ta]);

  const onBossWin = useCallback(() => {
    setBossActive(false);
    const player = getPlayerNode();
    if (player) player.style.display = "";
    alertUser(ta("bossDown"));
  }, [alertUser, ta]);

  useEffect(() => () => clearAllTimers(), [clearAllTimers]);

  return {
    bugs,
    killBug,
    lahntVisible,
    lahntYes,
    lahntNo,
    invaderVisible,
    bossActive,
    onBossWin,
    onBossHit,
    onBossDrain,
    onPlayerTap,
    start,
    endGame,
    saveEnabled,
    cheatViaLahnt,
  };
}
