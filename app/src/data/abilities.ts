// Copied from the live page (index.html). The parity tests in e2e/parity check
// this stays identical to the page until the page is retired.

/** An ability as a sheet lists it: name, table cost (x SC = stamina), text, "r" for a reaction. */
export type SheetAbility = [name: string, cost: number, text: string, reaction: string]

/** Every character can Dodge Roll (a reaction). */
export const COMMON_ABILITIES: SheetAbility[] = [
  [
    "Dodge Roll",
    3,
    "Reaction: when an attack would hit you, roll a DEX save (d20 + DEX) against its roll. Beat it: no damage. Miss by 1-2: half damage. Miss by more: full damage. Costs stamina either way. Doesn't use an action.",
    "r"
  ]
]

/** Parry, for characters whose class or shield allows it. */
export const PARRY: SheetAbility = [
  "Parry",
  2,
  "Reaction (needs a shield or melee weapon): when a weapon, claw, tail or projectile attack would hit you (not a spell effect, flame, frost or beam), roll a STR save (d20 + STR) against its roll. Beat it: no damage, and you may counter-attack once. Miss by 1-2: half damage. Miss by more: full damage. Costs stamina either way. Doesn't use an action.",
  "r"
]

/** Extra abilities on the default ability board: vocation, name, cost, level, kind, dice, range, auto-hit, bonus, text. */
export const DEFAULT_BOARD_EXTRAS: [string, string, number, number, string, string, number, number, string, string][] = [
  [
    "fighter",
    "Cleave",
    3,
    2,
    "atk",
    "3d6",
    1,
    0,
    "",
    "A wide swing: 3d6 damage."
  ],
  [
    "fighter",
    "Heavy Smash",
    5,
    3,
    "atk",
    "4d8",
    1,
    0,
    "",
    "A crushing overhead blow: 4d8."
  ],
  [
    "archer",
    "Rapid Shot",
    3,
    2,
    "atk",
    "2d8",
    8,
    0,
    "",
    "Two arrows in one: 2d8."
  ],
  [
    "archer",
    "Deadeye",
    5,
    3,
    "atk",
    "4d6",
    10,
    0,
    "",
    "A patient, perfect shot: 4d6, long range."
  ],
  [
    "mage",
    "Frost Lance",
    3,
    2,
    "atk",
    "3d8",
    8,
    0,
    "",
    "A spear of ice: 3d8."
  ],
  [
    "mage",
    "Fireball",
    5,
    3,
    "atk",
    "8d6",
    6,
    1,
    "",
    "Explosive: 8d6 to the target, no attack roll."
  ],
  [
    "thief",
    "Shadow Strike",
    3,
    2,
    "atk",
    "4d6",
    1,
    0,
    "",
    "Strike from the dark: 4d6."
  ],
  [
    "thief",
    "Venom Cut",
    2,
    2,
    "atk",
    "2d6",
    1,
    1,
    "",
    "A poisoned nick: 2d6, no attack roll."
  ]
]

/** Sheet banner colour and emoji per class (others use the fighter one). */
export const CLASS_FRAMES: Record<string, [color: string, emoji: string]> = {
  "fighter": [
    "#c8553d",
    "⚔️"
  ],
  "archer": [
    "#4f9d4a",
    "🏹"
  ],
  "mage": [
    "#5b6fe0",
    "🔮"
  ],
  "thief": [
    "#8d7fa8",
    "🗡️"
  ]
}

/** Number fields on the sheet, in order: field, label. */
export const STAT_FIELDS: [field: string, label: string][] = [
  [
    "level",
    "Level"
  ],
  [
    "atn",
    "Attunements"
  ],
  [
    "ac",
    "AC"
  ],
  [
    "maxHp",
    "Max HP"
  ],
  [
    "maxSt",
    "Max stamina"
  ],
  [
    "rg",
    "Regen/turn"
  ],
  [
    "spd",
    "Speed (sq)"
  ],
  [
    "maxFl",
    "Flasks max"
  ],
  [
    "souls",
    "Souls"
  ],
  [
    "str",
    "STR"
  ],
  [
    "dex",
    "DEX"
  ],
  [
    "con",
    "CON"
  ],
  [
    "int",
    "INT"
  ],
  [
    "wis",
    "WIS"
  ],
  [
    "cha",
    "CHA"
  ]
]
