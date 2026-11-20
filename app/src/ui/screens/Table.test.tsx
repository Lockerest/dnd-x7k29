// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from 'zustand'
import type { Board } from '../../logic/board'
import type { Sheet } from '../../logic/sheet'
import { createGameStore, emptyTables, type GameStore, type Tables } from '../../state/store'
import { fakeDb } from '../../testing/fakeDb'
import { lightHit } from '../../logic/sheet'
import { TableScreen } from './Table'

afterEach(cleanup)
// jsdom has no layout: the map is 500 x 400 pixels at the top left.
beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 500, height: 400, right: 500, bottom: 400, x: 0, y: 0, toJSON: () => ({}) })
})
afterEach(() => vi.restoreAllMocks())

const MAP = { name: 'Crypt', w: 500, h: 400, cols: 10, al: ['1,1'], bf: ['3,3'], dr: { d1: { c: '3,0', p: [3.5, 0.5] } } }
const memory = () => {
  const m = new Map<string, string>()
  return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
}

function Harness({ store, storage, images }: { store: GameStore; storage: ReturnType<typeof memory>; images: boolean }) {
  const tables = useStore(store, (s) => s.tables)
  const dm = useStore(store, (s) => s.dm)
  const gmMap = useStore(store, (s) => s.gmMap)
  const jump = useStore(store, (s) => s.jump)
  const me = useStore(store, (s) => s.session?.me ?? '')
  return (
    <TableScreen
      tables={tables}
      dm={dm}
      me={me}
      pin="dragon42"
      gmMap={gmMap}
      jump={jump}
      actions={store.getState()}
      mapImages={images ? { m: 'data:m', n: 'data:n' } : {}}
      icons={{ a: 'data:a', w: 'data:w' }}
      abilityImages={{}}
      markers={{}}
      now={() => 5}
      storage={storage}
      enemiesPanel={<div>GM enemies</div>}
      onApprove={() => {}}
      onClaim={() => {}}
      legacyUrl="../"
    />
  )
}

function setup(t: Partial<Tables>, o: { role?: 'gm' | 'player'; me?: string; images?: boolean; storage?: ReturnType<typeof memory> } = {}) {
  const f = fakeDb()
  const store = createGameStore(() => f.db, () => 5, () => 0.5, () => {})
  store.getState().connect({ pin: 'p', role: o.role ?? 'player', me: o.me ?? 'a' })
  store.getState().applySnapshot({ ...emptyTables(), maps: { m: MAP }, cur: 'm', ...t })
  const storage = o.storage ?? memory()
  render(<Harness store={store} storage={storage} images={o.images ?? true} />)
  return { f, store, storage }
}
const hero = (o: Partial<Sheet> = {}): Sheet => ({ name: 'Lyra', cls: 'archer', hp: 30, maxHp: 30, st: 50, maxSt: 100, rg: 10, fl: 2, maxFl: 3, mx: 2, my: 2, ...o })
const click = (name: string | RegExp, scope: HTMLElement = document.body) => fireEvent.click(within(scope).getByRole('button', { name }))
const tap = (x: number, y: number) => fireEvent.pointerDown(screen.getByRole('img', { name: 'Map: Crypt' }), { clientX: x * 50 + 25, clientY: y * 50 + 25 })

