// Shapes of the data stored in Firebase. Field names are the short codes the live
// page has always used, so both apps can read the same tables; the comments say
// what each one means.

export type ClassId = 'fighter' | 'archer' | 'mage' | 'thief' | 'warrior' | 'sorcerer' | 'spearhand' | 'magickarcher' | 'trickster' | 'hexblade' | 'duelist'
export type Stat = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
export type EffectKind = 'slash' | 'heavy' | 'bash' | 'fire' | 'ice' | 'bolt' | 'arrow' | 'poison'

/** A player character sheet (only the fields the rules read or write). */
export type Character = {
  name?: string
  cls?: ClassId | string
  level?: number
  /** Current and max HP; bmh is the max HP before fatigue (base max HP). */
  hp?: number
  maxHp?: number
  bmh?: number
  /** Stamina, max stamina and stamina regained per turn. */
  st?: number
  maxSt?: number
  rg?: number
  /** Deaths so far (each costs max HP and makes abilities cost more). */
  dth?: number
  /** Damage taken this rest (fa) and fatigue level 0 to 10 (ft). */
  fa?: number
  ft?: number
  /** Exhausted, and exhausted rounds left. */
  exh?: boolean
  exn?: number
  /** Used an ability this turn: no stamina regen at the next turn's start. */
  ua?: boolean
  /** Movement type ("climb" drains stamina) and the enemy being climbed. */
  mt?: string
  mon?: string | null
  /** Stunned, and a charged ability waiting to go off. */
  stn?: boolean
  chg?: string | null
  /** Grid position, and the map it is on (missing: every map). */
  mx?: number | null
  my?: number | null
  mp?: string | null
  /** Already on the x10 scale. */
  x10?: boolean
  /** GM approval: false = waiting, "no" = declined, true or missing = can play. */
  ap?: boolean | string
} & Partial<Record<Stat, number>>

/** One skill on an enemy sheet. d "0", "-" or "none" is a utility skill. */
export type EnemySkill = { n: string; d: string; r: number; t: 's' | 'a'; a?: number }

/** An enemy or boss sheet (only the fields the rules read or write). */
export type Enemy = {
  name?: string
  type?: string
  hp?: number
  max?: number
  /** Size in squares (2 = 2x2) and grid position on map mp. */
  sz?: number
  mx?: number | null
  my?: number | null
  mp?: string | null
  /** Max poise and current poise; 0 poise staggers. */
  pm?: number
  po?: number
  stun?: boolean
  /** Staggered this round (cleared next round). */
  sg?: boolean
  rec?: boolean
  /** Phases: next sheet id, gate %, gate reached at HP, swap at 0 HP, phase label, theme key. */
  nx?: string
  pg?: number
  gr?: number
  sw?: number | boolean
  pl?: string
  th?: string
  /** Cinematic script for the gate. */
  gt?: string
  /** Cutscene video link for the gate (plays before the script). */
  gvu?: string
  /** Light attack dice, reach and attack bonus. */
  dm?: string
  er?: number
  ab?: number
  /** Heavy hit reactions override. */
  ha?: boolean | number
  cls?: string
  sk?: Record<string, EnemySkill>
  x10?: boolean
  [k: string]: unknown
}

/** A combatant as the rules see it: e = enemy, o = its sheet. */
export type Unit<T = Character | Enemy> = { e: boolean; id?: string; o: T }

/** Attack numbers, as the live page builds them. */
export type AttackInfo = {
  label: string
  rng: number
  dmg: string
  tb: number
  db: number
  cost: number
  cs?: number
  po: number
  heavy?: true
}
