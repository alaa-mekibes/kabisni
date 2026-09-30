# 🖱️ Kabisni (كبسني)

> **"Kabisni"** = _"click me"_ in Arabic. Yes, that's the whole game. Yes, it has a 3D final boss.

[**▶ Play it live: kabisni.vercel.app**](https://kabisni.vercel.app/)

A clicker game in Arabic and English where you click things, buy things, and get emotionally betrayed by a guy named Lahnt.

---

## 🎮 What is this?

You click. Numbers go up. You feel powerful. Then things start happening:

- 👾 **2 seconds in:** a hallucinating space invader drifts across your screen for 16 seconds. Nobody explains why. Nobody will.
- 😈 **At 20 seconds:** **Lahnt** slides in from the bottom-right and offers you **+9999 points**. He tells you upfront it's illegal. _Lol._ If you say yes, well... (see the anti-cheat section, you poor soul).
- 🪲 **At 50 seconds:** Hoarding Bugs start crawling out every 2 seconds. Each one **eats 1 point per second** until you **double-click** it to death. Up to 10 of them. Your score is a buffet.
- 🧊 **Then:** a **3D voxel boss** shows up, built with Three.js, with 20 HP, an enrage phase, and a death burst. It's a clicker game. We went too far. We regret nothing.

## 🛡️ Anti-Cheat: Better Than CS2 VAC\*

Valve has spent two decades and a whole lot of money on VAC.
We spent an afternoon and a bad attitude. **Kabisni's anti-cheat is better.**

| Feature                              | CS2 VAC                | Kabisni                                                   |
| ------------------------------------ | ---------------------- | --------------------------------------------------------- |
| Bans cheaters                        | Sometimes, weeks later | **Instantly, with a horror scene**                        |
| Humiliation factor                   | Low                    | **Jump scare + sound effect + "الغشاش يُكشَف دائماً 👀"** |
| Has a honeypot                       | Nope                   | **Lahnt. He's very persuasive.**                          |
| Checks if you opened Inspect Element | Nope                   | **Yes, and he's disappointed**                            |
| Gives you a second chance            | Never                  | Sends you back to the home screen after the scream        |
| Works offline                        | No                     | **Absolutely**                                            |

### How it catches you

- 🧾 **The click ledger:** your score is a mirror of every real click. The number on screen isn't the source of truth, so editing it in DevTools just gets you noticed.
- 🕵️ **DOM tamper check:** at game over, the score and store balance shown in the page must match what the game actually tracked. Mismatch = cheater.
- ⚡ **Speed limit:** more than 20 clicks per second? You're not a human, you're a macro. Caught.
- 🤖 **`isTrusted` check:** synthetic clicks fired by scripts are ignored. Nice try, `element.click()`.
- 🧮 **Math police:** score can't exceed `duration × 10`, and `score` must equal the store balance delta. Numbers that don't add up get you flagged.
- 🪤 **Lahnt's honeypot:** press "نعم" on his +9999 offer and you get the cheater ending. He does not forgive. He _does not forget._

## 🧩 Features

- 🌍 Arabic + English, with RTL handled per-component (the `<html>` root stays neutral so menus don't flip out)
- 🌗 Light / dark theme
- 🛒 A store with skins (shape / color / animation) and a sounds tab
- 🌧️ Generated ambience: wind, rain, ocean, thunder. Procedural Web Audio noise, not audio files. No music, by design.
- 📴 **Fully offline.** No server, no accounts, no leaderboard, no tracking. Just you, `localStorage`, and your own bad decisions.
- 📱 PWA-ready icons, Arabic SEO metadata, JSON-LD, sitemap. Yes, for a clicker game.
- 🪫 Budget-conscious 3D: no shadows, pixel ratio capped, one instanced draw call for the boss, and Three.js only loads when the boss actually shows up

## 🧱 Tech Stack

| Thing           | Choice                           |
| --------------- | -------------------------------- |
| Framework       | Next.js 16 (App Router)          |
| Language        | TypeScript                       |
| Styling         | Tailwind CSS v4.3                |
| 3D              | Three.js (lazy-loaded)           |
| Icons           | Lucide                           |
| Package manager | **bun**                          |
| Tests           | None. The players are the tests. |

## 🚀 Run it locally

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). Opening the file straight from disk (`file://`) won't work, Next needs a server.

Other scripts:

```bash
bun run build   # production build
bun run start   # serve the build
bun run lint    # yell at your code
```

> ⚠️ Please use **bun**. Not npm. We will know.

## 🗂️ Project structure

```
src/
├── app/          # layout, page, globals.css (Tailwind @theme + design system)
├── lib/          # pure game systems: storage, progress, anticheat, ambience, skins, i18n...
├── stores/       # game-store (phase / score / skin / lang / theme)
├── hooks/        # useGameEngine, useClickLedger, useSkin, useAlert
└── components/   # layout, pages, game (boss arena, Lahnt, bugs...), common
public/
├── img/          # art
└── sounds/       # sounds
```

## 🐛 Troubleshooting

- **"The page is dead."** Check the dev overlay and server log before blaming the game logic.
- **"I deployed and nothing changed."** Hard refresh: `Ctrl+Shift+R`.
- **"Lahnt tricked me."** Yes. That was the point.
- **"My score got eaten."** Double-click the bug. It says so in the warning. Nobody reads the warning.
- **"I got the cheater ending but I didn't cheat."** Don't open DevTools mid-run, and please stop clicking like a machine gun.

## 🤝 Contributing

PRs welcome, but please keep these sacred rules:

1. Never touch `localStorage` directly. Use `readStore` / `writeStore` (or `readRaw` / `writeRaw`). Blocked storage should degrade to an in-memory session, not crash the game.
2. Don't "fix" the score math without preserving the `score == storePoints - oldStorePoints` invariant. The anti-cheat is watching.
3. Every game ending must dispose the 3D arena. Leaked renderers are how ghosts get in.
4. Keep store tile styling in CSS. Never in JS.
5. Don't add a backend. We already tried. It's gone. Let it rest.

## 📜 License

[MIT](LICENSE). Do whatever you want with it: fork it, remix it, sell it, add more bugs.
Just keep the copyright notice, and don't blame us when Lahnt tricks your users.

---

<p align="center"><b>Now go click something. كبسني. 🖱️</b></p>