describe('a player at the table', () => {
  it('sees their status, quick actions, abilities, the map and the enemies in sight', () => {
    const board: Board = { s: { n: 'Smoke', v: 'any', k: 'util', c: 1, t: 'A cloud of smoke. Hides you.' }, h: { n: 'Hit', v: 'any', k: 'atk', d: '1d6', r: 2, a: 1, sd: 'Bonk' }, m: { n: 'Mend', v: 'any', k: 'heal', d: '1d4', hc: 5 }, c: { n: 'Peek', v: 'any', k: 'check' } }
    setup({ board, chars: { a: hero({ iv: 1, level: 3 }) }, enemies: { w: { name: 'Wolf', type: 'Beast', hp: 5, mx: 4, my: 4, pl: 'Phase 1', iv: 1, stun: true }, x: { name: 'Far', hp: 5, mx: 9, my: 7, mp: 'n' }, y: { name: 'Unplaced', hp: 5 } } })
    const st = screen.getByLabelText('Status: Lyra')
    expect(st).toHaveTextContent('Archer · Actions 0/2')
    expect(st.querySelector('img.av')).toHaveAttribute('src', 'data:a')
    expect(within(st).queryByRole('button', { name: /Start of turn/ })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Quick actions (2 per round)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Smoke · 10/ })).toBeEnabled()
    expect(screen.queryByRole('button', { name: /Hit ·/ })).toBeNull()
    const yours = screen.getByRole('heading', { name: 'Your abilities' }).parentElement!
    expect(yours).toHaveTextContent('Smoke 10 StA cloud of smoke.')
    expect(yours).toHaveTextContent('Hit 0 St · 1d6 · range 2 · auto-hitBonk')
    expect(yours).toHaveTextContent('Mend 0 St + 5% HP · heals 1d4')
    expect(yours).toHaveTextContent('Peek 0 St · d20 check')
    const en = screen.getByRole('heading', { name: 'Enemies' }).parentElement!
    expect(en).toHaveTextContent('WolfPhase 1Beast · 1×1Stunned')
    expect(en.querySelector('img.av')).toHaveAttribute('src', 'data:w')
    expect(en).not.toHaveTextContent('Far')
    expect(screen.getByText(/Out of combat: move up to 6 squares for free/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'live table' })).toHaveAttribute('href', '../')
  })

  it('walks by tapping the map, and attacking points to the live table for now', async () => {
    const { f, store } = setup({ chars: { a: hero() }, enemies: { w: { name: 'Wolf', hp: 5, mx: 6, my: 6 } } })
    tap(3, 3)
    await vi.waitFor(() => expect(f.writes[0]![2]).toMatchObject({ mx: 3, my: 3 }))
    tap(6, 6)
    await vi.waitFor(() => expect(store.getState().error).toMatch(/Attacking from the map is still on the live table/))
    tap(20, 20) // outside the map
  })

  it('uses quick actions, flasks, rests, doors, mounts; helps allies', async () => {
    const board: Board = { s: { n: 'Smoke', v: 'any', k: 'util', c: 1 } }
    const { f, store } = setup({ board, chars: { a: hero({ mx: 2, my: 1, dth: 1, cb: '9,9', mt: 'down', mon: 'w' }), b: hero({ name: 'Bo', exh: true }) }, enemies: { w: { name: 'Wolf', hp: 5 }, i: { name: 'Imp', hd: 'c:a' } } })
    const st = screen.getByLabelText('Status: Lyra')
    click(/Smoke ·/)
    click('Flask 2/3', st)
    click('Open door', st)
    click('Foe is up', st)
    click('Put down Imp', st)
    click('Jump off', st)
    click('Help Bo up (uses an action)')
    click('Rest at altar & cleanse curse', st)
    await vi.waitFor(() => expect(f.writes.length).toBeGreaterThan(8))
    expect(f.writes.some((w) => (w[2] as { ev?: string }).ev === 'Lyra opens a door')).toBe(true)
    click('Jump off', screen.getByLabelText('Status: Lyra'))
    expect(store.getState().jump).toEqual({ id: 'a', on: 'w' })
    expect(screen.getByText(/Tap a free square within 3 squares of the monster to jump there\./)).toBeInTheDocument()
    click('Cancel jump')
    expect(store.getState().jump).toBeNull()
  })

  it('rest and curse notes; dead heroes revive; no map yet', () => {
    setup({ chars: { a: hero({ mx: 1, my: 2, dth: 1, cb: '1,1', ft: 2 }) } })
    expect(screen.getByRole('button', { name: 'Rest at altar (resets the world)' })).toBeInTheDocument()
    expect(screen.getByText('This is the altar you were revived at. Find a different altar to cleanse the curse.')).toBeInTheDocument()
    cleanup()
    setup({ chars: { a: hero({ mx: 3, my: 2, dth: 1 }) } })
    expect(screen.getByRole('button', { name: 'Rest at bonfire (clears fatigue)' })).toBeInTheDocument()
    expect(screen.getByText('Find a different altar than the one you were revived at to cleanse the curse.')).toBeInTheDocument()
    cleanup()
    setup({ chars: { a: hero({ hp: 0 }) } })
    click('Revive at altar 1')
    cleanup()
    setup({ chars: { a: hero({ hp: 0 }) }, maps: {} })
    expect(screen.getByText('No altar on the map to revive at.')).toBeInTheDocument()
    expect(screen.getByText("The GM hasn't set a map yet.")).toBeInTheDocument()
  })

  it('combat and exhaustion notes; a waiting player sees nothing on the left', () => {
    setup({ chars: { a: hero({ mvd: 2 }) }, combat: true })
    expect(screen.getByText(/Combat: moving costs 1 stamina per square, 4 squares left this round/)).toBeInTheDocument()
    cleanup()
    setup({ chars: { a: hero({ exh: true, exn: 1 }) } })
    expect(screen.getByText(/Exhausted \(1 rounds left\)/)).toBeInTheDocument()
    cleanup()
    setup({ chars: { a: hero({ exh: true }) } })
    expect(screen.getByText(/Exhausted \(2 rounds left\)/)).toBeInTheDocument()
    cleanup()
    setup({ chars: { a: hero({ mx: null }), b: hero({ name: 'Bo', exh: true }) } })
    expect(screen.getByText('Tap the map to place it.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Help Bo up (uses an action)' })).toBeEnabled()
    cleanup()
    setup({ chars: { a: hero({ used: 2 }), b: hero({ name: 'Bo', pr: true }) } })
    expect(screen.getByRole('button', { name: 'Help Bo up (uses an action)' })).toBeDisabled()
    cleanup()
    const { container } = render(<div />)
    setup({ chars: {} })
    expect(screen.queryByLabelText(/^Status:/)).toBeNull()
    expect(screen.getByText('None in sight.')).toBeInTheDocument()
    void container
  })

  it('shows "Loading map…" until the picture arrives', () => {
    setup({ chars: { a: hero() } }, { images: false })
    expect(screen.getByText('Loading map…')).toBeInTheDocument()
  })
})

