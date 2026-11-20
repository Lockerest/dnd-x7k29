// Map grid geometry the sheet needs: where the altars and bonfires are, who stands
// next to one, and the fog of war revealed around a spot (walls and closed doors
// block the view). Same maths as the live page's geo, blk, los and revealAround.

export type MapData = {
  /** Picture size in pixels and grid columns. */
  w?: number
  h?: number
  cols?: number
  /** Altars and bonfires: "x,y" squares. */
  al?: Record<string, string> | string[]
  bf?: Record<string, string> | string[]
  /** Wall squares, wall edges ("v,x,y" or "h,x,y") and doors. */
  walls?: Record<string, string> | string[]
  ew?: Record<string, string> | string[]
  dr?: Record<string, { c?: string; o?: unknown; e?: Record<string, string> | string[]; p?: number[] }>
  /** Fog of war on, and the revealed squares ("1" per square, row by row). */
  fog?: unknown
  fg?: string
  [k: string]: unknown
}

const vals = (o: Record<string, string> | string[] | undefined) => Object.values(o || {})

export type Geometry = { cols: number; rows: number; walls: Set<string>; edges: Set<string> }

export function geometry(m: MapData): Geometry {
  const cols = m.cols || 24
  const cs = (m.w as number) / cols
  const walls = new Set(vals(m.walls))
  const edges = new Set(vals(m.ew))
  for (const d of Object.values(m.dr || {})) {
    if (d.c && !d.o) walls.add(d.c)
    if (!d.o) for (const k of vals(d.e)) edges.add(k)
  }
  return { cols, rows: Math.floor((m.h as number) / cs), walls, edges }
}

/** True when a wall edge stops a one-square step from (x, y) by (dx, dy). */
export function blocked(g: Geometry, x: number, y: number, dx: number, dy: number): boolean {
  const E = g.edges
  if (!E.size) return false
  const v = (a: number, b: number) => E.has(`v,${a},${b}`)
  const h = (a: number, b: number) => E.has(`h,${a},${b}`)
  if (dx && !dy) return dx > 0 ? v(x + 1, y) : v(x, y)
  if (dy && !dx) return dy > 0 ? h(x, y + 1) : h(x, y)
  const ex = dx > 0 ? x + 1 : x
  const ey = dy > 0 ? y + 1 : y
  return v(ex, y) || v(ex, y + dy) || h(x, ey) || h(x + dx, ey)
}

/** Line of sight between two squares. */
export function lineOfSight(g: Geometry, x0: number, y0: number, x1: number, y1: number): boolean {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
  let px = x0
  let py = y0
  for (let i = 1; i <= n; i++) {
    const t = i / n
    const cx = Math.round(x0 + (x1 - x0) * t)
    const cy = Math.round(y0 + (y1 - y0) * t)
    // Each step moves at least one square along the longer side, so it always checks.
    if (blocked(g, px, py, Math.sign(cx - px), Math.sign(cy - py))) return false
    if (i < n && g.walls.has(`${cx},${cy}`)) return false
    px = cx
    py = cy
  }
  return true
}

/** How far a hero sees through the fog. */
export const VIEW_RANGE = 4

/** The fog after revealing what a hero sees from (x, y), or null when the map has no fog. */
export function revealAround(m: MapData, x: number, y: number): string | null {
  if (!m.fog) return null
  const g = geometry(m)
  const a = (m.fg || '').padEnd(g.cols * g.rows, '0').split('')
  for (let j = -VIEW_RANGE; j <= VIEW_RANGE; j++)
    for (let i = -VIEW_RANGE; i <= VIEW_RANGE; i++) {
      const xx = x + i
      const yy = y + j
      if (xx < 0 || yy < 0 || xx >= g.cols || yy >= g.rows || Math.hypot(i, j) > VIEW_RANGE || !lineOfSight(g, x, y, xx, yy)) continue
      a[yy * g.cols + xx] = '1'
    }
  return a.join('')
}

export const altarsOf = (m: MapData | null | undefined) => (m ? vals(m.al) : [])
export const bonfiresOf = (m: MapData | null | undefined) => (m ? vals(m.bf) : [])
export const guildsOf = (m: MapData | null | undefined) => (m ? vals(m.gd as Record<string, string> | undefined) : [])

/** The first of these squares next to (or under) the character, or null. */
export function nearSpot(c: { mx?: number | null; my?: number | null } | null | undefined, spots: string[]): string | null {
  if (!c || c.mx == null) return null
  for (const k of spots) {
    const [x, y] = k.split(',').map(Number) as [number, number]
    if (Math.max(Math.abs(x - c.mx), Math.abs(y - (c.my as number))) <= 1) return k
  }
  return null
}

/** Where the Golden Wave starts: the altar's square, or the middle of the map. */
export function waveCenter(m: MapData | null | undefined, key: string | null): { x: number; y: number } {
  if (key) {
    const [x, y] = key.split(',').map(Number) as [number, number]
    return { x: x + 0.5, y: y + 0.5 }
  }
  if (!m) return { x: 0, y: 0 }
  const g = geometry(m)
  return { x: g.cols / 2, y: g.rows / 2 }
}
