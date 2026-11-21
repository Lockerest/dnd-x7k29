// The game state for one table, shared by every screen. Changes are applied
// locally first (so the screen reacts at once) and then saved to the database,
// exactly like the live page.
import { createStore } from 'zustand/vanilla'
import type { Db } from '../db/client'
import { buildNextPhase, nextPhasePatch } from '../logic/phases'
import { videoUrl, type CinematicEvent } from '../logic/cinematic'
import type { Character, Enemy, EnemySkill } from '../logic/types'
import type { Session } from './session'
import { errorText } from '../util/errors'
import { characterChange, enemyChange, type CharacterWithLog } from './updates'
import { sheetActions, type SheetActions, type Timers } from './sheetActions'
import { boardActions, type BoardActions } from './boardActions'
import { initiativeActions, type InitiativeActions } from './initiativeActions'
import { diceActions, type DiceActions } from './diceActions'
import { mapActions, type MapActions } from './mapActions'
import { pictureActions, type PictureActions } from './pictureActions'
import { soundActions, type SoundActions } from './soundActions'
import { enemyExtras, type BossIntro, type EnemyExtras } from './enemyExtras'
import { attackActions, type AttackActions } from './attackActions'
import { tableActions, type TableActions } from './tableActions'

export type Tables = {
  chars: Record<string, CharacterWithLog>
  enemies: Record<string, Enemy>
  maps: Record<string, Record<string, unknown>>
  /** The live map id. */
  cur: string | null
  rolls: Record<string, Record<string, unknown>>
  combat: boolean
  /** Initiative: order list l, turn t, round r, phase ph. */
  ini: { l: { k: string; v?: number | null }[]; t?: number; r?: number; ph?: string } | null
  board: Record<string, unknown> | null
  claims: Record<string, unknown> | null
  /** Spoiler words hidden from players (meta/sp): null = the default list, "-" = none. */
  sp: string | null
  /** meta/abv = 1: players see every ability, locked ones too. */
  showAll: boolean
  /** meta/aic = 0 turns the drawn ability icons off (emoji instead). */
  drawnIcons: boolean
}

export const emptyTables = (): Tables => ({ chars: {}, enemies: {}, maps: {}, cur: null, rolls: {}, combat: false, ini: null, board: null, claims: null, sp: null, showAll: false, drawnIcons: true })

export type Status = 'idle' | 'connecting' | 'live' | 'error'

export type GameState = {
  session: Session | null
  tables: Tables
  status: Status
  /** Last connection or save problem, shown to the user. */
  error: string
  /** True for the Game Master. */
  dm: boolean
  /** The map the GM has on screen (null: the live map). Players always see the live map. */
  gmMap: string | null
  setGmMap: (id: string | null) => void
  /** A hero jumping off the monster they climb: the next map tap picks where they land. */
  jump: { id: string; on: string } | null
  startJump: (id: string) => void
  cancelJump: () => void
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
  /** The screen's attack scenes and Golden Wave (null: nothing shown, as in tests). */
  effects: Effects | null
  setEffects: (e: Effects | null) => void
  setDm: (dm: boolean) => void
  /** This device now plays another character (after a takeover was allowed). */
  setMe: (me: string) => void
  /** Saves a whole new character sheet. */
  putCharacter: (id: string, sheet: CharacterWithLog) => Promise<void>
  /** This player's takeover request (null withdraws it). */
  setMyClaim: (claim: Record<string, unknown> | null) => Promise<void>
  /** GM: allow or refuse a takeover request. */
  decideClaim: (id: string, st: 'ok' | 'no') => Promise<void>

  // Game Master: enemies.
  addEnemy: (id: string, sheet: Enemy) => Promise<void>
  /** Removes an enemy, its pictures, and any "next phase" links to it. */
  removeEnemy: (id: string) => Promise<void>
  setSkills: (id: string, sk: Record<string, EnemySkill>) => Promise<void>
  putSkill: (id: string, key: string, skill: EnemySkill) => Promise<void>
  setSkillField: (id: string, key: string, field: string, value: string | number) => Promise<void>
  deleteSkill: (id: string, key: string) => Promise<void>
  /** "+ Add next phase sheet". themeAvailable says which theme keys exist. */
  addNextPhase: (id: string, newId: string, themeAvailable: (key: string) => boolean) => Promise<void>
  /** Hands over to the next phase sheet (HP null = full). */
  switchPhase: (id: string, hp: number | null) => Promise<void>
  /** Shares a cinematic with every device; returns it, or null without a script. */
  shareCinematic: (id: string) => Promise<CinematicEvent | null>
  /** Takes an enemy off the board and out of the turn order (after a vanishing cinematic). */
  vanish: (id: string) => Promise<void>
  /** Internal: replaces an enemy's skills locally (no save). */
  setSkillsLocal: (id: string, sk: Record<string, EnemySkill>) => void
  /** Shows a message to the user (not a connection problem). */
  notice: (text: string) => void
} & SheetActions &
  BoardActions &
  InitiativeActions &
  AttackActions &
  TableActions &
  DiceActions &
  MapActions &
  PictureActions &
  SoundActions &
  EnemyExtras

