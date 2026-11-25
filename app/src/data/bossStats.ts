// Stat presets for the "Stats" menu on enemy sheets: picking one fills the sheet's
// name, HP (full), AC, size, attack bonus, speed and rank in one go. Tuned to the
// party level each region expects (see each boss's GM rules in its skill set).
import type { Enemy } from '../logic/types'

/** Preset: what it sets on the sheet (hp is set to max). */
export type BossStats = { name: string; max: number; ac: number; sz: number; ab: number; spd: number; rk: 'n' | 'm' | 'u' }

/** Main, secret and halfway bosses for the enemy sheet's Stats menu. Every boss is Unique: it stays dead after an altar rest. */
export const BOSS_STATS: Record<string, BossStats> = {
  // Main bosses, in story order. A phase that continues the previous sheet (Kernunos's rooted phase 3, Izat'al's enraged phase 3) has no preset.
  'Aethelric: first encounter (cave, level 1)': { name: 'Aethelric', max: 1200, ac: 15, sz: 2, ab: 5, spd: 6, rk: 'u' },
  'Aethelric: phase 1 (Calden, level 3)': { name: 'Aethelric', max: 2000, ac: 16, sz: 2, ab: 6, spd: 6, rk: 'u' },
  'Aethelric: phase 2 (golden)': { name: 'Aethelric, the First Defier', max: 1800, ac: 17, sz: 2, ab: 7, spd: 6, rk: 'u' },
  'Arachne: phase 1 (human, level 4)': { name: 'Arachne', max: 1800, ac: 16, sz: 1, ab: 7, spd: 6, rk: 'u' },
  'Arachne: phase 2 (spider)': { name: 'Arachne, the Spider', max: 2400, ac: 15, sz: 3, ab: 7, spd: 8, rk: 'u' },
  'Kernunos: phase 1 (level 6)': { name: 'Kernunos', max: 2600, ac: 16, sz: 3, ab: 8, spd: 8, rk: 'u' },
  'Kernunos: phase 2 (rotten, phase 3 continues it)': { name: 'Kernunos, the Withered', max: 2200, ac: 15, sz: 3, ab: 8, spd: 6, rk: 'u' },
  'Nameless King: phase 1 (storm rider, level 7)': { name: 'The Nameless King', max: 2600, ac: 17, sz: 3, ab: 9, spd: 10, rk: 'u' },
  'Nameless King: phase 2 (on foot)': { name: 'The Nameless King', max: 2400, ac: 18, sz: 1, ab: 9, spd: 7, rk: 'u' },
  'Nameless King: phase 3 (cloud dragon)': { name: 'The Nameless King', max: 900, ac: 18, sz: 1, ab: 9, spd: 7, rk: 'u' },
  "Odi'ram: phase 1 (titan, level 8)": { name: "Odi'ram", max: 3200, ac: 18, sz: 3, ab: 10, spd: 4, rk: 'u' },
  "Odi'ram: phase 2 (unbound)": { name: "Odi'ram, Unbound", max: 2600, ac: 17, sz: 3, ab: 10, spd: 8, rk: 'u' },
  "Odi'ram: phase 3 (blue fire)": { name: "Odi'ram, Blue Fire", max: 1400, ac: 17, sz: 3, ab: 11, spd: 8, rk: 'u' },
  'Xibalba: phase 1 (rift, level 9)': { name: 'Xibalba', max: 3000, ac: 18, sz: 3, ab: 11, spd: 8, rk: 'u' },
  'Xibalba: phase 2 (brood)': { name: 'Xibalba', max: 2600, ac: 18, sz: 3, ab: 11, spd: 10, rk: 'u' },
  'Xibalba: phase 3 (singularity)': { name: 'Xibalba, the Singularity', max: 2000, ac: 19, sz: 3, ab: 12, spd: 5, rk: 'u' },
  "Izat'al: phase 1 (sorceress, level 10)": { name: "Izat'al", max: 2800, ac: 25, sz: 1, ab: 12, spd: 6, rk: 'u' },
  "Izat'al: phase 2 (dragon, phase 3 continues it)": { name: "Izat'al, the Golden Wave", max: 4000, ac: 25, sz: 4, ab: 12, spd: 8, rk: 'u' },
  // Secret bosses.
  'Desidia: phase 1 (secret, level 3)': { name: 'Desidia, Lady of Slumber', max: 1800, ac: 15, sz: 3, ab: 6, spd: 0, rk: 'u' },
  'Desidia: phase 2 (nightmare)': { name: 'Desidia, the Nightmare', max: 1200, ac: 16, sz: 2, ab: 6, spd: 6, rk: 'u' },
  'Iniha Yunvra: phase 1 (secret, Arachne, level 4)': { name: 'Iniha Yunvra, the Drow Queen', max: 2000, ac: 16, sz: 1, ab: 7, spd: 6, rk: 'u' },
  'Iniha Yunvra: phase 2 (brood mother)': { name: 'Iniha Yunvra, the Brood Mother', max: 1800, ac: 15, sz: 3, ab: 7, spd: 8, rk: 'u' },
  'Cadmus the Exhumed: phase 1 (secret, Kernunos, level 5)': { name: 'Cadmus the Exhumed', max: 2400, ac: 16, sz: 3, ab: 7, spd: 0, rk: 'u' },
  'Cadmus the Exhumed: phase 2 (the throne wakes)': { name: 'Cadmus, the Throne Awake', max: 2000, ac: 15, sz: 3, ab: 7, spd: 0, rk: 'u' },
  'Aldrich: phase 1 (secret, Sky, level 7)': { name: 'Aldrich, Devourer of Gods', max: 2800, ac: 17, sz: 3, ab: 9, spd: 4, rk: 'u' },
  'Aldrich: phase 2 (the gods break through)': { name: 'Aldrich, the Gods Break Through', max: 2200, ac: 16, sz: 3, ab: 9, spd: 4, rk: 'u' },
  'Tenjin: phase 1 (secret, Odi’ram, level 8)': { name: 'Tenjin, Warden of the Shard', max: 2600, ac: 18, sz: 2, ab: 10, spd: 6, rk: 'u' },
  'Tenjin: phase 2 (red thunder)': { name: 'Tenjin, Red Thunder', max: 2000, ac: 17, sz: 2, ab: 10, spd: 6, rk: 'u' },
  // Halfway bosses, in story order.
  'The Jailer (Calden, level 2)': { name: 'The Jailer', max: 1500, ac: 15, sz: 2, ab: 5, spd: 5, rk: 'u' },
  'Remade Triumvirate (Arachne, level 3-4)': { name: 'Remade Triumvirate', max: 1500, ac: 16, sz: 2, ab: 6, spd: 6, rk: 'u' },
  'Dark Elf High Priestess (Arachne, level 3-4)': { name: 'Dark Elf High Priestess', max: 500, ac: 13, sz: 1, ab: 6, spd: 6, rk: 'u' },
  'The Corrupted Idol (Kernunos, level 5)': { name: 'The Corrupted Idol', max: 2200, ac: 16, sz: 3, ab: 7, spd: 5, rk: 'u' },
  'Awakened Blood (Idol at half HP)': { name: 'Awakened Blood', max: 300, ac: 14, sz: 1, ab: 7, spd: 6, rk: 'u' },
  'Alithrax (Sky, level 6-7)': { name: 'Alithrax', max: 2600, ac: 17, sz: 3, ab: 8, spd: 8, rk: 'u' },
  'Azael phase 1 (Odi’ram, level 8)': { name: 'Azael', max: 1600, ac: 18, sz: 1, ab: 9, spd: 8, rk: 'u' },
  'Azael phase 2 (unchained)': { name: 'Azael, Unchained', max: 1200, ac: 17, sz: 1, ab: 9, spd: 8, rk: 'u' },
  'Yesod (void 1, level 9)': { name: 'Yesod, the Infinite Witness', max: 2400, ac: 16, sz: 3, ab: 10, spd: 0, rk: 'u' },
  'Tiferet, left half (void 2, level 9)': { name: 'Tiferet (Left)', max: 1600, ac: 17, sz: 3, ab: 10, spd: 0, rk: 'u' },
  'Tiferet, right half (void 2, level 9)': { name: 'Tiferet (Right)', max: 1600, ac: 17, sz: 3, ab: 10, spd: 0, rk: 'u' },
  'Zarael phase 1 (void 3, level 9)': { name: 'Zarael, the Masked Queen', max: 2200, ac: 18, sz: 3, ab: 10, spd: 8, rk: 'u' },
  'Zarael phase 2 (faceless)': { name: 'Zarael, the Faceless Queen', max: 1800, ac: 17, sz: 3, ab: 10, spd: 8, rk: 'u' },
  'The Great Yokai (Izat’al, level 9-10)': { name: 'The Great Yokai', max: 3400, ac: 18, sz: 2, ab: 10, spd: 6, rk: 'u' },
}

