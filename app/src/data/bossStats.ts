// Stat presets for the "Stats" menu on enemy sheets: picking one fills the sheet's
// name, HP (full), AC, size, attack bonus, speed and rank in one go. Tuned to the
// party level each region expects (see each boss's GM rules in its skill set).
import type { Enemy } from '../logic/types'

/** Preset: what it sets on the sheet (hp is set to max). */
export type BossStats = { name: string; max: number; ac: number; sz: number; ab: number; spd: number; rk: 'n' | 'm' | 'u' }

/** Halfway bosses, in story order. */
export const BOSS_STATS: Record<string, BossStats> = {
  'Desidia: phase 1 (secret, level 3)': { name: 'Desidia, Lady of Slumber', max: 1800, ac: 15, sz: 3, ab: 6, spd: 0, rk: 'm' },
  'Desidia: phase 2 (nightmare)': { name: 'Desidia, the Nightmare', max: 1200, ac: 16, sz: 2, ab: 6, spd: 6, rk: 'm' },
  'Iniha Yunvra: phase 1 (secret, Arachne, level 4)': { name: 'Iniha Yunvra, the Drow Queen', max: 2000, ac: 16, sz: 1, ab: 7, spd: 6, rk: 'm' },
  'Iniha Yunvra: phase 2 (brood mother)': { name: 'Iniha Yunvra, the Brood Mother', max: 1800, ac: 15, sz: 3, ab: 7, spd: 8, rk: 'm' },
  'Cadmus the Exhumed: phase 1 (secret, Kernunos, level 5)': { name: 'Cadmus the Exhumed', max: 2400, ac: 16, sz: 3, ab: 7, spd: 0, rk: 'm' },
  'Cadmus the Exhumed: phase 2 (the throne wakes)': { name: 'Cadmus, the Throne Awake', max: 2000, ac: 15, sz: 3, ab: 7, spd: 0, rk: 'm' },
  'Aldrich: phase 1 (secret, Sky, level 7)': { name: 'Aldrich, Devourer of Gods', max: 2800, ac: 17, sz: 3, ab: 9, spd: 4, rk: 'm' },
  'Aldrich: phase 2 (the gods break through)': { name: 'Aldrich, the Gods Break Through', max: 2200, ac: 16, sz: 3, ab: 9, spd: 4, rk: 'm' },
  'Tenjin: phase 1 (secret, Odi’ram, level 8)': { name: 'Tenjin, Warden of the Shard', max: 2600, ac: 18, sz: 2, ab: 10, spd: 6, rk: 'm' },
  'Tenjin: phase 2 (red thunder)': { name: 'Tenjin, Red Thunder', max: 2000, ac: 17, sz: 2, ab: 10, spd: 6, rk: 'm' },
  'The Jailer (Calden, level 2)': { name: 'The Jailer', max: 1500, ac: 15, sz: 2, ab: 5, spd: 5, rk: 'm' },
  'Remade Triumvirate (Arachne, level 3-4)': { name: 'Remade Triumvirate', max: 1500, ac: 16, sz: 2, ab: 6, spd: 6, rk: 'm' },
  'Dark Elf High Priestess (Arachne, level 3-4)': { name: 'Dark Elf High Priestess', max: 500, ac: 13, sz: 1, ab: 6, spd: 6, rk: 'm' },
  'The Corrupted Idol (Kernunos, level 5)': { name: 'The Corrupted Idol', max: 2200, ac: 16, sz: 3, ab: 7, spd: 5, rk: 'm' },
  'Awakened Blood (Idol at half HP)': { name: 'Awakened Blood', max: 300, ac: 14, sz: 1, ab: 7, spd: 6, rk: 'n' },
  'Alithrax (Sky, level 6-7)': { name: 'Alithrax', max: 2600, ac: 17, sz: 3, ab: 8, spd: 8, rk: 'm' },
  'Azael phase 1 (Odi’ram, level 8)': { name: 'Azael', max: 1600, ac: 18, sz: 1, ab: 9, spd: 8, rk: 'm' },
  'Azael phase 2 (unchained)': { name: 'Azael, Unchained', max: 1200, ac: 17, sz: 1, ab: 9, spd: 8, rk: 'm' },
  'Yesod (void 1, level 9)': { name: 'Yesod, the Infinite Witness', max: 2400, ac: 16, sz: 3, ab: 10, spd: 0, rk: 'm' },
  'Tiferet, left half (void 2, level 9)': { name: 'Tiferet (Left)', max: 1600, ac: 17, sz: 3, ab: 10, spd: 0, rk: 'm' },
  'Tiferet, right half (void 2, level 9)': { name: 'Tiferet (Right)', max: 1600, ac: 17, sz: 3, ab: 10, spd: 0, rk: 'm' },
  'Zarael phase 1 (void 3, level 9)': { name: 'Zarael, the Masked Queen', max: 2200, ac: 18, sz: 3, ab: 10, spd: 8, rk: 'm' },
  'Zarael phase 2 (faceless)': { name: 'Zarael, the Faceless Queen', max: 1800, ac: 17, sz: 3, ab: 10, spd: 8, rk: 'm' },
  'The Great Yokai (Izat’al, level 9-10)': { name: 'The Great Yokai', max: 3400, ac: 18, sz: 2, ab: 10, spd: 6, rk: 'm' },
}

/** The sheet change a preset makes: full HP at the new max. */
export const bossStatsPatch = (s: BossStats): Partial<Enemy> => ({ name: s.name, max: s.max, hp: s.max, ac: s.ac, sz: s.sz, ab: s.ab, spd: s.spd, rk: s.rk })
