import { describe, expect, it, vi } from 'vitest'
import { fakeDb } from '../testing/fakeDb'
import type { DiceJob } from '../ui/dice/player'
import { createGameStore, emptyTables } from './store'

function setup(role: 'gm' | 'player' = 'player', rand = 0.5) {
  const f = fakeDb()
  const s = createGameStore(() => f.db, () => 1000, () => rand)
  s.getState().connect({ pin: 'p', role, me: role === 'gm' ? 'gm' : 'a' })
  s.getState().applySnapshot({ ...emptyTables(), chars: { a: { name: 'Lyra', dex: 16 } } })
  return { s, f }
}

describe('rolling', () => {
  it("a player's roll is shared with their name and dice style, and shows in the log at once", async () => {
    const { s, f } = setup()
    s.getState().setDice({ skin: 'lava' })
    expect(await s.getState().roll([20, 6], 3)).toEqual([11, 4])
    const e = { n: 'Lyra', ds: [{ d: 20, r: 11 }, { d: 6, r: 4 }], m: 3, ts: 1000, sk: 'lava', by: 'a' }
    expect(f.writes).toEqual([['POST', 'rolls', e]])
    expect(s.getState().tables.rolls['-k']).toEqual(e)
  })

  it('without a sheet the name is "?"; the GM\'s rolls stay secret on this device unless Secret is off', async () => {
    const { s, f } = setup()
    s.getState().setMe('nobody')
    await s.getState().roll([4], 0)
    expect(f.writes[0]![2]).toMatchObject({ n: '?' })
    const gm = setup('gm')
    for (let i = 0; i < 13; i++) await gm.s.getState().roll([8], 0)
    expect(gm.f.writes).toEqual([])
    expect(gm.s.getState().secretRolls).toHaveLength(12)
    expect(gm.s.getState().secretRolls[0]).toEqual({ n: 'GM', ds: [{ d: 8, r: 5 }], m: 0, ts: 1000, sk: 'classic', by: 'gm' })
    gm.s.getState().setDice({ secret: false })
    await gm.s.getState().roll([8], 0)
    expect(gm.f.writes[0]![2]).toMatchObject({ n: 'GM' })
  })

  it('waits for the dice on screen, then hands back the results', async () => {
    const { s, f } = setup()
    const jobs: DiceJob[] = []
    let finish = () => {}
    s.getState().setDiceView({ play: (j) => (jobs.push(j), new Promise<void>((r) => (finish = r))), physics: () => false })
    let out: number[] | null = null
    const p = s.getState().roll([6], 2).then((r) => (out = r))
    await vi.waitFor(() => expect(jobs).toHaveLength(1))
    expect(jobs[0]).toEqual({ ds: [6], res: [{ d: 6, r: 4 }], m: 2, sk: 'classic', who: null, remote: false, onLand: undefined })
    expect(f.writes).toHaveLength(1) // shared before the dice land
    expect(out).toBeNull()
    finish()
    await p
    expect(out).toEqual([4])
  })

  it('with real 3D dice, my d4s are shared once they land, with where they landed', async () => {
    const { s, f } = setup()
    s.getState().setDiceView({
      play: async (j) => {
        expect(f.writes).toEqual([])
        j.res[0]!.r = 1
        j.onLand!()
      },
      physics: () => true,
    })
    expect(await s.getState().roll([4, 6], 0)).toEqual([1, 4])
    expect(f.writes[0]![2]).toMatchObject({ ds: [{ d: 4, r: 1 }, { d: 6, r: 4 }] })
    // Without a d4 nothing waits.
    s.getState().setDiceView({ play: async (j) => expect(j.onLand).toBeUndefined(), physics: () => true })
    await s.getState().roll([6], 0)
  })
})

describe('the Dice card buttons', () => {
  it('one roll at a time: buttons pressed while my dice are on screen do nothing', async () => {
    const { s, f } = setup()
    let finish: (() => void) | null = null
    s.getState().setDiceView({ play: () => new Promise<void>((r) => (finish = r)), physics: () => false })
    const first = s.getState().rollDie(6)
    expect(s.getState().diceBusy).toBe(true)
    await vi.waitFor(() => expect(finish).not.toBeNull())
    await s.getState().rollDie(6)
    expect(f.writes).toHaveLength(1)
    finish!()
    await first
    expect(s.getState().diceBusy).toBe(false)
    // A roll that fails still frees the buttons.
    s.getState().setDiceView({ play: () => Promise.reject(new Error('x')), physics: () => false })
    await expect(s.getState().rollDie(6)).rejects.toThrow('x')
    expect(s.getState().diceBusy).toBe(false)
  })

  it('rolls "How many" dice with the bonus and the chosen stat', async () => {
    const { s, f } = setup()
    s.getState().setDice({ count: 3, bonus: 1, stat: 'dex' })
    await s.getState().rollDie(8)
    expect(f.writes[0]![2]).toMatchObject({ ds: [{ d: 8, r: 5 }, { d: 8, r: 5 }, { d: 8, r: 5 }], m: 4 })
    s.getState().setDice({ count: 40 })
    await s.getState().rollDie(6)
    expect((f.writes[1]![2] as { ds: unknown[] }).ds).toHaveLength(10)
    s.getState().setDice({ count: 0 })
    s.getState().disconnect()
    await s.getState().rollDie(6) // no session: still rolls one die (nothing to save to)
  })
})
