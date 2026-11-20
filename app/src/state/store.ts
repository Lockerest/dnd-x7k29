// The game state for one table, shared by every screen. Changes are applied
// locally first (so the screen reacts at once) and then saved to the database,
// exactly like the live page.
import { createStore } from 'zustand/vanilla'
import type { Db } from '../db/client'
import type { Character, Enemy } from '../logic/types'
import type { Session } from './session'
import { errorText } from '../util/errors'
import { characterChange, enemyChange, type CharacterWithLog } from './updates'

export type Tables = {
  chars: Record<string, CharacterWithLog>
  enemies: Record<string, Enemy>
  maps: Record<string, Record<string, unknown>>
  /** The live map id. */
  cur: string | null
  rolls: Record<string, Record<string, unknown>>
  combat: boolean
  /** Initiative: order list l, turn t, round r, phase ph. */
  ini: { l: { k: string }[]; t?: number; r?: number; ph?: string } | null
  board: Record<string, unknown> | null
  claims: Record<string, unknown> | null
}

export const emptyTables = (): Tables => ({ chars: {}, enemies: {}, maps: {}, cur: null, rolls: {}, combat: false, ini: null, board: null, claims: null })

export type Status = 'idle' | 'connecting' | 'live' | 'error'

export type GameState = {
  session: Session | null
  tables: Tables
  status: Status
  /** Last connection or save problem, shown to the user. */
  error: string
  /** True for the Game Master. */
  dm: boolean
  connect: (s: Session) => void
  disconnect: () => void
  /** Replaces the tables with a fresh read; returns false when nothing changed. */
  applySnapshot: (t: Tables) => boolean
  setError: (e: unknown) => void
  updateCharacter: (id: string, p: Record<string, unknown>, msg?: string) => Promise<void>
  updateEnemy: (id: string, p: Record<string, unknown>) => Promise<void>
  /** Adds a line to the shared event log. */
  log: (text: string) => Promise<void>
  /** GM only: look at the table as a player and back (the role itself stays GM). */
  setDm: (dm: boolean) => void
  /** This device now plays another character (after a takeover was allowed). */
  setMe: (me: string) => void
  /** Saves a whole new character sheet. */
  putCharacter: (id: string, sheet: CharacterWithLog) => Promise<void>
  /** This player's takeover request (null withdraws it). */
  setMyClaim: (claim: Record<string, unknown> | null) => Promise<void>
  /** GM: allow or refuse a takeover request. */
  decideClaim: (id: string, st: 'ok' | 'no') => Promise<void>
}

const signature = (t: Tables) => JSON.stringify(t)

/** db gives the database to save to; without one (the default) nothing is ever written. */
export function createGameStore(db: () => Db | null = () => null, now: () => number = Date.now) {
  let lastSig = ''
  return createStore<GameState>()((set, get) => {
    const save = async (f: (d: Db) => Promise<unknown>) => {
      const d = db()
      if (!d) return
      try {
        await f(d)
      } catch (e) {
        get().setError(e)
      }
    }
    return {
      session: null,
      tables: emptyTables(),
      status: 'idle',
      error: '',
      dm: false,
      connect: (s) => {
        lastSig = ''
        set({ session: s, dm: s.role === 'gm', status: 'connecting', error: '', tables: emptyTables() })
      },
      disconnect: () => {
        lastSig = ''
        set({ session: null, dm: false, status: 'idle', error: '', tables: emptyTables() })
      },
      applySnapshot: (t) => {
        const sig = signature(t)
        const changed = sig !== lastSig
        lastSig = sig
        set(changed ? { tables: t, status: 'live', error: '' } : { status: 'live', error: '' })
        return changed
      },
      setError: (e) => set({ error: `Connection problem: ${errorText(e)}` }),

      updateCharacter: async (id, p, msg) => {
        const { tables, dm, session } = get()
        const c = tables.chars[id]
        if (!c || (!dm && id !== session?.me)) return
        const { patch, next } = characterChange(c, p, msg)
        set({ tables: { ...tables, chars: { ...tables.chars, [id]: next } } })
        await save((d) => d.patch(`chars/${id}`, patch))
      },

      updateEnemy: async (id, p) => {
        const { tables } = get()
        const liveMap = () => (tables.cur && tables.maps[tables.cur] ? tables.cur : Object.keys(tables.maps)[0])
        const { patch, next, riders } = enemyChange(tables.enemies[id], p, tables.chars, id, liveMap)
        const chars = { ...tables.chars }
        for (const [i, pos] of Object.entries(riders)) chars[i] = { ...chars[i], ...(pos as Partial<Character>) }
        set({ tables: { ...tables, chars, enemies: { ...tables.enemies, [id]: next } } })
        await Promise.all([
          ...Object.entries(riders).map(([i, pos]) => save((d) => d.patch(`chars/${i}`, pos))),
          save((d) => d.patch(`enemies/${id}`, patch)),
        ])
      },

      log: (text) => save((d) => d.post('rolls', { ev: text, ts: now() })),

      setDm: (dm) => set({ dm }),
      setMe: (me) => {
        const { session } = get()
        if (session) set({ session: { ...session, me } })
      },
      putCharacter: async (id, sheet) => {
        const { tables } = get()
        set({ tables: { ...tables, chars: { ...tables.chars, [id]: sheet } } })
        await save((d) => d.put(`chars/${id}`, sheet))
      },
      setMyClaim: async (claim) => {
        const me = get().session?.me
        if (!me) return
        set({ tables: { ...get().tables, claims: claim } })
        await save((d) => (claim ? d.put(`claims/${me}`, claim) : d.del(`claims/${me}`)))
      },
      decideClaim: async (id, st) => {
        const { tables } = get()
        const c = (tables.claims || {})[id] as Record<string, unknown> | undefined
        if (c) set({ tables: { ...tables, claims: { ...tables.claims, [id]: { ...c, st } } } })
        await save((d) => d.patch(`claims/${id}`, { st }))
      },
    }
  })
}

export type GameStore = ReturnType<typeof createGameStore>
