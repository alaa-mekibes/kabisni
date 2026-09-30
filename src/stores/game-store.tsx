"use client";

import { createContext, useCallback, useContext, useMemo, useReducer } from "react";
import type { ReactNode } from "react";
import { currentAmbience, type AmbienceName } from "@/lib/ambience";
import { getProgress } from "@/lib/progress";
import { currentNickname } from "@/lib/nickname";
import { getLang, getTheme, persistLang, persistTheme, type Lang, type Theme } from "@/lib/i18n";
import { readRaw } from "@/lib/storage";

export type GamePhase = "gate" | "menu" | "running" | "cheater" | "ended";

interface GameState {
  phase: GamePhase;
  nickname: string;
  score: number;
  storePoints: number;
  bestScore: number;
  isGameRunning: boolean;
  shape: string;
  skinColor: string | null;
  skinAnimation: string | null;
  ambience: AmbienceName;
  storeOpen: boolean;
  elapsed: number;
  lang: Lang;
  theme: Theme;
}

type GameAction =
  | { type: "BOOT"; nickname: string }
  | { type: "SET_NICKNAME"; nickname: string }
  | { type: "START_RUN"; storePoints: number }
  | { type: "SCORE"; score: number; storePoints: number }
  | { type: "DRAIN"; score: number; storePoints: number }
  | { type: "TICK"; elapsed: number }
  | { type: "APPLY_SKIN"; shape?: string; color?: string | null; animation?: string | null }
  | { type: "SET_AMBIENCE"; ambience: AmbienceName }
  | { type: "SET_STORE_OPEN"; open: boolean }
  | { type: "END_RUN" }
  | { type: "CHEATER" }
  | { type: "SHOW_GATE" }
  | { type: "SET_LANG"; lang: Lang }
  | { type: "SET_THEME"; theme: Theme };

function initState(): GameState {
  return {
    phase: "gate",
    nickname: "",
    score: 0,
    storePoints: 0,
    bestScore: 0,
    isGameRunning: false,
    shape: "circle",
    skinColor: null,
    skinAnimation: null,
    ambience: "wind",
    storeOpen: false,
    elapsed: 0,
    lang: "ar",
    theme: "light",
  };
}

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "BOOT":
      return { ...state, nickname: action.nickname, phase: action.nickname ? "menu" : "gate" };
    case "SET_NICKNAME":
      return { ...state, nickname: action.nickname, phase: "menu" };
    case "START_RUN":
      return {
        ...state,
        phase: "running",
        isGameRunning: true,
        score: 0,
        storePoints: action.storePoints,
        elapsed: 0,
      };
    case "SCORE":
    case "DRAIN":
      return { ...state, score: action.score, storePoints: action.storePoints };
    case "TICK":
      return { ...state, elapsed: action.elapsed };
    case "APPLY_SKIN":
      return {
        ...state,
        shape: action.shape ?? state.shape,
        skinColor: action.color !== undefined ? action.color : state.skinColor,
        skinAnimation: action.animation !== undefined ? action.animation : state.skinAnimation,
      };
    case "SET_AMBIENCE":
      return { ...state, ambience: action.ambience };
    case "SET_STORE_OPEN":
      return { ...state, storeOpen: action.open };
    case "END_RUN":
      return { ...state, phase: "ended", isGameRunning: false };
    case "CHEATER":
      return { ...state, phase: "cheater", isGameRunning: false };
    case "SHOW_GATE":
      return { ...state, phase: "gate" };
    case "SET_LANG":
      return { ...state, lang: action.lang };
    case "SET_THEME":
      return { ...state, theme: action.theme };
    default:
      return state;
  }
}

interface GameStore {
  state: GameState;
  boot(): void;
  setNickname(nickname: string): void;
  startRun(storePoints: number): void;
  syncScore(score: number, storePoints: number): void;
  drainScore(score: number, storePoints: number): void;
  tick(elapsed: number): void;
  applySkin(patch: { shape?: string; color?: string | null; animation?: string | null }): void;
  setAmbience(ambience: AmbienceName): void;
  setStoreOpen(open: boolean): void;
  endRun(): void;
  markCheater(): void;
  showGate(): void;
  setLang(lang: Lang): void;
  setTheme(theme: Theme): void;
}

const GameContext = createContext<GameStore | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState);

  const boot = useCallback(() => {
    const progress = getProgress();
    dispatch({ type: "BOOT", nickname: currentNickname() });
    dispatch({ type: "SCORE", score: progress.score, storePoints: progress.storePoints });
    dispatch({
      type: "APPLY_SKIN",
      shape: readRaw("shape") ?? "circle",
      color: readRaw("color"),
      animation: readRaw("animation"),
    });
    dispatch({ type: "SET_AMBIENCE", ambience: currentAmbience() });
    dispatch({ type: "SET_LANG", lang: getLang() });
    dispatch({ type: "SET_THEME", theme: getTheme() });
  }, []);

  const value = useMemo<GameStore>(
    () => ({
      state,
      boot,
      setNickname: (nickname) => dispatch({ type: "SET_NICKNAME", nickname }),
      startRun: (storePoints) => dispatch({ type: "START_RUN", storePoints }),
      syncScore: (score, storePoints) => dispatch({ type: "SCORE", score, storePoints }),
      drainScore: (score, storePoints) => dispatch({ type: "DRAIN", score, storePoints }),
      tick: (elapsed) => dispatch({ type: "TICK", elapsed }),
      applySkin: (patch) => dispatch({ type: "APPLY_SKIN", ...patch }),
      setAmbience: (ambience) => dispatch({ type: "SET_AMBIENCE", ambience }),
      setStoreOpen: (open) => dispatch({ type: "SET_STORE_OPEN", open }),
      endRun: () => dispatch({ type: "END_RUN" }),
      markCheater: () => dispatch({ type: "CHEATER" }),
      showGate: () => dispatch({ type: "SHOW_GATE" }),
      setLang: (lang) => {
        persistLang(lang);
        dispatch({ type: "SET_LANG", lang });
      },
      setTheme: (theme) => {
        persistTheme(theme);
        dispatch({ type: "SET_THEME", theme });
      },
    }),
    [state, boot],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGameStore(): GameStore {
  const store = useContext(GameContext);
  if (!store) throw new Error("useGameStore must be used inside <GameProvider>");
  return store;
}
