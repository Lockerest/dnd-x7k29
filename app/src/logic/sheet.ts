// What the character sheet's buttons and boxes do: each returns the change to save
// and the log line, exactly like the live page's handlers for the sheet.
import { SC } from '../data/rules'
import { attunedSet, PARRY_LABELS, PARRY_SETTINGS, type Board } from './board'
import { isHeavy } from './combat'
import { effectiveMaxHp, hpCost } from './health'
import { abilityCost } from './stamina'
import { clamp } from './stats'
import type { Character, Enemy } from './types'

/** A full sheet as stored (the rules only type the fields they read). */
export type Sheet = Character & {
  log?: string[]
  fl?: number
  maxFl?: number
  used?: number
  mvd?: number
  pr?: boolean
  lh?: number
  ddg?: boolean
  pry?: boolean
  ctr?: boolean
  cb?: string | null
  conds?: string
  notes?: string
  shield?: unknown
  pw?: string
  ha?: unknown
  at?: Record<string, unknown> | null
  atn?: number
  ac?: number
  pv?: number
  iv?: number
  [k: string]: unknown
}

export type Change = [patch: Record<string, unknown>, msg?: string]

/** Status labels under the name; bad ones show in red. */
export function characterPills(c: Sheet): { text: string; bad: boolean }[] {
  const x: string[] = []
  if (c.mt) x.push(c.mt === 'climb' ? 'Mounted: -40 St/round' : 'On a downed foe')
  if (c.exh) x.push(`Exhausted · ${c.exn || 2} rd`)
  if (c.stn) x.push('Stunned')
  if (c.ddg) x.push('Dodging')
  if (c.pry) x.push('Parrying')
  if (c.chg) x.push(`Charging ${c.chg}`)
  if (c.ctr) x.push('Counter ready')
  if ((c.hp as number) <= 0) x.push('Dead')
  if (c.dth) x.push(`Curse x${c.dth} · stamina +${15 * c.dth}% · max HP -${10 * c.dth}% · rest at a DIFFERENT altar to cleanse`)
  if (c.ft) x.push(`Fatigue · max HP -${c.ft}% · rest at a bonfire or altar to clear`)
  if (c.pr) x.push('Prone')
  if (c.conds) x.push(c.conds)
  return x.map((text) => ({ text, bad: /Exh|Prone|Stun|Dead/.test(text) }))
}

