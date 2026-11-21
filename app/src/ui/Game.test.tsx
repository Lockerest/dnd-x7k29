// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { gmPinHash } from '../logic/join'
import type { DicePlayer, DiceJob } from './dice/player'
import { Game } from './Game'

afterEach(cleanup)

/** An in-memory Firebase (GET, PUT, PATCH, POST, DELETE, shallow) behind fetch. */
function fakeFirebase(initial: Record<string, unknown> = {}) {
  let root: Record<string, unknown> = JSON.parse(JSON.stringify(initial))
  const writes: [string, string, unknown][] = []
  let offline = false
  const parts = (p: string) => p.split('/').filter(Boolean)
  const get = (p: string) => parts(p).reduce<unknown>((n, k) => (n && typeof n === 'object' ? (n as Record<string, unknown>)[k] : undefined), root) ?? null
  const set = (p: string, v: unknown) => {
    const ps = parts(p)
    let n = root as Record<string, unknown>
    for (const k of ps.slice(0, -1)) n = (n[k] && typeof n[k] === 'object' ? n[k] : (n[k] = {})) as Record<string, unknown>
    if (v === null) delete n[ps.at(-1)!]
    else n[ps.at(-1)!] = v
  }
  const f = vi.fn(async (input: string, init?: RequestInit) => {
    if (offline) throw new TypeError('Failed to fetch')
    const u = new URL(input)
    const path = decodeURIComponent(u.pathname.replace(/\.json$/, ''))
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(String(init.body)) : null
    if (method !== 'GET') writes.push([method, path, body])
    if (method === 'PUT') set(path, body)
    if (method === 'DELETE') set(path, null)
    if (method === 'PATCH') for (const [k, v] of Object.entries(body as object)) set(`${path}/${k}`, v)
    let v = method === 'GET' ? get(path) : body
    if (u.searchParams.get('shallow') === 'true' && v && typeof v === 'object') v = Object.fromEntries(Object.keys(v).map((k) => [k, true]))
    return new Response(JSON.stringify(v))
  })
  return { fetch: f as unknown as typeof fetch, writes, get, set, setOffline: (o: boolean) => (offline = o), reset: (t: Record<string, unknown>) => (root = t) }
}

const memory = () => {
  const m = new Map<string, string>()
  return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }
}

const type = (label: RegExp, v: string) => fireEvent.change(screen.getByLabelText(label), { target: { value: v } })
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }))

function setup(tree: Record<string, unknown> = {}, opts: { storage?: ReturnType<typeof memory>; hash?: string; player?: DicePlayer } = {}) {
  const fb = fakeFirebase(tree)
  const storage = opts.storage ?? memory()
  let n = 0
  render(<Game fetchImpl={fb.fetch} storage={storage} hash={opts.hash ?? ''} every={20} qteEvery={20} dicePlayer={opts.player ?? null} newId={() => `p${++n}`} now={() => 1000} />)
  return { fb, storage }
}

describe('<Game /> joining', () => {
  it('rejects a bad PIN and an unknown table', async () => {
    const { fb } = setup()
    type(/Table PIN/, 'abc')
    click('Join as player')
    expect(await screen.findByRole('alert')).toHaveTextContent('Table PIN: 6 or more letters/numbers only.')
    type(/Table PIN/, 'dragon42')
    click('Join as player')
    expect(await screen.findByText('No table with that PIN. Ask your GM to open it first.')).toBeInTheDocument()
    click('Open table view (projector)')
    expect(await screen.findByText('No table with that PIN. Ask your GM to open it first.')).toBeInTheDocument()
    expect(fb.writes).toEqual([])
  })

  it('the GM opens a new table (storing only the PIN hash) and can leave', async () => {
    const { fb, storage } = setup()
    type(/Table PIN/, 'dragon42')
    type(/Game Master PIN/, 'abc')
    click('Open as Game Master')
    expect(await screen.findByText('GM PIN needs 4+ characters.')).toBeInTheDocument()
    type(/Game Master PIN/, 'secret')
    click('Open as Game Master')
    expect(await screen.findByText('Game Master')).toBeInTheDocument()
    expect(fb.get('tables/dragon42/meta')).toEqual({ dm: await gmPinHash('secret') })
    expect(screen.getByRole('heading', { name: 'Dice' })).toBeInTheDocument()
    expect(screen.getByText('No rolls yet.')).toBeInTheDocument()
    // The new app's session is kept apart from the live page's.
    expect(JSON.parse(storage.m.get('next.st')!)).toEqual({ pin: 'dragon42', role: 'gm', me: 'gm' })
    expect(storage.m.has('st')).toBe(false)
    click('Leave')
    expect(screen.getByRole('heading', { name: 'Join a table' })).toBeInTheDocument()
    expect(storage.m.has('next.st')).toBe(false)
  })

  it('a wrong GM PIN is refused', async () => {
    setup({ tables: { dragon42: { meta: { dm: await gmPinHash('right') } } } })
    type(/Table PIN/, 'dragon42')
    type(/Game Master PIN/, 'wrong')
    click('Open as Game Master')
    expect(await screen.findByText('Wrong GM PIN.')).toBeInTheDocument()
  })

  it('shows connection problems while joining', async () => {
    const { fb } = setup()
    fb.setOffline(true)
    type(/Table PIN/, 'dragon42')
    click('Join as player')
    expect(await screen.findByText('Connection problem: Failed to fetch')).toBeInTheDocument()
  })

  it('the table display joins without a character', async () => {
    setup({ tables: { dragon42: { meta: { dm: 'h' }, enemies: { w: { name: 'Wolf', hp: 50, max: 50, x10: true }, g: { name: 'Golem', hp: 9, max: 9, mx: 2, my: 2, x10: true } } } } }, { hash: '#table' })
    type(/Table PIN/, 'dragon42')
    click('Open table view (projector)')
    expect(await screen.findByText('Waiting for the GM to show a map…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Table settings' })).toBeInTheDocument()
  })
})

