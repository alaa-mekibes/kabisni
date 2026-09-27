# AGENTS.md — Kabisni (كبسني) clicker game

Static Arabic RTL browser game. No framework, no build, no tests, no package manager.

## Run / preview

- No `package.json`, build, lint, or test commands. Do not add tooling unprompted.
- Preview: open `index.html` directly, or serve the repo root statically (e.g. `python -m http.server`). The entry is a **classic script, not `type="module"`** — modules are CORS-blocked on `file://`, which left the page dead with no error. `main.js` has no imports/exports; keep it that way, or the `file://` path breaks again.
- A load-time crash now paints a `.fatalError` overlay (registered first thing in `main.js`). If a user reports a dead page, read that message before debugging game logic.
- After a deploy, ask testers for a hard refresh (Ctrl+Shift+R).
- Live site: [https://kabisni.vercel.app/](https://kabisni.vercel.app/)

## Structure

- `index.html` — all UI markup (name gate, start menu, store, enemy). Entry point.
- `assets/js/main.js` (single monolith) — local data layer, name gate, store/skins, game loop levels, scoring, anti-cheat.
- `assets/css/style.css` — all styles; CSS var `--bg-shape` controls player color.
- `assets/img/`, `assets/sound/` — referenced by relative path; keep filenames as-is (one contains Arabic: `كبسني.webp`).
- `assets/js/manifest.json` — PWA manifest, linked from `index.html` head as a local path.

## Backend: none (online experiment removed)

- No server, no auth, no network calls. The game is fully offline: everything persists
  in `localStorage` (best score + store balance only). There is no leaderboard —
  it was removed (button, board, and scoring history); see git history if it ever returns.
- Do not reintroduce keys in the repo. A past experiment loaded
  `assets/js/supabase-config.js` (gitignored publishable key) and a `public.scores`
  table with RLS + CHECKs; it was removed — see git history if it ever returns.
- Everything persists in `localStorage` under `kabisni:*` keys: `nickname`, `progress` (`{score, storePoints}`).
- All storage access goes through `readStore`/`writeStore` (JSON) or `readRaw`/`writeRaw` (plain strings, used by skins). Never touch `localStorage` directly: a blocked storage (private mode, cookies off) must degrade to an in-memory session, not kill the script on load.
- Entry is a nickname gate (`#nickname`), not login: `showNameGate()` / `showStartMenu()` flip `.start.box` visibility at boot, no throttle, no await.
- `saveProgress()` keeps max `score` and always overwrites `storePoints` (old upsert semantics).

## Game logic gotchas (`main.js`)

- `isGameRunning` gates store/score reads; `pointsInsertBeforeStart()` only fills UI pre-game.
- Save button (`#save`) is disabled for first 10s, then binds `endGame({once:true})`; `endGame` reloads page after 11s.
- Anti-cheat `isScoreValid()`: rejects `score > duration*10` or `score != newStorePoints - oldStorePoints`, wipes DOM and marks the row `cheat`. Do not "fix" score math without preserving this invariant.
- `caughtCheating()` is the shared cheater ending (wipe DOM, horror cheater scene + sound, `cheat` row). `viaLahnt` picks the subline: Lahnt's deal earns "لهنت خدعك 👀", hand-cheating keeps "الغشاش يُكشَف دائماً 👀". When the sound ends — or after an 8s fallback — it reloads home. Used by `endGame()` and by Lahnt's honeypot.
- Lahnt's honeypot (`showLahntTrap()`): 20s into a run, Lahnt slides in fixed bottom-right (`.lahnt-trap`, `Hi.mp3`, `assets/img/lahnt.webp`) saying "تريد +9999 نقطة؟ انه غير قانوني ههه 👀". "نعم" calls `caughtCheating()`; "لا" dismisses with "أحسنت أيها المكبس، التكبيس الحكيم مفيد". Auto-leaves after 6s. Guarded by `isGameRunning`, shown once per run.
- Hoarding Bug (`spawnBugLoop()` / `spawnBug()`): from 50s on, a bug crawls out every 2s (up to 10, `assets/img/Hoarding_Bug_Lethal_Company.webp`, `Yippee.mp3`). Each live bug eats 1 score/sec with a red `-1` floating just above it, until double-clicked dead — the one-time warning spells out the double-click. No toast per kill; one toast when all 10 are wiped (`bugsKilled`). Drain stops at 0 so the `score == storePoints-delta` invariant can't false-flag. The old commented-out `yippy` block stays untouched as reference.
- `detectTampering()` is the inspect-element guard: `score` is mirrored from the `clicks` ledger (never the source of truth), the DOM `.score span` / `#pointStore` must still match internal values at game over, `peakClicksPerSecond` must stay under `MAX_CLICKS_PER_SECOND` (20, a burst ceiling), and synthetic clicks (`!e.isTrusted`) are ignored. It deliberately does **not** re-check the `duration*10` cap — two clocks disagreeing there falsely accused honest fast players. All client-side, so it is deterrence, not a guarantee.
- Invader flyby (`enemyShowBeforeSatart()`): 2s in, the space-invader crosses in one 16s `invader-flyby` pass (slide in, loom, exit fading) with `space-sound.mp3`; out at 18s, 2s before Lahnt's 20s entrance. The inner sprite carries a hallucination treatment (`invader-hallucinate`: RGB-split drop-shadows, stepped flicker, blur/hue pulses — parent keeps the flyby so animations never fight). Both timers guard on `isGameRunning`. The old 2D `startLv3()` boss pose no longer fires early — invader shows only here, real boss is 3D.
- Skins persist in `localStorage` keys `shape`/`color`/`animation`, restored by `rememberTheSkin()`.
- Ambience is generated, not files: `AMBIENCES` recipes (wind/rain/ocean/thunder/off) render looped noise through Web Audio. The store "sounds" tab previews each (live swap mid-run, 2.5s sample outside) and persists to `kabisni:ambience`. `startAmbience()` runs from `startGame`, `stopAmbience()` in every ending. No music by design.
- Store is CSS-dressed only: `main.js` builds `.row` / `.box.p{price}` / `.storeBox` tiles with an inline-styled price tag and toggles `.Unlocked` + `.no-before`. Keep those hooks and the price-tag override (`.store .row .box > span`) in `style.css`; never move tile styling into JS.
- Large commented-out blocks (Lv2 bug enemy, `yippy` loop) are dead code, intentionally kept; don't delete without asking.
- UI strings are Arabic RTL with `dir="rtl"`; keep them Arabic unless asked otherwise.

## Final-boss 3D arena (Three.js, boss phase only)

- `assets/js/three.min.js` + `assets/js/GLTFLoader.js` are vendored r147 UMD classic scripts (no CDN, no modules, no build). They load lazily via `ensureThree()` only when the boss comes, so the 2D game never pays the parse cost. Never upgrade to module builds — `file://` would break. Everything else stays 2D.
- Arena is budget-conscious: no shadows, pixelRatio capped at 1.5 (auto-drops to 1 on sustained slow frames), antialias off on ≤4-core devices, boss is one InstancedMesh draw call, bugs are 4 sprites max.
- Flow: wave wiped → `onWaveCleared()` → 5s → `startBossPhase()` hides `.player`/`.enemy`, mounts `#bossArena` canvas, voxel invader (11x8 sprite in code, one InstancedMesh) with 20-click HP. Intro card, hit shake, half-HP enrage (faster spin, hotter glow), death burst, then a victory banner — the run CONTINUES (`finishBossWin()` returns the player, never calls `endGame()`). Boss clicks go through `registerClick()`/`updateScore()` so the ledger and `score == storePoints-delta` invariant hold.
- 3D bugs are PNG sprites (`Hoarding_Bug_Lethal_Company.webp` has transparency, loaded via core TextureLoader — works on `file://`). `assets/models/bug.glb` is parked, unreferenced, until a ≤50K textured export lands.
- `disposeArena()` runs in `endGame()`, `caughtCheating()`, and `looser()` — every ending must release the renderer/RAF.
- Test shortcut: open `index.html?boss=1` to jump straight into the boss arena (skips Lahnt/bug timers; scoring + save stay live). Remove it before calling the game finished.