/** "+20" / "-5" */
export const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`)

/** The -50 / -10 / +10 / +50 HP buttons. */
export const hpChange = (c: Sheet, n: number): Change => [{ hp: clamp((c.hp as number) + n, c.maxHp as number) }, `${n > 0 ? 'Healed ' : 'Took '}${Math.abs(n)}`]

/** The GM's -10 / +10 stamina buttons (no log line; empty stamina still exhausts). */
export const staminaChange = (c: Sheet, n: number): Change => [{ st: clamp((c.st as number) + n, c.maxSt as number) }]

/** A flask heals 40% of max HP (rounded down). Null with none left. */
export function drinkFlask(c: Sheet): Change | null {
  if (!((c.fl as number) > 0)) return null
  const h = Math.floor((c.maxHp as number) * 0.4)
  return [{ fl: (c.fl as number) - 1, hp: clamp((c.hp as number) + h, c.maxHp as number) }, `Drank a flask (+${h} HP)`]
}

/** Stamina regained at the start of a turn (climbing a monster drains 4 x SC). */
export const netRegen = (c: Sheet) => (c.ua ? 0 : (c.rg as number)) - (c.mt === 'climb' ? 4 * SC : 0)

/** Bonfire rest: fatigue cleared, HP and stamina full (the curse stays). */
export function bonfireRest(c: Sheet): Change {
  const base = (c.bmh || c.maxHp) as number
  const mx = effectiveMaxHp(base, c.dth || 0, 0)
  return [{ fa: 0, ft: 0, bmh: c.dth ? base : c.bmh || null, maxHp: mx, hp: mx, st: c.maxSt, used: 0, mvd: 0, exh: false, pr: false, lh: 0 }, 'Rested at a bonfire: fatigue cleared']
}

/** True when resting at this altar lifts the curse: cursed, and not the altar they were revived at. */
export const cleanses = (c: Sheet, altar: string | null) => !!(c.dth && altar && altar !== c.cb)

/** Altar rest: everything refilled and fatigue cleared; a different altar also lifts the curse. */
export function altarRest(c: Sheet, altar: string | null): Change {
  const base = (c.bmh || c.maxHp) as number
  const cl = cleanses(c, altar)
  const nd = cl ? 0 : c.dth || 0
  const mx = effectiveMaxHp(base, nd, 0)
  const p: Record<string, unknown> = { fa: 0, ft: 0, hp: mx, maxHp: mx, st: c.maxSt, fl: c.maxFl, used: 0, mvd: 0, exh: false, pr: false, lh: 0 }
  if (nd === 0) Object.assign(p, { dth: 0, cb: null, bmh: null })
  else p.bmh = base
  return [p, cl ? 'Cleansed at a new altar: the curse lifts' : 'Rested at the altar']
}

/** Rising again at an altar: one more curse (max 3), moved onto that altar. */
export function revive(c: Sheet, altar: string): [patch: Record<string, unknown>, msg: string, event: string] {
  const [bx, by] = altar.split(',').map(Number)
  const base = (c.bmh || c.maxHp) as number
  const nd = Math.min(3, (c.dth || 0) + 1)
  const nm = effectiveMaxHp(base, nd, 0)
  return [
    { bmh: base, maxHp: nm, hp: nm, st: c.maxSt, fl: c.maxFl, fa: 0, ft: 0, dth: nd, cb: altar, mx: bx, my: by, exh: false, stn: false, pr: false, mt: '', mon: null, used: 0, mvd: 0 },
    `Revived at an altar (curse x${nd}): max HP -${10 * nd}%, stamina costs +${15 * nd}%`,
    `${c.name} rises again at an altar, weaker than before (curse x${nd})`,
  ]
}

export const toggleShield = (c: Sheet): Change => [{ shield: !c.shield }, c.shield ? 'Put away the shield' : 'Equipped a shield']

export function cycleParry(c: Sheet): Change {
  const o = PARRY_SETTINGS as readonly string[]
  const nx = o[(o.indexOf(c.pw || '') + 1) % 4]!
  return [{ pw: nx }, `Parry set to ${PARRY_LABELS[nx]}`]
}

export const toggleArmor = (c: Sheet): Change => [{ ha: !isHeavy(c) }, isHeavy(c) ? 'Changed into light armor' : 'Put on heavy armor']

/** Climbing a standing monster, or riding one that is down. */
export const toggleFoeDown = (c: Sheet): Change => [{ mt: c.mt === 'climb' ? 'down' : 'climb' }, c.mt === 'climb' ? 'Foe knocked down: no drain' : 'Foe is back up: -40 St per round']

export const dismount = (dm: boolean): Change => [{ mt: '', mon: null }, dm ? 'Dropped from the monster' : 'Unmounted']

/** The GM frees a Golden ability kept by attunement. */
export function releaseAttunement(c: Sheet, key: string, board: Board): Change {
  const o = { ...(c.at || {}) }
  delete o[key]
  return [{ at: Object.keys(o).length ? o : null }, `Attunement released: ${board[key] ? board[key].n : ''}`]
}

export const attunedKeys = (c: Sheet, board: Board) => attunedSet(c, board)

/** A typed box on the sheet: numbers (GM only) save as numbers, text as typed. */
export const fieldValue = (raw: string, isNumber: boolean): string | number => (isNumber ? Number(raw) || 0 : raw)

/** Turn order: "go" phase with whose turn it is. */
export type Initiative = { l?: { k: string }[]; t?: number; ph?: string } | null | undefined

export const turnKey = (ini: Initiative) => (ini && ini.ph === 'go' && ini.l && ini.l[ini.t as number] ? ini.l[ini.t as number]!.k : null)

/** Outside combat anyone may act; in combat only on their turn. */
export const isMyTurn = (ini: Initiative, k: string) => !(ini && ini.ph === 'go') || turnKey(ini) === k

/** Whether an ability button is greyed out (reactions ignore the action count and the turn). */
export function abilityLocked(c: Sheet, reaction: boolean, dm: boolean, myTurn: boolean): boolean {
  return !!(c.exh || c.stn || c.chg || (c.hp as number) <= 0 || (!reaction && ((c.used || 0) >= 2 || (!dm && !myTurn))))
}

/** Using an ability: pay stamina (and HP for Golden ones), count the action, raise Dodge or Parry. */
export function payForAbility(c: Sheet, name: string, baseCost: number, reaction: boolean, hpPct: number | undefined, target?: string): Change {
  const k = abilityCost(c, baseCost)
  const p: Record<string, unknown> = {}
  let msg = `Used ${name} (-${k} St)${target ? ` on ${target}` : ''}`
  if ((c.st as number) >= k) {
    p.st = (c.st as number) - k
    Object.assign(p, hpCost(c as Sheet & { hp: number }, hpPct))
  } else {
    Object.assign(p, { st: 0, exh: true, mt: '', mon: null })
    msg += ' - out of stamina: EXHAUSTED'
  }
  if (!reaction) p.used = (c.used || 0) + 1
  // A real ability on your turn stops the next turn's stamina regen (Dodge and Parry don't).
  if (!reaction && k > 0 && name !== 'Dodge Roll' && name !== 'Parry') p.ua = true
  if (name === 'Dodge Roll') p.ddg = true
  if (name === 'Parry') p.pry = true
  return [p, msg]
}

/** Healing from an ability roll: dice total plus bonus, x SC. */
export const healAmount = (rolls: number[], bonus: number) => (rolls.reduce((a, b) => a + b, 0) + bonus) * SC

/**
 * Resting at an altar resets the world: every monster back to full at its post,
 * except unique foes (who stay dead) and phase sheets (which wait off the board).
 */
export function respawnPatches(enemies: Record<string, Enemy>): [string, Record<string, unknown>][] {
  const out: [string, Record<string, unknown>][] = []
  const rank = (e: Enemy) => (e.rk as string) || ((e.sz || 1) >= 4 ? 'u' : 'n')
  const next = new Set(
    Object.values(enemies)
      .map((e) => e.nx)
      .filter((k): k is string => !!k && !!enemies[k]),
  )
  for (const i of Object.keys(enemies)) {
    const e = enemies[i]!
    if (next.has(i)) {
      if ((e.hp as number) > 0 && e.mx != null) out.push([i, { hp: e.max, mx: null, my: null, po: e.pm || 0, stun: false, sg: false }])
      continue
    }
    if (e.nx && enemies[e.nx] && e.mx == null && (enemies[e.nx]!.hp as number) > 0) {
      out.push([i, { hp: e.max, bi: false, po: e.pm || 0, stun: false, sg: false, hd: null, ht: 0, mx: e.hx, my: e.hy, mp: e.hm || e.mp }])
      continue
    }
    if (rank(e) === 'u') continue
    out.push([i, { hp: e.max, bi: false, po: e.pm || 0, stun: false, sg: false, rec: false, hd: null, ht: 0, mx: e.hx != null ? e.hx : e.mx, my: e.hy != null ? e.hy : e.my, mp: e.hm || e.mp }])
  }
  return out
}

/** Hitting an exhausted hero: three light hits or one heavy hit knock them prone. */
export function lightHit(c: Sheet, k: 'l' | 'h'): [Record<string, unknown>, string] {
  const lh = (c.lh || 0) + (k === 'l' ? 1 : 0)
  const pr = k === 'h' || lh >= 3
  return [{ lh: pr ? 0 : lh, pr: pr || !!c.pr }, pr ? 'Knocked prone!' : `Light hit ${lh}/3`]
}
