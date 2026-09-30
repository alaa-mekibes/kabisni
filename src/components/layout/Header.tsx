"use client";

import Image from "next/image";
import Link from "next/link";
import { Store } from "lucide-react";
import { t } from "@/lib/i18n";
import { useGameStore } from "@/stores/game-store";

// Slim top bar: [score | logo | store]. Theme/language/fullscreen live
// inside the store panel (SettingsRow) so nothing crowds the bar on phones.
export function Header() {
  const { state, setStoreOpen } = useGameStore();

  return (
    <header className="header_container">
      <div className="score">
        <span aria-live="polite">{state.score}</span>
      </div>
      <div className="logo">
        <Link href="/" aria-label="website logo">
          <Image src="/img/kabisni.webp" alt="كبسني" width={100} height={60} priority style={{ height: "auto" }} />
        </Link>
      </div>
      <div className="store_icon">
        <button type="button" className="store-btn" onClick={() => setStoreOpen(true)}>
          <Store size={16} />
          <span>{t(state.lang, "storeBtn")}</span>
        </button>
      </div>
    </header>
  );
}