/** Each region's enemies, grouped in the Stats menu under the bosses. Normal enemies come back after an altar rest; mini-bosses are Unique and stay dead. */
export const REGION_STATS: Record<string, Record<string, BossStats>> = {
  'Frozen North (Calden, level 1-3)': {
    'Revenant Phalanx': { name: 'Revenant Phalanx', max: 200, ac: 15, sz: 1, ab: 4, spd: 5, rk: 'n' },
    'Revenant Courtier': { name: 'Revenant Courtier', max: 140, ac: 13, sz: 1, ab: 4, spd: 7, rk: 'n' },
    'Accursed Servant': { name: 'Accursed Servant', max: 120, ac: 11, sz: 1, ab: 3, spd: 6, rk: 'n' },
    Necrolyte: { name: 'Necrolyte', max: 150, ac: 12, sz: 1, ab: 4, spd: 6, rk: 'n' },
    'Revenant Hound': { name: 'Revenant Hound', max: 160, ac: 13, sz: 1, ab: 4, spd: 8, rk: 'n' },
    'Morwen, the Shadow of Calden (mini-boss)': { name: 'Morwen, the Shadow of Calden', max: 900, ac: 16, sz: 2, ab: 5, spd: 7, rk: 'u' },
    'Knight of the Gravid Moon (mini-boss)': { name: 'Knight of the Gravid Moon', max: 1000, ac: 17, sz: 3, ab: 5, spd: 6, rk: 'u' },
    'Lullaby Gent (nightmare)': { name: 'Lullaby Gent', max: 180, ac: 13, sz: 1, ab: 4, spd: 6, rk: 'n' },
    'Priest of Slumber (nightmare)': { name: 'Priest of Slumber', max: 180, ac: 13, sz: 1, ab: 4, spd: 5, rk: 'n' },
    'Flickering Knight (nightmare)': { name: 'Flickering Knight', max: 280, ac: 16, sz: 1, ab: 4, spd: 5, rk: 'n' },
    'Horror Summoner (nightmare)': { name: 'Horror Summoner', max: 160, ac: 13, sz: 1, ab: 4, spd: 5, rk: 'n' },
    'Shackled Horror (nightmare)': { name: 'Shackled Horror', max: 300, ac: 13, sz: 2, ab: 4, spd: 5, rk: 'n' },
    'Sleeping Deceit (nightmare)': { name: 'Sleeping Deceit', max: 220, ac: 12, sz: 1, ab: 4, spd: 5, rk: 'n' },
    'Timekeeper Hag (nightmare elite)': { name: 'Timekeeper Hag', max: 450, ac: 14, sz: 1, ab: 5, spd: 5, rk: 'n' },
    'Bogeyman (horror, Desidia phase 2)': { name: 'The Bogeyman', max: 650, ac: 15, sz: 2, ab: 5, spd: 7, rk: 'u' },
    'Dream Eater (horror, Desidia phase 2)': { name: 'The Dream Eater', max: 700, ac: 14, sz: 2, ab: 5, spd: 6, rk: 'u' },
    'Nightmare Aberration (horror, Desidia phase 2)': { name: 'Nightmare Aberration', max: 850, ac: 14, sz: 3, ab: 5, spd: 6, rk: 'u' },
    'Insomnia Beast (guardian)': { name: 'Insomnia Beast', max: 1100, ac: 14, sz: 3, ab: 5, spd: 6, rk: 'u' },
  },
  'Caves of Ifstrid (Arachne, level 3-4)': {
    'All-seeing Ooze (elite)': { name: 'All-seeing Ooze', max: 450, ac: 13, sz: 1, ab: 5, spd: 4, rk: 'n' },
  },
}

/** The Stats menu: bosses first, then each region. Option values are "group|label". */
export const STAT_GROUPS: { label: string; items: Record<string, BossStats> }[] = [{ label: 'Bosses', items: BOSS_STATS }, ...Object.entries(REGION_STATS).map(([label, items]) => ({ label, items }))]

/** A Stats menu value ("group|label") to its preset. */
export const statPreset = (v: string): BossStats | undefined => {
  const i = v.indexOf('|')
  return STAT_GROUPS.find((g) => g.label === v.slice(0, i))?.items[v.slice(i + 1)]
}

/** The sheet change a preset makes: full HP at the new max. */
export const bossStatsPatch = (s: BossStats): Partial<Enemy> => ({ name: s.name, max: s.max, hp: s.max, ac: s.ac, sz: s.sz, ab: s.ab, spd: s.spd, rk: s.rk })
