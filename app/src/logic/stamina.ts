// Turn start, stamina costs and exhaustion.
import { SC } from '../data/rules'
import { clamp } from './stats'
import type { Character } from './types'

export type Patch = Partial<Character> & Record<string, unknown>

/** Stamina cost of an ability: table cost x SC, +15% per death (max 3 deaths). */
export const abilityCost = (c: { dth?: number }, base: number) => (base ? Math.ceil(base * SC * (1 + 0.15 * Math.min(3, c.dth || 0))) : 0)

/**
 * Start of a character's turn: regain stamina, reset per-turn flags, count down
 * exhaustion, and drain 4 x SC while climbing (falling off at 0). Stamina comes
 * back only after a turn without abilities (ua): light attacks, moving, dodging
 * and drinking all count as catching your breath.
 * Returns the sheet changes and the log message.
 */
export function startTurn(c: Character & { st: number; rg: number; maxSt: number }): [Patch, string] {
  const p: Patch = {
    used: 0,
    mvd: 0,
    exh: false,
    pr: false,
    lh: 0,
    stn: false,
    ddg: false,
    pry: false,
    ctr: false,
    ...(c.ua ? { ua: false } : {}),
    ...((c.stn || c.exh) && c.chg ? { chg: null } : {}),
  }
  const drain = c.mt === 'climb' ? 4 * SC : 0
  const st = c.st + (c.ua ? 0 : c.rg) - drain
  let msg = c.ua ? 'New round (no stamina back: used an ability last turn)' : 'New round'
  if (c.exh) {
    const left = (c.exn || 2) - 1
    if (left > 0) {
      p.exh = true
      p.exn = left
      msg = `Still exhausted (${left} round${left > 1 ? 's' : ''} left)`
    } else p.exn = 0
  }
  if (drain && st <= 0) {
    p.st = 0
    p.mt = ''
    p.mon = null
    p.exh = true
    msg = 'Drained while climbing: fell off, exhausted!'
  } else {
    p.st = clamp(st, c.maxSt)
    if (drain) msg = `Climbing (-${drain} St)`
  }
  return [p, msg]
}

/** Pays for an action. Overspending empties stamina and exhausts. */
export function spend(c: Character & { st: number }, base: number, label: string): [Patch, string] {
  const cost = abilityCost(c, base)
  const p: Patch = {}
  let msg = label + (cost ? ` (-${cost} St)` : '')
  if (c.st >= cost) p.st = c.st - cost
  else {
    p.st = 0
    p.exh = true
    p.mt = ''
    p.mon = null
    msg += ' - out of stamina: EXHAUSTED'
  }
  return [p, msg]
}
