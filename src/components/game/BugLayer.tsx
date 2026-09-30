"use client";

import Image from "next/image";
import type { Bug } from "@/hooks/useGameEngine";

// Positions come from the bug itself (rolled once at spawn in the engine).
// This layer never computes randomness, so mounting/unmounting one bug
// can't shift or hide the others.
export function BugLayer({ bugs, onKill }: { bugs: Bug[]; onKill: (id: number) => void }) {
  return (
    <>
      {bugs.map((bug) => (
        <Image
          key={bug.id}
          data-bug={bug.id}
          src="/img/Hoarding_Bug_Lethal_Company.webp"
          alt="هورينغ"
          width={60}
          height={60}
          onDoubleClick={() => onKill(bug.id)}
            className="bug"
            style={{
              position: "absolute",
              width: 60,
              height: "auto",
              zIndex: 8,
            left: `calc(${bug.x}% - 50px)`,
            top: `calc(${bug.y}% - 50px)`,
            cursor: "pointer",
            animation: "bug linear 2s infinite, bug-drain-pulse 1s ease-in-out infinite",
          }}
        />
      ))}
    </>
  );
}
