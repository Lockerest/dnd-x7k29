// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultDice } from '../../state/diceActions'
import { emptyTables, type Tables } from '../../state/store'
import { DicePanel } from './Dice'

afterEach(cleanup)

const tables = (o: Partial<Tables> = {}): Tables => ({ ...emptyTables(), chars: { a: { name: 'Lyra', str: 8, dex: 16 } }, ...o })
const show = (o: { t?: Tables; dm?: boolean; me?: string; dice?: Partial<ReturnType<typeof defaultDice>>; secret?: object[] } = {}) => {
  const actions = { setDice: vi.fn(), rollDie: vi.fn() }
  render(<DicePanel tables={o.t ?? tables()} dm={!!o.dm} me={o.me ?? 'a'} dice={{ ...defaultDice(), ...o.dice }} secretRolls={o.secret ?? []} actions={actions} />)
  return actions
}

describe('the Dice card', () => {
  it('a player: dice buttons, how many, bonus, their stats, dice style', () => {
    const actions = show({ dice: { count: 2, bonus: 1, stat: 'dex', skin: 'lava' } })
    for (const n of [4, 6, 8, 10, 12, 20, 100]) fireEvent.click(screen.getByRole('button', { name: `d${n}` }))
    expect(actions.rollDie.mock.calls.map((c) => c[0])).toEqual([4, 6, 8, 10, 12, 20, 100])
    fireEvent.change(screen.getByLabelText('How many'), { target: { value: '30' } })
    fireEvent.change(screen.getByLabelText('How many'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Bonus'), { target: { value: '-2' } })
    fireEvent.change(screen.getByLabelText('Bonus'), { target: { value: '' } })
    const stat = screen.getByLabelText('Stat')
    expect(stat).toHaveValue('dex')
    expect([...stat.querySelectorAll('option')].map((o) => o.textContent)).toEqual(['No stat', 'STR -1', 'DEX +3', 'CON +0', 'INT +0', 'WIS +0', 'CHA +0'])
    fireEvent.change(stat, { target: { value: 'str' } })
    expect(screen.getByLabelText('Dice style')).toHaveValue('lava')
    fireEvent.change(screen.getByLabelText('Dice style'), { target: { value: 'gold' } })
    expect(actions.setDice.mock.calls.map((c) => c[0])).toEqual([{ count: 10 }, { count: 1 }, { bonus: -2 }, { bonus: 0 }, { stat: 'str' }, { skin: 'gold' }])
    expect(screen.queryByLabelText('Secret')).not.toBeInTheDocument()
    expect(within(screen.getByLabelText('Dice log')).getByText('No rolls yet.')).toBeInTheDocument()
  })

  it('the dice buttons wait while my roll is on screen', () => {
    const actions = { setDice: vi.fn(), rollDie: vi.fn() }
    render(<DicePanel tables={tables()} dm={false} me="a" dice={defaultDice()} busy secretRolls={[]} actions={actions} />)
    expect(screen.getByRole('button', { name: 'd20' })).toBeDisabled()
  })

  it('no stat box without a sheet', () => {
    show({ me: 'zz' })
    expect(screen.queryByLabelText('Stat')).not.toBeInTheDocument()
  })

  it('the GM: Secret, their secret rolls in the log, and reached gates', () => {
    const t = tables({ enemies: { w: { name: 'Wolf', gr: 50 }, o: { name: 'Ogre' }, x: { name: 'Aethelric', gr: 30 } } })
    const actions = show({ t, dm: true, secret: [{ n: 'GM', ds: [{ d: 20, r: 18 }], m: 0, ts: 5, sk: 'classic' }] })
    expect(screen.queryByLabelText('Stat')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Secret')).toBeChecked()
    fireEvent.click(screen.getByLabelText('Secret'))
    expect(actions.setDice).toHaveBeenCalledWith({ secret: false })
    expect(screen.getByText(/Gate reached:/).parentElement).toHaveTextContent('Gate reached: Wolf, Aethelric. Run the scripted event (open the enemy to clear this).')
    expect(screen.getByLabelText('Dice log')).toHaveTextContent('🔒 GM rolled d20: 18')
  })

  it('no gate banner when none is reached', () => {
    show({ dm: true, t: tables({ enemies: { o: { name: 'Ogre' } } }) })
    expect(screen.queryByText(/Gate reached/)).not.toBeInTheDocument()
  })

  it('the log: lines in italics, rolls with their style, bonus and total, newest first', () => {
    const rolls = {
      a: { ev: 'Lyra hits Wolf for 40', ts: 1 },
      b: { n: 'Lyra', ds: [{ d: 6, r: 2 }, { d: 6, r: 5 }], m: 3, ts: 2, sk: 'gold' },
      c: { n: 'Bo', ds: [{ d: 20, r: 9 }], ts: 3 },
    }
    show({ t: tables({ rolls }) })
    const items = within(screen.getByLabelText('Dice log')).getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual(['Bo rolled d20: 9', 'Lyra rolled 2d6: 2, 5 +3 = 10', 'Lyra hits Wolf for 40'])
    expect(items[1]!.querySelector('.sw')).toHaveStyle({ background: '#d4a017' })
    expect(items[2]!.querySelector('i')).toHaveTextContent('Lyra hits Wolf for 40')
    // Old one-die rolls have no swatch.
    cleanup()
    show({ t: tables({ rolls: { a: { n: 'Old', d: 20, r: 4, ts: 1 } } }) })
    expect(within(screen.getByLabelText('Dice log')).getByRole('listitem').querySelector('.sw')).toBeNull()
  })
})
