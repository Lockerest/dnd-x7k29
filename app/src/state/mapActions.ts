// The GM's map tools for the game store: adding, renaming and deleting maps, the
// drawing tools (walls, fog, altars, bonfires, guilds, doors, pins, the entry
// flag), party travel through a pin, and the altar/bonfire/guild icons. Every
// change saves the whole map, like the live page. The rules are in logic/mapTools.ts.
import type { Db } from '../db/client'
import { approvedIds } from '../logic/characters'
import {
  colsPatch,
  deletePin,
  newMapEntry,
  newMapId,
  newPin,
  paintFog,
  paintWalls,
  pinNear,
  placeDoor,
  renamePin,
  toggleDanger,
  toggleDoorNear,
  toggleSpot,
  travelPlan,
  type MapEntry,
  type Tool,
} from '../logic/mapTools'
import { liveMapId, type Maps } from '../logic/table'
import { currentMapId } from './sheetActions'
import type { GameState } from './store'

/** What a tap with the Pins tool asks the screen to do next. */
export type PinTap = { pin: string } | { newPin: { x: number; y: number } } | null

export type MapActions = {
  /** The GM's current map tool (Move tokens by default). */
  tool: Tool
  setTool: (t: Tool) => void
  /** The next danger zone's size (squares) and colour. */
  dzs: number
  dzc: string
  setDanger: (p: { dzs?: number; dzc?: string }) => void
  /** Changes the map on screen and saves all of it. */
  setMap: (p: Partial<MapEntry>) => Promise<void>
  /** A tap with the current tool (other than moving tokens and painting). */
  toolTap: (x: number, y: number) => Promise<PinTap>
  /** The end of a wall or fog drag over these squares. */
  paint: (cells: [number, number][]) => Promise<void>
  addPin: (x: number, y: number, to: string, label: string) => Promise<void>
  renamePin: (k: string, label: string) => Promise<void>
  deletePin: (k: string) => Promise<void>
  /** Moves the whole party to this map (through a pin). */
  travel: (to: string) => Promise<void>
  /** A new map: its picture (already shrunk) and entry; the first map goes live. */
  addMap: (data: string, w: number, h: number, fileName: string, extra?: Partial<MapEntry>) => Promise<void>
  renameMap: (name: string) => Promise<void>
  deleteMap: () => Promise<void>
  /** Squares across (the fog starts over). */
  setCols: (v: string) => Promise<void>
  /** The altar, bonfire or guild picture (128 px PNG); null goes back to the default icons. */
  setMarkerIcon: (k: 'al' | 'bf' | 'gd' | null, data?: string) => Promise<void>
}

type Get = () => GameState
type Set_ = (p: Partial<GameState>) => void
type Save = (f: (d: Db) => Promise<unknown>) => Promise<void>

