// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Sheet } from '../../logic/sheet'
import type { Qte } from '../../state/attackActions'
import { emptyTables, type Tables } from '../../state/store'
import { ActionMenu, InitiativeCall, QtePrompt } from './Combat'

afterEach(cleanup)

const hero = (o: Partial<Sheet> = {}): Sheet => ({ name: 'Lyra', cls: 'fighter', level: 1, hp: 30, maxHp: 30, st: 50, maxSt: 100, str: 14, mx: 2, my: 2, ...o })
const tables = (o: Partial<Tables> = {}): Tables => ({ ...emptyTables(), chars: { a: hero() }, enemies: { w: { name: 'Wolf', hp: 20, max: 20, mx: 3, my: 2 } }, ...o })
const labels = () => screen.getAllByRole('button').map((b) => b.textContent)

describe('the action menu', () => {
  it('shows nothing without a menu, or when a side is gone or off the map', () => {
    const actions = { act: vi.fn(), closeMenu: vi.fn() }
    const { container, rerender } = render(<ActionMenu tables={tables()} dm={false} menu={null} actions={actions} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<ActionMenu tables={tables()} dm={false} menu={{ a: 'c:a', t: 'e:gone' }} actions={actions} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<ActionMenu tables={tables({ chars: { a: hero({ mx: null }) } })} dm={false} menu={{ a: 'c:a', t: 'e:w' }} actions={actions} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<ActionMenu tables={tables({ enemies: { w: { name: 'Wolf', mx: null } } })} dm={false} menu={{ a: 'c:a', t: 'e:w' }} actions={actions} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("a hero's attacks: each button acts, Cancel closes, notes show", () => {
    const actions = { act: vi.fn(), closeMenu: vi.fn() }
    render(<ActionMenu tables={tables({ chars: { a: hero({ ctr: true }) } })} dm={false} menu={{ a: 'c:a', t: 'e:w' }} actions={actions} />)
    expect(screen.getByText('Lyra → Wolf')).toBeInTheDocument()
    // The default board's fighter attacks come between heavy and counter.
    expect(labels()).toEqual(['Light attack', 'Heavy attack · 10 St', 'Power Strike · 20 St', 'Multi-Slash · 30 St', 'Shield Bash · 20 St', 'Counter attack (free)', 'Push (10 St)', 'Cancel'])
    fireEvent.click(screen.getByText('Light attack'))
    expect(actions.act).toHaveBeenCalledWith('l', undefined)
    expect(screen.getByText('Counter attack (free)')).toHaveClass('pri')
    fireEvent.click(screen.getByText('Cancel'))
    expect(actions.closeMenu).toHaveBeenCalled()
    cleanup()
    render(<ActionMenu tables={tables({ chars: { a: hero({ mx: 0 }) } })} dm={false} menu={{ a: 'c:a', t: 'e:w' }} actions={actions} />)
    expect(screen.getByText(/need you next to the target/)).toBeInTheDocument()
  })

  it('ability buttons warn about stamina and pass their place in the list', () => {
    const actions = { act: vi.fn(), closeMenu: vi.fn() }
    const board = { b: { n: 'Cleave', v: 'any', l: 1, c: 2, k: 'atk', d: '2d8', r: 1 } }
    render(<ActionMenu tables={tables({ board, chars: { a: hero({ st: 15 }) } })} dm={false} menu={{ a: 'c:a', t: 'e:w' }} actions={actions} />)
    const b = screen.getByText('Cleave · 20 St')
    expect(b).toHaveClass('warn')
    fireEvent.click(b)
    expect(actions.act).toHaveBeenCalledWith('ab', expect.any(Number))
  })

  it("a monster's special attack asks for its name; no name closes the menu", () => {
    const actions = { act: vi.fn(), closeMenu: vi.fn() }
    const ask = vi.fn().mockReturnValueOnce('Tail Swipe').mockReturnValueOnce(null)
    render(<ActionMenu tables={tables()} dm menu={{ a: 'e:w', t: 'c:a' }} actions={actions} ask={ask} />)
    const sp = screen.getByText(/Special attack/)
    fireEvent.click(sp)
    expect(ask).toHaveBeenCalledWith('Name of the special attack?')
    expect(actions.act).toHaveBeenCalledWith('sp', 'Tail Swipe')
    fireEvent.click(sp)
    expect(actions.closeMenu).toHaveBeenCalledTimes(1)
  })

  it("a monster's skills show their icons when they have one", () => {
    const actions = { act: vi.fn(), closeMenu: vi.fn() }
    const t = tables({ enemies: { w: { name: 'Wolf', hp: 20, max: 20, mx: 3, my: 2, sk: { s1: { n: 'Bite', d: '1d6', r: 1, t: 's' }, s2: { n: 'Howl', d: '1d4', r: 1, t: 's' } } } } })
    render(<ActionMenu tables={t} dm menu={{ a: 'e:w', t: 'c:a' }} actions={actions} skillIcons={{ bite: 'data:bite' }} />)
    expect(screen.getByRole('button', { name: /Bite/ }).querySelector('img')).toHaveAttribute('src', 'data:bite')
    expect(screen.getByRole('button', { name: /Howl/ }).querySelector('img')).toBeNull()
    expect(screen.getByRole('button', { name: /Light attack/ }).querySelector('img')).toBeNull()
  })

  it("uses the browser's box by default", () => {
    const actions = { act: vi.fn(), closeMenu: vi.fn() }
    const p = vi.spyOn(window, 'prompt').mockReturnValue('Roar')
    render(<ActionMenu tables={tables()} dm menu={{ a: 'e:w', t: 'c:a' }} actions={actions} />)
    fireEvent.click(screen.getByText(/Special attack/))
    expect(actions.act).toHaveBeenCalledWith('sp', 'Roar')
    p.mockRestore()
  })
})

describe('the 3-second prompt', () => {
  const q = (o: Partial<Qte> = {}): Qte => ({ id: 1, tid: 'a', total: 15, melee: true, par: true, from: 'Wolf', ...o })

  it('nothing without a prompt or a sheet', () => {
    const { container, rerender } = render(<QtePrompt qte={null} me="a" tables={tables()} onAnswer={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<QtePrompt qte={q()} me="zz" tables={tables()} onAnswer={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('dodge, parry and take it, with prices', () => {
    const onAnswer = vi.fn()
    render(<QtePrompt qte={q()} me="a" tables={tables()} onAnswer={onAnswer} />)
    expect(screen.getByRole('alert')).toHaveTextContent('⚠ Wolf is attacking you!')
    expect(labels()).toEqual(['Dodge · 30 St', 'Parry · 20 St', 'Take it'])
    for (const [l, k] of [['Dodge · 30 St', 'dodge'], ['Parry · 20 St', 'parry'], ['Take it', 'none']]) {
      fireEvent.click(screen.getByText(l!))
      expect(onAnswer).toHaveBeenLastCalledWith(k)
    }
  })

  it('no parry for a mage or an area attack; disadvantage is shown; an exhausted hero can only take it', () => {
    const { rerender } = render(<QtePrompt qte={q()} me="a" tables={tables({ chars: { a: hero({ cls: 'mage' }) } })} onAnswer={vi.fn()} />)
    expect(labels()).toEqual(['Dodge · 30 St', 'Take it'])
    rerender(<QtePrompt qte={q({ par: false })} me="a" tables={tables()} onAnswer={vi.fn()} />)
    expect(labels()).toEqual(['Dodge · 30 St', 'Take it'])
    rerender(<QtePrompt qte={q()} me="a" tables={tables({ chars: { a: hero({ pw: 'd', exh: true }) } })} onAnswer={vi.fn()} />)
    expect(screen.getByText(/Parry \(disadvantage\)/)).toBeDisabled()
    expect(screen.getByText(/Dodge/)).toBeDisabled()
    expect(screen.getByText('Take it')).toBeEnabled()
  })

  it('a readied reaction just says it goes off', () => {
    render(<QtePrompt qte={q({ pre: 'parry' })} me="a" tables={tables()} onAnswer={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent('⚠ Wolf attacks!Your readied parry goes off. Rolling your save...')
    expect(screen.queryAllByRole('button')).toEqual([])
  })
})

describe('the initiative call', () => {
  const ini = { ph: 'roll', l: [{ k: 'e:w', v: 12 }, { k: 'c:a' }], i: 0, r: 1 }

  it("asks a player who hasn't rolled; rolling passes their place in the list", () => {
    const onRoll = vi.fn()
    render(<InitiativeCall tables={tables({ ini })} dm={false} me="a" onRoll={onRoll} />)
    expect(screen.getByRole('alert')).toHaveTextContent('⚔ Roll for initiative!')
    fireEvent.click(screen.getByText('Roll initiative'))
    expect(onRoll).toHaveBeenCalledWith(1)
  })

  it('not for the GM, after rolling, outside the roll, without a sheet or without initiative', () => {
    for (const [t, dm, me] of [
      [tables({ ini }), true, 'a'],
      [tables({ ini: { ...ini, l: [{ k: 'c:a', v: 3 }] } }), false, 'a'],
      [tables({ ini: { ...ini, ph: 'go' } }), false, 'a'],
      [tables({ ini }), false, 'zz'],
      [tables(), false, 'a'],
    ] as [Tables, boolean, string][]) {
      const { container } = render(<InitiativeCall tables={t} dm={dm} me={me} onRoll={vi.fn()} />)
      expect(container).toBeEmptyDOMElement()
      cleanup()
    }
  })
})
