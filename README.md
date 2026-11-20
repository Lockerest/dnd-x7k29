# The Curse of the Golden Wave: table tool

Private browser tool for the campaign. It is moving from one big HTML file to a
React + TypeScript app, one piece at a time, without breaking the live table.

## What is where

| Path | What it is |
|---|---|
| `index.html` | The live single-file app (the one players use). Still the real game. |
| `app/` | The new React + TypeScript app (Vite). Published at `/next/`. |
| `app/src/data/` | Game data: classes, skill sets, themes, ability sounds, cinematic preset. |
| `app/src/logic/` | Game rules as typed functions (no screen code): stamina, health, combat, phases, skills, cinematic, audio. |
| `app/src/**/*.test.ts(x)` | Unit tests for the new app (100% coverage required). |
| `app/e2e/parity/` | Parity tests: the new rules must give the same answers as the live page. |
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
npm run test:e2e       # rule + smoke tests on ../index.html
npm run build
```

## Migration phases

1. Safety net: smoke tests on the live page. **Done.**
2. Scaffold and deploy: React app at `/next/`. **Done.**
3. Move pure logic (dice, damage, phases, cinematic script, skill sets, sounds) into tested modules. **Done.**
4. Data layer and state: Firebase module, store, lazy loading of themes and sounds.
5. Screens, one at a time.
6. Cutover: the new app becomes the root, the old file is kept as a backup.
7. Cleanup and new features (bulk icon import, cutscene videos).

New bosses and skill sets go in `app/src/data/` (and, until the cutover, in `index.html` too:
the parity tests fail if the two disagree).