export function mapActions(get: Get, set: Set_, save: Save, now: () => number, rand: () => number): MapActions {
  const here = () => {
    const s = get()
    const id = currentMapId(s.tables, s)
    return { id, m: (id ? s.tables.maps[id] : null) as MapEntry | null }
  }
  const putMap = async (id: string, m: MapEntry) => {
    const t = get().tables
    set({ tables: { ...t, maps: { ...t.maps, [id]: m } } })
    await save((d) => d.put(`maps/${id}`, m))
  }
  const setMap: MapActions['setMap'] = async (p) => {
    const { id, m } = here()
    if (!id || !m || !get().dm) return
    await putMap(id, { ...m, ...p })
  }

  return {
    tool: 'move',
    setTool: (tool) => set({ tool }),
    dzs: 2,
    dzc: '#f5c542',
    setDanger: (p) => set(p),
    setMap,

    toolTap: async (x, y) => {
      const { m } = here()
      const tool = get().tool
      if (!m || !get().dm) return null
      if (tool === 'pin') {
        const k = pinNear(m, x, y)
        return k ? { pin: k } : { newPin: { x: x + 0.5, y: y + 0.5 } }
      }
      if (tool === 'en') await setMap({ en: [x + 0.5, y + 0.5] })
      else if (tool === 'dz') await setMap(toggleDanger(m, x, y, get().dzs, get().dzc, rand))
      else if (tool === 'nd') await setMap(placeDoor(m, x, y, rand))
      else if (tool === 'dr') {
        const p = toggleDoorNear(m, x, y)
        if (p) await setMap(p)
      } else if (tool === 'al' || tool === 'bf' || tool === 'gd') await setMap(toggleSpot(m, tool, x, y))
      return null
    },

    paint: async (cells) => {
      const { m } = here()
      const tool = get().tool
      if (!m) return
      if (tool === 'wall') await setMap({ walls: paintWalls(m, cells) })
      else if (tool === 'rev' || tool === 'hid') await setMap({ fg: paintFog(m, cells, tool === 'rev') })
    },

    addPin: async (x, y, to, label) => {
      const { m } = here()
      if (m) await setMap(newPin(m, x, y, to, label, now()))
    },
    renamePin: async (k, label) => {
      const { m } = here()
      if (m?.pn?.[k]) await setMap(renamePin(m, k, label))
    },
    deletePin: async (k) => {
      const { m } = here()
      if (m?.pn?.[k]) await setMap(deletePin(m, k))
    },

    travel: async (to) => {
      const t = get().tables
      const maps = t.maps as Record<string, MapEntry>
      const old = liveMapId(maps as Maps, t.cur)
      if (!get().dm || !maps[to] || to === old) return
      const { pin, moves, fg } = travelPlan(maps, t.chars, t.enemies, approvedIds(t.chars), old!, to)
      const chars = { ...t.chars }
      const enemies = { ...t.enemies }
      const writes: [string, Record<string, unknown>][] = []
      for (const [i, p] of Object.entries(pin.chars)) {
        chars[i] = { ...chars[i], ...p }
        writes.push([`chars/${i}`, p])
      }
      for (const [i, p] of Object.entries(pin.enemies)) {
        enemies[i] = { ...enemies[i]!, ...p }
        writes.push([`enemies/${i}`, p])
      }
      for (const [i, p] of Object.entries(moves)) {
        chars[i] = { ...chars[i], ...p }
        writes.push([`chars/${i}`, p])
      }
      const nm = fg == null ? maps[to] : { ...maps[to]!, fg }
      set({
        tables: {
          ...t,
          chars,
          enemies,
          maps: { ...t.maps, [to]: nm },
          cur: to,
        },
        gmMap: to,
      })
      for (const [p, v] of writes) await save((d) => d.patch(p, v))
      if (fg != null) await save((d) => d.put(`maps/${to}/fg`, fg))
      await save((d) => d.put('cur', to))
      await get().log(`The party travels to ${maps[to]!.name}`)
    },

    addMap: async (data, w, h, fileName, extra) => {
      if (!get().dm) return
      const iv = now()
      const id = newMapId(iv)
      const m = newMapEntry(fileName || 'Map', w, h, iv, extra)
      await save((d) => d.put(`mapimg/${id}`, { data }))
      const t = get().tables
      const first = !t.cur
      set({
        tables: { ...t, maps: { ...t.maps, [id]: m }, cur: first ? id : t.cur },
        gmMap: id,
      })
      if (first) await save((d) => d.put('cur', id))
      await save((d) => d.put(`maps/${id}`, m))
    },

    renameMap: async (name) => {
      if (name) await setMap({ name: name.slice(0, 30) })
    },

    deleteMap: async () => {
      const { id } = here()
      if (!id || !get().dm) return
      const t = get().tables
      const maps = { ...t.maps }
      delete maps[id]
      const cur = t.cur === id ? (Object.keys(maps)[0] ?? null) : t.cur
      set({ tables: { ...t, maps, cur }, gmMap: null })
      if (t.cur === id) await save((d) => d.put('cur', cur))
      await save((d) => d.del(`maps/${id}`))
      await save((d) => d.del(`mapimg/${id}`))
    },

    setCols: (v) => setMap(colsPatch(v)),

    setMarkerIcon: async (k, data) => {
      if (!get().dm) return
      const st = now()
      await save(async (d) => {
        if (k) await d.put(`mkicons/${k}`, { data })
        else await d.del('mkicons')
        await d.patch('meta', { mki: st })
      })
    },
  }
}