describe('the GM at the table', () => {
  const gm = (t: Partial<Tables>, o: { storage?: ReturnType<typeof memory>; images?: boolean } = {}) => setup(t, { role: 'gm', me: 'gm', ...o })

  it('controls, hidden words, everyone’s status, and the enemies panel', async () => {
    const { f } = gm({ chars: { a: hero(), b: hero({ name: 'Bo', exh: true, lh: 1, mt: 'climb', mon: 'w' }), c: hero({ name: 'New', ap: false }) }, enemies: { w: { name: 'Wolf', hp: 5 } } })
    expect(screen.getByText('GM enemies')).toBeInTheDocument()
    expect(screen.getAllByLabelText(/^Status:/)).toHaveLength(2)
    click('Next round: all')
    click('Altar: all')
    click('Bonfire: all')
    click('Combat: off')
    const bo = screen.getByLabelText('Status: Bo')
    click('Light hit (1/3)', bo)
    click('Heavy hit', bo)
    click('Foe is down', bo)
    click('Drop rider', bo)
    click(/^Start of turn/, bo)
    click('+50', bo)
    await vi.waitFor(() => expect(f.writes.length).toBeGreaterThan(10))
    expect(screen.getByRole('button', { name: 'Combat: on' })).toHaveClass('pri')
    expect(f.writes.some((w) => (w[2] as { ev?: string }).ev === 'Bo is dropped from the monster. The GM decides where they land.')).toBe(true)
  })

  it('hidden words: reveal one, save the list, reveal all, default words', async () => {
    const { f } = gm({ sp: 'golden,altar' })
    click('golden · reveal')
    const box = screen.getByLabelText('Word list, separated by commas')
    fireEvent.change(box, { target: { value: 'Ghost, crystal' } })
    click('Save list')
    click('Reveal all')
    await vi.waitFor(() => expect(screen.getByText('Nothing is hidden.')).toBeInTheDocument())
    click('Save list')
    click('Hide the default words')
    await vi.waitFor(() => expect(f.writes).toHaveLength(5))
    expect(f.writes.map((w) => (w[2] as { sp: string }).sp)).toEqual(['altar', 'ghost,crystal', '-', '-', expect.stringContaining('golden')])
  })

  it('hides and shows the side panel (remembered)', () => {
    const storage = memory()
    gm({ chars: { a: hero() } }, { storage })
    click('Hide panel')
    expect(storage.m.get('hl')).toBe('1')
    expect(screen.queryByLabelText('Status: Lyra')).toBeNull()
    click('Show side panel')
    expect(screen.getByLabelText('Status: Lyra')).toBeInTheDocument()
    cleanup()
    storage.m.set('hl', '1')
    gm({}, { storage })
    expect(screen.getByRole('button', { name: 'Show side panel' })).toBeInTheDocument()
  })

  it('a table with no heroes shows its PIN; no maps yet', () => {
    gm({ maps: {} })
    expect(screen.getByText(/No characters yet\. Table PIN:/)).toHaveTextContent('dragon42')
    expect(screen.getByText('No maps yet. Upload one on the live table to begin.')).toBeInTheDocument()
  })

  it('picks units with the chips, moves them on the map, and switches to a tapped token', async () => {
    const { f } = gm({ chars: { a: hero() }, enemies: { w: { name: 'Wolf', hp: 5, mx: 6, my: 6, spd: 2, bon: 1 } as never } })
    expect(screen.getByText(/Pick a unit, then tap the map/)).toBeInTheDocument()
    click('👹 Wolf')
    expect(screen.getByText(/Red squares: this enemy can move up to 3 squares \(speed 2 \+ bonus 1\)/)).toBeInTheDocument()
    tap(7, 5)
    await vi.waitFor(() => expect(f.writes[0]).toEqual(['PATCH', 'enemies/w', expect.objectContaining({ mx: 7, my: 5 })]))
    tap(2, 2) // Lyra: she becomes the selected unit
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Lyra' })).toHaveClass('pri'))
  })

  it('chooses which map to look at and shows it to players', async () => {
    const { f, store } = gm({ maps: { m: MAP, n: { ...MAP, name: 'Two' } } })
    expect(screen.getByRole('option', { name: 'Crypt (live)' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Map'), { target: { value: 'n' } })
    expect(store.getState().gmMap).toBe('n')
    expect(screen.getByText(/You're editing a map players can't see yet\./)).toBeInTheDocument()
    click('Show to players')
    await vi.waitFor(() => expect(f.writes).toEqual([['PUT', 'cur', 'n']]))
    cleanup()
    gm({ maps: { m: { ...MAP, name: undefined } } }, { images: false })
    expect(screen.getByRole('option', { name: 'm (live)' })).toBeInTheDocument()
  })
})

it('hits on an exhausted hero: three light hits or one heavy hit knock them prone', () => {
  expect(lightHit({ lh: 1 } as Sheet, 'l')).toEqual([{ lh: 2, pr: false }, 'Light hit 2/3'])
  expect(lightHit({ lh: 2 } as Sheet, 'l')).toEqual([{ lh: 0, pr: true }, 'Knocked prone!'])
  expect(lightHit({} as Sheet, 'h')).toEqual([{ lh: 0, pr: true }, 'Knocked prone!'])
  expect(lightHit({ pr: true } as Sheet, 'l')).toEqual([{ lh: 1, pr: true }, 'Light hit 1/3'])
})

it('blocked storage: the side panel setting just is not remembered', () => {
  const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
  setup({}, { role: 'gm', me: 'gm', storage: broken as unknown as ReturnType<typeof memory> })
  click('Hide panel')
  expect(screen.getByRole('button', { name: 'Show side panel' })).toBeInTheDocument()
})

describe('more table cases', () => {
  it('a bonfire next to you, a hero with no equipped abilities, and bare sheets', async () => {
    const { f } = setup({ board: { z: { n: 'Mage only', v: 'mage' } }, chars: { a: hero({ mx: 3, my: 2 }) } })
    click('Rest at bonfire (clears fatigue)')
    await vi.waitFor(() => expect(f.writes[0]![2]).toMatchObject({ log: ['Rested at a bonfire: fatigue cleared'] }))
    expect(screen.queryByRole('heading', { name: 'Your abilities' })).toBeNull()
  })

  it('ability lines without dice, range or text', () => {
    const board: Board = { a: { n: 'Swing', v: 'any', k: 'atk' }, h: { n: 'Pray', v: 'any', k: 'heal' }, u: { n: 'Wait', v: 'any', k: 'util', c: 9 } }
    setup({ board, chars: { a: hero({ st: 5 }) } })
    const yours = screen.getByRole('heading', { name: 'Your abilities' }).parentElement!
    expect(yours).toHaveTextContent('Swing 0 StPray')
    expect(yours).toHaveTextContent('Pray 0 St · heals')
    expect(screen.getByRole('button', { name: /Wait · 90/ })).toHaveClass('warn')
  })

  it("the GM's move notes for each kind of unit, and chips named by id when nameless", () => {
    setup(
      {
        chars: { a: hero({ name: undefined, spd: 4, mvd: 1, stn: true } as Partial<Sheet>), b: hero({ name: 'Bo', exh: true, exn: 3 }), c: hero({ name: 'Cy', mx: null }) },
        enemies: { w: { name: 'Wolf', hp: 5, mx: 4, my: 4, spd: 3, bon: 1 } as never, v: { name: 'Vole', hp: 5, mx: 5, my: 5 } },
        combat: true,
      },
      { role: 'gm', me: 'gm' },
    )
    click('a')
    expect(screen.getByText(/Combat: moving costs 1 stamina per square, -1 squares left this round\./)).toBeInTheDocument()
    click('Bo')
    expect(screen.getByText(/Exhausted \(3 rounds left\)/)).toBeInTheDocument()
    click('Cy')
    expect(screen.getByText(/Tap the map to place it\./)).toBeInTheDocument()
    click('👹 Wolf')
    expect(screen.getByText(/this enemy can move up to 4 squares \(speed 3 \+ bonus 1\)/)).toBeInTheDocument()
    click('👹 Vole')
    expect(screen.getByText(/this enemy can move up to 6 squares \(speed 6 \+ bonus 0\)/)).toBeInTheDocument()
  })

  it('a hero with no speed walks 6 out of combat, less what they already moved in combat', () => {
    const { store } = setup({ chars: { a: hero({ mvd: 2 }) } })
    expect(screen.getByText(/Out of combat: move up to 6 squares for free/)).toBeInTheDocument()
    act(() => store.getState().applySnapshot({ ...store.getState().tables, combat: true }))
    expect(screen.getByText(/4 squares left this round/)).toBeInTheDocument()
  })

  it('a player jumping off a monster that is gone just steps down', async () => {
    const { f } = setup({ chars: { a: hero({ mt: 'down', mon: 'gone' }) } })
    click('Jump off')
    await vi.waitFor(() => expect(f.writes).toEqual([['PATCH', 'chars/a', { mt: '', mon: null, log: ['Unmounted'] }]]))
  })
})
