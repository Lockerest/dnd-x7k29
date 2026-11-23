// Signature weapons and accessories (1.21.0). Every hero keeps one weapon for the
// whole story; the Golden power reforges it after the big falls (tiers), and only
// the light and heavy attacks use it (abilities already count the weapon in their
// own dice). Accessories are rings and amulets the GM gives out: a hero wears any
// two (two rings, two amulets, or one of each).
import { clamp } from '../logic/stats'

export type WeaponTier = { t: number; label: string; light: string; heavy: string }

/** Weapon tiers: the light and heavy attack dice (+ the class stat, x10 like all damage). */
export const WEAPON_TIERS: WeaponTier[] = [
  { t: 1, label: 'Tier 1 (start)', light: '1d6', heavy: '1d10' },
  { t: 2, label: 'Tier 2 (Arachne has fallen)', light: '1d8', heavy: '2d6' },
  { t: 3, label: 'Tier 3 (the Nameless King has fallen)', light: '1d10', heavy: '2d8' },
  { t: 4, label: 'Tier 4 (Xibalba has fallen)', light: '1d12', heavy: '2d10' },
]

/** A hero's weapon tier (1 to 4; 1 when unset). */
export const weaponTier = (c: object): WeaponTier => WEAPON_TIERS[(clamp(Math.round(Number((c as { wt?: unknown }).wt) || 1), 4) || 1) - 1]!

/** What an accessory changes on the sheet (applied when worn, taken back when removed) or in a roll. */
export type GearFx = { hp?: number; st?: number; rg?: number; ac?: number; fl?: number; pry?: number; ddg?: number; flask?: number; heal?: number }

export type Accessory = { n: string; kind: 'ring' | 'amulet'; text: string; fx?: GearFx }

/** Every ring and amulet. Numbers are table numbers (already x10). */
export const ACCESSORIES: Record<string, Accessory> = {
  ring_breath: { n: 'Ring of Steady Breath', kind: 'ring', text: '+5 stamina at the start of each of your turns (still none after a turn you used an ability).', fx: { rg: 5 } },
  ring_parry: { n: 'Duelist’s Signet', kind: 'ring', text: '+1 to every Parry roll.', fx: { pry: 1 } },
  ring_dodge: { n: 'Featherstep Ring', kind: 'ring', text: '+1 to every Dodge Roll.', fx: { ddg: 1 } },
  ring_blood: { n: 'Bloodstone Band', kind: 'ring', text: '+20 max HP.', fx: { hp: 20 } },
  ring_lung: { n: 'Ring of the Deep Lung', kind: 'ring', text: '+20 max stamina.', fx: { st: 20 } },
  ring_iron: { n: 'Iron Oath Ring', kind: 'ring', text: '+1 AC.', fx: { ac: 1 } },
  ring_ember: { n: 'Ember-Eater Ring', kind: 'ring', text: 'Odi’ram’s Embers burst at 5 instead of 4 on you (at 3 instead of 2 in blue fire). GM applies it.' },
  ring_rime: { n: 'Rime Ward Ring', kind: 'ring', text: 'Every frost or cold hit you take deals 20 less (after halving, never below 10). GM applies it.' },
  am_hearth: { n: 'Hearthstone Amulet', kind: 'amulet', text: '+1 flask, refilled at rests like the others.', fx: { fl: 1 } },
  am_pilgrim: { n: 'Pilgrim’s Pendant', kind: 'amulet', text: 'Your flasks heal 50% of your max HP instead of 40%.', fx: { flask: 10 } },
  am_medal: { n: 'Saint’s Medal', kind: 'amulet', text: 'Your healing abilities heal 10 more (on yourself or an ally).', fx: { heal: 10 } },
  am_unbroken: { n: 'Amulet of the Unbroken', kind: 'amulet', text: '+10 max HP, and +2 on saves against being pushed, pulled or knocked prone (GM applies the +2).', fx: { hp: 10 } },
  am_watcher: { n: 'Watcher’s Eye', kind: 'amulet', text: 'You can’t be surprised, and hidden or invisible creatures within 2 squares of you are seen. GM applies it.' },
  am_quiet: { n: 'Charm of the Quiet Step', kind: 'amulet', text: 'Once per turn you can leave one enemy’s reach without giving it a free attack. GM applies it.' },
}

/** Accessory ids from a comma list ("ring_parry,am_hearth"), unknown ones left out. */
export const idList = (s: unknown): string[] => (typeof s === 'string' ? s.split(',').filter((x) => x in ACCESSORIES) : [])

/** The worn accessories (slots a1 and a2). */
type Slots = { a1?: unknown; a2?: unknown }
export const worn = (c: object): string[] => [(c as Slots).a1, (c as Slots).a2].filter((x): x is string => typeof x === 'string' && x in ACCESSORIES)

/** The sum of one effect over the worn accessories. */
export const gearBonus = (c: object, k: keyof GearFx): number => worn(c).reduce((n, id) => n + (ACCESSORIES[id]!.fx?.[k] ?? 0), 0)
