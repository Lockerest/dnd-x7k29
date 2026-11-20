// Play table actions for the game store: tapping the map to place or move a token,
// the GM's round and rest buttons, combat on or off, doors, helping allies up, the
// hidden words, and which map players see. The rules are in logic/table.ts.
import type { Db } from '../db/client'
import { revealAround } from '../logic/geometry'
import type { Sheet } from '../logic/sheet'
import { isMyTurn as isMyTurnFor } from '../logic/sheet'
import { doorCheck, enemyHidden, grid, heroReach, nextRound, occupant, placeEnemy, spoilerValue, walk, type Maps } from '../logic/table'
import { approvedIds } from '../logic/characters'
import { currentMapId } from './sheetActions'
import type { GameState } from './store'

export type TapResult = { target: string } | null

export type TableActions = {
  /**
   * Taps square (x, y) of the map on screen with this unit selected ("c:id" or
   * "e:id"; players always act as themselves). Places or moves the unit; tapping
   * another token returns it as the target (for the action menu).
   */
  tapMap: (x: number, y: number, selected: string | null) => Promise<TapResult>
  /** Reveals the fog around a square of the map on screen. */
  revealAt: (x: number, y: number) => Promise<void>
  /** GM: every hero's start of turn, and staggered monsters recover. */
  nextRoundAll: () => Promise<void>
  /** GM: everyone rests at an altar or a bonfire. */
  restAll: (kind: 'al' | 'bf') => Promise<void>
  /** GM: combat on (moving costs stamina) or off. */
  setCombat: (on: boolean) => Promise<void>
  /** Opens or closes door k next to this hero. */
  toggleDoor: (heroId: string, k: string) => Promise<void>
  /** This player helps an exhausted or prone ally up (uses an action). */
  helpUp: (id: string) => Promise<void>
  /** GM: saves the hidden words. */
  saveSpoilers: (words: string[]) => Promise<void>
  /** GM: players now see this map. */
  showMap: (id: string) => Promise<void>
}

type Get = () => GameState
type Set_ = (p: Partial<GameState>) => void
type Save = (f: (d: Db) => Promise<unknown>) => Promise<void>

