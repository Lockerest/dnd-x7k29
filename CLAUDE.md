# The Curse of the Golden Wave — project notes for Claude

Dionny's private TTRPG table tool (React + TypeScript in `app/`, published by GitHub Actions to
lockerest.github.io/dnd-x7k29 on every push to `main`). Read this first in any new chat: it keeps
the game's identity, art style and working habits the same from one chat to the next.

## Working habits (Dionny's standing instructions)
- Do everything and publish right away; no confirmation needed for routine work.
- For NEW enemies or bosses, show the move list first (with HP/AC/size), then build after he agrees
  or moves on. He sends mini photos one at a time; answer with the move list + a Gemini portrait prompt.
- He makes portraits himself with Gemini and keeps them on his Discord; they are not in the app.
  He doesn't need to send results back unless something looks wrong.
- Opportunity attacks stay manual. Players never see icons or "Golden" spoilers; only the GM does.
- Keep replies short and in plain words; he reads on his phone.

## Tone and story identity (keep it)
- Dark, cruel, Souls-like: Izat'al's Golden Wave wipes memories and drains souls; bosses are tragic
  or monstrous, never cartoonish. Revival curse and altars are secret from the players.
- Regions in order: Frozen North (Calden's Keep, Aethelric) → Caves of Ifstrid (Arachne) → the Wilds
  (Kernunos) → Sky (Nameless King) → Odi'ram's kingdom → the Void (Xibalba) → Izat'al's kingdom.
- The region guide (Claude Doc "Solaris: Region Guide & Soundtrack Briefs") holds each region's mood.

## Art style (icons and portraits)
- Ability icons: Creative Claw `image/nano-banana-2`, 1:1, 12 credits, with
  `image_url` = https://cdn.creativeclaw.co/u/59c4c4dc/images/b1afd9d4-3f31-4d5c-ae75-4ebe932e4d67.jpg
  and the prompt: "Create a NEW square ability icon. Style from the reference image only: muted painted
  dark fantasy ink-and-wash, dark vignette background, no text, no border. Subject: <one concrete image
  of the move, using the creature's real look and colours>."
- Gemini portrait prompts: "Using the attached miniature photo as the exact reference, create a portrait
  of ONLY ONE figure: <which one>. Remove the others. Keep pose and every sculpted detail; do not add or
  remove parts." Then a colour list per part, a setting line (frozen keep: frost, cold blue moonlight;
  Desidia's things: violet mist), and "Mood: … Painterly dark fantasy illustration, muted colours,
  strong contrast, full body visible, centred, no base, no text, no border."
  Tell him to crop multi-view photos to the front view (two views make Gemini draw two creatures).
- Sounds: Creative Claw `generate_sound_effect` (ElevenLabs), 1.5–4 s, 1–2 credits; "No voice, no music".
- If his upload fails, his PC is linked: read the file from his Downloads folder instead.

## Enemy design conventions
- Every move set lives in `app/src/data/skillSets.ts` (regenerate it as JSON with a script; never run
  Prettier on it or on `audio.ts`). Region enemies are keyed "Region: Name (role)" so the GM's Boss
  abilities list groups them under one region tab (e.g. "Frozen North: Necrolyte").
- Row = { name, dice, range, target 's'|'a', text }. Rules/GM rows: dice "0", range 20, target 'a',
  text starts "GM rules." and gives HP, AC, size, speed and the d6 order.
- Texts say: attack roll or save (against 10 + its attack bonus), whether it can be parried or is dodge
  only, and what happens on a miss. Damage is dice ×10 on the table.
- Tiers (level 1–3 region): normal 120–300 HP, elite ~450, mini-boss 650–1,000, guardian ~1,100.
  Mini-bosses and guardians get a d6 move table + a GM rules row and rank 'u' (stay dead); normals and
  elites rank 'n' (come back after an altar rest).
- Stats presets: `app/src/data/bossStats.ts` → `REGION_STATS` (grouped in the Stats menu after Bosses).
- Every row needs an icon (`app/src/data/icons.ts`, SKILL_ICONS, slug → 'uuid.jpg') and a sound
  (`app/src/data/audio.ts`, ABILITY_SOUNDS, JSON-style lines). Slug = lowercase, non-alphanumerics → '_'
  ("Sandman's Toss" → sandman_s_toss). Check new names don't clash with hero abilities or existing slugs.
- `app/src/data/data.test.ts` counts the skill sets; update it.

## Checks and publishing
- In `app/`: `npx tsc -b`, `npx tsc -p tsconfig.e2e.json --noEmit`, `npm run lint`,
  `npm run test:coverage` (100% coverage required), `npm run build`, `npx playwright test` (~10 min;
  can skip for a pure icon/sound swap).
- Bump `APP_VERSION` in `app/src/config.ts` and add one line to README.md's version log.
- Commit to `main` and push. Don't wait for the "Deploy to GitHub Pages" run: say it's pushed and move
  on to the next enemy. Run the browser tests (`npx playwright test`) only once per batch, before the push.

## Status (late Nov 2026, version 1.27.1)
- All bosses done: 7 main, 9 halfway, 5 secret (Desidia, Iniha Yunvra, Cadmus, Aldrich, Tenjin).
- Frozen North enemies done: Revenant Phalanx, Revenant Courtier, Accursed Servant, Necrolyte,
  Revenant Hound; mini-bosses Morwen, the Shadow of Calden (stalker, two meetings) and the Knight of the
  Gravid Moon; Desidia's nightmares (Lullaby Gent, Priest of Slumber, Flickering Knight, Horror Summoner,
  Shackled Horror, Sleeping Deceit, Timekeeper Hag), her horrors (Bogeyman, Dream Eater, Nightmare
  Aberration) and guardian (Insomnia Beast). The Jailer stays the halfway boss.
- Open: the beast replacing the starved yeti in Calden's forest (he'll decide).
- Caves of Ifstrid enemies in progress: All-seeing Ooze (elite), Mapinguari Demon (2x2 common) done. Spider
  venom slows, and a failed save while already slowed paralyses (pale, milky venom; never vivid green).
- Next: the rest of the Caves of Ifstrid (Web of Tyranny, the Remade / Cult of the Fleshsmith, the Drow bundle),
  then the other regions, story, encounters, balance, cutscenes (one per main-boss phase change), French
  (if his friends want it), solo mode last.
