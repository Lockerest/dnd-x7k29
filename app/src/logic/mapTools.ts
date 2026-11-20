// The GM's map tools as plain rules: what each tool changes on a map, party
// travel through a pin, the "you are here" overview, and reading Dungeondraft
// exports. Same results as the live page (the parity tests check it).
import { VIEW_RANGE, type MapData } from './geometry'

export type Doors = Record<
  string,
  {
    c?: string
    a?: number[]
    b?: number[]
    p: number[]
    e?: string[]
    o?: number
  }
>
export type Pin = { x: number; y: number; to: string; l: string }
export type MapEntry = MapData & {
  name?: string
  grid?: boolean
  ov?: boolean
  en?: number[]
  pn?: Record<string, Pin>
  dr?: Doors
  ew?: unknown
  gd?: unknown
  al?: unknown
  bf?: unknown
  iv?: number
}

export type Tool = 'move' | 'wall' | 'rev' | 'hid' | 'al' | 'bf' | 'gd' | 'dr' | 'nd' | 'pin' | 'en'

const K = (x: number, y: number) => `${x},${y}`
const values = <T>(v: unknown): T[] => Object.values((v as Record<string, T>) || {})

/** Rows of a map for its width and squares across. */
export const rowsOf = (m: MapData) => Math.floor((m.h as number) / ((m.w as number) / (m.cols || 24)))

/** Altar, bonfire and guild tools: a tap adds the square, or removes it if there. */
export function toggleSpot(m: MapEntry, kind: 'al' | 'bf' | 'gd', x: number, y: number): Partial<MapEntry> {
  const list = values<string>(m[kind])
  const key = K(x, y)
  const i = list.indexOf(key)
  if (i >= 0) list.splice(i, 1)
  else list.push(key)
  return { [kind]: list }
}

/** Place door: a door on this square (replacing a wall there), or remove the door placed here. */
export function placeDoor(m: MapEntry, x: number, y: number, rand: () => number): Partial<MapEntry> {
  const k = K(x, y)
  const ds: Doors = { ...(m.dr || {}) }
  const ex = Object.keys(ds)
    .filter((d) => ds[d]!.c === k)
    .pop()
  if (ex) delete ds[ex]
  else
    ds[`d${rand().toString(36).slice(2, 6)}`] = {
      c: k,
      p: [x + 0.5, y + 0.5],
      o: 0,
    }
  return { dr: ds, walls: values<string>(m.walls).filter((q) => q !== k) }
}

/** Doors tool: opens or closes the door nearest the tap (within 1.7 squares). */
export function toggleDoorNear(m: MapEntry, x: number, y: number): Partial<MapEntry> | null {
  const ds = m.dr || {}
  let best: string | null = null
  let bd = 1.7
  for (const k of Object.keys(ds)) {
    const q = ds[k]!
    const d = Math.hypot(q.p[0]! - (x + 0.5), q.p[1]! - (y + 0.5))
    if (d < bd) {
      bd = d
      best = k
    }
  }
  return best ? { dr: { ...ds, [best]: { ...ds[best]!, o: ds[best]!.o ? 0 : 1 } } } : null
}

/** The pin nearest a tap (within 1.2 squares), if any. */
export function pinNear(m: MapEntry, x: number, y: number): string | null {
  const ps = m.pn || {}
  let best: string | null = null
  let bd = 1.2
  for (const k of Object.keys(ps)) {
    const q = ps[k]!
    const d = Math.hypot(q.x - (x + 0.5), q.y - (y + 0.5))
    if (d < bd) {
      bd = d
      best = k
    }
  }
  return best
}

/** Maps a new pin can lead to: every other map. */
export const pinTargets = (maps: Record<string, MapEntry>, here: string) => Object.keys(maps).filter((k) => k !== here)

export const newPin = (m: MapEntry, x: number, y: number, to: string, label: string, now: number): Partial<MapEntry> => ({
  pn: {
    ...(m.pn || {}),
    [`p${now.toString(36)}`]: { x, y, to, l: label.slice(0, 24) },
  },
})
export const renamePin = (m: MapEntry, k: string, label: string): Partial<MapEntry> => ({
  pn: { ...m.pn, [k]: { ...m.pn![k]!, l: label.slice(0, 24) } },
})
export function deletePin(m: MapEntry, k: string): Partial<MapEntry> {
  const pn = { ...m.pn }
  delete pn[k]
  return { pn }
}

/** Squares across (5 to 200; the fog starts over because the squares changed). */
export const colsPatch = (v: string | number): Partial<MapEntry> => ({
  cols: Math.max(5, Math.min(200, +v || 24)),
  fg: '',
})

