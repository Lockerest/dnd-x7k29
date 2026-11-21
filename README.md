# The Curse of the Golden Wave: table tool

Private browser tool for the campaign. It is moving from one big HTML file to a
React + TypeScript app, one piece at a time, without breaking the live table.

## What is where

| Path | What it is |
|---|---|
| `index.html` | The live single-file app (the one players use). Still the real game. |
| `app/` | The new React + TypeScript app (Vite). Published at `/next/`. |
| `app/src/data/` | Game data: classes, skill sets, themes, ability sounds, cinematic preset. |
| `app/src/logic/` | Game rules as typed functions (no screen code): stamina, health, combat, phases, skills, cinematic, audio, ability board and reference, icons, map geometry, the play table, sheet actions. |
| `app/src/**/*.test.ts(x)` | Unit tests for the new app (100% coverage required). |
| `app/src/ui/` | React screens (`Game.tsx` picks the screen; `screens/` holds each one). |
| `app/src/db/`, `app/src/state/`, `app/src/audio/` | Database client and live stream, game store, saved session and preferences, refresh loop, lazy theme and sound loader. |
| `app/e2e/parity/` | Parity tests: the new rules and data layer must give the same answers as the live page. |
| `app/e2e/next/` | The built new app tested in a real browser, served like GitHub Pages. |
| `app/e2e/rules/` | Unit tests for the live page's game rules (stamina, HP, dice, combat, phases, skills, audio, cinematic). |
| `app/e2e/legacy.spec.ts` | Smoke tests for whole flows on the live page. |
| `app/e2e/harness.ts` | Opens the live page with a fake in-memory Firebase for those tests. |
| `.github/workflows/pages.yml` | Checks, builds and publishes everything to GitHub Pages. |

## How publishing works

Every push to `main` runs the checks (type check, unit tests with coverage, rule
and smoke tests on the live page), builds the new app and publishes:

- `https://<you>.github.io/<repo>/` → the live app (unchanged link)
- `https://<you>.github.io/<repo>/next/` → the new app preview

If a check fails, nothing is published and the previous version stays online.
You can see each run under the repository's **Actions** tab.

## Working on the new app (optional, needs Node 22)

```
cd app
npm ci
npm run dev        # local preview
npm test               # unit tests for the new app
npm run test:coverage  # same, with the 100% coverage gate
npm run test:e2e       # builds, then rule, parity, smoke and built-app tests
npm run build
```

## Migration phases

1. Safety net: smoke tests on the live page. **Done.**
2. Scaffold and deploy: React app at `/next/`. **Done.**
3. Move pure logic (dice, damage, phases, cinematic script, skill sets, sounds) into tested modules. **Done.**
4. Data layer and state: Firebase module, store, lazy loading of themes and sounds. **Done.**
5. Screens, one at a time. **In progress.** Done: app shell and header, joining (player, table display,
   Game Master with PIN), creating a character, waiting for approval, taking over a character from
   another device, the GM's join and device requests, the GM's Enemies panel and enemy editor
   (stats, phase gates and next-phase sheets, themes, skills and skill sets, cinematic script) and the
   cinematic itself, shared with every device, and the character sheets (HP, flasks, stamina, rests
   at altars and bonfires with the Golden Wave and world reset, reviving, shield, parry, armor,
   mounts, abilities with their costs and dice, attunements, stats, conditions, notes, log), the
   ability board (the GM's editor with the default and 9-class boards, drawn icons, what players
   see; players equipping and attuning at an altar, bonfire or guild), the reference table, and the
   play table part 1: the map (picture, grid, walls and doors, altars, bonfires and guilds, pins,
   fog, tokens with pictures, tombstones and effects, movement squares), placing and moving heroes
   and monsters (stamina in combat, carried monsters, fog revealed), jumping off a monster, the
   GM's round, rest and combat buttons, everyone's status boxes, quick actions, helping allies up,
   doors, the hidden-words list, choosing and showing maps, and the projector view; and the play
   table part 2a: initiative and turn order (start, roll, begin, next turn with new rounds, a
   player's End turn, end combat); and part 2b: attacks (the action menu on a tapped target, light,
   heavy and ability attacks, charged abilities, counter-attacks, monster skills, area and special
   attacks, push, mount, pick up and throw, the defender's 3-second dodge/parry prompt with readied
   reactions, damage, poise and stagger, phase gates and phase swaps, the "Roll for initiative!"
   call to players); and part 2d: dice (the Dice card with how many, bonus, stat, dice style and the
   GM's Secret box, the shared log, the 3D dice with the CSS dice fallback, other players' rolls
   shown on every screen, attacks and abilities waiting for their dice like on the live page).
   Part 2e: sound and scenes (the synthesised attack sounds, the GM's uploaded clips and ability
   sounds when they exist, the attack scenes with the 2.5D camera, the Golden Wave, cinematic beat
   sounds, and the Attack scenes, 2.5D camera, Sound and Volume settings, shared with the live page).
   Still on the live page: battle music and boss themes (they start with the boss intro), the GM's
   test lab and the sound, ability sound and boss theme uploads and imports.
   Part 2f: the GM's map tools (new maps from a picture or a Dungeondraft export, rename, delete,
   squares across, grid, walls by dragging, fog on/off with reveal and hide by dragging, altars,
   bonfires, guilds, doors, pins with party travel, the arrival point, the "you are here" overview,
   and the altar, bonfire and guild icons). Part 2g: pictures (portraits and token icons for heroes
   and monsters, boss art, monster skill icons, ability icons), resized exactly like the live page.
   Part 2h: the enemy extras (a monster's turn played by the computer, the spawn point, the boss
   intro on every screen, by itself when combat begins or a boss changes phase, battle music from
   the boss themes, a skill's own sound).
6. Cutover: the new app becomes the root, the old file is kept as a backup.
7. Cleanup and new features (bulk icon import, cutscene videos).

New bosses and skill sets go in `app/src/data/` (and, until the cutover, in `index.html` too:
the parity tests fail if the two disagree).
