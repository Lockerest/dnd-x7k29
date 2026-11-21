// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Initiative } from '../../logic/initiative'
import { emptyTables, type Tables } from '../../state/store'
import { InitiativePanel } from './Initiative'

afterEach(cleanup)

const actions = () => ({ startInitiative: vi.fn(), rollInitiative: vi.fn(), rollMonsters: vi.fn(), beginCombat: vi.fn(), passTurn: vi.fn(), endCombat: vi.fn(), autoTurn: vi.fn() })
const base = (o: Partial<Tables>): Tables => ({
  ...emptyTables(),
  maps: { m: { w: 500, h: 400, cols: 10, fog: 1 } },
  cur: 'm',
  chars: { a: { name: 'Lyra', hp: 5, mx: 0, my: 0 }, b: { name: 'Bram', hp: 5 } },
  enemies: { w: { name: 'Wolf', hp: 5, mx: 1, my: 1 }, f: { name: 'Lurker', hp: 5, mx: 9, my: 7 }, u: { name: 'Unplaced', hp: 5 } },
  ...o,
})
const show = (t: Tables, dm: boolean, me = 'a') => {
  const a = actions()
  render(<InitiativePanel tables={t} dm={dm} me={me} gmMap={null} actions={a} />)
  return a
}
const rows = () => screen.getAllByRole('listitem').map((li) => li.textContent)
const rolling: Initiative = { ph: 'roll', t: 0, r: 1, l: [{ k: 'c:a', v: null }, { k: 'c:b', v: 12 }, { k: 'e:w', v: null }, { k: 'e:f', v: 7 }, { k: 'e:u', v: null }, { k: 'e:gone', v: null }] }

describe('<InitiativePanel />', () => {
  it('before initiative: the GM can start it; players see nothing', () => {
    const a = show(base({}), true)
    fireEvent.click(screen.getByRole('button', { name: 'Start initiative' }))
    expect(a.startInitiative).toHaveBeenCalled()
    cleanup()
    const { container } = render(<InitiativePanel tables={base({})} dm={false} me="a" gmMap={null} actions={actions()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('rolling, for a player: their Roll button, hero values, a tick for monsters, unseen monsters unnamed', () => {
    const a = show(base({ ini: rolling }), false)
    expect(screen.getByRole('heading', { name: 'Roll initiative' })).toBeInTheDocument()
    expect(rows()).toEqual(['Lyra waiting Roll', 'Bram (12)', 'Wolf waiting ', 'Unseen enemy ✓', 'Unseen enemy waiting '])
    fireEvent.click(screen.getByRole('button', { name: 'Roll' }))
    expect(a.rollInitiative).toHaveBeenCalledWith(0)
    expect(screen.queryByRole('button', { name: 'Begin combat' })).toBeNull()
  })

  it('rolling, for the GM: Roll buttons for monsters, values, and Begin once all have rolled', () => {
    const a = show(base({ ini: rolling }), true, 'gm')
    expect(rows()).toEqual(['Lyra waiting ', 'Bram (12)', 'Wolf waiting Roll', 'Lurker (7)', 'Unplaced waiting Roll'])
    fireEvent.click(within(screen.getAllByRole('listitem')[2]!).getByRole('button', { name: 'Roll' }))
    expect(a.rollInitiative).toHaveBeenCalledWith(2)
    expect(screen.getByRole('button', { name: 'Begin combat' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Roll enemies' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(a.rollMonsters).toHaveBeenCalled()
    expect(a.endCombat).toHaveBeenCalled()
    cleanup()
    const b = show(base({ ini: { ...rolling, l: rolling.l.map((u) => ({ ...u, v: 3 })) } }), true, 'gm')
    fireEvent.click(screen.getByRole('button', { name: 'Begin combat' }))
    expect(b.beginCombat).toHaveBeenCalled()
  })

  it('in combat: the round, whose turn it is, and the GM buttons', () => {
    const go: Initiative = { ph: 'go', t: 1, r: 3, l: [{ k: 'c:a', v: 15 }, { k: 'e:w', v: 12 }, { k: 'e:f', v: 4 }] }
    show(base({ ini: go }), false)
    expect(screen.getByRole('heading', { name: 'Turn order · Round 3' })).toBeInTheDocument()
    expect(rows()).toEqual(['Lyra (15)', '▶ Wolf ', 'Unseen enemy '])
    expect(screen.getAllByRole('listitem')[1]).toHaveClass('now')
    expect(screen.queryByRole('button')).toBeNull()
    cleanup()
    const a = show(base({ ini: go }), true, 'gm')
    expect(rows()).toEqual(['Lyra (15)', '▶ Wolf (12)', 'Lurker (4)'])
    for (const n of ['Next turn', 'New initiative', 'End combat']) fireEvent.click(screen.getByRole('button', { name: n }))
    expect(a.passTurn).toHaveBeenCalled()
    expect(a.startInitiative).toHaveBeenCalled()
    expect(a.endCombat).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: "Run Wolf's turn" }))
    expect(a.autoTurn).toHaveBeenCalledWith('w')
  })

  it("no Run button on a hero's turn, a fallen monster's or a missing one", () => {
    for (const t of [0, 1, 2]) {
      const go: Initiative = { ph: 'go', t, r: 1, l: [{ k: 'c:a', v: 15 }, { k: 'e:w', v: 12 }, { k: 'e:gone', v: 4 }] }
      show(base({ ini: go, enemies: { w: { name: 'Wolf', hp: 0, mx: 1, my: 1 } } }), true, 'gm')
      expect(screen.queryByRole('button', { name: /^Run / })).toBeNull()
      cleanup()
    }
  })
})