/** Fog painting: sets the squares in the fog string ("1" seen, "0" hidden). */
export function paintFog(m: MapEntry, cells: [number, number][], reveal: boolean): string {
  const cols = m.cols || 24
  const a = (m.fg || '').padEnd(cols * rowsOf(m), '0').split('')
  for (const [x, y] of cells) a[y * cols + x] = reveal ? '1' : '0'
  return a.join('')
}

/** Wall painting: a drag adds walls when it starts on an empty square, else removes them. */
export function paintWalls(m: MapEntry, cells: [number, number][]): string[] {
  const W = new Set(values<string>(m.walls))
  if (!cells.length) return [...W]
  const add = !W.has(K(...cells[0]!))
  for (const c of cells) {
    if (add) W.add(K(...c))
    else W.delete(K(...c))
  }
  return [...W]
}

export const revealAll = (m: MapEntry): Partial<MapEntry> => ({
  fog: true,
  fg: '1'.repeat((m.cols || 24) * rowsOf(m)),
})

/** A new map's entry (the picture is stored apart, under mapimg). */
export function newMapEntry(fileName: string, w: number, h: number, iv: number, extra: Partial<MapEntry> = {}): MapEntry {
  return {
    name: String(fileName)
      .replace(/\.[^.]+$/, '')
      .slice(0, 30),
    cols: 24,
    grid: true,
    w,
    h,
    iv,
    ...extra,
  }
}
export const newMapId = (now: number) => `m${now.toString(36)}`

/** The map with a pin leading here, and that pin (for the "you are here" overview). */
export function parentOf(maps: Record<string, MapEntry>, id: string): { map: string; pin: Pin } | null {
  for (const k of Object.keys(maps)) {
    if (k === id) continue
    const ps = maps[k]!.pn || {}
    for (const pk of Object.keys(ps)) if (ps[pk]!.to === id) return { map: k, pin: ps[pk]! }
  }
  return null
}

type Unit = {
  name?: string
  mp?: string | null
  mx?: number | null
  my?: number | null
  hp?: number
  mt?: string
  mon?: string | null
  ap?: unknown
}

/**
 * Party travel through a pin: everyone without a map is pinned to the old one, the
 * living heroes land around the new map's entry (walls skipped), the fog around
 * them lifts, and the new map goes live.
 */
export function travelPlan(maps: Record<string, MapEntry>, chars: Record<string, Unit>, enemies: Record<string, Unit>, heroes: string[], old: string, to: string) {
  const m = maps[to]!
  const pin = {
    chars: {} as Record<string, Record<string, unknown>>,
    enemies: {} as Record<string, Record<string, unknown>>,
  }
  for (const i of Object.keys(chars)) if (!chars[i]!.mp) pin.chars[i] = { mp: old }
  for (const i of Object.keys(enemies)) if (!enemies[i]!.mp) pin.enemies[i] = { mp: old }
  const cols = m.cols || 24
  const rows = rowsOf(m)
  const W = new Set(values<string>(m.walls))
  const en = m.en || [cols / 2, rows / 2]
  const cx = Math.floor(en[0]!)
  const cy = Math.floor(en[1]!)
  const cells: [number, number][] = []
  for (let r = 0; r <= 6 && cells.length < 20; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue
        const x = cx + dx
        const y = cy + dy
        if (x < 0 || y < 0 || x >= cols || y >= rows || W.has(K(x, y))) continue
        cells.push([x, y])
      }
  const moves: Record<string, Record<string, unknown>> = {}
  heroes
    .filter((i) => (chars[i]!.hp as number) > 0)
    .forEach((i, k) => {
      const c = cells[k] || cells[0] || [cx, cy]
      moves[i] = { mp: to, mx: c[0], my: c[1], mt: '', mon: null }
    })
  let fg: string | null = null
  if (m.fog) {
    const a = (m.fg || '').padEnd(cols * rows, '0').split('')
    for (const i of heroes) {
      const c = { ...chars[i], ...pin.chars[i], ...moves[i] }
      if (c.mp !== to) continue
      const VR = VIEW_RANGE
      for (let j = -VR; j <= VR; j++)
        for (let k2 = -VR; k2 <= VR; k2++) {
          const xx = (c.mx as number) + k2
          const yy = (c.my as number) + j
          if (xx >= 0 && yy >= 0 && xx < cols && yy < rows && Math.hypot(j, k2) <= VR) a[yy * cols + xx] = '1'
        }
    }
    fg = a.join('')
  }
  return { pin, moves, fg }
}

// ---------- Dungeondraft / Dungeon Alchemist exports (.dd2vtt) ----------

