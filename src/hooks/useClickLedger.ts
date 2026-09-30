"use client";

import { useCallback, useRef } from "react";

// Click ledger: score is mirrored from it, never the source of truth.
// Tracks peakClicksPerSecond for the burst ceiling (MAX_CLICKS_PER_SECOND).
export function useClickLedger() {
  const clicks = useRef<number[]>([]);
  const peak = useRef(0);

  const registerClick = useCallback((): number => {
    const now = performance.now();
    clicks.current.push(now);
    const windowStart = now - 1000;
    let recent = 0;
    for (let i = clicks.current.length - 1; i >= 0 && clicks.current[i] > windowStart; i--) {
      recent++;
    }
    if (recent > peak.current) peak.current = recent;
    return clicks.current.length;
  }, []);

  const getClicksLength = useCallback(() => clicks.current.length, []);
  const getPeak = useCallback(() => peak.current, []);
  const reset = useCallback(() => {
    clicks.current = [];
    peak.current = 0;
  }, []);

  return { registerClick, getClicksLength, getPeak, reset };
}
