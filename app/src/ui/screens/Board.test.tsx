// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useStore } from 'zustand'
import { CLASS_ICONS, ICON_BASE } from '../../data/icons'
import { vocationBoard } from '../../logic/abilityBoard'
import { defaultBoard, type Board } from '../../logic/board'
import { createGameStore, emptyTables, type GameStore, type Tables } from '../../state/store'
import { fakeDb } from '../../testing/fakeDb'
import { pickPicture } from '../../testing/fakeKit'
import { FakeKit } from '../../testing/KitWrapper'
import { AbilityIcon, BoardScreen } from './Board'

afterEach(cleanup)

function Harness({ store, start, images, confirm }: { store: GameStore; start: 'board' | 'ref'; images: Record<string, string>; confirm: (q: string) => boolean }) {
  const tables = useStore(store, (s) => s.tables)
  const dm = useStore(store, (s) => s.dm)
  const me = useStore(store, (s) => s.session?.me ?? '')
  const [view, setView] = useState(start)
  return <BoardScreen view={view} onView={setView} tables={tables} dm={dm} me={me} actions={store.getState()} images={images} confirm={confirm} rand={() => 0.5} />
}

const MAP = { w: 500, h: 500, cols: 10, al: { a: '0,0' } }

function setup(t: Partial<Tables>, o: { role?: 'gm' | 'player'; me?: string; start?: 'board' | 'ref'; images?: Record<string, string>; confirm?: boolean } = {}) {
  const f = fakeDb()
  const store = createGameStore(() => f.db)
  store.getState().connect({ pin: 'p', role: o.role ?? 'player', me: o.me ?? 'a' })
  store.getState().applySnapshot({ ...emptyTables(), maps: { m: MAP }, cur: 'm', ...t })
  const confirm = vi.fn(() => o.confirm ?? true)
  render(<Harness store={store} start={o.start ?? 'board'} images={o.images ?? {}} confirm={confirm} />, { wrapper: FakeKit })
  return { f, store, confirm }
}

const click = (name: string | RegExp, scope: HTMLElement = document.body) => fireEvent.click(within(scope).getByRole('button', { name }))
const board: Board = {
  b1: { n: 'Cleave', v: 'fighter', l: 1, c: 2, k: 'atk', d: '2d6', r: 1, t: 'A wide swing.', ic: '🪓' },
  b2: { n: 'Rally', v: 'fighter', l: 1, c: 1, k: 'heal', d: '1d8' },
  g1: { n: 'Cleave (Golden)', v: 'fighter', l: 1, c: 3, gb: 'b1', hc: 10, k: 'atk', d: '4d6' },
  b4: { n: 'Doom', v: 'fighter', l: 5, c: 6, k: 'atk', d: '8d6' },
}
const hero = (o: object = {}) => ({ name: 'Bo', cls: 'fighter', level: 1, st: 50, maxSt: 100, hp: 10, maxHp: 10, mx: 1, my: 1, ...o })

