# AGENTS.md — Kabisni (كبسني) clicker game

Static Arabic RTL browser game. No framework, no build, no tests, no package manager.

## Run / preview
- No `package.json`, build, lint, or test commands. Do not add tooling unprompted.
- Preview: open `index.html` directly, or serve the repo root statically (e.g. `python -m http.server`). The entry is a **classic script, not `type="module"`** — modules are CORS-blocked on `file://`, which left the page dead with no error. `main.js` has no imports/exports; keep it that way, or the `file://` path breaks again.
- `index.html` loads the entry as `assets/js/main.js?v=2`. Bump `?v=` when shipping a change, otherwise a cached `main.js` can meet a fresh `index.html` and the page dies silently.
- A load-time crash now paints a `.fatalError` overlay (registered first thing in `main.js`). If a user reports a dead page, read that message before debugging game logic.
- After a deploy, ask testers for a hard refresh (Ctrl+Shift+R).
- Live site: https://alaa-mekibes.github.io/kabisni/ (GitHub Pages from `main`).

## Structure
- `index.html` — all UI markup (name gate, start menu, store, leaderboard, enemy). Entry point.
- `assets/js/main.js` (~900 lines, single monolith) — local data layer, name gate, store/skins, game loop levels, scoring, anti-cheat, leaderboard.
- `assets/css/style.css` — all styles; CSS var `--bg-shape` controls player color.
- `assets/img/`, `assets/sound/` — referenced by relative path; keep filenames as-is (one contains Arabic: `كبسني.png`).
- `assets/js/manifest.json` — PWA manifest, linked from `index.html` head as a local path.

## Backend: none (Supabase removed)
- No server, no auth, no network calls. `assets/js/config.js` (Supabase URL + anon key) is deleted; do not reintroduce keys in the repo.
- Everything persists in `localStorage` under `kabisni:*` keys: `nickname`, `progress` (`{score, storePoints}`), `scores` (leaderboard rows), `secret` (per-device signing salt).
- All storage access goes through `readStore`/`writeStore` (JSON) or `readRaw`/`writeRaw` (plain strings, used by skins). Never touch `localStorage` directly: a blocked storage (private mode, cookies off) must degrade to an in-memory session, not kill the script on load.
- Entry is a nickname gate (`#nickname`), not login: `showNameGate()` / `showStartMenu()` flip `.start.box` visibility at boot, no throttle, no await.
- `saveProgress()` keeps max `score` and always overwrites `storePoints` (old upsert semantics).
- `publishScore()` signs each leaderboard row with FNV-1a + `secret`; `leaderboard()` drops rows whose signature no longer matches, so hand-edited `localStorage` scores never show.
- Leaderboard is per-device only. A real online board needs a backend; nothing here can provide cross-device ranking.

## Game logic gotchas (`main.js`)
- `isGameRunning` gates store/score reads; `pointsInsertBeforeStart()` only fills UI pre-game.
- Save button (`#save`) is disabled for first 10s, then binds `endGame({once:true})`; `endGame` reloads page after 11s.
- Anti-cheat `isScoreValid()`: rejects `score > duration*10` or `score != newStorePoints - oldStorePoints`, wipes DOM and marks the row `cheat`. Do not "fix" score math without preserving this invariant.
- `caughtCheating()` is the shared cheater ending (wipe DOM, cheater page + sound, `cheat` row). When the sound ends — or after an 8s fallback — it reloads home. Used by `endGame()` and by Lahnt's honeypot.
- Lahnt's honeypot (`showLahntTrap()`): 20s into a run, Lahnt slides in fixed bottom-right (`.lahnt-trap`, `Hi.mp3`, `assets/img/lahnt.png`) saying "تريد +9999 نقطة؟ انه غير قانوني ههه 👀". "نعم" calls `caughtCheating()`; "لا" dismisses with "أحسنت أيها المكبس، التكبيس الحكيم مفيد". Auto-leaves after 6s. Guarded by `isGameRunning`, shown once per run.
- Hoarding Bug (`spawnBugLoop()` / `spawnBug()`): from 50s on, a bug crawls out every 2s (up to 10, `assets/img/Hoarding_Bug_Lethal_Company.png`, `Yippee.mp3`). Each live bug eats 1 score/sec with a red `-1` floating just above it, until double-clicked dead — the one-time warning spells out the double-click. No toast per kill; one toast when all 10 are wiped (`bugsKilled`). Drain stops at 0 so the `score == storePoints-delta` invariant can't false-flag. The old commented-out `yippy` block stays untouched as reference.
- `detectTampering()` is the inspect-element guard: `score` is mirrored from the `clicks` ledger (never the source of truth), the DOM `.score span` / `#pointStore` must still match internal values at game over, `peakClicksPerSecond` must stay under `MAX_CLICKS_PER_SECOND` (20, a burst ceiling), and synthetic clicks (`!e.isTrusted`) are ignored. It deliberately does **not** re-check the `duration*10` cap — two clocks disagreeing there falsely accused honest fast players. All client-side, so it is deterrence, not a guarantee.
- Skins persist in `localStorage` keys `shape`/`color`/`animation`, restored by `rememberTheSkin()`.
- Large commented-out blocks (Lv2 bug enemy, `yippy` loop) are dead code, intentionally kept; don't delete without asking.
- UI strings are Arabic RTL with `dir="rtl"`; keep them Arabic unless asked otherwise.
