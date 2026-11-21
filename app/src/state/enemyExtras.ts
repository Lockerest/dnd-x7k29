// The GM's enemy extras: a monster's turn played by the computer, the spawn
// point (where it returns after the Golden Wave), and the boss intro (played
// here, shared with every screen, and started by itself for the first boss in
// sight when combat begins or a boss changes phase).
import type { Db } from '../db/client'
import { autoTurn } from '../logic/autoTurn'
import { approvedIds } from '../logic/characters'
import { rankOf } from '../logic/enemies'
import { enemyHidden, grid, liveMapId, onMap, type Maps } from '../logic/table'
import { currentMapId } from './sheetActions'
import type { GameState } from './store'

/** A boss intro: the monster's key, name, title and theme. */
export type BossIntro = { k: string; n: string; t: string; th: string }

export type EnemyExtras = {
  /** GM: plays this monster's turn. */
  autoTurn: (id: string) => Promise<void>
  /** GM: where it stands now is where it returns after the Golden Wave. */
  setSpawn: (id: string) => Promise<void>
  /** Shows the boss intro here and on every screen. */
  bossIntro: (id: string) => Promise<void>
  /** The first unseen boss (mini-boss or unique) in sight gets its intro, once. */
  introBosses: () => Promise<void>
}

type Get = () => GameState
type Save = (f: (d: Db) => Promise<unknown>) => Promise<void>

export function enemyExtras(get: Get, save: Save, now: () => number, rand: () => number): EnemyExtras {
  const bossIntro: EnemyExtras['bossIntro'] = async (id) => {
    const e = get().tables.enemies[id]
    if (!e) return
    const b: BossIntro = { k: `e:${id}`, n: String(e.name ?? ''), t: String(e.bt || ''), th: String(e.th || '') }
    get().effects?.boss(b)
    await save((d) => d.post('rolls', { boss: b, ts: now(), by: get().session?.me ?? '' }))
  }

  return {
    autoTurn: async (id) => {
      const s = get()
      const { chars, enemies, maps } = s.tables
      const e = enemies[id]
      const g = grid(maps as Maps, currentMapId(s.tables, s))
      if (!s.dm || !e || !g || (e.hp as number) <= 0 || e.mx == null || e.hd) return
      const r = autoTurn(id, chars, enemies, g, rand)
      if (r.kind === 'stunned') return void (await get().log(`${e.name} is stunned and cannot act`))
      if (r.kind === 'nobody') return void (await get().log(`${e.name} finds no one to attack`))
      if (r.move) {
        await get().updateEnemy(id, { ...r.move, mp: g.id })
        await get().log(`${e.name} advances on ${r.targetName}`)
      }
      if (!r.attack) return
      get().openMenu(`e:${id}`, r.target)
      await get().act(r.attack.k, r.attack.i)
    },

    setSpawn: async (id) => {
      const e = get().tables.enemies[id]
      if (e && e.mx != null) await get().updateEnemy(id, { hx: e.mx, hy: e.my })
    },

    bossIntro,

    introBosses: async () => {
      const s = get()
      const { chars, enemies, maps, cur } = s.tables
      const live = liveMapId(maps as Maps, cur)
      const g = grid(maps as Maps, currentMapId(s.tables, s))
      const seers = approvedIds(chars).map((i) => chars[i]!)
      const id = Object.keys(enemies).find((i) => {
        const e = enemies[i]!
        return !e.bi && (e.hp as number) > 0 && e.mx != null && onMap(e, live) && ['m', 'u'].includes(rankOf(e)) && !(g && enemyHidden(g, seers, e))
      })
      if (!id) return
      await bossIntro(id)
      await get().updateEnemy(id, { bi: true })
    },
  }
}