export function tableActions(get: Get, set: Set_, save: Save): TableActions {
  const screen = () => {
    const s = get()
    const id = currentMapId(s.tables, s)
    return { id, g: grid(s.tables.maps as Maps, id) }
  }

  const revealAt = async (x: number, y: number) => {
    const { id, g } = screen()
    const fg = g && revealAround(g.m, x, y)
    if (fg == null) return
    const t = get().tables
    set({ tables: { ...t, maps: { ...t.maps, [id!]: { ...t.maps[id!], fg } } } })
    await save((d) => d.patch(`maps/${id}`, { fg }))
  }

  /** Monsters a hero carries move with them. */
  const follow = async (key: string, x: number, y: number) => {
    const e = get().tables.enemies
    for (const i of Object.keys(e)) if (e[i]!.hd === key) await get().updateEnemy(i, { mx: x, my: y })
  }

  /** Landing a jump off a monster: a free square within 3 squares of it. */
  const jumpTo = async (x: number, y: number): Promise<TapResult> => {
    const { jump, tables } = get()
    const { id, g } = screen()
    const c = tables.chars[jump!.id]
    const m = tables.enemies[jump!.on]
    if (!c || !m) {
      set({ jump: null })
      return null
    }
    const z = m.sz || 1
    const dx = Math.max((m.mx as number) - x, x - ((m.mx as number) + z - 1), 0)
    const dy = Math.max((m.my as number) - y, y - ((m.my as number) + z - 1), 0)
    if (Math.max(dx, dy) > 3 || g!.walls.has(`${x},${y}`) || occupant(tables.chars as Record<string, Sheet>, tables.enemies, id, x, y)) {
      get().notice('Pick a free square within 3 squares of the monster.')
      return null
    }
    get().notice('')
    await get().updateCharacter(jump!.id, { mt: '', mon: null, mx: x, my: y }, `Jumped off ${m.name}`)
    await get().log(`${c.name} jumps off ${m.name} and lands at column ${x + 1}, row ${y + 1}`)
    set({ jump: null })
    await revealAt(x, y)
    return null
  }

  return {
    revealAt,

    tapMap: async (x, y, selected) => {
      const st = get()
      const { id, g } = screen()
      if (!g) return null
      const { tables, dm, session } = st
      const me = session?.me ?? ''
      if (st.jump) return jumpTo(x, y)
      const mk = dm ? selected : `c:${me}`
      const sid = mk?.slice(2) ?? ''
      const isEnemy = mk?.[0] === 'e'
      const o = mk ? (isEnemy ? tables.enemies[sid] : tables.chars[sid]) : undefined
      if (!mk || !o) return null
      const chars = tables.chars as Record<string, Sheet>
      const seers = approvedIds(chars).map((i) => chars[i]!)
      const t0 = occupant(chars, tables.enemies, id, x, y)
      const t = t0 && !dm && t0[0] === 'e' && enemyHidden(g, seers, tables.enemies[t0.slice(2)]!) ? null : t0
      if (t && t !== mk) return !dm && t[0] === 'c' ? null : { target: t }
      if (isEnemy) {
        // Only the GM selects monsters (a player's unit is always their own hero).
        await get().updateEnemy(sid, placeEnemy(o, g, x, y))
        return null
      }
      const c = o as Sheet // a player's unit is always their own hero
      if (!dm && !isMyTurnFor(tables.ini, mk)) {
        get().notice('It is not your turn.')
        return null
      }
      if (!dm && (c.hp as number) <= 0) return null
      if (c.mx == null || dm) {
        await get().updateCharacter(sid, { mx: x, my: y, mp: id }, c.mx == null ? 'Placed on the map' : '')
      } else {
        const n = heroReach(c, g, tables.combat)[`${x},${y}`]
        if (!n) return null
        const [p, msg] = walk(c, n, x, y, tables.combat)
        await get().updateCharacter(sid, p, msg)
      }
      await follow(mk, x, y)
      await revealAt(x, y)
      return null
    },

    nextRoundAll: async () => {
      const { tables } = get()
      const r = nextRound(tables.chars as Record<string, Sheet>, tables.enemies)
      for (const [i, p, m] of r.heroes) await get().updateCharacter(i, p, m)
      for (const [i, p] of r.monsters) await get().updateEnemy(i, p)
    },

    restAll: async (kind) => {
      for (const i of approvedIds(get().tables.chars)) await get().rest(i, kind)
    },

    setCombat: async (on) => {
      set({ tables: { ...get().tables, combat: on } })
      await save((d) => d.put('combat', on))
      await get().log(on ? 'Combat begins: moving costs 1 stamina per square' : 'Combat ends')
    },

    toggleDoor: async (heroId, k) => {
      const { tables, dm, session } = get()
      const { id, g } = screen()
      const q = g?.m.dr?.[k]
      const c = tables.chars[heroId] as Sheet | undefined
      if (!q || !c || (!dm && heroId !== session?.me)) return
      const chk = doorCheck(c, dm, tables.combat, isMyTurnFor(tables.ini, `c:${heroId}`))
      if ('error' in chk) return get().notice(chk.error)
      if (chk.patch) await get().updateCharacter(heroId, chk.patch)
      const nq = { ...q, o: q.o ? 0 : 1 }
      const t = get().tables
      const m = t.maps[id!]!
      set({ tables: { ...t, maps: { ...t.maps, [id!]: { ...m, dr: { ...(m.dr as object), [k]: nq } } } } })
      await save((d) => d.put(`maps/${id}/dr/${k}`, nq))
      await get().log(`${c.name}${nq.o ? ' opens' : ' closes'} a door`)
      if (c.mx != null) await revealAt(c.mx, c.my as number)
    },

    helpUp: async (id) => {
      const { tables, session } = get()
      const me = session ? (tables.chars[session.me] as Sheet | undefined) : undefined
      const c = tables.chars[id]
      if (!me || !c || me.exh || (me.used || 0) >= 2) return
      const log = [...(c.log || []).slice(-9), `Helped up by ${me.name}`]
      const p = { exh: false, exn: 0, pr: false, log }
      set({ tables: { ...tables, chars: { ...tables.chars, [id]: { ...c, ...p } } } })
      await save((d) => d.patch(`chars/${id}`, p))
      await get().updateCharacter(session!.me, { used: (me.used || 0) + 1 }, `Helped ${c.name} up`)
    },

    saveSpoilers: async (words) => {
      if (!get().dm) return
      const sp = spoilerValue(words)
      set({ tables: { ...get().tables, sp } })
      await save((d) => d.patch('meta', { sp }))
    },

    showMap: async (id) => {
      set({ tables: { ...get().tables, cur: id } })
      await save((d) => d.put('cur', id))
    },
  }
}
