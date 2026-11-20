// Rolling dice: every roll is shown (when a screen is attached), shared in the
// "rolls" list for everyone, and handed back. The GM's rolls stay secret while
// "Secret" is ticked (the default), like the live page.
import type { Db } from '../db/client'
import { manualBonus, type RollEntry } from '../logic/dice'
import { mod } from '../logic/stats'
import type { DiceJob } from '../ui/dice/player'
import type { GameState } from './store'

export type DiceSettings = { skin: string; bonus: number; stat: string; count: number; secret: boolean }

/** The screen's dice: shows a roll and resolves once it is gone. */
export type DiceView = { play: (job: DiceJob) => Promise<void>; physics: () => boolean }

export type DiceActions = {
  dice: DiceSettings
  /** The GM's secret rolls (last 12), only on this device. */
  secretRolls: RollEntry[]
  diceView: DiceView | null
  setDice: (p: Partial<DiceSettings>) => void
  setDiceView: (v: DiceView | null) => void
  /** Rolls, shows and shares dice with a bonus; resolves with the results once shown. */
  roll: (dice: number[], bonus: number) => Promise<number[]>
  /** A Dice card button: "How many" dice of this size, with the bonus box (and a player's stat). */
  rollDie: (n: number) => Promise<void>
}

type Get = () => GameState
type Set = (p: Partial<GameState>) => void
type Save = (f: (d: Db) => Promise<unknown>) => Promise<void>

export const defaultDice = (): DiceSettings => ({ skin: 'classic', bonus: 0, stat: '', count: 1, secret: true })

export function diceActions(get: Get, set: Set, save: Save, now: () => number, rand: () => number): DiceActions {
  const roll: DiceActions['roll'] = async (ds, m) => {
    const res = ds.map((d) => ({ d, r: 1 + Math.floor(rand() * d) }))
    const { dm, session, tables, dice, diceView } = get()
    const me = session?.me ?? ''
    const sheet = tables.chars[me]
    const post = async () => {
      const e: RollEntry = { n: dm ? 'GM' : sheet ? String(sheet.name) : '?', ds: res.map((x) => ({ d: x.d, r: x.r })), m, ts: now(), sk: dice.skin, by: me }
      if (dm && dice.secret) return set({ secretRolls: [...get().secretRolls, e].slice(-12) })
      await save(async (d) => {
        const key = await d.post('rolls', e)
        // Show it in the log straight away.
        const t = get().tables
        set({ tables: { ...t, rolls: { ...t.rolls, [key]: e as Record<string, unknown> } } })
      })
    }
    // My d4s are read from where the 3D dice land, so those rolls are shared once they land.
    const waitD4 = ds.includes(4) && !!diceView?.physics()
    let landed: Promise<void> = Promise.resolve()
    if (!waitD4) await post()
    if (diceView) await diceView.play({ ds, res, m, sk: dice.skin, who: null, remote: false, onLand: waitD4 ? () => void (landed = post()) : undefined })
    await landed
    return res.map((x) => x.r)
  }

  return {
    dice: defaultDice(),
    secretRolls: [],
    diceView: null,
    setDice: (p) => set({ dice: { ...get().dice, ...p } }),
    setDiceView: (diceView) => set({ diceView }),
    roll,
    rollDie: async (n) => {
      const { dice, dm, session, tables } = get()
      const m = manualBonus(dice.bonus, dice.stat, tables.chars[session?.me ?? ''], dm, mod)
      await roll(Array(Math.max(1, Math.min(10, dice.count))).fill(n), m)
    },
  }
}
