// New characters, GM approval and device takeover requests.
import { CLASSES } from '../data/classes'
import type { ClassId } from './types'

type Approvable = { ap?: boolean | string }

/** A character can play unless the GM has not approved it yet (false) or declined it ("no"). */
export const isApproved = (c: Approvable) => c.ap !== false && c.ap !== 'no'

/** Ids of the characters that can play, in table order. */
export const approvedIds = (chars: Record<string, Approvable>) => Object.keys(chars).filter((i) => isApproved(chars[i]!))

/** Characters waiting for the GM (new or declined). */
export const pendingIds = (chars: Record<string, Approvable>) => Object.keys(chars).filter((i) => !isApproved(chars[i]!) || chars[i]!.ap === false)

/** A fresh level 1 sheet. Characters the GM makes are approved at once. */
export function newCharacter(cls: ClassId, name: string, me: string) {
  const k = CLASSES[cls]
  return {
    name: name.trim() || 'Nameless',
    cls,
    level: 1,
    ac: 12,
    hp: k.hp,
    maxHp: k.hp,
    st: k.stamina,
    maxSt: k.stamina,
    rg: k.regen,
    fl: 3,
    maxFl: 3,
    x10: true,
    souls: 0,
    spd: 6,
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    conds: '',
    notes: '',
    used: 0,
    ap: me === 'gm',
    log: ['Joined the party'],
  }
}

export type Claim = { who: string; target: string; st: 'pending' | 'ok' | 'no'; ts: number }

export const CLAIM_ERROR = 'Enter your name and pick a character.'

/** A request to take over an existing character on this device. */
export function claimRequest(who: string, target: string, now: number): Claim | { error: string } {
  const w = who.trim().slice(0, 30)
  if (!w || !target) return { error: CLAIM_ERROR }
  return { who: w, target, st: 'pending', ts: now }
}