describe('<Game /> characters', () => {
  const table = () => ({ tables: { dragon42: { meta: { dm: 'h' }, chars: { c1: { name: 'Bram', cls: 'warrior', hp: 150, maxHp: 150, x10: true } } } } })

  it('a player creates a character, waits, and plays once the GM allows', async () => {
    const { fb } = setup(table())
    type(/Table PIN/, 'dragon42')
    click('Join as player')
    expect(await screen.findByRole('heading', { name: 'Create your character' })).toBeInTheDocument()
    type(/^Name/, 'Lyra')
    click(/^Archer/)
    expect(await screen.findByRole('heading', { name: 'Waiting to be allowed to play' })).toBeInTheDocument()
    expect(screen.getByText(/needs to approve Lyra/)).toBeInTheDocument()
    expect(fb.get('tables/dragon42/chars/p1')).toMatchObject({ name: 'Lyra', cls: 'archer', ap: false })
    expect(screen.queryByRole('button', { name: 'Sheet' })).toBeNull()
    act(() => fb.set('tables/dragon42/chars/p1/ap', true))
    expect(await screen.findByRole('heading', { name: 'Dice' })).toBeInTheDocument()
    // Tabs now work.
    click('Sheet')
    expect(screen.getByRole('heading', { name: 'Lyra' })).toBeInTheDocument()
    click('Table')
    click('Abilities')
    expect(screen.getByRole('heading', { name: 'Ability board' })).toBeInTheDocument()
    click('Back to table')
    expect(screen.getByRole('heading', { name: 'Dice' })).toBeInTheDocument()
  })

  it('a declined character sees it', async () => {
    const fb = setup(table()).fb
    fb.set('tables/dragon42/chars/p1', { name: 'Lyra', ap: 'no' })
    type(/Table PIN/, 'dragon42')
    click('Join as player')
    expect(await screen.findByRole('heading', { name: 'Request declined' })).toBeInTheDocument()
  })

  it('takes over a character from another device once the GM allows it', async () => {
    const { fb, storage } = setup(table())
    type(/Table PIN/, 'dragon42')
    click('Join as player')
    click(await screen.findByRole('button', { name: 'I already have a character' }).then((b) => b.textContent!))
    click('Ask the GM')
    expect(await screen.findByText('Enter your name and pick a character.')).toBeInTheDocument()
    type(/Your name/, 'Sam')
    fireEvent.change(screen.getByLabelText(/Which character/), { target: { value: 'c1' } })
    click('Ask the GM')
    expect(await screen.findByRole('heading', { name: 'Waiting for the GM' })).toBeInTheDocument()
    expect(screen.getByText(/take over Bram/)).toBeInTheDocument()
    expect(fb.get('tables/dragon42/claims/p1')).toEqual({ who: 'Sam', target: 'c1', st: 'pending', ts: 1000 })
    act(() => fb.set('tables/dragon42/claims/p1/st', 'ok'))
    expect(await screen.findByRole('heading', { name: 'Dice' })).toBeInTheDocument()
    await vi.waitFor(() => expect(fb.get('tables/dragon42/claims/p1')).toBeNull())
    expect(JSON.parse(storage.m.get('next.st')!)).toEqual({ pin: 'dragon42', role: 'player', me: 'c1' })
  })

  it('a refused takeover can be dismissed; the form has a Back button', async () => {
    const { fb } = setup(table())
    type(/Table PIN/, 'dragon42')
    click('Join as player')
    click(await screen.findByRole('button', { name: 'I already have a character' }).then((b) => b.textContent!))
    click('Back')
    expect(screen.getByRole('heading', { name: 'Create your character' })).toBeInTheDocument()
    fb.set('tables/dragon42/claims/p1', { who: 'Sam', target: 'c1', st: 'no', ts: 1 })
    expect(await screen.findByText("The GM didn't approve linking this device.")).toBeInTheDocument()
    click('Back')
    expect(await screen.findByRole('heading', { name: 'Create your character' })).toBeInTheDocument()
    expect(fb.writes.at(-1)).toEqual(['DELETE', '/tables/dragon42/claims/p1', null])
  })

  it('nameless characters and missing targets read sensibly', async () => {
    const { fb } = setup({ tables: { dragon42: { meta: { dm: 'h' }, chars: { c9: { x10: true } } } } })
    type(/Table PIN/, 'dragon42')
    click('Join as player')
    click(await screen.findByRole('button', { name: 'I already have a character' }).then((b) => b.textContent!))
    expect(screen.getByRole('option', { name: 'c9' })).toBeInTheDocument()
    act(() => fb.set('tables/dragon42/claims/p1', { who: 'Sam', target: 'gone', st: 'pending' }))
    expect(await screen.findByText(/take over that character/)).toBeInTheDocument()
    act(() => fb.set('tables/dragon42/claims/p1', null))
    act(() => fb.set('tables/dragon42/chars/p1', { ap: false, x10: true }))
    expect(await screen.findByText(/needs to approve before/)).toBeInTheDocument()
  })

  it('the claim form with no characters cannot be sent', async () => {
    setup({ tables: { dragon42: { meta: { dm: 'h' } } } })
    type(/Table PIN/, 'dragon42')
    click('Join as player')
    click(await screen.findByRole('button', { name: 'I already have a character' }).then((b) => b.textContent!))
    expect(screen.getByRole('button', { name: 'Ask the GM' })).toBeDisabled()
  })
})

