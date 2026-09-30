import { KEYS } from "./constants";
import { readStore, writeStore } from "./storage";

// Ambience engine, generated — no audio files, no music. Looped noise through
// a filter with an LFO for movement. Created on user gesture (Start/select).

export type AmbienceName = "wind" | "rain" | "ocean" | "thunder" | "off";

interface AmbienceRecipe {
  label: string;
  type?: BiquadFilterType;
  freq?: number;
  gain?: number;
  lfoRate?: number;
  lfoDepth?: number;
  lfoTarget?: "gain" | "freq";
}

export const AMBIENCES: Record<AmbienceName, AmbienceRecipe> = {
  wind: { label: "رياح 🌬", type: "lowpass", freq: 400, gain: 0.0575, lfoRate: 0.13, lfoDepth: 0.0345, lfoTarget: "gain" },
  rain: { label: "مطر 🌧", type: "highpass", freq: 2200, gain: 0.035, lfoRate: 2.5, lfoDepth: 0.008, lfoTarget: "gain" },
  ocean: { label: "أمواج 🌊", type: "lowpass", freq: 700, gain: 0.06, lfoRate: 0.1, lfoDepth: 350, lfoTarget: "freq" },
  thunder: { label: "رعد ⛈", type: "lowpass", freq: 240, gain: 0.28, lfoRate: 0.07, lfoDepth: 0.15, lfoTarget: "gain" },
  off: { label: "صامت 🔇" },
};

export const AMBIENCE_NAMES = Object.keys(AMBIENCES) as AmbienceName[];

interface AmbienceNodes {
  ctx: AudioContext;
  src: AudioBufferSourceNode;
  lfo: OscillatorNode;
}

let ambienceNodes: AmbienceNodes | null = null;

export function currentAmbience(): AmbienceName {
  const saved = readStore<string>(KEYS.ambience, "wind");
  return saved in AMBIENCES ? (saved as AmbienceName) : "wind";
}

export function persistAmbience(name: AmbienceName): void {
  writeStore(KEYS.ambience, name);
}

export function startAmbience(name: AmbienceName): void {
  const recipe = AMBIENCES[name];
  if (!recipe || name === "off") return;
  stopAmbience();
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx || recipe.type === undefined) return;
    const ctx = new Ctx();
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = recipe.type;
    filter.frequency.value = recipe.freq ?? 400;
    const gain = ctx.createGain();
    gain.gain.value = recipe.gain ?? 0.05;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = recipe.lfoRate ?? 0.1;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = recipe.lfoDepth ?? 0.03;
    lfo.connect(lfoGain);
    if (recipe.lfoTarget === "freq") lfoGain.connect(filter.frequency);
    else lfoGain.connect(gain.gain);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    lfo.start();
    ambienceNodes = { ctx, src, lfo };
  } catch {
    // Audio unavailable — game continues silently.
  }
}

export function stopAmbience(): void {
  if (!ambienceNodes) return;
  try {
    ambienceNodes.src.stop();
    ambienceNodes.lfo.stop();
    void ambienceNodes.ctx.close();
  } catch {
    // Already stopped — ignore.
  }
  ambienceNodes = null;
}
