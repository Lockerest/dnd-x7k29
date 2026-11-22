// Encounters: ready-made groups of enemies the Game Master prepares ahead of time.
// They are stored apart from the live enemies (never read by the refresh, never on
// any map) until the GM deploys one; then each sheet is copied onto the map in its
// saved formation, and "Clear" takes that copy off again.
import type { Enemy } from './types'

/** Folders in the Encounters list, in story order. */
export const REGIONS = ['Frozen North', "Arachne's Mountains", "Kernunos's Forest", 'Sky City', "Odi'ram's Lands", 'The Void', "Izat'al's Kingdom", 'Other'] as const

/** One enemy in an encounter: its fresh sheet and where it stands from the formation's top-left (null: off the map, like a waiting phase sheet). */
export type EncounterMember = { s: Enemy; dx: number | null; dy: number | null }

/** A saved encounter: name, region folder, members by key, and the map it was built on. */
export type Encounter = { n: string; rg: string; m: Record<string, EncounterMember>; mp?: string | null; ax?: number; ay?: number }

/** Fields a fight changes; a saved sheet starts without them. */
const RUNTIME = ['mx', 'my', 'mp', 'hx', 'hy', 'hm', 'stun', 'sg', 'rec', 'bi', 'gr', 'hd', 'ht', 'ei']

/** The sheet as it stands before any fight: full HP and poise, no position or status. */
export function freshSheet(e: Enemy): Enemy {
  const s: Enemy = { ...e }
  for (const f of RUNTIME) delete s[f]
  s.hp = s.max ?? s.hp
  if (s.pm != null) s.po = s.pm
  return s
}

/**
 * Builds an encounter from live enemies. The formation is kept relative to the
 * top-left enemy; phase sheets they point to come along even if not picked.
 */
export function captureEncounter(name: string, region: string, enemies: Record<string, Enemy>, ids: string[]): Encounter | null {
  const n = name.trim().slice(0, 60)
  const pick = new Set(ids.filter((i) => enemies[i]))
  // Follow "next phase" links so a boss keeps all its sheets.
  for (const i of [...pick]) {
    let nx = enemies[i]!.nx
    while (nx && enemies[nx] && !pick.has(nx)) {
      pick.add(nx)
      nx = enemies[nx]!.nx
    }
  }
  if (!n || !pick.size) return null
  const placed = [...pick].filter((i) => enemies[i]!.mx != null)
  const ax = placed.length ? Math.min(...placed.map((i) => enemies[i]!.mx as number)) : 0
  const ay = placed.length ? Math.min(...placed.map((i) => enemies[i]!.my as number)) : 0
  const m: Record<string, EncounterMember> = {}
  for (const i of pick) {
    const e = enemies[i]!
    const on = e.mx != null
    m[i] = { s: freshSheet(e), dx: on ? (e.mx as number) - ax : null, dy: on ? (e.my as number) - ay : null }
  }
  const mp = placed.length ? (enemies[placed[0]!]!.mp ?? null) : null
  return { n, rg: region || 'Other', m, mp, ax, ay }
}

/** How big the formation is, in squares (members' sizes included). */
export function formationSize(enc: Encounter): { w: number; h: number } {
  let w = 0
  let h = 0
  for (const x of Object.values(enc.m)) {
    if (x.dx == null || x.dy == null) continue
    const z = x.s.sz || 1
    w = Math.max(w, x.dx + z)
    h = Math.max(h, x.dy + z)
  }
  return { w, h }
}

/**
 * Where the formation's top-left lands: where it was built (same map), else the
 * middle of the map; always kept inside the grid.
 */
export function deployAnchor(enc: Encounter, map: { id: string; cols: number; rows: number }): { x: number; y: number } {
  const { w, h } = formationSize(enc)
  const same = enc.mp === map.id && enc.ax != null && enc.ay != null
  const x = same ? enc.ax! : Math.floor((map.cols - w) / 2)
  const y = same ? enc.ay! : Math.floor((map.rows - h) / 2)
  return { x: Math.max(0, Math.min(x, map.cols - w)), y: Math.max(0, Math.min(y, map.rows - h)) }
}

/**
 * The live sheets a deploy creates, under new ids (newId(key) gives one per member).
 * Each is tagged ei = tag so Clear can find them, and its spawn point is where it
 * lands (the Golden Wave brings it back there).
 */
export function deploySheets(enc: Encounter, map: { id: string; cols: number; rows: number }, tag: string, newId: (key: string) => string): Record<string, Enemy> {
  const { x, y } = deployAnchor(enc, map)
  const ids: Record<string, string> = {}
  for (const k of Object.keys(enc.m)) ids[k] = newId(k)
  const out: Record<string, Enemy> = {}
  for (const [k, mem] of Object.entries(enc.m)) {
    const s: Enemy = { ...mem.s, ei: tag }
    if (s.nx) s.nx = ids[s.nx] ?? ''
    if (mem.dx != null && mem.dy != null) {
      const z = s.sz || 1
      const mx = Math.min(x + mem.dx, map.cols - z)
      const my = Math.min(y + mem.dy, map.rows - z)
      Object.assign(s, { mx, my, mp: map.id, hx: mx, hy: my, hm: map.id })
    } else Object.assign(s, { mx: null, my: null })
    out[ids[k]!] = s
  }
  return out
}

/** Live enemies a deploy made, by tag. */
export const deployedIds = (enemies: Record<string, Enemy>, tag: string) => Object.keys(enemies).filter((i) => enemies[i]?.ei === tag)

/** The deploys on the table now: tag → [encounter id, how many enemies are still standing]. */
export function liveDeploys(enemies: Record<string, Enemy>): Record<string, { id: string; up: number; all: number }> {
  const out: Record<string, { id: string; up: number; all: number }> = {}
  for (const e of Object.values(enemies)) {
    const t = typeof e.ei === 'string' ? e.ei : ''
    if (!t) continue
    const d = (out[t] ??= { id: t.split('~')[0]!, up: 0, all: 0 })
    d.all++
    if ((e.hp ?? 0) > 0 && e.mx != null) d.up++
  }
  return out
}

/** Encounters grouped by region, in REGIONS order then by name. */
export function byRegion(all: Record<string, Encounter>): [string, [string, Encounter][]][] {
  const groups = new Map<string, [string, Encounter][]>()
  const order = (r: string) => {
    const i = (REGIONS as readonly string[]).indexOf(r)
    return i < 0 ? REGIONS.length : i
  }
  for (const [id, e] of Object.entries(all)) {
    const r = e.rg || 'Other'
    if (!groups.has(r)) groups.set(r, [])
    groups.get(r)!.push([id, e])
  }
  return [...groups.entries()].sort((a, b) => order(a[0]) - order(b[0]) || a[0].localeCompare(b[0])).map(([r, list]) => [r, list.sort((a, b) => a[1].n.localeCompare(b[1].n))])
}

/** "4 enemies: 3 Wolf, Frost Brute" (phase sheets not counted). */
export function encounterSummary(enc: Encounter): string {
  const next = new Set(
    Object.values(enc.m)
      .map((x) => x.s.nx)
      .filter(Boolean),
  )
  const names = Object.entries(enc.m)
    .filter(([k]) => !next.has(k))
    .map(([, x]) => String(x.s.name ?? '?'))
  const count = new Map<string, number>()
  for (const n of names) count.set(n, (count.get(n) ?? 0) + 1)
  const parts = [...count.entries()].map(([n, c]) => (c > 1 ? `${c} ${n}` : n))
  return `${names.length} ${names.length === 1 ? 'enemy' : 'enemies'}: ${parts.join(', ')}`
}
