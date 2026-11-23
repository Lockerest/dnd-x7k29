// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useStore } from 'zustand'
import type { Board } from '../../logic/board'
import type { Sheet } from '../../logic/sheet'
import { createGameStore, emptyTables, type GameStore, type Tables } from '../../state/store'
import { fakeDb } from '../../testing/fakeDb'
import { pickPicture } from '../../testing/fakeKit'
import { FakeKit } from '../../testing/KitWrapper'
import { CharacterCard, SheetScreen } from './Sheet'

afterEach(cleanup)

function Harness({
  store,
  portraits,
  confirm,
  onApprove,
  onClaim,
}: {
  store: GameStore
  portraits: Record<string, string>
  confirm: (q: string) => boolean
  onApprove: () => void
  onClaim: () => void
}) {
  const tables = useStore(store, (s) => s.tables)
  const dm = useStore(store, (s) => s.dm)
  const me = useStore(store, (s) => s.session?.me ?? '')
  return <SheetScreen tables={tables} dm={dm} me={me} actions={store.getState()} portraits={portraits} confirm={confirm} onApprove={onApprove} onClaim={onClaim} />
}

const hero = (o: Partial<Sheet> = {}): Sheet => ({
  name: 'Lyra',
  cls: 'archer',
  level: 3,
  ac: 14,
  hp: 60,
  maxHp: 100,
  st: 50,
  maxSt: 120,
  rg: 15,
  fl: 2,
  maxFl: 4,
  x10: true,
  ...o,
})

const board: Board = {
  s: { n: 'Smoke', v: 'any', k: 'util', c: 2, t: 'A cloud' },
  a: { n: 'Arrow Storm', v: 'any', k: 'atk', c: 9, t: 'Many arrows' },
  g: { n: 'Smoke (Golden)', v: 'any', k: 'util', gb: 's', c: 1, l: 1, t: 'Gold' },
}

function setup(t: Partial<Tables>, opts: { role?: 'gm' | 'player'; me?: string; portraits?: Record<string, string>; confirm?: boolean } = {}) {
  const f = fakeDb()
  const store = createGameStore(
    () => f.db,
    () => 7,
    () => 0.5,
    () => {},
  )
  store.getState().connect({ pin: 'p', role: opts.role ?? 'player', me: opts.me ?? 'a' })
  store.getState().applySnapshot({ ...emptyTables(), board, ...t })
  const confirm = vi.fn(() => opts.confirm ?? true)
  const onApprove = vi.fn()
  const onClaim = vi.fn()
  render(<Harness store={store} portraits={opts.portraits ?? {}} confirm={confirm} onApprove={onApprove} onClaim={onClaim} />, { wrapper: FakeKit })
  return { f, store, confirm, onApprove, onClaim }
}

const click = (name: string | RegExp, within_: HTMLElement = document.body) => fireEvent.click(within(within_).getByRole('button', { name }))
const sheet = (name: string) => screen.getByLabelText(`Sheet: ${name}`)
const last = (f: ReturnType<typeof fakeDb>) => f.writes.at(-1)

