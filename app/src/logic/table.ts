// The play table's rules: which map is shown, what the fog hides, who stands where,
// how far a hero or monster can move, moving, the next round for everyone, doors and
// helping allies up. Same rules as the live page's mapId, fogHid, eHid, reach,
// reachE, occ, the map tap handler, tick, the door button and "Help up".
import { abilityCost, startTurn } from './stamina'
import { recover } from './combat'
import { geometry, lineOfSight, blocked, VIEW_RANGE, type Geometry, type MapData } from './geometry'
import type { Sheet } from './sheet'
import type { Enemy } from './types'

export type Maps = Record<string, MapData>

/** The map players see: the live one (cur), or the first. */
export const liveMapId = (maps: Maps, cur: string | null | undefined): string | null => (cur && maps[cur] ? cur : (Object.keys(maps)[0] ?? null))

/** The map on screen: the GM may be looking at another one. */
export const shownMapId = (maps: Maps, cur: string | null | undefined, dm: boolean, gmMap: string | null | undefined) => (dm && gmMap && maps[gmMap] ? gmMap : liveMapId(maps, cur))

/** On this map: sheets without a map are on every map. */
export const onMap = (o: { mp?: string | null }, mapId: string | null) => !o.mp || o.mp === mapId

/** A map with its grid worked out. */
export type Grid = Geometry & { id: string; m: MapData; cs: number }
export function grid(maps: Maps, id: string | null): Grid | null {
  const m = id ? maps[id] : undefined
  if (!id || !m) return null
  const g = geometry(m)
  return { ...g, id, m, cs: (m.w as number) / g.cols }
}

/** Heroes who see through the fog: approved, placed, on this map. */
export type Seer = { mx?: number | null; my?: number | null; mp?: string | null }

/** True when the fog hides this square: not revealed, and no hero on the map sees it. */
export function fogHidden(g: Grid, seers: Seer[], x: number, y: number): boolean {
  if (!g.m.fog) return false
  if ((g.m.fg || '')[y * g.cols + x] === '1') return false
  return !seers.some((c) => c.mx != null && onMap(c, g.id) && Math.hypot(x - c.mx, y - (c.my as number)) <= VIEW_RANGE && lineOfSight(g, c.mx, c.my as number, x, y))
}

/** An enemy is hidden when every square it covers is in the fog. */
export function enemyHidden(g: Grid | null, seers: Seer[], e: Enemy): boolean {
  if (!g) return false
  const z = e.sz || 1
  for (let i = 0; i < z; i++) for (let j = 0; j < z; j++) if (!fogHidden(g, seers, (e.mx as number) + i, (e.my as number) + j)) return false
  return true
}

/** The fog as one SVG path of hidden squares. */
export function fogPath(g: Grid, seers: Seer[]): string {
  let d = ''
  for (let y = 0; y < g.rows; y++) for (let x = 0; x < g.cols; x++) if (fogHidden(g, seers, x, y)) d += `M${x * g.cs} ${y * g.cs}h${g.cs}v${g.cs}h${-g.cs}z`
  return d
}

const K = (x: number, y: number) => `${x},${y}`

/**
 * Squares a hero can reach, with the number of steps. Speed (2 while exhausted, 0
 * stunned), less what they already moved this round in combat. Walls and wall
 * edges block; diagonals can't cut a wall corner.
 */
export function heroReach(c: Sheet & { spd?: number }, g: Grid, combat: boolean): Record<string, number> {
  const sp = c.spd || 6
  const lim = (c.stn ? 0 : c.exh ? 2 : sp) - (combat ? c.mvd || 0 : 0)
  const d: Record<string, number> = { [K(c.mx as number, c.my as number)]: 0 }
  const q: [number, number][] = [[c.mx as number, c.my as number]]
  while (q.length) {
    const [x, y] = q.shift()!
    const n = d[K(x, y)]!
    if (n >= lim) continue
    for (let dx = -1; dx < 2; dx++)
      for (let dy = -1; dy < 2; dy++) {
        const a = x + dx
        const b = y + dy
        const k = K(a, b)
        if (!(dx || dy) || a < 0 || b < 0 || a >= g.cols || b >= g.rows || g.walls.has(k) || d[k] !== undefined || blocked(g, x, y, dx, dy)) continue
        if (dx && dy && (g.walls.has(K(x + dx, y)) || g.walls.has(K(x, y + dy)))) continue
        d[k] = n + 1
        q.push([a, b])
      }
  }
  return d
}

