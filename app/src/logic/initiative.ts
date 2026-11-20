// Initiative and turn order: who rolls, the order once everyone has rolled, whose
// turn it is, and the next turn (with a new round when it wraps). Same rules as the
// live page's istart, rollInit, ienemies, ibegin, nextTurn and its End turn button.
import { mod } from './stats'
import type { Sheet } from './sheet'
import type { Enemy } from './types'
import { onMap } from './table'

export type InitUnit = { k: string; v: number | null }
/** ph "roll": everyone rolls; "go": turns in order. t is whose turn, r the round. */
export type Initiative = { ph: 'roll' | 'go'; l: InitUnit[]; t: number; r: number }

const approved = (c: { ap?: unknown }) => c.ap !== false && c.ap !== 'no'

/** A unit ("c:id" or "e:id") and its sheet, or null when it no longer exists. */
export function unitOf(chars: Record<string, Sheet>, enemies: Record<string, Enemy>, k: string | null | undefined) {
  if (!k) return null
  const e = k[0] === 'e'
  const id = k.slice(2)
  const o = (e ? enemies : chars)[id] as (Sheet & Enemy) | undefined
  return o ? { e, id, o, key: k } : null
}

/** "Start initiative": living heroes and placed, free, living monsters on the live map. */
export function startInitiative(chars: Record<string, Sheet>, enemies: Record<string, Enemy>, liveId: string | null): Initiative {
  const l: InitUnit[] = []
  for (const i of Object.keys(chars)) if (approved(chars[i]!) && (chars[i]!.hp as number) > 0 && onMap(chars[i]!, liveId)) l.push({ k: `c:${i}`, v: null })
  for (const i of Object.keys(enemies)) {
    const e = enemies[i]!
    if (e.mx != null && !e.hd && (e.hp as number) > 0 && onMap(e, liveId)) l.push({ k: `e:${i}`, v: null })
  }
  return { ph: 'roll', l, t: 0, r: 1 }
}

/** A monster's initiative: d20 plus its initiative bonus. */
export const monsterInitiative = (e: Enemy, rand: () => number) => 1 + Math.floor(rand() * 20) + (Number(e.ib) || 0)

/** A hero's initiative bonus: their DEX modifier. */
export const heroInitiativeBonus = (c: Sheet) => mod(c.dex as number | undefined)

/** Everyone still at the table has rolled. */
export const allRolled = (ini: Initiative, chars: Record<string, Sheet>, enemies: Record<string, Enemy>) => ini.l.every((u) => u.v != null || !unitOf(chars, enemies, u.k))

/** "Begin combat": highest first, ties in random order; units that left are dropped. */
export function beginCombat(ini: Initiative, chars: Record<string, Sheet>, enemies: Record<string, Enemy>, rand: () => number): Initiative {
  const l = ini.l.filter((u) => unitOf(chars, enemies, u.k)).sort((x, y) => (y.v as number) - (x.v as number) || rand() - 0.5)
  return { ph: 'go', l, t: 0, r: 1 }
}

/** The next living unit's turn. wrapped: a new round began (everyone's start of turn). */
export function nextTurn(ini: Initiative, chars: Record<string, Sheet>, enemies: Record<string, Enemy>): { ini: Initiative; wrapped: boolean } {
  let t = ini.t
  let r = ini.r
  let wrapped = false
  const n = ini.l.length
  for (let q = 0; q < n; q++) {
    t++
    if (t >= n) {
      t = 0
      r++
      wrapped = true
    }
    const u = unitOf(chars, enemies, ini.l[t]!.k)
    if (u && (u.o.hp as number) > 0) break
  }
  return { ini: { ...ini, t, r }, wrapped }
}

/** The "It's X's turn" line (with the round when one begins). */
export const turnLine = (ini: Initiative, wrapped: boolean, name: string) => `${wrapped ? `Round ${ini.r}. ` : ''}It's ${name}'s turn`

/** A hero may end their own turn, except the last turn of a round (the GM ends that one). */
export const canEndTurn = (ini: Initiative | null | undefined, id: string, dm: boolean) =>
  !!ini && ini.ph === 'go' && ini.l[ini.t]?.k === `c:${id}` && (dm || ini.t < ini.l.length - 1)