/** Wall segments (in squares) to blocked square edges ("v,x,y" and "h,x,y"). */
export function edgesFromSegments(segs: number[][], set: Set<string>, cols: number, rows: number) {
  const addV = (x: number, y: number) => {
    if (x >= 0 && x <= cols && y >= 0 && y < rows) set.add(`v,${x},${y}`)
  }
  const addH = (x: number, y: number) => {
    if (x >= 0 && x < cols && y >= 0 && y <= rows) set.add(`h,${x},${y}`)
  }
  for (const [ax, ay, bx, by] of segs as [number, number, number, number][]) {
    const dx = bx - ax
    const dy = by - ay
    const len = Math.hypot(dx, dy)
    if (len < 0.05) continue
    if (Math.abs(dy) < 0.09) {
      const y = Math.round((ay + by) / 2)
      let c0 = Math.round(Math.min(ax, bx))
      let c1 = Math.round(Math.max(ax, bx)) - 1
      if (c1 < c0) c1 = c0 = Math.floor((ax + bx) / 2)
      for (let c = c0; c <= c1; c++) addH(c, y)
      continue
    }
    if (Math.abs(dx) < 0.09) {
      const x = Math.round((ax + bx) / 2)
      let r0 = Math.round(Math.min(ay, by))
      let r1 = Math.round(Math.max(ay, by)) - 1
      if (r1 < r0) r1 = r0 = Math.floor((ay + by) / 2)
      for (let r = r0; r <= r1; r++) addV(x, r)
      continue
    }
    const n = Math.ceil(len * 12)
    let px = Math.floor(ax + (dx * 0.5) / n)
    let py = Math.floor(ay + (dy * 0.5) / n)
    for (let i = 1; i < n; i++) {
      const t = (i + 0.5) / n
      const cx = Math.floor(ax + dx * t)
      const cy = Math.floor(ay + dy * t)
      if (cx !== px) {
        addV(Math.max(px, cx), py)
        if (cy !== py) addV(Math.max(px, cx), cy)
      }
      if (cy !== py) {
        addH(cx, Math.max(py, cy))
        if (cx !== px) addH(px, Math.max(py, cy))
      }
      px = cx
      py = cy
    }
  }
}

type Pt = { x: number; y: number }
export type DdExport = {
  resolution?: { map_size?: Pt; pixels_per_grid?: number; map_origin?: Pt }
  image?: string
  line_of_sight?: Pt[][]
  objects_line_of_sight?: Pt[][]
  portals?: { bounds?: Pt[]; closed?: boolean }[]
}

/** Reads an export: the picture, the squares, the walls as edges and the doors. Null when unusable. */
export function parseDungeondraft(j: DdExport | null): { cols: number; rows: number; ew: string[]; dr: Doors; src: string } | null {
  const rs = j && j.resolution
  const img = j && j.image
  if (!rs || !rs.map_size || !img) return null
  const ppg = +(rs.pixels_per_grid as number) || 50
  const cols = Math.round(+rs.map_size.x)
  const rows = Math.round(+rs.map_size.y)
  const ox = +(rs.map_origin?.x as number) || 0
  const oy = +(rs.map_origin?.y as number) || 0
  if (!(cols > 0 && rows > 0)) return null
  const all = ([] as Pt[][]).concat(j.line_of_sight || [], j.objects_line_of_sight || [])
  let mx = 0
  for (const l of all) for (const pt of l) mx = Math.max(mx, pt.x, pt.y)
  // Some exports give points in pixels, others in squares.
  const k = mx > Math.max(cols, rows) * 1.6 ? 1 / ppg : 1
  const P = (pt: Pt) => [(pt.x - ox) * k, (pt.y - oy) * k] as [number, number]
  const segs: number[][] = []
  for (const l of all)
    for (let i = 0; i + 1 < l.length; i++) {
      const a = P(l[i]!)
      const b = P(l[i + 1]!)
      segs.push([a[0], a[1], b[0], b[1]])
    }
  const set = new Set<string>()
  edgesFromSegments(segs, set, cols, rows)
  const dr: Doors = {}
  ;(j.portals || []).forEach((q, i) => {
    if (!q.bounds || q.bounds.length < 2) return
    const a = P(q.bounds[0]!)
    const b = P(q.bounds[1]!)
    const s2 = new Set<string>()
    edgesFromSegments([[a[0], a[1], b[0], b[1]]], s2, cols, rows)
    dr[`d${i}`] = {
      a,
      b,
      p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
      e: [...s2],
      o: q.closed === false ? 1 : 0,
    }
  })
  const src = /^data:/.test(img) ? img : `data:image/${img.startsWith('/9j') ? 'jpeg' : img.startsWith('UklG') ? 'webp' : 'png'};base64,${img}`
  return { cols, rows, ew: [...set], dr, src }
}