/** Squares a monster's top-left corner can reach: speed + bonus, its whole size must fit. */
export function enemyReach(e: Enemy & { spd?: number; bon?: number }, g: Grid): Record<string, number> {
  const z = e.sz || 1
  const lim = (e.spd || 6) + (e.bon || 0)
  const free = (a: number, b: number) => {
    if (a < 0 || b < 0 || a + z > g.cols || b + z > g.rows) return false
    for (let i = 0; i < z; i++) for (let j = 0; j < z; j++) if (g.walls.has(K(a + i, b + j))) return false
    return true
  }
  const d: Record<string, number> = { [K(e.mx as number, e.my as number)]: 0 }
  const q: [number, number][] = [[e.mx as number, e.my as number]]
  while (q.length) {
    const [x, y] = q.shift()!
    const n = d[K(x, y)]!
    if (n >= lim) continue
    for (let dx = -1; dx < 2; dx++)
      for (let dy = -1; dy < 2; dy++) {
        const a = x + dx
        const b = y + dy
        const k = K(a, b)
        if (!(dx || dy) || d[k] !== undefined || !free(a, b) || blocked(g, x, y, dx, dy)) continue
        d[k] = n + 1
        q.push([a, b])
      }
  }
  return d
}

const approved = (c: { ap?: unknown }) => c.ap !== false && c.ap !== 'no'

/** Who stands on a square ("c:id" or "e:id"): living heroes not riding a monster, then monsters not being carried. */
export function occupant(chars: Record<string, Sheet>, enemies: Record<string, Enemy>, mapId: string | null, x: number, y: number): string | null {
  for (const [i, c] of Object.entries(chars)) if (approved(c) && onMap(c, mapId) && (c.hp as number) > 0 && !(c.mt && c.mon) && c.mx === x && c.my === y) return `c:${i}`
  for (const [i, e] of Object.entries(enemies)) {
    const z = e.sz || 1
    if (!e.hd && onMap(e, mapId) && (e.hp as number) > 0 && e.mx != null && x >= e.mx && x < e.mx + z && y >= (e.my as number) && y < (e.my as number) + z) return `e:${i}`
  }
  return null
}

/** A hero walking n squares: free out of combat or while exhausted, else stamina per square. */
export function walk(c: Sheet, n: number, x: number, y: number, combat: boolean): [Record<string, unknown>, string] {
  const cost = combat && !c.exh ? abilityCost(c, n) : 0
  const afford = (c.st as number) >= cost
  const q: Record<string, unknown> = { mx: x, my: y }
  if (combat) q.mvd = (c.mvd || 0) + n
  if (cost) {
    q.st = afford ? (c.st as number) - cost : 0
    if (!afford) Object.assign(q, { exh: true, mt: '', mon: null })
  }
  return [q, `Moved ${n} squares${cost ? ` (-${afford ? cost : c.st} St)` : ''}${cost && !afford ? ' - out of stamina: EXHAUSTED' : ''}`]
}

/** A monster moved by the GM: kept inside the map for its size. */
export const placeEnemy = (e: Enemy, g: Grid, x: number, y: number) => ({ mx: Math.min(x, g.cols - (e.sz || 1)), my: Math.min(y, g.rows - (e.sz || 1)), mp: g.id })

/** "Next round: all": every hero's start of turn, and staggered monsters recover. */
export function nextRound(chars: Record<string, Sheet>, enemies: Record<string, Enemy>) {
  const heroes = Object.keys(chars)
    .filter((i) => approved(chars[i]!))
    .map((i) => [i, ...startTurn(chars[i] as Parameters<typeof startTurn>[0])] as const)
  const monsters = Object.keys(enemies).flatMap((i) => {
    const p = recover(enemies[i]!)
    return p ? [[i, p] as const] : []
  })
  return { heroes, monsters }
}

/** Doors close enough to use: within 1.6 squares of the hero's centre, at most 3. */
export function doorsNear(m: MapData | null | undefined, c: { mx?: number | null; my?: number | null }) {
  if (!m || c.mx == null) return []
  return Object.entries(m.dr || {})
    .filter(([, q]) => q.p && Math.hypot(q.p[0]! - (c.mx! + 0.5), q.p[1]! - ((c.my as number) + 0.5)) <= 1.6)
    .slice(0, 3)
}

/** Using a door in combat costs a player an action, on their turn. */
export function doorCheck(c: Sheet, dm: boolean, combat: boolean, myTurn: boolean): { error: string } | { patch: Record<string, unknown> | null } {
  if (!combat || dm) return { patch: null }
  if (!myTurn) return { error: 'It is not your turn.' }
  if (c.exh || c.stn || (c.used || 0) >= 2) return { error: 'You have no action left to use the door.' }
  return { patch: { used: (c.used || 0) + 1 } }
}

/** Allies the player can help up: exhausted or prone. */
export const alliesDown = (chars: Record<string, Sheet>, me: string) => Object.keys(chars).filter((i) => i !== me && approved(chars[i]!) && (chars[i]!.exh || chars[i]!.pr))

/** The hidden words, as saved: unique, trimmed, lower case; "-" when none. */
export function spoilerValue(words: string[]): string {
  const ws = [...new Set(words.map((x) => String(x).trim().toLowerCase()).filter(Boolean))]
  return ws.length ? ws.join(',') : '-'
}

/** For the map's tap handling: which squares were hit, from a point in the map picture. */
export function cellAt(g: Grid, fx: number, fy: number): [number, number] | null {
  const x = Math.floor(fx * g.cols)
  const y = Math.floor((fy * (g.m.h as number)) / g.cs)
  return x < 0 || y < 0 || x >= g.cols || y >= g.rows ? null : [x, y]
}

