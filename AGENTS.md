# AGENTS.md — Kabisni (كبسني) clicker game

Static Arabic RTL browser game. No framework, no build, no tests, no package manager.

## Run / preview
- No `package.json`, build, lint, or test commands. Do not add tooling unprompted.
- Preview: serve repo root statically (e.g. `python -m http.server`) and open `index.html`, or open the file directly. ES module import (`assets/js/main.js` → `./config.js`) requires http(s), not always `file://`.
- Live site: https://chakhabit.github.io/kabisni/ (GitHub Pages from `main`).

## Structure
- `index.html` — all UI markup (auth, start menu, store, leaderboard, enemy). Entry point.
- `assets/js/main.js` (~1000 lines, single monolith) — Supabase auth, store/skins, game loop levels, scoring, anti-cheat, leaderboard.
- `assets/js/config.js` — Supabase URL + anon key. Public key by design; never put service-role keys here.
- `assets/css/style.css` — all styles; CSS var `--bg-shape` controls player color.
- `assets/img/`, `assets/sound/` — referenced by relative path; keep filenames as-is (one contains Arabic: `كبسني.png`).
- `assets/js/manifest.json` — PWA manifest, but note `index.html:19` mislinks it as `stylesheet`; the working link is line 24 (jsdelivr). Fix to local path if touching head.

## Backend (Supabase, via CDN `supabase-js@2` global)
- Tables: `profiles(id, username)`, `scores(user_id, score, storePoints, game_duration, cheat)`.
- Auth session persists (`persistSession`, `detectSessionInUrl`); `updateUIAfterAuth()` drives login → start-menu visibility with 1s throttle.
- `submitScore` upserts on `user_id`, keeps max `score`, always overwrites `storePoints`. Requires login; works only with network + valid session.

## Game logic gotchas (`main.js`)
- `isGameRunning` gates store/score reads; `pointsInsertBeforeStart()` only fills UI pre-game.
- Save button (`#save`) is disabled for first 10s, then binds `endGame({once:true})`; `endGame` reloads page after 11s.
- Anti-cheat `isScoreValid()`: rejects `score > duration*10` or `score != newStorePoints - oldStorePoints`, wipes DOM and flags `scores.cheat`. Do not "fix" score math without preserving this invariant.
- Skins persist in `localStorage` keys `shape`/`color`/`animation`, restored by `rememberTheSkin()`.
- Large commented-out blocks (Lv2 bug enemy, `yippy` loop) are dead code, intentionally kept; don't delete without asking.
- UI strings are Arabic RTL with `dir="rtl"`; keep them Arabic unless asked otherwise.
