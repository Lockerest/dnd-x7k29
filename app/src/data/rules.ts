// Copied from the live page (index.html). The parity tests in e2e/parity check
// this stays identical to the page until the page is retired.
import type { ClassId, Stat } from '../logic/types'

/** Every number on the sheet is the table value times SC. */
export const SC = 10

/** The stat each class attacks with. */
export const CLASS_STAT: Record<ClassId, Stat> = {
  "fighter": "str",
  "archer": "dex",
  "mage": "int",
  "thief": "dex",
  "warrior": "str",
  "sorcerer": "int",
  "spearhand": "str",
  "magickarcher": "dex",
  "trickster": "dex"
}

/** Reach of each class's basic weapon attacks, in squares. */
export const WEAPON_REACH: Record<ClassId, number> = {
  "fighter": 1,
  "archer": 8,
  "mage": 6,
  "thief": 1,
  "warrior": 1,
  "sorcerer": 6,
  "spearhand": 2,
  "magickarcher": 8,
  "trickster": 1
}

/** Base damage of class abilities. autoHit: the target makes a save instead of being rolled against. */
export const ABILITY_DAMAGE: Record<string, { range: number; dice: string; autoHit?: boolean }> = {
  "Power Strike": {
    "range": 1,
    "dice": "2d8"
  },
  "Multi-Slash": {
    "range": 1,
    "dice": "2d6"
  },
  "Shield Bash": {
    "range": 1,
    "dice": "1d4",
    "autoHit": true
  },
  "Piercing Shot": {
    "range": 8,
    "dice": "2d6"
  },
  "Triple Volley": {
    "range": 6,
    "dice": "3d4"
  },
  "Pinning Shot": {
    "range": 6,
    "dice": "1d6",
    "autoHit": true
  },
  "Firebolt": {
    "range": 8,
    "dice": "2d10"
  },
  "Ember Burst": {
    "range": 6,
    "dice": "6d6",
    "autoHit": true
  },
  "Backstab": {
    "range": 1,
    "dice": "3d6"
  },
  "Cutting Flurry": {
    "range": 1,
    "dice": "2d6"
  }
}

/** Healing abilities: dice plus the character level or their INT modifier. */
export const ABILITY_HEAL: Record<string, { dice: string; bonus: 'level' | 'int' }> = {
  "Second Wind": {
    "dice": "1d10",
    "bonus": "level"
  },
  "Mending Light": {
    "dice": "2d8",
    "bonus": "int"
  }
}
