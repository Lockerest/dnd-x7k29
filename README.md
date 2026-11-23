# The Curse of the Golden Wave: table tool

Private browser tool for the campaign: a React + TypeScript app. It replaced the
original single-file page, which is kept as a backup.

## What is where

| Path | What it is |
|---|---|
| `app/` | The React + TypeScript app (Vite), the one players use. Published at the site root. |
| `classic/index.html` | The old single-file page, kept as a backup at `/classic/`. The parity tests still compare the app against it. |
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

- `https://<you>.github.io/<repo>/` → the app (unchanged link)
- `https://<you>.github.io/<repo>/classic/` → the old page, as a backup
- `https://<you>.github.io/<repo>/next/` → forwards to the app (the old preview address)

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
5. Screens, one at a time. **Done.** app shell and header, joining (player, table display,
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
   Part 2f: the GM's map tools (new maps from a picture or a Dungeondraft export, rename, delete,
   squares across, grid, walls by dragging, fog on/off with reveal and hide by dragging, altars,
   bonfires, guilds, doors, pins with party travel, the arrival point, the "you are here" overview,
   and the altar, bonfire and guild icons). Part 2g: pictures (portraits and token icons for heroes
   and monsters, boss art, monster skill icons, ability icons), resized exactly like the live page.
   Part 2h: the enemy extras (a monster's turn played by the computer, the spawn point, the boss
   intro on every screen, by itself when combat begins or a boss changes phase, battle music from
   the boss themes, a skill's own sound). Part 2i: the GM's test lab (any attack scene or the Golden
   Wave on the GM's screen only) and sound tools (clips for each sound slot, ability sounds from the
   web or from files, the reverb, and boss themes: upload, play, remove, import from the web, add
   another boss). Every part of the live page now exists in the new app.
6. Cutover: the new app becomes the root, the old file is kept as a backup at `/classic/`. **Done** (1.0.0).
   Saved logins carry over (the app now uses the old page's saved-session names).
7. Cleanup and new features: the parity checks now ignore content added since the cutover
   (1.0.1). "Import icons" on the ability board: many pictures at once, each matched by its
   file name to the board abilities and monster skills of that name (1.1.0). Cutscene video link on a boss (1.2.0):
   it plays full screen on every device instead of the cinematic text (with sound when the
   browser allows, muted otherwise; a click skips it); "Use the Aethelric sword-slam clip"
   fills in the Seedance cave-collapse clip. Video or text, never both (1.2.1).
   Phase 7 is done.
8. Bosses. The Nameless King's three skill sets (storm rider, on foot with Storm's Wager
   and Lightning Reprisal, cloud dragon) with a sound for every move; a new Chain Pull
   sound for Aethelric (1.3.0). Changed entries are listed in `app/e2e/parity/kept.ts`.
   His 18 skill icons (Shōryū the Ancestral Dragon as his mount; Wingbeat Gale became
   Coiling Gale) and "Import boss icons from web" on the ability board (1.4.0).
   The GM's Boss abilities list under Reference: every boss move by phase with its icon,
   damage, reach, what it does and the GM's own note (saved under `skdesc/`); four
   Nameless King icons redone; Aethelric's and Arachne's icons added to the web import (1.5.0).
   The Boss abilities list folds away (folded by default), every boss move has a description
   and a ▶ sound button; the Enemies card folds away; phase sheets not being fought show only
   their name (1.6.0). The class abilities Reference folds the same way (1.6.1).
   Kernunos's 17 icons; his phase 3 (rooted) set also carries all his phase 2 moves (1.7.0).
   Ability and boss move pictures open big when clicked (Reference and Boss abilities); two
   Kernunos icons redone as a four-legged centaur (1.7.1).
   New icons for all 123 class abilities (9 classes) in the same ink-and-wash style as the
   bosses; "Import icons from web" saves them on the ability board, Golden versions included,
   in place of the older pictures (1.8.0). The 16 starting abilities of Fighter, Archer, Mage
   and Thief got theirs too; class pictures open big at full sharpness; the Reference shows each
   Golden version as its own row with its icon (1.8.1).
   The 27 Golden abilities have their own icons, with the ability itself turned gold; "Import
   icons from web" puts them on the Golden versions (1.9.0). The class Reference has a ▶
   sound button on every ability that has a sound, Golden versions included (1.10.0).
   The Reference shows players every ability of the class, whatever their level; while words
   are hidden, the hidden words show as black bars and, with "golden" hidden, Golden versions
   stay out (1.11.0). A hidden word hides its whole clause ("Once per altar rest") (1.11.1).
   Two new classes, 11 in all: the Hexblade (a living bone khopesh that feeds on blood; her stronger
   versions are Crimson) and the Duelist (parries, counters and Flow), each with 15 abilities, icons
   and sounds. Every class has its own class rules at the top of its Reference page (the Hexblade's
   Hunger is GM only). "Add new class abilities" adds them to a saved board without changing it (1.12.0).
   The Hexblade's Blade Guard icon redone: the bone blade now coils around her (1.12.1).
   Odi'ram, the fire titan: three phase sheets (titan, unbound, blue fire) with his Embers rule,
   18 moves with descriptions, icons and sounds on the GM's Boss abilities list (1.13.0).
   Xibalba, the living void: three phase sheets (rift, brood, singularity) with her Gravity Field
   and limb combos, 17 moves with icons and sounds. Odi'ram's Embers burst at 4, at 2 in blue fire (1.14.0).
   Izat'al, the final boss: sorceress, the debt (six-headed dragon) and the monster, with her
   contract and crystal rules, the Echoes of the fallen bosses and The Last Breath, 19 moves with
   icons and sounds. Every main boss now has a full sheet (1.15.0).
   Izat'al's phase 2 comes in four versions, one per outcome for Arachne and Odi'ram (both spared,
   one fell, both fell, which adds Cinder Web); Crowned Fang redone with all six heads (1.15.1).
   Boss abilities list: each move's description and note now run across the full width under it (1.15.2).
   Encounters (GM, under Enemies): save placed enemies as a ready-made group in a region folder, with their phase sheets and pictures; Deploy puts a copy on the map on screen in the same formation (spawn points set), Clear removes it. Saved encounters are never loaded until the list is opened (1.16.0).
   Table view (projector): "Miniatures on the table" draws every standing token as a plain black square so no light lands on painted minis, and "Turn the picture" (90°, 180°, 270°) lays the map along the table; real size keeps its millimetres when turned (1.17.0).
   Hero balance: stamina comes back only after a turn without abilities (light attacks, moving, dodging and drinking let you catch your breath); changing a hero's level applies growth automatically (+10% base HP and +5% base stamina per level, +2 attack stat at levels 2, 4 and 8, keeping the revival curse's share) (1.18.0).
   French comes last, after the story and balancing.

New bosses, skill sets, themes and ability sounds go in `app/src/data/` only. The parity
tests compare the app with `classic/index.html` on what the backup already has: those
entries must stay as they were, and anything added since the cutover is left out of the
comparison (`app/e2e/parity/kept.ts`). So the backup never needs updating.