describe('icons', () => {
  it('uploaded picture, then the drawn icon, then the emoji; nothing for unknown names', () => {
    const { container, rerender } = render(<AbilityIcon board={board} name="Cleave" images={{ b1: 'data:x' }} drawn />)
    expect(container.querySelector('img')).toHaveAttribute('src', 'data:x')
    rerender(<AbilityIcon board={board} name="Cleave (Golden)" images={{}} drawn />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-label', 'Cleave (Golden)')
    expect(container.querySelectorAll('rect')).toHaveLength(2) // the gold frame
    rerender(<AbilityIcon board={board} name="Cleave" images={{}} drawn />)
    expect(container.querySelectorAll('rect')).toHaveLength(1)
    rerender(<AbilityIcon board={board} name="Cleave" images={{}} drawn={false} />)
    expect(container).toHaveTextContent('🪓')
    rerender(<AbilityIcon board={board} name="Rally" images={{}} drawn={false} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<AbilityIcon board={board} name="Nope" images={{}} drawn />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('a player equipping abilities', () => {
  it('shows slots, the rest-spot note, and each ability with its price and notes', () => {
    setup({ board, chars: { a: hero({ eq: { _: true, b1: true }, dth: 1 }) }, sp: '-' })
    expect(screen.getByRole('button', { name: 'Equip abilities' })).toHaveClass('pri')
    expect(screen.getByText(/^Equipped 1 \/ 3\./)).toHaveTextContent('You are at an altar, bonfire or guild: you can change your abilities.')
    const rows = [...document.querySelectorAll('.ab')]
    expect(rows.map((r) => r.querySelector('b')!.textContent)).toEqual(['Cleave', 'Rally', 'Cleave (Golden)'])
    expect(rows[0]).toHaveTextContent('Lv 1 · 23 St')
    expect(rows[0]).toHaveTextContent('A wide swing. · Damage 2d6, range 1')
    expect(rows[2]).toHaveTextContent('Lv 1 · 35 St + 10% HP')
    expect(within(rows[0] as HTMLElement).getByRole('button', { name: 'Unequip' })).toBeEnabled()
  })

  it('equips, unequips, attunes, and shows attuned ones', () => {
    const { f, store } = setup({ board, chars: { a: hero({ eq: { _: true, b1: true }, atn: 1 }) }, sp: '-' })
    expect(screen.getByText(/Attuned 0 \/ 1 \(attuned Golden abilities use no slot\)\./)).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Equip' })[1]!) // Cleave (Golden)
    expect(f.writes.at(-1)![2]).toMatchObject({ eq: { _: true, b1: true, g1: true } })
    click('Attune')
    expect(store.getState().tables.chars.a).toMatchObject({ at: { g1: 1 } })
    expect(screen.getByText('Attuned', { selector: 'span' })).toBeInTheDocument()
    click('Unequip', document.querySelector('.ab') as HTMLElement)
    expect(f.writes.at(-1)![2]).toMatchObject({ eq: { _: true } })
  })

  it('away from a rest spot the buttons are off; locked abilities show when the GM allows', () => {
    setup({ board, chars: { a: hero({ mx: 6, my: 6 }) }, showAll: true })
    expect(screen.getByText(/You can only change abilities next to an altar/)).toBeInTheDocument()
    for (const b of screen.getAllByRole('button', { name: /Equip|Unequip/ }).filter((b) => b.textContent !== 'Equip abilities')) expect(b).toBeDisabled()
    expect(screen.getByText(/unlocks at level 5/)).toBeInTheDocument()
    expect(screen.queryByText('Cleave (Golden)')).toBeNull() // "golden" is a spoiler by default
  })

  it('nothing available, and no sheet at all', () => {
    setup({ board: { m: { n: 'Mage', v: 'mage' } }, chars: { a: hero() } })
    expect(screen.getByText('No abilities available yet.')).toBeInTheDocument()
    cleanup()
    const { container } = render(<BoardScreen view="board" onView={() => {}} tables={emptyTables()} dm={false} me="x" actions={createGameStore().getState()} images={{}} confirm={() => true} />)
    expect(container.querySelectorAll('.card')).toHaveLength(0)
  })
})

describe("the GM's board editor", () => {
  const gm = (t: Partial<Tables> = {}, o: { confirm?: boolean } = {}) => setup({ board, ...t }, { role: 'gm', me: 'gm', ...o })

  it('lists every ability with its fields, filters by vocation', () => {
    gm()
    expect(screen.getByRole('button', { name: 'Ability board' })).toHaveClass('pri')
    expect(screen.getAllByLabelText(/^Ability: /)).toHaveLength(4)
    click('Fighter (4)')
    expect(screen.getByRole('button', { name: 'Fighter (4)' })).toHaveClass('pri')
    click('Mage (0)')
    expect(screen.queryAllByLabelText(/^Ability: /)).toHaveLength(0)
    click('All (4)')
    const c = screen.getByLabelText('Ability: Cleave')
    expect(within(c).getByLabelText('Name')).toHaveValue('Cleave')
    expect(within(c).getByLabelText('Vocation')).toHaveValue('fighter')
    expect(within(c).getByLabelText('Kind')).toHaveValue('atk')
    expect(within(c).getByLabelText('Bonus')).toHaveValue('')
    expect(within(c).getByLabelText('Needs equipped')).toHaveValue('')
    expect(within(c).getByLabelText('Auto-hit')).not.toBeChecked()
    expect(within(screen.getByLabelText('Ability: Cleave (Golden)')).getByLabelText('Needs equipped')).toHaveValue('b1')
    const empty = screen.getByLabelText('Ability: Rally')
    expect(within(empty).getByLabelText('Dice')).toHaveValue('1d8')
    expect(within(empty).getByLabelText('Range')).toHaveValue('0')
    expect(within(empty).getByLabelText('Description')).toHaveValue('')
  })

  it('saves typed fields, picks and check boxes', async () => {
    const { f } = gm()
    const c = screen.getByLabelText('Ability: Cleave')
    const cost = within(c).getByLabelText('Cost')
    fireEvent.change(cost, { target: { value: '4' } })
    fireEvent.blur(cost)
    await vi.waitFor(() => expect(f.writes).toHaveLength(1))
    fireEvent.change(within(c).getByLabelText('Kind'), { target: { value: 'util' } })
    await vi.waitFor(() => expect(f.writes).toHaveLength(2))
    fireEvent.click(within(c).getByLabelText('Charge a round'))
    await vi.waitFor(() => expect(f.writes).toHaveLength(3))
    expect(f.writes).toEqual([
      ['PUT', 'board/b1/c', 4],
      ['PUT', 'board/b1/k', 'util'],
      ['PUT', 'board/b1/ch', 1],
    ])
  })

  it('add, remove (asks first), load boards (ask first), and the two settings', async () => {
    const { f, confirm } = gm({}, { confirm: false })
    click('Remove', screen.getByLabelText('Ability: Rally'))
    click('Load default abilities')
    click('Load class abilities')
    expect(confirm).toHaveBeenCalledTimes(3)
    expect(f.writes).toEqual([])
    click('Add ability')
    await vi.waitFor(() => expect(f.writes.at(-1)![1]).toMatch(/^board\/x[a-z0-9]+$/))
    click('Icons: drawn')
    expect(screen.getByRole('button', { name: 'Icons: emoji' })).toBeInTheDocument()
    click('Players see: unlocked only')
    expect(screen.getByRole('button', { name: 'Players see: all abilities' })).toBeInTheDocument()
    await vi.waitFor(() => expect(f.writes.slice(-2).map((w) => w[2])).toEqual([{ aic: 0 }, { abv: 1 }]))
  })

  it('confirmed removals and loads', async () => {
    const { f, store } = gm()
    click('Remove', screen.getByLabelText('Ability: Rally'))
    await vi.waitFor(() => expect(f.writes.at(-1)).toEqual(['DELETE', 'board/b2', null]))
    click('Load default abilities')
    expect(store.getState().tables.board).toEqual(defaultBoard())
    click('Load class abilities')
    expect(store.getState().tables.board).toEqual(vocationBoard())
    click('Add new class abilities')
    expect(store.getState().tables.board).toEqual(vocationBoard())
  })

  it('adds the new class abilities to a saved board, keeping what it has', async () => {
    const old = Object.fromEntries(Object.entries(vocationBoard()).filter(([, e]) => !['hexblade', 'duelist'].includes(e.v as string)))
    const { store } = gm({ board: { ...old, x1: { n: 'Mine', v: 'any', k: 'util' } } })
    click('Add new class abilities')
    const b = store.getState().tables.board as Board
    expect(b.x1).toEqual({ n: 'Mine', v: 'any', k: 'util' })
    expect(b.hexblade_sinew_lash_g!.n).toBe('Sinew Lash (Crimson)')
    expect(b.duelist_twin_fang_g!.n).toBe('Twin Fang (Golden)')
    expect(Object.keys(b)).toHaveLength(Object.keys(vocationBoard()).length + 1)
  })
})

describe('the reference', () => {
  it("opens on the player's class, lists every ability, and switches class", () => {
    setup({ board, chars: { a: hero({ cls: 'fighter' }) }, sp: '-' }, { start: 'ref' })
    expect(screen.getByRole('heading', { name: 'Fighter' })).toBeInTheDocument()
    expect(screen.queryByText(/not unlocked yet/)).toBeNull()
    const rows = [...document.querySelectorAll('tbody tr')].map((r) => [...r.children].map((td) => td.textContent))
    expect(rows).toEqual([
      ['1', 'Rally', '1', ''],
      ['1', 'Cleave', '2', '2d6 damage. A wide swing.'],
      ['1', 'Cleave (Golden)', '3', '4d6 damage. Costs 10% max HP.'],
      ['5', 'Doom', '6', '8d6 damage. '],
    ])
    expect(document.querySelector('tr.gold')).toHaveTextContent('Cleave (Golden)')
    click('Mage')
    expect(screen.getByRole('heading', { name: 'Mage' })).toBeInTheDocument()
    expect(screen.getByText('Nothing to show yet.')).toBeInTheDocument()
    click('Equip abilities')
    expect(screen.getByRole('heading', { name: 'Ability board' })).toBeInTheDocument()
    click('Reference')
    expect(screen.getByRole('heading', { name: 'Fighter' })).toBeInTheDocument()
  })

  it('players see every ability but no Golden versions, and hidden words as black bars', () => {
    const b = { ...board, b5: { n: 'Altar Call', v: 'fighter', l: 2, c: 1, k: 'util', t: 'Revive an ally at an altar.' } } as Board
    setup({ board: b, chars: { a: hero({ cls: 'fighter' }) } }, { start: 'ref' })
    expect(screen.getByText('Doom')).toBeInTheDocument()
    expect(document.querySelector('tr.gold')).toBeNull()
    expect(screen.queryByText(/Golden/)).toBeNull()
    const bars = [...document.querySelectorAll('.spl')].map((e) => e.textContent)
    expect(bars).toEqual(expect.arrayContaining(['Altar Call', 'Revive an ally at an altar']))
    cleanup()
    setup({ board: b }, { role: 'gm', me: 'gm', start: 'ref' })
    expect(document.querySelector('.spl')).toBeNull()
    expect(document.querySelector('tr.gold')).not.toBeNull()
  })

  it('the GM sees every level; without a sheet it starts on Fighter', () => {
    setup({ board }, { role: 'gm', me: 'gm', start: 'ref' })
    expect(screen.getByRole('heading', { name: 'Fighter' })).toBeInTheDocument()
    expect(screen.queryByText(/not unlocked yet/)).toBeNull()
    expect(screen.getByText('Doom')).toBeInTheDocument()
    cleanup()
    setup({ board, chars: { a: hero({ cls: 'bard', level: undefined }) } }, { start: 'ref' })
    expect(screen.getByRole('heading', { name: 'Fighter' })).toBeInTheDocument()
  })
})

describe('abilities with missing fields', () => {
  const bare: Board = { a: { n: 'Bare' }, b: { n: 'Gold (Golden)', gb: 'a', c: 2, v: 'any' } }
  it('show as "any" vocation, level 1, cost 0, utility', () => {
    setup({ board: bare }, { role: 'gm', me: 'gm' })
    const c = screen.getByLabelText('Ability: Bare')
    expect(within(c).getByLabelText('Vocation')).toHaveValue('any')
    expect(within(c).getByLabelText('Min level')).toHaveValue('1')
    expect(within(c).getByLabelText('Kind')).toHaveValue('util')
    fireEvent.click(screen.getByRole('button', { name: 'Any vocation (2)' }))
    expect(screen.getAllByLabelText(/^Ability: /)).toHaveLength(2)
    cleanup()
    const anyBare: Board = { ...bare, a: { n: 'Bare', v: 'any' } }
    setup({ board: anyBare, chars: { a: hero() }, sp: '-' })
    expect(document.querySelector('.ab')).toHaveTextContent('Lv 1 · 0 St')
    cleanup()
    setup({ board: anyBare, chars: { a: hero() }, sp: '-' }, { start: 'ref' })
    expect(document.querySelector('tr.gold')).toHaveTextContent('Gold (Golden)2Costs 10% max HP.')
  })
})

describe("the GM's ability pictures", () => {
  it('a custom icon image for an ability, and clearing it', async () => {
    const first = Object.keys(board)[0]!
    const { f } = setup({ board }, { role: 'gm', me: 'gm', images: { [first]: 'data:mine' } })
    await pickPicture('Custom icon image')
    await vi.waitFor(() => expect(f.writes).toHaveLength(2))
    expect(f.writes[0]).toEqual(['PUT', `abicons/${first}`, { data: 'data:image/png;96x96' }])
    fireEvent.click(screen.getAllByRole('button', { name: 'Clear image' })[0]!)
    await vi.waitFor(() => expect(f.writes).toHaveLength(4))
    expect(f.writes[2]).toEqual(['DELETE', `abicons/${first}`, null])
  })
})

describe('the class Reference folds to its title', () => {
  it('shut shows only the title; the arrow asks to open it', () => {
    const onRefShut = vi.fn()
    const p = { onView: () => {}, tables: emptyTables(), dm: false, me: 'x', actions: createGameStore().getState(), images: {}, confirm: () => true }
    const { rerender } = render(<BoardScreen view="ref" {...p} refShut onRefShut={onRefShut} />)
    const ref = screen.getByLabelText('Class abilities')
    expect(within(ref).getByRole('heading', { name: 'Fighter' })).toBeInTheDocument()
    expect(within(ref).queryByRole('table')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Show or hide the class abilities' }))
    expect(onRefShut).toHaveBeenCalledWith(false)
    rerender(<BoardScreen view="ref" {...p} />)
    expect(within(screen.getByLabelText('Class abilities')).getByRole('table')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show or hide the class abilities' })) // no handler: nothing happens
    expect(onRefShut).toHaveBeenCalledTimes(1)
  })
})

describe('class rules on the Reference', () => {
  it('lists the class rules; GM-only ones only for the GM; hidden words still hide', () => {
    setup({ board: vocationBoard(), chars: { a: hero({ cls: 'hexblade' }) } }, { start: 'ref' })
    const rules = screen.getByRole('list', { name: 'Class rules' })
    expect(rules).toHaveTextContent('Fed.')
    expect(rules).toHaveTextContent('Blood Price.')
    expect(rules).not.toHaveTextContent('Hunger')
    expect(screen.queryByText('Sinew Lash (Crimson)')).toBeNull()
    cleanup()
    setup({ board: vocationBoard() }, { role: 'gm', me: 'gm', start: 'ref' })
    click('Hexblade')
    expect(screen.getByRole('list', { name: 'Class rules' })).toHaveTextContent('Hunger.')
    const row = screen.getByText('Sinew Lash (Crimson)').closest('tr')!
    expect(row).toHaveClass('crimson')
    click('Duelist')
    expect(screen.getByText('Twin Fang (Golden)').closest('tr')).not.toHaveClass('crimson')
  })
})

describe('ability sounds on the Reference', () => {
  it('a ▶ plays the sound of abilities that have one, Golden versions too', () => {
    const board = {
      k: { n: 'Heavy Swing', v: 'warrior', l: 1, c: 2, k: 'atk', d: '2d6', r: 1 },
      g: { n: 'Heavy Swing (Golden)', v: 'warrior', l: 1, c: 3, k: 'atk', d: '4d6', r: 1, gb: 'k' },
      q: { n: 'Quiet', v: 'warrior', l: 1, c: 1, k: 'util' },
    } as unknown as Board
    const onPlay = vi.fn()
    const p = { onView: () => {}, tables: { ...emptyTables(), board }, dm: true, me: 'gm', actions: createGameStore().getState(), images: {}, confirm: () => true }
    render(<BoardScreen view="ref" {...p} onPlay={onPlay} />)
    click('Warrior')
    click('Play the sound of Heavy Swing')
    click('Play the sound of Heavy Swing (Golden)')
    expect(onPlay.mock.calls).toEqual([['Heavy Swing'], ['Heavy Swing (Golden)']])
    expect(screen.queryByRole('button', { name: 'Play the sound of Quiet' })).toBeNull()
    cleanup()
    render(<BoardScreen view="ref" {...p} />)
    click('Warrior')
    expect(screen.queryByRole('button', { name: /Play the sound/ })).toBeNull()
  })
})

describe('ability pictures open big on the Reference', () => {
  it('an uploaded picture can be clicked to view it larger', () => {
    const board = { k: { n: 'Cleave', v: 'fighter', l: 1, c: 2, k: 'atk', d: '2d6', r: 1 } } as unknown as Board
    const p = { onView: () => {}, tables: { ...emptyTables(), board }, dm: true, me: 'gm', actions: createGameStore().getState(), images: { k: 'data:cleave' }, confirm: () => true }
    render(<BoardScreen view="ref" {...p} />)
    fireEvent.click(screen.getByRole('button', { name: 'View Cleave larger' }))
    expect(screen.getByRole('dialog', { name: 'Cleave' })).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).getByRole('img')).toHaveAttribute('src', 'data:cleave')
  })

  it('a class ability shows its sharp built-in picture big', () => {
    const board = { k: { n: 'Heavy Swing', v: 'warrior', l: 1, c: 2, k: 'atk', d: '2d6', r: 1 } } as unknown as Board
    const p = { onView: () => {}, tables: { ...emptyTables(), board }, dm: true, me: 'gm', actions: createGameStore().getState(), images: { k: 'data:small' }, confirm: () => true }
    render(<BoardScreen view="ref" {...p} />)
    click('Warrior')
    fireEvent.click(screen.getByRole('button', { name: 'View Heavy Swing larger' }))
    expect(within(screen.getByRole('dialog')).getByRole('img')).toHaveAttribute('src', ICON_BASE + CLASS_ICONS.heavy_swing)
  })
})
