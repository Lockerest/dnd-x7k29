// Ability board actions for the game store: the GM's editor and settings, and
// players equipping and attuning. The rules are in logic/abilityBoard.ts.
import type { Db } from '../db/client'
import { attuneChange, boardFieldValue, equipChange, NEW_ABILITY, type EquipResult } from '../logic/abilityBoard'
import { boardOrDefault, goldenHidden, type Board } from '../logic/board'
import { altarsOf, bonfiresOf, guildsOf, nearSpot } from '../logic/geometry'
import { currentMap, type MapView } from './sheetActions'
import type { GameState, Tables } from './store'

export type BoardActions = {
  /** GM: changes one field of a board ability. */
  setAbilityField: (id: string, field: string, raw: string | boolean) => Promise<void>
  /** GM: adds a new ability under this key. */
  addAbility: (id: string) => Promise<void>
  removeAbility: (id: string) => Promise<void>
  /** GM: replaces the whole board (default or 9-class abilities). */
  replaceBoard: (b: Board) => Promise<void>
  /** GM: drawn icons on or off, and whether players see locked abilities. */
  setBoardSetting: (setting: 'drawnIcons' | 'showAll', on: boolean) => Promise<void>
  /** This player equips (learn) or unequips an ability. */
  equip: (key: string, learn: boolean) => Promise<void>
  /** This player attunes an equipped Golden ability. */
  attune: (key: string) => Promise<void>
}

type Get = () => GameState
type Set_ = (p: Partial<GameState>) => void
type Save = (f: (d: Db) => Promise<unknown>) => Promise<void>

/** Standing next to an altar, a bonfire or a guild on the current map. */
export function atRestSpot(t: Tables, c: { mx?: number | null; my?: number | null }, v: MapView = {}): boolean {
  const m = currentMap(t, v)
  return !!(nearSpot(c, altarsOf(m)) || nearSpot(c, bonfiresOf(m)) || nearSpot(c, guildsOf(m)))
}

export function boardActions(get: Get, set: Set_, save: Save): BoardActions {
  const setBoard = (board: Board) => set({ tables: { ...get().tables, board } })

  /** A table without a saved board uses the default one; the first edit saves it whole. */
  const ensure = async (): Promise<Board> => {
    const t = get().tables
    if (t.board) return t.board as Board
    const b = boardOrDefault(null)
    setBoard(b)
    await save((d) => d.put('board', b))
    return b
  }

  const apply = async (r: EquipResult) => {
    if (!r) return
    if ('error' in r) return get().notice(r.error)
    await get().updateCharacter(get().session!.me, r.patch, r.msg)
  }

  const mine = () => {
    const { tables, session, dm } = get()
    const c = session ? tables.chars[session.me] : undefined
    return c ? { c, board: boardOrDefault(tables.board as Board | null), here: atRestSpot(tables, c, get()), dm, hide: goldenHidden(dm, tables.sp) } : null
  }

  return {
    setAbilityField: async (id, field, raw) => {
      const { dm, tables } = get()
      if (!dm || !boardOrDefault(tables.board as Board | null)[id]) return
      const b = await ensure()
      const v = boardFieldValue(b, id, field, raw)
      setBoard({ ...b, [id]: { ...b[id]!, [field]: v } })
      await save((d) => d.put(`board/${id}/${field}`, v))
    },
    addAbility: async (id) => {
      const b = await ensure()
      setBoard({ ...b, [id]: { ...NEW_ABILITY } })
      await save((d) => d.put(`board/${id}`, NEW_ABILITY))
    },
    removeAbility: async (id) => {
      const b = { ...(await ensure()) }
      delete b[id]
      setBoard(b)
      await save((d) => d.del(`board/${id}`))
    },
    replaceBoard: async (b) => {
      setBoard(b)
      await save((d) => d.put('board', b))
    },
    setBoardSetting: async (setting, on) => {
      if (!get().dm) return
      set({ tables: { ...get().tables, [setting]: on } })
      await save((d) => d.patch('meta', setting === 'drawnIcons' ? { aic: on ? 1 : 0 } : { abv: on ? 1 : 0 }))
    },
    equip: async (key, learn) => {
      const m = mine()
      if (m) await apply(equipChange(m.c, m.board, key, learn, m.here, m.dm, m.hide))
    },
    attune: async (key) => {
      const m = mine()
      if (m) await apply(attuneChange(m.c, m.board, key, m.here, m.dm, m.hide))
    },
  }
}
