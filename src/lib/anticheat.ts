import { MAX_CLICKS_PER_SECOND } from "./constants";

// Client-side deterrence, not a guarantee — the real fix would be a server.
// INVARIANTS (do not "fix" score math without preserving these):
//   1. score is mirrored from the clicks ledger, never the source of truth.
//   2. score == newStorePoints - oldStorePoints must hold at game over.
//   3. score <= duration * 10 is checked ONLY in isScoreValid (two clocks
//      disagreeing in detectTampering falsely accused honest fast players).

export type TamperReason =
  | "ledger"
  | "displayed-score"
  | "displayed-store"
  | "click-rate"
  | "no-duration";

export interface TamperSnapshot {
  score: number;
  clicksLength: number;
  shownScore: number;
  shownStorePoints: number;
  storePoints: number;
  peakClicksPerSecond: number;
  duration: number;
}

export function isScoreValid(
  score: number,
  duration: number,
  newStorePoints: number,
  oldStorePoints: number,
): boolean {
  const maxPossibleScore = duration * 10;
  if (score > maxPossibleScore) return false;
  if (score !== newStorePoints - oldStorePoints) return false;
  return true;
}

export function detectTampering(snap: TamperSnapshot): TamperReason[] {
  const reasons: TamperReason[] = [];
  if (snap.score !== snap.clicksLength) reasons.push("ledger");
  if (snap.shownScore !== snap.score) reasons.push("displayed-score");
  if (snap.shownStorePoints !== snap.storePoints) reasons.push("displayed-store");
  if (snap.peakClicksPerSecond > MAX_CLICKS_PER_SECOND) reasons.push("click-rate");
  if (snap.duration <= 0) reasons.push("no-duration");
  return reasons;
}
