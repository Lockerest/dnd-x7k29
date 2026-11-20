// Phase gates, switching to the next sheet, and building chains of phase sheets.
import { THEME_GROUPS } from '../data/audio'
import { tightSlug } from './text'
import type { Enemy } from './types'

export type Gate = false | 'event' | 'swap'
export type DamageResult = {
  /** New HP after the hit. */
  hp: number
  /** "event": stop at the gate and flag it; "swap": hand over to the next sheet. */
  gate: Gate
  /** True for swap-at-0: the next sheet starts at full HP instead of this HP. */
  full: boolean
}

/**
 * Applies damage to an enemy sheet, honouring its gates:
 * - pg (gate %): a hit that crosses it stops exactly at the gate (rounded up).
 *   With a next sheet it swaps, otherwise it is an event gate for the GM.
 * - sw (swap at 0 HP): a lethal hit leaves 1 HP and the next sheet starts at full HP.
 * hasNext says whether the next sheet (nx) exists.
 */
export function damageEnemy(o: Enemy, dmg: number, hasNext: boolean): DamageResult {
  let hp = Math.max(0, (o.hp || 0) - dmg)
  let gate: Gate = false
  let full = false
  if (o.pg! > 0) {
    const thr = Math.ceil(((o.max || 0) * o.pg!) / 100)
    if ((o.hp || 0) > thr && hp <= thr) {
      hp = thr
      gate = o.nx && hasNext ? 'swap' : 'event'
    }
  }
  if (o.sw && hp === 0 && o.nx && hasNext) {
    hp = 1
    gate = 'swap'
    full = true
  }
  return { hp, gate, full }
}

/**
 * Changes for the next sheet when a phase swaps: same map spot, HP kept within 1..max
 * (full when hp is null). A sheet without max HP counts as 0 (the live page gave NaN).
 */
export function nextPhasePatch(cur: Enemy, next: Enemy, hp: number | null): Partial<Enemy> {
  const max = next.max || 0
  return {
    mx: cur.mx,
    my: cur.my,
    mp: cur.mp,
    hp: hp == null ? max : Math.max(1, Math.min(max, hp)),
    po: next.pm || 0,
    stun: false,
    sg: false,
    hd: null,
    bi: false,
  }
}

const MAX_CHAIN = 9
const nextOf = (all: Record<string, Enemy>, id: string) => {
  const nx = all[id]?.nx
  return nx && all[nx] ? nx : null
}

/** Last sheet of the chain starting at id, and how many links were followed. */
export function chainEnd(all: Record<string, Enemy>, id: string): { id: string; depth: number } {
  let t = id
  let depth = 0
  for (let n = nextOf(all, t); n && depth < MAX_CHAIN; n = nextOf(all, t)) {
    t = n
    depth++
  }
  return { id: t, depth }
}

/** First sheet whose chain reaches `last` (the boss's phase 1); `last` itself when nothing leads to it. */
export function chainRoot(all: Record<string, Enemy>, last: string): string {
  const root = Object.keys(all).find((k) => {
    let q = k
    for (let n = 0, x = nextOf(all, q); x && n < MAX_CHAIN; n++, x = nextOf(all, q)) {
      q = x
      if (q === last) return true
    }
    return k === last
  })
  return root ?? last
}

const COPY_EXCLUDED = ['nx', 'pg', 'gr', 'sw', 'mx', 'my', 'mp', 'hx', 'hy', 'hm', 'hv', 'ht', 'hd', 'stun', 'sg', 'bi', 'th']

/**
 * "+ Add next phase sheet": copies the last sheet of the chain into a new, unplaced
 * sheet named "<boss> (phase N)" at full HP, with that phase's theme when it is
 * available. Returns the new sheet and the change for the current last sheet.
 */
export function buildNextPhase(
  all: Record<string, Enemy>,
  id: string,
  themeAvailable: (key: string) => boolean,
): { lastId: string; sheet: Enemy; lastPatch: { nx?: string; pg: number }; themeSet: boolean } | null {
  const x = all[id]
  if (!x) return null
  const { id: lastId, depth } = chainEnd(all, id)
  const last = all[lastId]!
  const bossName = all[chainRoot(all, lastId)]!.name
  const group = Object.keys(THEME_GROUPS).find((k) => tightSlug(bossName).includes(k))
  const key = group ? THEME_GROUPS[group]![depth + 1] : undefined
  const theme = key && themeAvailable(key) ? key : ''
  const sheet = JSON.parse(JSON.stringify(last)) as Enemy
  for (const k of COPY_EXCLUDED) delete sheet[k]
  sheet.name = (bossName || 'Boss').replace(/ \(phase \d+\)$/, '') + ` (phase ${depth + 2})`
  sheet.hp = sheet.max
  sheet.po = sheet.pm || 0
  if (theme) sheet.th = theme
  return { lastId, sheet, lastPatch: { pg: last.pg! > 0 ? last.pg! : 50 }, themeSet: !!theme }
}

/**
 * Order of the enemy list: each phase-1 sheet followed by its later phases,
 * with their depth in the chain (0 = phase 1) for indenting.
 * ids is the visible subset, in display order.
 */
export function enemyListOrder(all: Record<string, Enemy>, ids: string[]): [string, number][] {
  const isNext = new Set(ids.map((i) => all[i]?.nx).filter((k): k is string => !!k && !!all[k]))
  const order: [string, number][] = []
  const seen = new Set<string>()
  const add = (i: string, d: number) => {
    if (seen.has(i) || !ids.includes(i)) return
    seen.add(i)
    order.push([i, d])
    const n = all[i]!.nx
    if (n && all[n]) add(n, d + 1)
  }
  ids.filter((i) => !isNext.has(i)).forEach((i) => add(i, 0))
  ids.forEach((i) => add(i, 0))
  return order
}
