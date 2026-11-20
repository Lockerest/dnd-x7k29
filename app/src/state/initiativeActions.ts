// Initiative actions for the game store: starting, rolling, beginning and ending
// combat, and passing turns. The rules are in logic/initiative.ts.
import type { Db } from '../db/client'
import {
  allRolled,
  beginCombat,
  canEndTurn,
  heroInitiativeBonus,
  monsterInitiative,
  nextTurn,
  startInitiative,
  turnLine,
  unitOf,
  type Initiative,
} from '../logic/initiative'
import type { Sheet } from '../logic/sheet'
import { liveMapId, nextRound, type Maps } from '../logic/table'
import type { GameState } from './store'

export type InitiativeActions = {
  /** GM: everyone rolls initiative (combat pauses until it begins). */
  startInitiative: () => Promise<void>
  /** Rolls unit i's initiative: a player their own hero (shared dice), the GM a monster. */
  rollInitiative: (i: number) => Promise<void>
  /** GM: rolls every monster that has not rolled yet. */
  rollMonsters: () => Promise<void>
  /** GM: once everyone has rolled, sorts the order and starts combat. */
  beginCombat: () => Promise<void>
  /** The GM passes the turn; a player ends their own turn (not the round's last). */
  passTurn: () => Promise<void>
  /** GM: clears the turn order and ends combat. */
  endCombat: () => Promise<void>
}

type Get = () => GameState
type Set_ = (p: Partial<GameState>) => void
type Save = (f: (d: Db) => Promise<unknown>) => Promise<void>

export function initiativeActions(get: Get, set: Set_, save: Save, rand: () => number): InitiativeActions {
  const state = () => {
    const { tables } = get()
    return { tables, chars: tables.chars as Record<string, Sheet>, enemies: tables.enemies, ini: tables.ini as Initiative | null }
  }
  const setIni = (ini: Initiative | null, combat?: boolean) => set({ tables: { ...get().tables, ini, ...(combat === undefined ? {} : { combat }) } })

  const setRoll = async (i: number, v: number) => {
    const ini = state().ini!
    setIni({ ...ini, l: ini.l.map((u, j) => (j === i ? { ...u, v } : u)) })
    await save((d) => d.patch(`init/l/${i}`, { v }))
  }

  return {
    startInitiative: async () => {
      const { tables, chars, enemies } = state()
      const ini = startInitiative(chars, enemies, liveMapId(tables.maps as Maps, tables.cur))
      setIni(ini, false)
      await save((d) => d.put('init', ini))
      await save((d) => d.put('combat', false))
      await get().log('Initiative! Everyone roll to see who goes first.')
    },

    rollInitiative: async (i) => {
      const { chars, enemies, ini } = state()
      const { dm, session } = get()
      if (!ini || ini.ph !== 'roll') return
      const u = ini.l[i]
      const t = u && u.v == null ? unitOf(chars, enemies, u.k) : null
      if (!t) return
      if (t.e) {
        if (!dm) return
        await setRoll(i, monsterInitiative(t.o, rand))
        return get().log(`${t.o.name} rolls initiative`)
      }
      if (u!.k !== `c:${session?.me}`) return
      const bonus = heroInitiativeBonus(t.o)
      const [r] = await get().roll([20], bonus)
      await setRoll(i, r! + bonus)
      await get().log(`${t.o.name} rolls initiative: ${r! + bonus}`)
    },

    rollMonsters: async () => {
      const { chars, enemies, ini } = state()
      if (!ini) return
      for (let i = 0; i < ini.l.length; i++) {
        const t = unitOf(chars, enemies, ini.l[i]!.k)
        if (t && t.e && ini.l[i]!.v == null) await setRoll(i, monsterInitiative(t.o, rand))
      }
    },

    beginCombat: async () => {
      const { chars, enemies, ini } = state()
      if (!ini || ini.ph !== 'roll' || !allRolled(ini, chars, enemies)) return
      const next = beginCombat(ini, chars, enemies, rand)
      setIni(next, true)
      await save((d) => d.put('init', next))
      await save((d) => d.put('combat', true))
      const u0 = next.l[0] && unitOf(chars, enemies, next.l[0].k)
      await get().log(`Combat begins! ${u0 ? `${u0.o.name} goes first.` : ''}`)
    },

    passTurn: async () => {
      const { chars, enemies, ini } = state()
      const { dm, session } = get()
      if (!ini || ini.ph !== 'go') return
      if (!dm && !canEndTurn(ini, session?.me ?? '', false)) return
      const { ini: next, wrapped } = nextTurn(ini, chars, enemies)
      if (wrapped) {
        // A new round: everyone's start of turn, and staggered monsters recover.
        const r = nextRound(chars, enemies)
        for (const [id, p, m] of r.heroes) await get().updateCharacter(id, p, m)
        for (const [id, p] of r.monsters) await get().updateEnemy(id, p)
      }
      setIni(next)
      await save((d) => d.put('init', next))
      const u = unitOf(get().tables.chars as Record<string, Sheet>, get().tables.enemies, next.l[next.t]!.k)
      if (u) await get().log(turnLine(next, wrapped, u.o.name as string))
    },

    endCombat: async () => {
      setIni(null, false)
      await save((d) => d.del('init'))
      await save((d) => d.put('combat', false))
      await get().log('Combat ends')
    },
  }
}
