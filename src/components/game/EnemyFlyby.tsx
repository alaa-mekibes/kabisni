"use client";

import Image from "next/image";

export function EnemyFlyby({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="enemy" style={{ display: "block", animation: "invader-flyby 16s linear forwards" }}>
      <div className="space-invader" aria-hidden>
        <Image src="/img/space-invader.webp" alt="" width={64} height={64} style={{ opacity: 0 }} />
      </div>
    </div>
  );
}
