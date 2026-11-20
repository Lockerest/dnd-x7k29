// Character sheet actions for the game store: the parts that save, log and touch
// other sheets (rests reset the world, reviving reveals the fog, abilities roll
// dice). The rules themselves are in logic/sheet.ts.
import type { Db } from '../db/client'
import { boardIndex, boardOrDefault, type Board } from '../logic/board'
import { altarsOf, bonfiresOf, nearSpot, revealAround, waveCenter, type MapData } from '../logic/geometry'
import { abilityLocked, altarRest, bonfireRest, healAmount, isMyTurn, payForAbility, respawnPatches, revive, type Sheet } from '../logic/sheet'
import { approvedIds } from '../logic/characters'
import { parseDice } from '../logic/text'
import { bonusOf, clamp, proficiency } from '../logic/stats'
import type { GameState, Tables } from './store'
import { shownMapId, type Maps } from '../logic/table'

/** Runs f after ms milliseconds. */
export type Timers = (f: () => unknown, ms: number) => void

/** The map the sheet looks at: the live one, or the first. */
/** Who is looking: the GM may have another map on screen. */
export type MapView = { dm?: boolean; gmMap?: string | null }

/** The map on screen: the live one, the first, or the GM's pick. */
export const currentMapId = (t: Tables, v: MapView = {}): string | null => shownMapId(t.maps as Maps, t.cur, !!v.dm, v.gmMap)
export const currentMap = (t: Tables, v: MapView = {}): MapData | null => {
  const id = currentMapId(t, v)
  return id ? (t.maps[id] as MapData) : null
}

export type SheetActions = {
  /** Saves fields without a log line (typed boxes: stats, conditions, notes). */
  patchCharacter: (id: string, p: Record<string, unknown>) => Promise<void>
  /** GM: removes a character and its pictures. */
  removeCharacter: (id: string) => Promise<void>
  /** Rest at a bonfire ("bf") or an altar ("al"); players must stand next to one. */
  rest: (id: string, kind: 'al' | 'bf') => Promise<void>
  /** A fallen character rises at the altar "x,y". */
  reviveAt: (id: string, altar: string) => Promise<void>
  /** A hero puts down the monster they carry. */
  putDown: (enemyId: string) => Promise<void>
  /** Uses ability name (cost in table units); heals and checks roll their dice. */
  castAbility: (id: string, name: string, cost: number, reaction: boolean) => Promise<void>
  /** Rolls dice; players' rolls are shared, the GM's stay secret. Returns each result. */
}

type Get = () => GameState
type Set_ = (p: Partial<GameState>) => void
type Save = (f: (d: Db) => Promise<unknown>) => Promise<void>

export function sheetActions(get: Get, set: Set_, save: Save, now: () => number, later: Timers): SheetActions {
  let lastWave = -Infinity

  const setChars = (chars: Tables['chars']) => set({ tables: { ...get().tables, chars } })

  /** The Golden Wave from an altar (at most once every 8 seconds); the monsters return 1.5 s later. */
  const altarWave = async (key: string | null) => {
    if (now() - lastWave < 8000) return
    lastWave = now()
    const t = get().tables
    const w = { m: currentMapId(t, get()), ...waveCenter(currentMap(t, get()), key) }
    get().effects?.wave(w)
    later(respawn, 1500)
    await save((d) => d.post('rolls', { wave: w, ts: now(), by: get().session?.me ?? '' }))
    await get().log('The Golden Wave sweeps across the land...')
  }

  const respawn = async () => {
    const p = respawnPatches(get().tables.enemies)
    for (const [i, q] of p) await get().updateEnemy(i, q)
    if (p.length) await get().log('The monsters return to their posts (unique foes stay dead)')
  }

  const reveal = async (x: number, y: number) => {
    const t = get().tables
    const id = currentMapId(t, get())
    const m = currentMap(t, get())
    const fg = m && revealAround(m, x, y)
    if (!id || fg == null) return
    set({ tables: { ...t, maps: { ...t.maps, [id]: { ...m, fg } } } })
    await save((d) => d.patch(`maps/${id}`, { fg }))
  }

  return {
    patchCharacter: async (id, p) => {
      const { tables, dm, session } = get()
      const c = tables.chars[id]
      if (!c || (!dm && id !== session?.me)) return
      setChars({ ...tables.chars, [id]: { ...c, ...p } })
      await save((d) => d.patch(`chars/${id}`, p))
    },

    removeCharacter: async (id) => {
      const chars = { ...get().tables.chars }
      delete chars[id]
      setChars(chars)
      await Promise.all(['chars', 'icons', 'portraits'].map((p) => save((d) => d.del(`${p}/${id}`))))
    },

    rest: async (id, kind) => {
      const { tables, dm } = get()
      const c = tables.chars[id] as Sheet | undefined
      if (!c || (c.hp as number) <= 0) return
      const m = currentMap(tables, get())
      const altar = nearSpot(c, altarsOf(m))
      if (kind === 'bf') {
        if (!dm && !nearSpot(c, bonfiresOf(m))) return get().notice('You can only use a bonfire when standing next to one.')
        const [p, msg] = bonfireRest(c)
        return get().updateCharacter(id, p, msg)
      }
      if (!dm && !altar) return get().notice('You can only rest next to an altar.')
      const [p, msg] = altarRest(c, altar)
      await get().updateCharacter(id, p, msg)
      await altarWave(altar)
    },

    reviveAt: async (id, altar) => {
      const { tables } = get()
      const c = tables.chars[id] as Sheet | undefined
      if (!c || (c.hp as number) > 0) return
      const wipe = approvedIds(tables.chars).every((i) => i === id || (tables.chars[i]!.hp as number) <= 0)
      const [p, msg, event] = revive(c, altar)
      await get().updateCharacter(id, p, msg)
      await get().log(event)
      await reveal(p.mx as number, p.my as number)
      if (wipe) {
        await get().log('The whole party has fallen...')
        await altarWave(altar)
      }
    },

    putDown: async (enemyId) => {
      const { tables } = get()
      const x = tables.enemies[enemyId]
      const hd = x?.hd as string | undefined
      const carrier = hd?.startsWith('c:') ? tables.chars[hd.slice(2)] : hd?.startsWith('e:') ? tables.enemies[hd.slice(2)] : undefined
      await get().updateEnemy(enemyId, { hd: null })
      if (x && carrier) await get().log(`${carrier.name} puts down ${x.name}`)
    },

    castAbility: async (id, name, cost, reaction) => {
      const { tables, dm } = get()
      const c = tables.chars[id] as Sheet | undefined
      if (!c || abilityLocked(c, reaction, dm, isMyTurn(tables.ini, `c:${id}`))) return
      const ix = boardIndex(boardOrDefault(tables.board as Board | null))
      const [p, msg] = payForAbility(c, name, cost, reaction, ix.hpCost[name])
      await get().updateCharacter(id, p, msg)
      const heal = ix.heal[name]
      const check = ix.check[name]
      if (heal) {
        const bb = bonusOf(c, heal.b)
        const rs = await get().roll(parseDice(heal.d), bb)
        const amt = healAmount(rs, bb)
        const cc = get().tables.chars[id]!
        await get().updateCharacter(id, { hp: clamp((cc.hp as number) + amt, cc.maxHp as number) }, `Healed ${amt}`)
        await get().log(`${c.name} heals ${amt} with ${name}`)
      } else if (check) {
        const bb = bonusOf(c, check.b) + proficiency(c)
        const [r] = await get().roll([20], bb)
        await get().log(`${c.name} tries ${name}: ${r! + bb}`)
      }
    },

  }
}