/** What the screen shows for an attack scene ("fx") or a Golden Wave. */
export type Effects = { scene: (f: Record<string, unknown>) => void; wave: (w: { m?: string | null; x: number; y: number }) => void; boss: (b: BossIntro) => void }

const signature = (t: Tables) => JSON.stringify(t)

/**
 * db gives the database to save to; without one (the default) nothing is ever written.
 * rand rolls the dice; later runs delayed steps (the world reset after the Golden Wave).
 */
export function createGameStore(db: () => Db | null = () => null, now: () => number = Date.now, rand: () => number = Math.random, later: Timers = (f, ms) => void setTimeout(() => void f(), ms)) {
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
      gmMap: null,
      setGmMap: (gmMap) => set({ gmMap }),
      jump: null,
      startJump: (id) => {
        const c = get().tables.chars[id]
        if (c?.mon) set({ jump: { id, on: c.mon as string } })
      },
      cancelJump: () => set({ jump: null }),
      connect: (s) => {
        lastSig = ''
        set({ session: s, dm: s.role === 'gm', gmMap: null, jump: null, status: 'connecting', error: '', tables: emptyTables() })
      },
      disconnect: () => {
        lastSig = ''
        set({ session: null, dm: false, gmMap: null, jump: null, status: 'idle', error: '', tables: emptyTables() })
      },
      applySnapshot: (t) => {
        const sig = signature(t)
        const changed = sig !== lastSig
        lastSig = sig
        set(changed ? { tables: t, status: 'live', error: '' } : { status: 'live', error: '' })
        return changed
      },
      setError: (e) => set({ error: `Connection problem: ${errorText(e)}` }),
      notice: (text) => set({ error: text }),
      ...sheetActions(get, set, save, now, later),
      ...boardActions(get, set, save, now),
      ...pictureActions(get, save, now),
      ...soundActions(get, db, now),
      ...enemyExtras(get, save, now, rand),
      ...initiativeActions(get, set, save, rand, later),
      ...attackActions(get, set, save, db, now, rand, later),
      ...tableActions(get, set, save),
      ...diceActions(get, set, save, now, rand),
      ...mapActions(get, set, save, now, rand),

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
        // A change that arrives after the enemy was removed must not bring back an empty
        // "ghost" sheet (the live page would recreate one).
        if (!tables.enemies[id]) return
        const liveMap = () => (tables.cur && tables.maps[tables.cur] ? tables.cur : Object.keys(tables.maps)[0])
        const { patch, next, riders } = enemyChange(tables.enemies[id], p, tables.chars, id, liveMap)
        const chars = { ...tables.chars }
        for (const [i, pos] of Object.entries(riders)) chars[i] = { ...chars[i], ...(pos as Partial<Character>) }
        set({ tables: { ...tables, chars, enemies: { ...tables.enemies, [id]: next } } })
        await Promise.all([...Object.entries(riders).map(([i, pos]) => save((d) => d.patch(`chars/${i}`, pos))), save((d) => d.patch(`enemies/${id}`, patch))])
      },

      log: (text) => save((d) => d.post('rolls', { ev: text, ts: now() })),

      effects: null,
      setEffects: (effects) => set({ effects }),
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

      addEnemy: async (id, sheet) => {
        const { tables } = get()
        set({ tables: { ...tables, enemies: { ...tables.enemies, [id]: sheet } } })
        await save((d) => d.put(`enemies/${id}`, sheet))
      },
      removeEnemy: async (id) => {
        const links = Object.keys(get().tables.enemies).filter((k) => k !== id && get().tables.enemies[k]?.nx === id)
        await Promise.all(links.map((k) => get().updateEnemy(k, { nx: '' })))
        const { tables } = get()
        const enemies = { ...tables.enemies }
        delete enemies[id]
        set({ tables: { ...tables, enemies } })
        await Promise.all(['enemies', 'icons', 'portraits', 'bossart'].map((p) => save((d) => d.del(`${p}/${id}`))))
      },
      setSkills: async (id, sk) => {
        const { tables } = get()
        const e = tables.enemies[id]
        if (!e) return
        set({ tables: { ...tables, enemies: { ...tables.enemies, [id]: { ...e, sk } } } })
        await save((d) => d.put(`enemies/${id}/sk`, sk))
      },
      putSkill: async (id, key, skill) => {
        const e = get().tables.enemies[id]
        if (!e) return
        get().setSkillsLocal(id, { ...(e.sk || {}), [key]: skill })
        await save((d) => d.put(`enemies/${id}/sk/${key}`, skill))
      },
      setSkillField: async (id, key, field, value) => {
        const e = get().tables.enemies[id]
        const q = e?.sk?.[key]
        if (!e || !q) return
        get().setSkillsLocal(id, { ...e.sk, [key]: { ...q, [field]: value } })
        await save((d) => d.put(`enemies/${id}/sk/${key}/${field}`, value))
      },
      deleteSkill: async (id, key) => {
        const e = get().tables.enemies[id]
        if (e?.sk) {
          const sk = { ...e.sk }
          delete sk[key]
          get().setSkillsLocal(id, sk)
        }
        await save((d) => d.del(`enemies/${id}/sk/${key}`))
      },
      setSkillsLocal: (id, sk) => {
        const { tables } = get()
        set({ tables: { ...tables, enemies: { ...tables.enemies, [id]: { ...tables.enemies[id], sk } } } })
      },
      addNextPhase: async (id, newId, themeAvailable) => {
        const r = buildNextPhase(get().tables.enemies, id, themeAvailable)
        if (!r) return
        const last = get().tables.enemies[r.lastId]!
        await get().addEnemy(newId, r.sheet)
        await get().updateEnemy(r.lastId, { nx: newId, ...r.lastPatch })
        await get().log(`${last.name} now has a next phase sheet: ${r.sheet.name}${r.themeSet ? ' (theme set)' : ''}. Set the gate % on each sheet.`)
      },
      switchPhase: async (id, hp) => {
        const { tables } = get()
        const x = tables.enemies[id]
        const nid = x?.nx
        const n = nid ? tables.enemies[nid] : undefined
        if (!x || !nid || !n) return
        await get().updateEnemy(nid, nextPhasePatch(x, n, hp))
        await get().updateEnemy(id, { mx: null, my: null })
        const ini = get().tables.ini
        if (ini?.l?.some((u) => u.k === `e:${id}`)) {
          const next = { ...ini, l: ini.l.map((u) => (u.k === `e:${id}` ? { ...u, k: `e:${nid}` } : u)) }
          set({ tables: { ...get().tables, ini: next } })
          await save((d) => d.put('init', next))
        }
        await get().log(`${x.name} changes... ${n.name} rises!`)
        // The new phase gets its own intro a moment later.
        later(() => get().bossIntro(nid), 400)
      },
      shareCinematic: async (id) => {
        const e = get().tables.enemies[id]
        const v = videoUrl(e?.gvu)
        if (!e?.gt && !v) return null
        const c: CinematicEvent = { t: e!.gt ?? '', n: e!.name ?? '', k: `e:${id}`, ...(v ? { v } : {}) }
        await save((d) => d.post('rolls', { cin: c, ts: now(), by: get().session?.me ?? '' }))
        return c
      },
      vanish: async (id) => {
        await get().updateEnemy(id, { mx: null, my: null })
        const ini = get().tables.ini
        if (ini?.l?.some((u) => u.k === `e:${id}`)) {
          const l = ini.l.filter((u) => u.k !== `e:${id}`)
          const next = { ...ini, l, t: Math.max(0, Math.min(ini.t || 0, l.length - 1)) }
          set({ tables: { ...get().tables, ini: next } })
          await save((d) => d.put('init', next))
        }
      },
    }
  })
}

export type GameStore = ReturnType<typeof createGameStore>
