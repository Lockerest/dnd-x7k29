// The GM's encounters: saved groups of enemies, kept at encounters/ (with their
// pictures at encpics/) and never read by the refresh, so they cost nothing until
// the Encounters list is opened. Deploy copies one onto the map; Clear removes it.
import type { Db } from '../db/client'
import { captureEncounter, deployedIds, deploySheets, type Encounter } from '../logic/encounters'
import { grid, type Maps } from '../logic/table'
import { currentMapId } from './sheetActions'
import type { GameState } from './store'

/** Pictures a sheet can have, by their database folder and the sheet's stamp. */
const PICS = [
  ['icons', 'iv'],
  ['portraits', 'pv'],
  ['bossart', 'ba'],
] as const

export type EncounterActions = {
  /** Saved encounters (null until loaded). */
  encounters: Record<string, Encounter> | null
  /** GM: reads the saved encounters. */
  loadEncounters: () => Promise<void>
  /** GM: saves these live enemies (and their phase sheets and pictures) as an encounter; false when nothing to save. */
  saveEncounter: (id: string, name: string, region: string, ids: string[]) => Promise<boolean>
  /** GM: moves an encounter to another region folder or renames it. */
  editEncounter: (id: string, p: { n?: string; rg?: string }) => Promise<void>
  /** GM: deletes a saved encounter (the live enemies stay). */
  deleteEncounter: (id: string) => Promise<void>
  /** GM: puts a copy of the encounter on the map on screen; returns its tag. */
  deployEncounter: (id: string) => Promise<string | null>
  /** GM: removes every enemy one deploy made. */
  clearDeploy: (tag: string) => Promise<void>
}

type Get = () => GameState
type Set = (p: Partial<GameState>) => void
type Save = (f: (d: Db) => Promise<unknown>) => Promise<void>

export function encounterActions(get: Get, set: Set, save: Save, rand: () => number): Omit<EncounterActions, 'encounters'> {
  const key = (p: string) => p + rand().toString(36).slice(2, 8)
  const put = (id: string, e: Encounter | null) => {
    const all = { ...(get().encounters || {}) }
    if (e) all[id] = e
    else delete all[id]
    set({ encounters: all })
  }
  return {
    loadEncounters: async () => {
      if (!get().dm) return
      await save(async (d) => set({ encounters: (await d.get<Record<string, Encounter>>('encounters')) || {} }))
    },

    saveEncounter: async (id, name, region, ids) => {
      if (!get().dm) return false
      const enc = captureEncounter(name, region, get().tables.enemies, ids)
      if (!enc) return false
      put(id, enc)
      await save(async (d) => {
        await d.put(`encounters/${id}`, enc)
        for (const k of Object.keys(enc.m)) {
          for (const [folder, stamp] of PICS) {
            if (!enc.m[k]!.s[stamp]) continue
            const p = await d.get<{ data?: string }>(`${folder}/${k}`)
            if (p?.data) await d.put(`encpics/${id}/${k}/${folder}`, p.data)
          }
        }
      })
      await get().log(`Encounter saved: ${enc.n}`)
      return true
    },

    editEncounter: async (id, p) => {
      const e = get().encounters?.[id]
      if (!get().dm || !e) return
      const patch: Record<string, string> = {}
      if (p.n?.trim()) patch.n = p.n.trim().slice(0, 60)
      if (p.rg) patch.rg = p.rg
      put(id, { ...e, ...patch })
      await save((d) => d.patch(`encounters/${id}`, patch))
    },

    deleteEncounter: async (id) => {
      if (!get().dm) return
      put(id, null)
      await save((d) => d.del(`encounters/${id}`))
      await save((d) => d.del(`encpics/${id}`))
    },

    deployEncounter: async (id) => {
      const s = get()
      const enc = s.encounters?.[id]
      const g = grid(s.tables.maps as Maps, currentMapId(s.tables, s))
      if (!s.dm || !enc) return null
      if (!g) {
        s.notice('Open a map first: the encounter is placed on the map on screen.')
        return null
      }
      const tag = `${id}~${key('')}`
      const made: Record<string, string> = {}
      const sheets = deploySheets(enc, g, tag, (k) => (made[k] = key('e')))
      for (const [nid, sheet] of Object.entries(sheets)) await s.addEnemy(nid, sheet)
      await save(async (d) => {
        const pics = await d.get<Record<string, Record<string, string>>>(`encpics/${id}`)
        for (const [k, nid] of Object.entries(made)) for (const [folder] of PICS) if (pics?.[k]?.[folder]) await d.put(`${folder}/${nid}`, { data: pics[k][folder] })
      })
      await get().log(`${enc.n} appears!`)
      return tag
    },

    clearDeploy: async (tag) => {
      if (!get().dm) return
      for (const i of deployedIds(get().tables.enemies, tag)) await get().removeEnemy(i)
    },
  }
}
