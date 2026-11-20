// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { gmPinHash } from '../logic/join'
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

function setup(tree: Record<string, unknown> = {}, opts: { storage?: ReturnType<typeof memory>; hash?: string } = {}) {
  const fb = fakeFirebase(tree)
  const storage = opts.storage ?? memory()
  let n = 0
  render(<Game fetchImpl={fb.fetch} storage={storage} hash={opts.hash ?? ''} every={20} newId={() => `p${++n}`} now={() => 1000} />)
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
    expect(screen.getByRole('heading', { name: 'The table' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'live table' })).toHaveAttribute('href', '../')
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
    expect(await screen.findByRole('heading', { name: 'Table display' })).toBeInTheDocument()
    expect(await screen.findByText('Wolf: HP 50 / 50')).toBeInTheDocument()
    expect(screen.getByText('Golem: HP 9 / 9, on the map')).toBeInTheDocument()
    expect(screen.getByText('Player')).toBeInTheDocument()
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
    expect(await screen.findByRole('heading', { name: 'The table' })).toBeInTheDocument()
    // Tabs now work.
    click('Sheet')
    expect(screen.getByRole('heading', { name: 'Character sheets' })).toBeInTheDocument()
    click('Table')
    click('Abilities')
    expect(screen.getByRole('heading', { name: 'Ability board' })).toBeInTheDocument()
    click('Back to table')
    expect(screen.getByRole('heading', { name: 'The table' })).toBeInTheDocument()
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
    expect(await screen.findByRole('heading', { name: 'The table' })).toBeInTheDocument()
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
    expect(screen.getByRole('heading', { name: 'The table' })).toBeInTheDocument()
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
    expect(await screen.findByRole('heading', { name: 'Table display' })).toBeInTheDocument()
    // Missing names and numbers show as the id and "?".
    expect(await screen.findByText('x: HP ? / ?, stamina ? / ?')).toBeInTheDocument()
    expect(screen.getByText('e: HP ? / ?, Phase 2')).toBeInTheDocument()
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
