"use client";

import { useGameStore } from "@/stores/game-store";
import { setPlayerNode } from "@/lib/player-node";

interface PlayerShapeProps {
  onTap: (e: React.MouseEvent<HTMLDivElement>) => void;
}

// .shape.player — the skin class (circle/triangleUp/...) mirrors the old
// `player.classList[2]` swap. Position is written imperatively by the engine
// (see lib/player-node.ts); color via --bg-shape, animation inline.
export function PlayerShape({ onTap }: PlayerShapeProps) {
  const { state } = useGameStore();
  return (
    <div
      ref={setPlayerNode}
      className={`shape player ${state.shape}`}
      style={state.skinAnimation && state.skinAnimation !== "none" ? { animation: `1s ${state.skinAnimation} infinite` } : undefined}
      onClick={onTap}
      role="button"
      aria-label="كبّس الشكل"
    />
  );
}