describe('<SheetScreen /> for a player', () => {
  it('shows the banner, bars, labels, abilities, stats and the last 5 log lines', () => {
    setup({ chars: { a: hero({ stn: true, conds: 'Poisoned', log: ['1', '2', '3', '4', '5', '6'], str: 15 }) } })
    const s = sheet('Lyra')
    expect(within(s).getByRole('heading', { name: 'Lyra' })).toBeInTheDocument()
    expect(s).toHaveTextContent('Archer · AC 14')
    expect(s).toHaveTextContent('❤ 60/100')
    expect(s).toHaveTextContent('⚡ 50/120')
    expect(s.querySelector('.lvb')).toHaveTextContent('LV3')
    expect(s.querySelector('.splash')).toHaveStyle({ '--fr': '#4f9d4a' })
    expect(s.querySelector('.ph')).toHaveTextContent('🏹')
    expect(within(s).getByText('Stunned')).toHaveClass('pill', 'bad')
    expect(within(s).getByText('Poisoned')).toHaveClass('pill')
    expect(within(s).getByText('Poisoned')).not.toHaveClass('bad')
    expect(
      within(s)
        .getAllByRole('meter')
        .map((m) => m.getAttribute('aria-valuenow')),
    ).toEqual(['60', '50'])
    expect(within(s).getByRole('heading', { name: 'Stamina · Actions used 0/2' })).toBeInTheDocument()
    // Players see stats but cannot change them.
    expect(within(s).getByText('STR').querySelector('b')).toHaveTextContent('15')
    expect(within(s).getByText('Level').querySelector('b')).toHaveTextContent('3')
    expect(within(s).queryByRole('spinbutton')).toBeNull()
    expect(
      within(s)
        .getAllByRole('listitem')
        .map((l) => l.textContent),
    ).toEqual(['6', '5', '4', '3', '2'])
    // GM-only buttons are hidden.
    for (const n of [/Start of turn/, /Parry:/, '-10 St', 'Remove character']) expect(within(s).queryByRole('button', { name: n })).toBeNull()
  })

  it('HP buttons and flasks', () => {
    const { f } = setup({ chars: { a: hero() } })
    click('+50')
    expect(last(f)).toEqual(['PATCH', 'chars/a', { hp: 100, log: ['Healed 50'] }])
    click('-10')
    expect(last(f)![2]).toMatchObject({ hp: 90 })
    click('Flask (2/4)')
    expect(last(f)![2]).toMatchObject({ fl: 1, hp: 100 })
  })

  it('no flasks left: the button is off, and a stale press does nothing', () => {
    const { f } = setup({ chars: { a: hero({ fl: 0 }) } })
    expect(screen.getByRole('button', { name: 'Flask (0/4)' })).toBeDisabled()
    const none = setup({ chars: { b: hero({ fl: undefined }) } }, { me: 'b' })
    fireEvent.click(screen.getAllByRole('button', { name: /^Flask/ })[1]!)
    expect(none.f.writes).toEqual([])
    expect(f.writes).toEqual([])
  })

  it('rest buttons need an altar or bonfire next to you', () => {
    const map = { w: 500, h: 500, cols: 10, al: { a: '1,1' }, bf: { a: '8,8' } }
    const far = setup({ chars: { a: hero({ mx: 5, my: 5 }) }, maps: { m: map } })
    expect(screen.getByRole('button', { name: 'Altar rest (stand by an altar)' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Bonfire rest (stand by a bonfire)' })).toBeDisabled()
    cleanup()
    const near = setup({ chars: { a: hero({ mx: 2, my: 2, dth: 1, cb: '9,9' }) }, maps: { m: map } })
    click('Altar rest & cleanse curse')
    expect(near.f.writes[0]![2]).toMatchObject({ dth: 0 })
    cleanup()
    const fire = setup({ chars: { a: hero({ mx: 7, my: 7 }) }, maps: { m: map } })
    click('Bonfire rest')
    expect(fire.f.writes[0]![2]).toMatchObject({ log: ['Rested at a bonfire: fatigue cleared'] })
    expect(far.f.writes).toEqual([])
  })

  it('shield and armor', () => {
    const { f } = setup({ chars: { a: hero() } })
    click('Shield: off')
    expect(last(f)![2]).toMatchObject({ shield: true })
    click('Shield: on')
    click('Armor: light')
    expect(last(f)![2]).toMatchObject({ ha: true })
    expect(screen.getByRole('button', { name: 'Armor: heavy' })).toBeInTheDocument()
  })

  it('abilities: stamina price, warnings, attacks from the map, and greyed out when exhausted', () => {
    setup({ chars: { a: hero({ st: 25, level: 1 }) } })
    const s = sheet('Lyra')
    const rows = [...s.querySelectorAll('.ab')].map((r) => r.textContent)
    expect(rows[0]).toMatch(/^Dodge Roll \(reaction\)Reaction: when an attack.*30 St$/)
    expect(rows.slice(1)).toEqual(['SmokeA cloud20 St', 'Arrow StormMany arrowsattack: tap a target'])
    expect(within(s).getByRole('button', { name: '30 St' })).toHaveClass('warn')
    expect(within(s).getByRole('button', { name: '20 St' })).not.toHaveClass('warn')
    cleanup()
    setup({ chars: { a: hero({ exh: true }) } })
    expect(screen.getByRole('button', { name: '30 St' })).toBeDisabled()
  })

  it('using an ability saves the cost', () => {
    const { f } = setup({ chars: { a: hero() } })
    click('20 St')
    expect(last(f)).toEqual(['PATCH', 'chars/a', { st: 30, used: 1, ua: true, log: ['Used Smoke (-20 St)'] }])
  })

  it('a dead hero can revive at an altar on the map, or is told there is none', () => {
    const { f } = setup({ chars: { a: hero({ hp: 0 }) }, maps: { m: { w: 500, h: 500, cols: 10, al: { a: '1,1', b: '4,4' } } } })
    expect(screen.getByText('Dead')).toHaveClass('bad')
    expect(screen.getByRole('button', { name: 'Altar rest (stand by an altar)' })).toBeDisabled()
    click('Revive at altar 2')
    expect(f.writes[0]![2]).toMatchObject({ mx: 4, my: 4, dth: 1 })
    cleanup()
    setup({ chars: { a: hero({ hp: 0 }) } })
    expect(screen.getByText('No altar on the map to revive at.')).toBeInTheDocument()
  })

  it('climbing a monster: foe down or up, jumping off, and carried monsters', async () => {
    const { f, store } = setup({ chars: { a: hero({ mt: 'climb', mon: 'w' }) }, enemies: { w: { name: 'Wolf' }, i: { name: 'Imp', hd: 'c:a' } } })
    click('Foe is down')
    expect(last(f)![2]).toMatchObject({ mt: 'down' })
    expect(screen.getByRole('button', { name: 'Foe is up' })).toBeInTheDocument()
    click('Jump off')
    expect(store.getState().jump).toEqual({ id: 'a', on: 'w' })
    click('Put down Imp')
    expect(f.writes).toContainEqual(['PATCH', 'enemies/i', { hd: null }])
    await waitFor(() => expect(last(f)).toEqual(['POST', 'rolls', { ev: 'Lyra puts down Imp', ts: 7 }]))
    cleanup()
    const gone = setup({ chars: { a: hero({ mt: 'down', mon: 'gone' }) } })
    click('Jump off')
    expect(last(gone.f)).toEqual(['PATCH', 'chars/a', { mt: '', mon: null, log: ['Unmounted'] }])
  })

  it("conditions and notes save when you leave the box; other players' sheets are read-only", () => {
    const { f } = setup({ chars: { a: hero({ notes: 'old' }) } })
    const cond = screen.getByLabelText('Conditions')
    fireEvent.change(cond, { target: { value: 'Blinded' } })
    fireEvent.blur(cond)
    expect(last(f)).toEqual(['PATCH', 'chars/a', { conds: 'Blinded' }])
    const notes = screen.getByLabelText('Notes')
    expect(notes).toHaveValue('old')
    fireEvent.change(notes, { target: { value: 'new' } })
    fireEvent.blur(notes)
    expect(last(f)).toEqual(['PATCH', 'chars/a', { notes: 'new' }])
  })

  it('a player without a sheet sees nothing', () => {
    const { container } = render(
      <SheetScreen tables={emptyTables()} dm={false} me="x" actions={createGameStore().getState()} portraits={{}} confirm={() => true} onApprove={() => {}} onClaim={() => {}} />,
    )
    expect(container.querySelector('.solo')).toBeEmptyDOMElement()
  })

  it('shows the portrait once loaded; other classes fall back to the fighter frame', () => {
    setup({ chars: { a: hero({ pv: 5, cls: 'warrior' }) } }, { portraits: { a: 'data:image/png;base64,x' } })
    const s = sheet('Lyra')
    expect(s.querySelector('.art')).toHaveStyle({ backgroundImage: 'url(data:image/png;base64,x)' })
    expect(s.querySelector('.ph')).toBeNull()
    expect(s.querySelector('.vc')).toHaveTextContent('⚔️')
    expect(s).toHaveTextContent('Warrior · AC 14')
    cleanup()
    setup({ chars: { a: hero({ cls: 'nobody', level: undefined }) } }, { portraits: { a: 'data:x' } })
    expect(sheet('Lyra')).toHaveTextContent('Fighter · AC 14')
    expect(sheet('Lyra').querySelector('.lvb')).toHaveTextContent('LV1')
    expect(sheet('Lyra').querySelector('.ph')).toBeInTheDocument() // no pv: the picture is old
  })
})

describe('<SheetScreen /> for the GM', () => {
  const gm = (t: Partial<Tables>, o: { confirm?: boolean } = {}) => setup(t, { role: 'gm', me: 'gm', ...o })

  it('lists every approved sheet with the join requests first', () => {
    const { onApprove } = gm({ chars: { a: hero(), b: hero({ name: 'Bo' }), c: hero({ name: 'New', ap: false }) } })
    expect(screen.getAllByLabelText(/^Sheet: /).map((s) => s.getAttribute('aria-label'))).toEqual(['Sheet: Lyra', 'Sheet: Bo'])
    click('Allow', screen.getByLabelText('Join requests'))
    expect(onApprove).toHaveBeenCalledWith('c', true)
  })

  it('no approved characters yet', () => {
    gm({ chars: { c: hero({ ap: false }) } })
    expect(screen.getByText('No approved characters yet.')).toBeInTheDocument()
  })

  it('start of turn, stamina, parry and other players’ abilities', () => {
    const { f } = gm({ chars: { a: hero({ mt: 'climb', mon: 'w', used: 2 }) }, enemies: { w: { name: 'Wolf' } } })
    click('Start of turn -25')
    expect(last(f)![2]).toMatchObject({ used: 0, st: 25 })
    click('+10 St')
    expect(last(f)![2]).toMatchObject({ st: 35 })
    click('-10 St')
    click('Parry: class default')
    expect(last(f)![2]).toMatchObject({ pw: 'n' })
    expect(screen.getByRole('button', { name: 'Parry: normal' })).toBeInTheDocument()
    click('Drop rider')
    expect(f.writes.slice(-2).map((w) => w[2])).toEqual([expect.objectContaining({ mt: '', mon: null }), { ev: 'Lyra is dropped from the monster. The GM decides where they land.', ts: 7 }])
  })

  it('the GM sees Golden abilities and can release attunements', () => {
    const { f } = gm({ chars: { a: hero({ eq: { s: 1, g: 1 }, at: { g: 1 }, atn: 1 }) } })
    expect(screen.getByText('Smoke (Golden)')).toBeInTheDocument()
    click('Release Smoke (Golden)')
    expect(last(f)![2]).toMatchObject({ at: null, log: ['Attunement released: Smoke (Golden)'] })
  })

  it('players do not see Golden abilities while "golden" is a spoiler', () => {
    setup({ chars: { a: hero({ eq: { s: 1, g: 1 } }) } })
    expect(screen.queryByText('Smoke (Golden)')).toBeNull()
    cleanup()
    setup({ chars: { a: hero({ eq: { s: 1, g: 1 } }) }, sp: '-' })
    expect(screen.getByText('Smoke (Golden)')).toBeInTheDocument()
  })

  it('stats are number boxes for the GM', () => {
    const { f } = gm({ chars: { a: hero({ str: 12 }) } })
    const str = screen.getByLabelText('STR')
    expect(str).toHaveValue(12)
    expect(screen.getByLabelText('Souls')).toHaveValue(0)
    fireEvent.change(str, { target: { value: '16' } })
    fireEvent.blur(str)
    expect(last(f)).toEqual(['PATCH', 'chars/a', { str: 16 }])
    // A new level brings its HP, stamina and stat growth.
    const lv = screen.getByLabelText('Level')
    fireEvent.change(lv, { target: { value: '2' } })
    fireEvent.blur(lv)
    expect(last(f)![2]).toMatchObject({ level: 2, maxSt: expect.any(Number) })
  })

  it('removing a character asks first', () => {
    const no = gm({ chars: { a: hero() } }, { confirm: false })
    click('Remove character')
    expect(no.confirm).toHaveBeenCalledWith('Remove Lyra?')
    expect(no.f.writes).toEqual([])
    cleanup()
    const yes = gm({ chars: { a: hero() } })
    click('Remove character')
    expect(yes.f.writes.map((w) => w[1])).toEqual(['chars/a', 'icons/a', 'portraits/a'])
    expect(screen.getByText('No approved characters yet.')).toBeInTheDocument()
  })
})

describe('<CharacterCard /> of someone else', () => {
  it('shows table prices only, and the boxes cannot be typed in', () => {
    const t = { ...emptyTables(), board, chars: { b: hero({ name: 'Bo', conds: 'Hexed', mt: 'climb' }) } }
    render(<CharacterCard id="b" tables={t} dm={false} me="a" actions={createGameStore().getState()} portraits={{}} confirm={() => true} />)
    const s = sheet('Bo')
    expect([...s.querySelectorAll('.ab')].map((r) => r.lastChild!.textContent)).toEqual(['3 St', '2 St', '9 St'])
    expect(within(s).getByLabelText('Conditions')).toBeDisabled()
    expect(within(s).getByLabelText('Notes')).toBeDisabled()
    expect(within(s).queryByRole('button')).toBeNull()
  })
})

it('players never see join or takeover requests', async () => {
  const { RequestPanels } = await import('./RequestPanels')
  const t = { ...emptyTables(), chars: { c: hero({ ap: false }) }, claims: { x: { who: 'X', target: 'c', st: 'pending' } } }
  const { container } = render(<RequestPanels tables={t} dm={false} onApprove={() => {}} onClaim={() => {}} />)
  expect(container).toBeEmptyDOMElement()
})

describe('pictures on the sheet', () => {
  it('a player sets their portrait and token icon', async () => {
    const { f } = setup({ chars: { a: hero() } }, { role: 'player', me: 'a' })
    await pickPicture('Set portrait')
    await pickPicture('Set icon')
    await vi.waitFor(() => expect(f.writes).toHaveLength(4))
    expect(f.writes.map((w) => [w[1], w[2]])).toEqual([
      ['portraits/a', { data: 'data:image/jpeg;420x560' }],
      ['chars/a', { pv: expect.any(Number) }],
      ['icons/a', { data: 'data:image/jpeg;96x96' }],
      ['chars/a', { iv: expect.any(Number) }],
    ])
  })
})
