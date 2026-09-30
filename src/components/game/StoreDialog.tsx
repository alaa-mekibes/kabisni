"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CloudLightning, CloudRain, Coins, Lock, VolumeX, Waves, Wind, X, type LucideIcon } from "lucide-react";
import { SettingsRow } from "@/components/common/SettingsRow";
import { AMBIENCE_NAMES, currentAmbience, persistAmbience, startAmbience, stopAmbience, type AmbienceName } from "@/lib/ambience";
import { t, type TxtKey } from "@/lib/i18n";
import { ANIMATIONS, chunkPairs, COLORS, isUnlocked, priceClass, SHAPES, type SkinCategory, type SkinProduct } from "@/lib/skins";
import { useGameStore } from "@/stores/game-store";
import { useSkin } from "@/hooks/useSkin";

type Tab = SkinCategory | "sounds";

const AMBIENCE_LABELS: Record<AmbienceName, TxtKey> = {
  wind: "ambienceWind",
  rain: "ambienceRain",
  ocean: "ambienceOcean",
  thunder: "ambienceThunder",
  off: "ambienceOff",
};

const AMBIENCE_ICONS: Record<AmbienceName, LucideIcon> = {
  wind: Wind,
  rain: CloudRain,
  ocean: Waves,
  thunder: CloudLightning,
  off: VolumeX,
};

function ProductTile({ product, unlocked, selected, priceSuffix, autoFocusRef, onPick }: { product: SkinProduct; unlocked: boolean; selected: boolean; priceSuffix: string; autoFocusRef?: (node: HTMLDivElement | null) => void; onPick: () => void }) {
  return (
    <div
      ref={selected ? autoFocusRef : undefined}
      role="button"
      tabIndex={unlocked ? 0 : -1}
      aria-pressed={selected}
      aria-label={`${product.id} — ${product.price} ${priceSuffix}`}
      className={`box ${priceClass(product.price)}${unlocked ? " Unlocked no-before" : ""}`}
      style={{
        pointerEvents: unlocked ? "all" : "none",
        backgroundColor: selected ? "rgba(255, 215, 0, 0.23)" : undefined,
      }}
      onClick={unlocked ? onPick : undefined}
      onKeyDown={unlocked ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(); } } : undefined}
    >
      {!unlocked && <Lock className="lock-icon" size={22} aria-hidden />}
      <span dir="rtl">{product.price} {priceSuffix}</span>
      {product.category === "shape" && <div className={`${product.id} storeBox shape`} />}
      {product.category === "color" && (
        <div className="circle storeBox color" style={{ backgroundColor: product.id }} />
      )}
      {product.category === "animation" && (
        <div
          className="circle storeBox animation"
          style={{ animation: `1s ${product.id} infinite`, transformOrigin: "top" }}
        />
      )}
    </div>
  );
}

export function StoreDialog() {
  const { state, setStoreOpen, setAmbience } = useGameStore();
  const { shape, color, animation, chooseShape, chooseColor, chooseAnimation } = useSkin();
  const [tab, setTab] = useState<Tab>("shape");

  const rows = useMemo(() => {
    if (tab === "shape") return chunkPairs(SHAPES);
    if (tab === "color") return chunkPairs(COLORS);
    if (tab === "animation") return chunkPairs(ANIMATIONS);
    return [];
  }, [tab]);

  const storeRef = useRef<HTMLDivElement | null>(null);

  // Autofocus the equipped (last-clicked) item whenever its tab mounts —
  // opening the store or switching tabs lands focus + highlight on it.
  const focusEquipped = useCallback((node: HTMLDivElement | HTMLButtonElement | null) => {
    if (node) {
      node.focus({ preventScroll: true });
      node.scrollIntoView({ block: "nearest" });
    }
  }, []);

  // Close when clicking outside the panel (ignoring the opener button) or
  // pressing Escape — same dismissal the old document-click handler gave.
  useEffect(() => {
    if (!state.storeOpen) return;
    const onDown = (e: PointerEvent) => {
      if (storeRef.current?.contains(e.target as Node)) return;
      if ((e.target as HTMLElement).closest?.(".store_icon")) return;
      setStoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStoreOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [state.storeOpen, setStoreOpen]);

  if (!state.storeOpen) return null;

  const pick = (p: SkinProduct) => {
    if (p.category === "shape") chooseShape(p.id);
    if (p.category === "color") chooseColor(p.id);
    if (p.category === "animation") chooseAnimation(p.id);
  };

  const isSelected = (p: SkinProduct) => {
    if (p.category === "shape") return shape === p.id;
    if (p.category === "color") return color === p.id;
    return animation === p.id || (p.id === "none" && !animation);
  };

  const previewAmbience = (name: AmbienceName) => {
    persistAmbience(name);
    setAmbience(name);
    stopAmbience();
    if (name !== "off") {
      startAmbience(name);
      if (!state.isGameRunning) setTimeout(() => stopAmbience(), 2500);
    }
  };

  return (
    <div ref={storeRef} className="store" style={{ display: "block" }}>
      <div className="close_container">
        <span className="close" title="close" onClick={() => setStoreOpen(false)}>
          <X />
        </span>
      </div>
      <SettingsRow />
      <div className="myPoints">
        <p><Coins size={16} className="inline-block align-middle" aria-hidden /> {t(state.lang, "balance")}: <span id="pointStore">{state.storePoints}</span> {t(state.lang, "currency")}</p>
      </div>
      <ul id="menu" className="menu">
        <li><button id="skins" type="button" onClick={() => setTab("shape")}>skins</button></li>
        <li><button id="animations" type="button" onClick={() => setTab("animation")}>animations</button></li>
        <li><button id="colors" type="button" onClick={() => setTab("color")}>colors</button></li>
        <li><button id="sounds" type="button" onClick={() => setTab("sounds")}>sounds</button></li>
      </ul>
      {tab !== "sounds"
        ? rows.map((row, i) => (
            <div key={i} className={`row ${tab === "shape" ? "skin" : "color"}`}>
              {row.map((p) => (
                <ProductTile
                  key={`${p.category}-${p.id}`}
                  product={p}
                  unlocked={isUnlocked(state.storePoints, p.price)}
                  selected={isSelected(p)}
                  priceSuffix={t(state.lang, "currency")}
                  autoFocusRef={focusEquipped}
                  onPick={() => pick(p)}
                />
              ))}
            </div>
          ))
        : (
          <div className="row sounds-list">
            {AMBIENCE_NAMES.map((name) => {
              const Icon = AMBIENCE_ICONS[name];
              const isCurrent = currentAmbience() === name;
              return (
                <button
                  key={name}
                  type="button"
                  ref={isCurrent ? focusEquipped : undefined}
                  className={isCurrent ? "selected" : undefined}
                  onClick={() => previewAmbience(name)}
                >
                  <Icon size={16} className="inline-block align-middle" aria-hidden />{" "}
                  {t(state.lang, AMBIENCE_LABELS[name])}
                </button>
              );
            })}
          </div>
        )}
    </div>
  );
}