describe('<Game /> Game Master', () => {
  it('approves or declines join requests and device requests', async () => {
    const h = await gmPinHash('secret')
    const { fb } = setup({
      tables: {
        dragon42: {
          meta: { dm: h },
          chars: { a: { name: 'New Guy', cls: 'mage', ap: false, x10: true }, b: { name: 'Odd', cls: 'bard', ap: false, x10: true }, c1: { name: 'Bram', x10: true } },
          claims: { p7: { who: 'Sam', target: 'c1', st: 'pending' }, p8: { who: 'Ann', target: 'zz', st: 'pending' }, p9: { who: 'Old', st: 'no' } },
        },
      },
    })
    type(/Table PIN/, 'dragon42')
    type(/Game Master PIN/, 'secret')
    click('Open as Game Master')
    expect(await screen.findByRole('heading', { name: 'Join requests' })).toBeInTheDocument()
    expect(screen.getByText('Mage')).toBeInTheDocument()
    expect(screen.getByText('Fighter')).toBeInTheDocument() // unknown class shows as Fighter, like the live page
    expect(screen.getByText('a deleted character')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Allow' })[2]!) // New Guy (after the 2 device requests)
    await vi.waitFor(() => expect(fb.get('tables/dragon42/chars/a/ap')).toBe(true))
    expect(fb.get('tables/dragon42/chars/a/log')).toEqual(['Approved by the GM'])
    fireEvent.click(screen.getAllByRole('button', { name: 'Deny' }).at(-1)!) // Odd
    await vi.waitFor(() => expect(fb.get('tables/dragon42/chars/b/ap')).toBe('no'))
    expect(await screen.findByText('Fighter · declined')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Allow' })[0]!) // Sam
    await vi.waitFor(() => expect(fb.get('tables/dragon42/claims/p7/st')).toBe('ok'))
    fireEvent.click(screen.getAllByRole('button', { name: 'Deny' })[0]!)
    await vi.waitFor(() => expect(fb.get('tables/dragon42/claims/p8/st')).toBe('no'))
  })

  it('can look at the table as a player and back', async () => {
    setup()
    type(/Table PIN/, 'dragon42')
    type(/Game Master PIN/, 'secret')
    click('Open as Game Master')
    click(await screen.findByRole('button', { name: 'View as player' }).then((b) => b.textContent!))
    expect(screen.getByRole('heading', { name: 'Create your character' })).toBeInTheDocument()
    click('Back to GM')
    expect(screen.getByRole('heading', { name: 'Dice' })).toBeInTheDocument()
  })
})

describe('<Game /> character sheets', () => {
  it('the GM sees every sheet, with portraits downloaded once per version (retried after a failure)', async () => {
    const h = await gmPinHash('secret')
    const { fb } = setup({
      tables: {
        dragon42: {
          meta: { dm: h },
          chars: {
            a: { name: 'Lyra', cls: 'archer', hp: 50, maxHp: 100, st: 10, maxSt: 100, pv: 1, x10: true },
            b: { name: 'Bram', cls: 'fighter', hp: 50, maxHp: 100, st: 10, maxSt: 100, pv: 2, x10: true },
            c: { name: 'Cid', cls: 'mage', hp: 50, maxHp: 100, st: 10, maxSt: 100, x10: true },
          },
          portraits: { a: { data: 'data:image/png;base64,QQ' }, b: {} },
        },
      },
    })
    type(/Table PIN/, 'dragon42')
    type(/Game Master PIN/, 'secret')
    click('Open as Game Master')
    click(await screen.findByRole('button', { name: 'Sheet' }).then((b) => b.textContent!))
    const lyra = await screen.findByLabelText('Sheet: Lyra')
    await vi.waitFor(() => expect(lyra.querySelector('.art')).toHaveStyle({ backgroundImage: 'url(data:image/png;base64,QQ)' }))
    expect(screen.getByLabelText('Sheet: Bram').querySelector('.ph')).toBeInTheDocument()
    expect(screen.getByLabelText('Sheet: Cid')).toBeInTheDocument()
    const reads = () => (fb.fetch as unknown as { mock: { calls: [string][] } }).mock.calls.filter(([u]) => u.includes('/portraits/')).length
    const before = reads()
    // A failed download is tried again on a later refresh; a good one is not.
    const mock = fb.fetch as unknown as Mock<(u: string, i?: RequestInit) => Promise<Response>>
    const real = mock.getMockImplementation()!
    let fails = 1
    mock.mockImplementation(async (u, i) => {
      if (u.includes('/portraits/b') && fails-- > 0) throw new TypeError('Failed to fetch')
      return real(u, i)
    })
    act(() => {
      fb.set('tables/dragon42/portraits/b', { data: 'data:image/png;base64,Qg' })
      fb.set('tables/dragon42/chars/b/pv', 3)
    })
    await vi.waitFor(() => expect(fails).toBe(0))
    act(() => fb.set('tables/dragon42/chars/c/hp', 40)) // any change: the next refresh tries again
    await vi.waitFor(() => expect(screen.getByLabelText('Sheet: Bram').querySelector('.art')).toHaveStyle({ backgroundImage: 'url(data:image/png;base64,Qg)' }))
    expect(reads()).toBeGreaterThan(before)
    expect((fb.fetch as unknown as { mock: { calls: [string][] } }).mock.calls.filter(([u]) => u.includes('/portraits/a')).length).toBe(1)
  })

  it('removing a character asks with the browser box by default', async () => {
    const h = await gmPinHash('secret')
    const ask = vi.spyOn(window, 'confirm').mockReturnValue(false)
    setup({ tables: { dragon42: { meta: { dm: h }, chars: { a: { name: 'Lyra', cls: 'archer', hp: 5, maxHp: 10, st: 1, maxSt: 10, x10: true } } } } })
    type(/Table PIN/, 'dragon42')
    type(/Game Master PIN/, 'secret')
    click('Open as Game Master')
    click(await screen.findByRole('button', { name: 'Sheet' }).then((b) => b.textContent!))
    fireEvent.click(await screen.findByRole('button', { name: 'Remove character' }))
    expect(ask).toHaveBeenCalledWith('Remove Lyra?')
    ask.mockRestore()
  })
})

describe('<Game /> ability board', () => {
  it('shows uploaded ability pictures, reloading them when the GM changes one (retried after a failure)', async () => {
    const h = await gmPinHash('secret')
    const { fb } = setup({
      tables: {
        dragon42: {
          meta: { dm: h },
          board: { a: { n: 'Cleave', v: 'fighter', iv: 1 }, b: { n: 'Rally', v: 'fighter' } },
          abicons: { a: { data: 'data:image/png;base64,QQ' }, b: {} },
        },
      },
    })
    type(/Table PIN/, 'dragon42')
    type(/Game Master PIN/, 'secret')
    click('Open as Game Master')
    click(await screen.findByRole('button', { name: 'Abilities' }).then((b) => b.textContent!))
    await vi.waitFor(() => expect(screen.getByLabelText('Ability: Cleave').querySelector('img')).toHaveAttribute('src', 'data:image/png;base64,QQ'))
    expect(screen.getByLabelText('Ability: Rally').querySelector('img')).toBeNull()
    const mock = fb.fetch as unknown as Mock<(u: string, i?: RequestInit) => Promise<Response>>
    const real = mock.getMockImplementation()!
    let fails = 1
    mock.mockImplementation(async (u, i) => {
      if (u.includes('/abicons') && fails-- > 0) throw new TypeError('Failed to fetch')
      return real(u, i)
    })
    act(() => {
      fb.set('tables/dragon42/abicons/a', { data: 'data:image/png;base64,Qg' })
      fb.set('tables/dragon42/board/a/iv', 2)
    })
    await vi.waitFor(() => expect(fails).toBe(0))
    act(() => fb.set('tables/dragon42/board/b/c', 3)) // any change: the next refresh tries again
    await vi.waitFor(() => expect(screen.getByLabelText('Ability: Cleave').querySelector('img')).toHaveAttribute('src', 'data:image/png;base64,Qg'))
    // The pictures were deleted: none shown.
    act(() => {
      fb.set('tables/dragon42/abicons', null)
      fb.set('tables/dragon42/board/a/iv', 3)
    })
    await vi.waitFor(() => expect(screen.getByLabelText('Ability: Cleave').querySelector('img')).toBeNull())
    act(() => fb.set('tables/dragon42/abicons/a', { data: 'data:image/png;base64,Qg' }))
    act(() => fb.set('tables/dragon42/board/a/iv', 4))
    await vi.waitFor(() => expect(screen.getByLabelText('Ability: Cleave').querySelector('img')).not.toBeNull())
    // No pictures left: nothing to download.
    act(() => fb.set('tables/dragon42/board/a/iv', null))
    await vi.waitFor(() => expect(screen.getByLabelText('Ability: Cleave').querySelector('img')).toBeNull())
    // The Remove button asks with the browser box by default.
    const ask = vi.spyOn(window, 'confirm').mockReturnValue(false)
    fireEvent.click(within(screen.getByLabelText('Ability: Rally')).getByRole('button', { name: 'Remove' }))
    expect(ask).toHaveBeenCalledWith('Remove this ability from the board?')
    ask.mockRestore()
  })
})

describe('<Game /> table and map', () => {
  it('shows the map picture, token icons and custom markers; a jump from the sheet opens the map', async () => {
    const storage = memory()
    storage.setItem('next.st', JSON.stringify({ pin: 'dragon42', role: 'player', me: 'a' }))
    setup(
      {
        tables: {
          dragon42: {
            meta: { dm: 'h', mki: 2 },
            cur: 'm',
            maps: { m: { name: 'Crypt', w: 500, h: 400, cols: 10, iv: 3, al: ['1,1'] }, n: { name: 'Bare', w: 500, h: 400, cols: 10 } },
            mapimg: { m: { data: 'data:image/png;base64,TQ' } },
            mkicons: { al: { data: 'data:image/png;base64,QUw' } },
            icons: { a: { data: 'data:image/png;base64,QQ' }, w: { data: 'data:image/png;base64,Vw' } },
            chars: { a: { name: 'Lyra', cls: 'archer', hp: 50, maxHp: 50, st: 50, maxSt: 100, mx: 2, my: 2, iv: 1, mt: 'climb', mon: 'w', x10: true } },
            enemies: { w: { name: 'Wolf', hp: 9, max: 9, mx: 2, my: 2, iv: 1, x10: true }, z: { name: 'Zed', hp: 9, max: 9, x10: true } },
          },
        },
      },
      { storage },
    )
    const map = await screen.findByRole('img', { name: 'Map: Crypt' })
    await vi.waitFor(() => expect(map.innerHTML).toContain('data:image/png;base64,TQ'))
    await vi.waitFor(() => expect(map.innerHTML).toContain('data:image/png;base64,Vw'))
    await vi.waitFor(() => expect(map.innerHTML).toContain('data:image/png;base64,QUw'))
    click('Sheet')
    click('Jump off')
    expect(await screen.findByText(/Tap a free square within 3 squares of the monster to jump there\./)).toBeInTheDocument()
  })

  it('"you are here": the overview shows the map whose pin leads here', async () => {
    const storage = memory()
    storage.setItem('next.st', JSON.stringify({ pin: 'dragon42', role: 'player', me: 'a' }))
    setup(
      {
        tables: {
          dragon42: {
            meta: { dm: 'h' },
            cur: 'n',
            maps: { w: { name: 'World', w: 500, h: 400, cols: 10, pn: { p: { x: 5, y: 2, to: 'n', l: 'Crypt gate' } } }, n: { name: 'Crypt', w: 500, h: 400, cols: 10, iv: 2 } },
            mapimg: { w: { data: 'data:image/png;base64,V1' }, n: { data: 'data:image/png;base64,TQ' } },
            chars: { a: { name: 'Lyra', hp: 50, maxHp: 50, st: 50, maxSt: 100, x10: true } },
          },
        },
      },
      { storage },
    )
    const ov = await screen.findByLabelText('Overview')
    expect(ov).toHaveTextContent('You are here: Crypt gate')
    expect(ov.querySelector('img')).toHaveAttribute('src', 'data:image/png;base64,V1')
  })

  it('the GM looking at a map without a picture version still asks for it', async () => {
    const h = await gmPinHash('secret')
    const { fb } = setup({ tables: { dragon42: { meta: { dm: h }, maps: { n: { name: 'Bare', w: 500, h: 400, cols: 10 } }, mapimg: { n: { data: 'data:image/png;base64,Tg' } } } } })
    type(/Table PIN/, 'dragon42')
    type(/Game Master PIN/, 'secret')
    click('Open as Game Master')
    const map = await screen.findByRole('img', { name: 'Map: Bare' })
    expect(map.innerHTML).toContain('data:image/png;base64,Tg')
    expect((fb.fetch as unknown as { mock: { calls: [string][] } }).mock.calls.some(([u]) => u.includes('/mapimg/n'))).toBe(true)
  })
})

describe('<Game /> combat', () => {
  it("a player sees the GM's call to roll initiative and the 3-second prompt aimed at them", async () => {
    const storage = memory()
    storage.setItem('next.st', JSON.stringify({ pin: 'dragon42', role: 'player', me: 'a' }))
    const { fb } = setup(
      {
        tables: {
          dragon42: {
            meta: { dm: 'h' },
            cur: 'm',
            maps: { m: { name: 'Crypt', w: 500, h: 400, cols: 10 } },
            chars: { a: { name: 'Lyra', cls: 'fighter', hp: 50, maxHp: 50, st: 50, maxSt: 100, dex: 12, mx: 2, my: 2, x10: true } },
            init: { ph: 'roll', l: [{ k: 'c:a', n: 'Lyra' }], i: 0, r: 1 },
            qte: { id: 5, tid: 'a', total: 15, melee: true, par: true, from: 'Wolf' },
          },
        },
      },
      { storage },
    )
    expect(await screen.findByText('⚠ Wolf is attacking you!')).toBeInTheDocument()
    click('Dodge · 30 St')
    await vi.waitFor(() => expect(fb.get('tables/dragon42/qte/sv')).toMatchObject({ t: expect.any(Number) }))
    expect(screen.queryByText('⚠ Wolf is attacking you!')).not.toBeInTheDocument()
    click('Roll initiative')
    await vi.waitFor(() => expect(fb.writes.map((w) => w[1])).toContain('/tables/dragon42/init/l/0'))
  })
})

describe('<Game /> dice', () => {
  it("rolls from the Dice card are shown and shared; other players' new rolls play here; the dice style is remembered", async () => {
    const storage = memory()
    storage.setItem('next.st', JSON.stringify({ pin: 'dragon42', role: 'player', me: 'a' }))
    storage.setItem('sk', 'gold')
    const jobs: DiceJob[] = []
    const player: DicePlayer = { play: async (j) => void jobs.push(j), init: () => {}, physics: () => false }
    const old = { n: 'Bo', ds: [{ d: 6, r: 3 }], ts: 1000, by: 'b', sk: 'red' }
    const { fb } = setup(
      { tables: { dragon42: { meta: { dm: 'h' }, chars: { a: { name: 'Lyra', hp: 50, maxHp: 50, st: 50, maxSt: 100, x10: true } }, rolls: { r1: old } } } },
      { storage, player },
    )
    expect(await screen.findByText('Bo rolled d6:')).toBeInTheDocument()
    expect(screen.getByLabelText('Dice style')).toHaveValue('gold')
    click('d20')
    await vi.waitFor(() => expect(jobs).toHaveLength(1))
    expect(jobs[0]).toMatchObject({ ds: [20], sk: 'gold', who: null, remote: false })
    expect(fb.writes.filter((w) => w[1] === '/tables/dragon42/rolls')[0]![2]).toMatchObject({ n: 'Lyra', sk: 'gold', by: 'a' })
    // A new roll by someone else plays here (the one already there did not); my own and secret ones do not.
    fb.set('tables/dragon42/rolls/r2', { n: 'Bo', ds: [{ d: 8, r: 7 }], m: 1, ts: 1000, by: 'b' })
    fb.set('tables/dragon42/rolls/r3', { n: 'GM', ds: [{ d: 8, r: 7 }], ts: 1000, by: 'gm', s: 1 })
    await vi.waitFor(() => expect(jobs).toHaveLength(2))
    expect(jobs[1]).toEqual({ ds: [8], res: [{ d: 8, r: 7 }], m: 1, sk: 'classic', who: 'Bo', remote: true })
    fb.set('tables/dragon42/rolls/r4', { ds: [{ d: 4, r: 2 }], ts: 1000, by: 'b', sk: 'lava' })
    await vi.waitFor(() => expect(jobs).toHaveLength(3))
    expect(jobs[2]).toMatchObject({ who: null, m: 0, sk: 'lava' })
    fireEvent.change(screen.getByLabelText('Dice style'), { target: { value: 'ice' } })
    expect(storage.m.get('sk')).toBe('ice')
    fireEvent.change(screen.getByLabelText('Bonus'), { target: { value: '2' } })
    expect(storage.m.get('sk')).toBe('ice')
  })

  it('the dice style is Ivory when none was chosen', async () => {
    const storage = memory()
    storage.setItem('next.st', JSON.stringify({ pin: 'dragon42', role: 'player', me: 'a' }))
    setup({ tables: { dragon42: { meta: { dm: 'h' }, chars: { a: { name: 'Lyra', hp: 50, maxHp: 50, st: 50, maxSt: 100, x10: true } } } } }, { storage })
    expect(await screen.findByLabelText('Dice style')).toHaveValue('classic')
  })
})

describe('<Game /> attack scenes', () => {
  it("another player's attack scene plays here, with the token pictures", async () => {
    const storage = memory()
    storage.setItem('next.st', JSON.stringify({ pin: 'dragon42', role: 'player', me: 'a' }))
    const { fb } = setup(
      {
        tables: {
          dragon42: {
            meta: { dm: 'h' },
            cur: 'm',
            maps: { m: { name: 'Crypt', w: 500, h: 400, cols: 10, iv: 1 } },
            mapimg: { m: { data: 'data:image/png;base64,TQ' } },
            icons: { a: { data: 'data:image/png;base64,QQ' } },
            chars: { a: { name: 'Lyra', hp: 50, maxHp: 50, st: 50, maxSt: 100, mx: 1, my: 1, iv: 1, x10: true } },
            enemies: { w: { name: 'Wolf', hp: 9, max: 9, mx: 2, my: 1, x10: true } },
          },
        },
      },
      { storage },
    )
    const map = await screen.findByRole('img', { name: 'Map: Crypt' })
    await vi.waitFor(() => expect(map.innerHTML).toContain('data:image/png;base64,QQ'))
    fb.set('tables/dragon42/rolls/f1', { fx: { a: 'e:w', t: 'c:a', an: 'Wolf', tn: 'Lyra', o: 'hit', d: 20 }, ts: 1000, by: 'gm' })
    const scene = await screen.findByRole('img', { name: 'Wolf attacks Lyra' })
    expect(scene.querySelector('.R img')).toHaveAttribute('src', 'data:image/png;base64,QQ')
    expect(scene.querySelector('.L .em')).toHaveTextContent('W')
  })

  it("the GM's boss intro shows here with the boss art", async () => {
    const storage = memory()
    storage.setItem('next.st', JSON.stringify({ pin: 'dragon42', role: 'player', me: 'a' }))
    const { fb } = setup(
      {
        tables: {
          dragon42: {
            meta: { dm: 'h' },
            cur: 'm',
            maps: { m: { name: 'Crypt', w: 500, h: 400, cols: 10, iv: 1 } },
            mapimg: { m: { data: 'data:image/png;base64,TQ' } },
            bossart: { w: { data: 'data:image/webp;base64,QVJU' } },
            chars: { a: { name: 'Lyra', hp: 50, maxHp: 50, st: 50, maxSt: 100, mx: 1, my: 1, x10: true } },
            enemies: { w: { name: 'Aethelric', hp: 9, max: 9, mx: 2, my: 1, ba: 3, x10: true } },
          },
        },
      },
      { storage },
    )
    await screen.findByRole('img', { name: 'Map: Crypt' })
    await vi.waitFor(() => expect((fb.fetch as unknown as { mock: { calls: [string][] } }).mock.calls.some(([u]) => u.includes('/bossart/w'))).toBe(true))
    await new Promise((r) => setTimeout(r, 50))
    fb.set('tables/dragon42/rolls/b1', { boss: { k: 'e:w', n: 'Aethelric', t: 'The First', th: '' }, ts: 1000, by: 'gm' })
    const intro = await screen.findByRole('img', { name: 'Boss: Aethelric' })
    expect(intro.querySelector('img')).toHaveAttribute('src', 'data:image/webp;base64,QVJU')
  })
})

describe('<Game /> coming back', () => {
  it('rejoins the saved table, or forgets it when the table is gone', async () => {
    const storage = memory()
    storage.setItem('next.st', JSON.stringify({ pin: 'dragon42', role: 'gm', me: 'gm' }))
    setup({ tables: { dragon42: { meta: { dm: 'h' } } } }, { storage })
    expect(await screen.findByText('Game Master')).toBeInTheDocument()
    cleanup()
    const gone = memory()
    gone.setItem('next.st', JSON.stringify({ pin: 'deleted1', role: 'gm', me: 'gm' }))
    setup({}, { storage: gone })
    await vi.waitFor(() => expect(gone.m.has('next.st')).toBe(false))
    expect(screen.getByRole('heading', { name: 'Join a table' })).toBeInTheDocument()
  })

  it('stays on the join screen when the database cannot be reached, and with an old session lacking a role', async () => {
    const storage = memory()
    storage.setItem('next.st', JSON.stringify({ pin: 'dragon42', role: 'player', me: 'p1' }))
    const fb = fakeFirebase()
    fb.setOffline(true)
    render(<Game fetchImpl={fb.fetch} storage={storage} hash="" every={20} />)
    await new Promise((r) => setTimeout(r, 30))
    expect(screen.getByRole('heading', { name: 'Join a table' })).toBeInTheDocument()
    expect(storage.m.has('next.st')).toBe(true)
    cleanup()
    const half = memory()
    half.setItem('next.st', JSON.stringify({ pin: 'dragon42' }))
    setup({ tables: { dragon42: { meta: {} } } }, { storage: half })
    expect(screen.getByRole('heading', { name: 'Join a table' })).toBeInTheDocument()
  })

  it('a saved table display session without an id rejoins', async () => {
    const storage = memory()
    storage.setItem('next.st', JSON.stringify({ pin: 'dragon42', role: 'table' }))
    setup({ tables: { dragon42: { meta: { dm: 'h' }, chars: { x: {} }, enemies: { e: { pl: 'Phase 2' } } } } }, { storage })
    expect(await screen.findByText('Waiting for the GM to show a map…')).toBeInTheDocument()
  })

  it('shows problems that happen while playing', async () => {
    const { fb } = setup({ tables: { dragon42: { meta: { dm: 'h' } } } })
    type(/Table PIN/, 'dragon42')
    click('Join as player')
    await screen.findByRole('heading', { name: 'Create your character' })
    fb.setOffline(true)
    expect(await screen.findByRole('alert')).toHaveTextContent('Connection problem: Failed to fetch')
  })
})

describe('<Game /> enemies and cinematics', () => {
  const boss = async (extra: Record<string, unknown> = {}, opts: { confirm?: (q: string) => boolean } = {}) => {
    const h = await gmPinHash('secret')
    const fb = fakeFirebase({
      tables: {
        dragon42: {
          meta: { dm: h },
          themes: { firstdefier: { n: 'x' } },
          bossart: { a: { data: 'data:image/png;base64,QUFB' } },
          enemies: { a: { name: 'Aethelric', hp: 100, max: 100, mx: 1, my: 1, gt: '[portrait] Hello', x10: true } },
          init: { l: [{ k: 'e:a' }], t: 0 },
          ...extra,
        },
      },
    })
    const storage = memory()
    render(<Game fetchImpl={fb.fetch} storage={storage} hash="" every={20} now={() => Date.now()} confirm={opts.confirm ?? (() => true)} rand={() => 0.5} />)
    type(/Table PIN/, 'dragon42')
    type(/Game Master PIN/, 'secret')
    click('Open as Game Master')
    await screen.findByRole('heading', { name: 'Enemies' })
    return { fb, storage }
  }

  it('the GM sees the Enemies panel, opens an editor (remembered) and edits', async () => {
    const { fb, storage } = await boss()
    click("Show or hide Aethelric's settings")
    expect(JSON.parse(storage.m.get('eop')!)).toEqual(['a'])
    expect(screen.getByRole('option', { name: 'Aethelric, phase 2 (The First Defier)' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'firstdefier' } })
    await vi.waitFor(() => expect(fb.get('tables/dragon42/enemies/a/th')).toBe('firstdefier'))
    click("Show or hide Aethelric's settings")
    expect(JSON.parse(storage.m.get('eop')!)).toEqual([])
    // Players never get the panel.
    click('View as player')
    expect(screen.queryByRole('heading', { name: 'Enemies' })).toBeNull()
  })

  it('a theme key without a known name shows the key', async () => {
    await boss({ themes: { custom: { n: 'x' } } })
    click("Show or hide Aethelric's settings")
    expect(screen.getByRole('option', { name: 'custom' })).toBeInTheDocument()
  })

  it('Play cinematic shows it with the boss art and shares it; vanishing takes him off the board', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const { fb } = await boss()
      fb.set('tables/dragon42/enemies/a/gv', 1)
      click("Show or hide Aethelric's settings")
      await vi.waitFor(() => expect(screen.getByLabelText(/vanishes from the board/)).toBeChecked())
      click('Play cinematic')
      const dlg = await screen.findByRole('dialog', { name: 'Cinematic: Aethelric' })
      expect(dlg.querySelector('img')).toHaveAttribute('src', 'data:image/png;base64,QUFB')
      expect(fb.writes.some(([m, p, b]) => m === 'POST' && p.endsWith('/rolls') && (b as { cin?: unknown }).cin)).toBe(true)
      await act(async () => void (await vi.advanceTimersByTimeAsync(8000)))
      await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      await vi.waitFor(() => expect(fb.get('tables/dragon42/enemies/a/mx')).toBeNull())
      expect(fb.get('tables/dragon42/init/l')).toEqual([])
    } finally {
      vi.useRealTimers()
    }
  })

  it('a cinematic started on another device plays here; old ones and its own do not', async () => {
    const { fb } = await boss({ rolls: { old: { cin: { t: 'Old', n: 'X', k: 'e:a' }, ts: Date.now(), by: 'p9' } }, bossart: {}, icons: { a: { data: 'data:image/png;base64,SUNP' } } })
    await new Promise((r) => setTimeout(r, 60))
    expect(screen.queryByRole('dialog')).toBeNull() // already there when we joined
    act(() => fb.set('tables/dragon42/rolls/new1', { cin: { t: '[portrait] Now', n: 'Aethelric', k: 'e:a' }, ts: Date.now(), by: 'p9' }))
    const dlg = await screen.findByRole('dialog', { name: 'Cinematic: Aethelric' })
    await vi.waitFor(() => expect(dlg.querySelector('img')).toHaveAttribute('src', 'data:image/png;base64,SUNP'))
    act(() => fb.set('tables/dragon42/rolls/new2', { cin: { t: 'No picture here', n: 'Plain', k: 'e:a' }, ts: Date.now(), by: 'p9' }))
    expect(await screen.findByRole('dialog', { name: 'Cinematic: Plain' })).toBeInTheDocument()
  })

  it('a portrait scene without any art plays without a picture, and a failed theme list is empty', async () => {
    const h = await gmPinHash('secret')
    const fb = fakeFirebase({ tables: { dragon42: { meta: { dm: h }, enemies: { a: { name: 'A', gt: '[portrait] Hi', x10: true } } } } })
    const real = fb.fetch
    const f = (async (u: string, i?: RequestInit) => {
      if (String(u).includes('/themes.json') || String(u).includes('/bossart/')) throw new Error('down')
      return real(u, i)
    }) as typeof fetch
    render(<Game fetchImpl={f} storage={memory()} hash="" every={20} confirm={() => true} />)
    type(/Table PIN/, 'dragon42')
    type(/Game Master PIN/, 'secret')
    click('Open as Game Master')
    click(await screen.findByRole('button', { name: "Show or hide A's settings" }).then((b) => b.getAttribute('aria-label')!))
    expect(screen.getByLabelText('Theme').querySelectorAll('option')).toHaveLength(1)
    click('Play cinematic')
    const dlg = await screen.findByRole('dialog')
    expect(dlg.querySelector('img')).toBeNull()
  })
})
