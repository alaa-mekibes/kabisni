// Single source of truth for game tuning — mirrors old/assets/js/main.js values.
// Do not retune without preserving the anti-cheat invariants documented below.

export const KEYS = {
  nickname: "kabisni:nickname",
  progress: "kabisni:progress",
  ambience: "kabisni:ambience",
} as const;

export const MAX_NICKNAME_LENGTH = 16;

/** Burst ceiling only — sustained limit lives in isScoreValid (duration * 10). */
export const MAX_CLICKS_PER_SECOND = 20;

/** Classic 11x8 invader — same sprite as public/img/space-invader.webp. */
export const INVADER_SPRITE: readonly string[] = [
  "..X.....X..",
  "...X...X...",
  "..XXXXXXX..",
  ".XX.XXX.XX.",
  "XXXXXXXXXXX",
  "X.XXXXXXX.X",
  "X.X.....X.X",
  "...XX.XX...",
];

export const TIMINGS = {
  saveUnlockMs: 10_000,
  invaderInMs: 2_000,
  invaderOutMs: 18_000,
  lahntInMs: 20_000,
  lahntAutoLeaveMs: 6_000,
  bugStartMs: 50_000,
  bugIntervalMs: 2_000,
  maxBugs: 10,
  bossDelayAfterWaveMs: 5_000,
  endReloadMs: 3_000,
  cheatReloadMs: 8_000,
  bossHp: 20,
} as const;

export const SITE_URL = "https://kabisni.vercel.app";
