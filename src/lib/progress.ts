import { KEYS } from "./constants";
import { readStore, writeStore } from "./storage";

export interface Progress {
  score: number;
  storePoints: number;
}

/** Progress = best score + store balance. Same shape the old `scores` row had. */
export function getProgress(): Progress {
  const saved = readStore<Progress | null>(KEYS.progress, null);
  if (!saved || typeof saved.score !== "number" || typeof saved.storePoints !== "number") {
    return { score: 0, storePoints: 0 };
  }
  return {
    score: Math.max(0, Math.floor(saved.score)),
    storePoints: Math.max(0, Math.floor(saved.storePoints)),
  };
}

/** Kept on purpose: same name/call-sites as the old backend reader, now synchronous. */
export function getUserColumnData(col: keyof Progress): number {
  return getProgress()[col];
}

/** Keeps the best score, always overwrites the store balance (old upsert semantics). */
export function saveProgress(score: number, storePoints: number): void {
  const previous = getProgress();
  writeStore(KEYS.progress, {
    score: Math.max(previous.score, score),
    storePoints,
  });
}
