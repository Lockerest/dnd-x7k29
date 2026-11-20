// Copied from the live page (index.html). The parity tests in e2e/parity check
// this stays identical to the page until the page is retired.
import type { ClassId } from '../logic/types'

export type ClassAbility = { name: string; cost: number; text: string }
export type ClassInfo = { name: string; description: string; hp: number; stamina: number; regen: number; abilities: ClassAbility[] }

/** Playable classes. hp, stamina and regen are table values (before x SC). */
export const CLASSES: Record<ClassId, ClassInfo> = {
  "fighter": {
    "name": "Fighter",
    "description": "Tough, 20 stamina back per turn",
    "hp": 140,
    "stamina": 100,
    "regen": 20,
    "abilities": [
      {
        "name": "Power Strike",
        "cost": 2,
        "text": "+1d8 damage on a hit"
      },
      {
        "name": "Multi-Slash",
        "cost": 3,
        "text": "One extra attack this turn"
      },
      {
        "name": "Shield Bash",
        "cost": 2,
        "text": "STR save or target is knocked prone"
      },
      {
        "name": "Second Wind",
        "cost": 3,
        "text": "Heal 1d10 + level"
      }
    ]
  },
  "archer": {
    "name": "Archer",
    "description": "Ranged, steady stamina",
    "hp": 110,
    "stamina": 100,
    "regen": 20,
    "abilities": [
      {
        "name": "Piercing Shot",
        "cost": 2,
        "text": "+1d6, ignores half cover"
      },
      {
        "name": "Triple Volley",
        "cost": 3,
        "text": "Three arrows, each at -2 to hit"
      },
      {
        "name": "Pinning Shot",
        "cost": 2,
        "text": "DEX save or speed 0 until your next turn"
      },
      {
        "name": "Hunter's Eye",
        "cost": 1,
        "text": "Mark a weak point: next hit crits on 19-20"
      }
    ]
  },
  "mage": {
    "name": "Mage",
    "description": "Big pool, slow regen",
    "hp": 90,
    "stamina": 140,
    "regen": 10,
    "abilities": [
      {
        "name": "Firebolt",
        "cost": 1,
        "text": "2d10 fire, ranged"
      },
      {
        "name": "Ember Burst",
        "cost": 4,
        "text": "20 ft radius, 6d6 fire, DEX half"
      },
      {
        "name": "Arcane Ward",
        "cost": 3,
        "text": "Absorb 50 + 10 per level damage"
      },
      {
        "name": "Mending Light",
        "cost": 3,
        "text": "Heal 2d8 + INT, once per turn"
      }
    ]
  },
  "thief": {
    "name": "Thief",
    "description": "Quick, opportunistic",
    "hp": 100,
    "stamina": 100,
    "regen": 20,
    "abilities": [
      {
        "name": "Backstab",
        "cost": 2,
        "text": "+2d6 with advantage or ally adjacent"
      },
      {
        "name": "Cutting Flurry",
        "cost": 2,
        "text": "Two quick light-weapon attacks"
      },
      {
        "name": "Smoke Bomb",
        "cost": 3,
        "text": "5 ft cloud, heavily obscured, free Disengage"
      },
      {
        "name": "Pilfer",
        "cost": 1,
        "text": "Sleight of Hand to lift an item mid-fight"
      }
    ]
  },
  "warrior": {
    "name": "Warrior",
    "description": "Heavy weapons, hits hard",
    "hp": 150,
    "stamina": 100,
    "regen": 20,
    "abilities": [
      {
        "name": "Heavy Swing",
        "cost": 2,
        "text": "A big two-handed swing"
      },
      {
        "name": "Guard Break",
        "cost": 3,
        "text": "Smash through a shield"
      },
      {
        "name": "Brace",
        "cost": 1,
        "text": "Plant your feet: harder to stagger"
      }
    ]
  },
  "sorcerer": {
    "name": "Sorcerer",
    "description": "Elemental caster, wide area",
    "hp": 90,
    "stamina": 140,
    "regen": 10,
    "abilities": [
      {
        "name": "Elemental Bolt",
        "cost": 1,
        "text": "A bolt of fire, ice or lightning"
      },
      {
        "name": "Burning Ground",
        "cost": 3,
        "text": "Scorch an area"
      },
      {
        "name": "Frost Veil",
        "cost": 3,
        "text": "Resist cold and fire for the fight"
      }
    ]
  },
  "spearhand": {
    "name": "Mystic Spearhand",
    "description": "Spear and magick, pulls enemies in",
    "hp": 120,
    "stamina": 110,
    "regen": 20,
    "abilities": [
      {
        "name": "Spear Thrust",
        "cost": 1,
        "text": "A reaching thrust"
      },
      {
        "name": "Sweeping Lance",
        "cost": 2,
        "text": "A wide spear sweep"
      },
      {
        "name": "Pull Stance",
        "cost": 2,
        "text": "Ready to pull an enemy in"
      }
    ]
  },
  "magickarcher": {
    "name": "Magick Archer",
    "description": "Enchanted arrows and sigils",
    "hp": 100,
    "stamina": 120,
    "regen": 15,
    "abilities": [
      {
        "name": "Enchanted Arrow",
        "cost": 1,
        "text": "An arrow charged with magick"
      },
      {
        "name": "Sigil Shot",
        "cost": 2,
        "text": "An arrow that leaves a sigil"
      },
      {
        "name": "Healing Sigil",
        "cost": 3,
        "text": "Heal 2d6 + INT"
      }
    ]
  },
  "trickster": {
    "name": "Trickster",
    "description": "Illusions and decoys",
    "hp": 100,
    "stamina": 110,
    "regen": 20,
    "abilities": [
      {
        "name": "Quick Jab",
        "cost": 1,
        "text": "A fast jab"
      },
      {
        "name": "Mirror Step",
        "cost": 2,
        "text": "Step aside and leave an image"
      },
      {
        "name": "Distract",
        "cost": 1,
        "text": "Dex check to pull attention"
      }
    ]
  }
}
