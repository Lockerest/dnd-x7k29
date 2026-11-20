// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MapEntry, Tool } from '../../logic/mapTools'
import { emptyTables, type Tables } from '../../state/store'
import type { ImageKit } from '../images'
import { pinPrompts, toolNote } from './mapPrompts'
import { MapTools, Overview } from './MapTools'

afterEach(cleanup)

const M = (o: Partial<MapEntry> = {}): MapEntry => ({ name: 'Crypt', w: 500, h: 400, cols: 10, ...o })
const tables = (o: Partial<Tables> = {}): Tables => ({ ...emptyTables(), maps: { m: M(), n: M({ name: 'Cave' }) }, cur: 'm', ...o })
const actions = () => ({
  setTool: vi.fn(),
  setMap: vi.fn(async (_p: object) => {}),
  setCols: vi.fn(async () => {}),
  addMap: vi.fn(async () => {}),
  renameMap: vi.fn(async () => {}),
  deleteMap: vi.fn(async () => {}),
  setMarkerIcon: vi.fn(async () => {}),
  showMap: vi.fn(async () => {}),
  setGmMap: vi.fn(),
  notice: vi.fn(),
})
const images = (o: { fail?: boolean } = {}): ImageKit => ({
  load: async () => {
    if (o.fail) throw new Error('bad')
    return { width: 100, height: 50, source: {} as CanvasImageSource }
  },
  canvas: () => ({ draw: () => {}, toDataURL: (t) => `data:${t}` }),
})
function show(o: { t?: Tables; id?: string | null; tool?: Tool; ask?: (q: string, d?: string) => string | null; confirm?: boolean; img?: ImageKit } = {}) {
  const a = actions()
  const ask = vi.fn(o.ask ?? ((_q: string, _d?: string) => null))
  const confirm = vi.fn((_q: string) => o.confirm ?? true)
  render(<MapTools tables={o.t ?? tables()} id={o.id === undefined ? 'm' : o.id} tool={o.tool ?? 'move'} actions={a} images={o.img ?? images()} ask={ask} confirm={confirm} />)
  return { a, ask, confirm }
}
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const file = (label: string, f: File) => fireEvent.change(screen.getByLabelText(label), { target: { files: [f] } })
const flush = () => act(async () => void (await new Promise((r) => setTimeout(r, 50))))

describe('the map list', () => {
  it('picks a map (the live one marked), shows it to players, renames and deletes it', () => {
    const { a, ask } = show({ ask: () => 'Deep Crypt' })
    const sel = screen.getByLabelText('Map')
    expect([...sel.querySelectorAll('option')].map((o) => o.textContent)).toEqual(['Crypt (live)', 'Cave'])
    fireEvent.change(sel, { target: { value: 'n' } })
    expect(a.setGmMap).toHaveBeenCalledWith('n')
    click('Show to players')
    expect(a.showMap).toHaveBeenCalledWith('m')
    click('Rename')
    expect(ask).toHaveBeenCalledWith('Map name', 'Crypt')
    expect(a.renameMap).toHaveBeenCalledWith('Deep Crypt')
    click('Delete')
    expect(a.deleteMap).toHaveBeenCalled()
  })

  it('a cancelled rename or delete does nothing; no maps: only New map and Import', () => {
    const { a } = show({ ask: () => null, confirm: false, t: tables({ maps: { m: { w: 1, h: 1 } } }) })
    expect(screen.getByLabelText('Map').querySelector('option')!.textContent).toBe('m (live)')
    click('Rename')
    click('Delete')
    expect(a.renameMap).not.toHaveBeenCalled()
    expect(a.deleteMap).not.toHaveBeenCalled()
    cleanup()
    show({ t: tables({ maps: {} }), id: null })
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['New map', 'Import Dungeondraft'])
  })
})

describe('adding maps', () => {
  it('New map opens the file box; the picture is shrunk and saved with the file name', async () => {
    const { a } = show()
    const input = screen.getByLabelText('Map picture') as HTMLInputElement
    const clickSpy = vi.spyOn(input, 'click')
    click('New map')
    expect(clickSpy).toHaveBeenCalled()
    file('Map picture', new File(['x'], 'Sewers.png', { type: 'image/png' }))
    await flush()
    expect(a.addMap).toHaveBeenCalledWith('data:image/jpeg', 100, 50, 'Sewers.png')
    fireEvent.change(input, { target: { files: [] } }) // nothing chosen
    expect(a.addMap).toHaveBeenCalledTimes(1)
  })

  it('a picture that cannot be read says so; a nameless file is "Map"', async () => {
    const { a } = show({ img: images({ fail: true }) })
    file('Map picture', new File(['x'], 'bad.png'))
    await flush()
    expect(a.notice).toHaveBeenCalledWith("Couldn't read that map image.")
    cleanup()
    const ok = show()
    file('Map picture', new File(['x'], ''))
    await flush()
    expect(ok.a.addMap).toHaveBeenCalledWith('data:image/jpeg', 100, 50, 'Map')
  })

  it('Import Dungeondraft: reads the export, says so while importing, saves with its squares, walls and doors', async () => {
    const { a } = show()
    const input = screen.getByLabelText('Dungeondraft file') as HTMLInputElement
    const clickSpy = vi.spyOn(input, 'click')
    click('Import Dungeondraft')
    expect(clickSpy).toHaveBeenCalled()
    const dd = { resolution: { map_size: { x: 4, y: 3 } }, image: 'iVBO', line_of_sight: [[{ x: 0, y: 1 }, { x: 1, y: 1 }]] }
    file('Dungeondraft file', new File([JSON.stringify(dd)], 'Vault.dd2vtt'))
    await flush()
    expect(a.notice.mock.calls.map((c) => c[0])).toEqual(['Importing Vault.dd2vtt...', ''])
    expect(a.addMap).toHaveBeenCalledWith('data:image/jpeg', 100, 50, 'Vault.dd2vtt', { cols: 4, ew: ['h,0,1'], dr: {} })
  })

  it('a bad export, one without a picture, or a picture that fails says so', async () => {
    const { a } = show()
    file('Dungeondraft file', new File(['{oops'], 'x.dd2vtt'))
    await flush()
    file('Dungeondraft file', new File(['{}'], 'x.dd2vtt'))
    await flush()
    expect(a.notice.mock.calls.map((c) => c[0])).toEqual(["That file isn't a valid Dungeondraft (.dd2vtt) export.", 'This file has no map image or grid information.'])
    cleanup()
    const bad = show({ img: images({ fail: true }) })
    file('Dungeondraft file', new File([JSON.stringify({ resolution: { map_size: { x: 2, y: 2 } }, image: 'iVBO' })], 'x.dd2vtt'))
    await flush()
    expect(bad.a.notice).toHaveBeenLastCalledWith("Couldn't read that map image.")
  })
})

describe('tools and switches', () => {
  it('the tool buttons, the current one highlighted', () => {
    const { a } = show({ tool: 'wall' })
    expect(screen.getByRole('button', { name: 'Draw walls' })).toHaveClass('pri')
    for (const [name, t] of [
      ['Move tokens', 'move'],
      ['Reveal', 'rev'],
      ['Hide', 'hid'],
      ['Altar', 'al'],
      ['Bonfire', 'bf'],
      ['Guild', 'gd'],
      ['Doors', 'dr'],
      ['Place door', 'nd'],
      ['Pins', 'pin'],
      ['Entry', 'en'],
    ]) {
      click(name!)
      expect(a.setTool).toHaveBeenLastCalledWith(t)
    }
  })

  it('grid, fog, overview, reveal and hide all, clear walls (asked first)', () => {
    const { a, confirm } = show({ t: tables({ maps: { m: M({ fog: true }) } }) })
    click('Grid: on')
    click('Fog: on')
    click('Overview: on')
    click('Reveal all')
    click('Hide all')
    click('Clear walls')
    click('Clear imported walls')
    expect(confirm.mock.calls.map((c) => c[0])).toEqual(['Remove all walls on this map?', 'Remove all imported walls and doors from this map?'])
    expect(a.setMap.mock.calls.map((c) => c[0])).toEqual([{ grid: false }, { fog: false }, { ov: false }, { fog: true, fg: '1'.repeat(80) }, { fog: true, fg: '' }, { walls: [] }, { ew: [], dr: {} }])
    cleanup()
    const off = show({ t: tables({ maps: { m: M({ grid: false, ov: false }) } }), confirm: false })
    click('Grid: off')
    click('Overview: off')
    click('Fog: off')
    click('Clear walls')
    click('Clear imported walls')
    expect(off.a.setMap.mock.calls.map((c) => c[0])).toEqual([{ grid: true }, { ov: true }, { fog: true }])
  })

  it('squares across: saved when the box is left (or Enter), only if it changed', () => {
    const { a } = show()
    const box = screen.getByLabelText('Squares across') as HTMLInputElement
    expect(box.value).toBe('10')
    fireEvent.blur(box)
    fireEvent.change(box, { target: { value: '14' } })
    fireEvent.keyDown(box, { key: 'a' })
    fireEvent.keyDown(box, { key: 'Enter' })
    fireEvent.blur(box)
    expect(a.setCols).toHaveBeenCalledWith('14')
    cleanup()
    const def = show({ t: tables({ maps: { m: { w: 240, h: 240 } } }) })
    const box2 = screen.getByLabelText('Squares across') as HTMLInputElement
    expect(box2.value).toBe('24')
    fireEvent.change(box2, { target: { value: '30' } })
    fireEvent.blur(box2)
    expect(def.a.setCols).toHaveBeenCalledWith('30')
  })

  it('altar, bonfire and guild icons: picked, squared and saved; the defaults asked first', async () => {
    const { a } = show()
    const input = screen.getByLabelText('Icon picture') as HTMLInputElement
    const clickSpy = vi.spyOn(input, 'click')
    click('Bonfire icon')
    expect(clickSpy).toHaveBeenCalled()
    file('Icon picture', new File(['x'], 'fire.png'))
    await flush()
    expect(a.setMarkerIcon).toHaveBeenCalledWith('bf', 'data:image/png')
    click('Guild icon')
    file('Icon picture', new File(['x'], 'mug.png'))
    await flush()
    expect(a.setMarkerIcon).toHaveBeenLastCalledWith('gd', 'data:image/png')
    click('Altar icon')
    click('Default icons')
    expect(a.setMarkerIcon).toHaveBeenLastCalledWith(null)
    cleanup()
    const bad = show({ img: images({ fail: true }), confirm: false })
    click('Altar icon')
    file('Icon picture', new File(['x'], 'x.png'))
    await flush()
    expect(bad.a.notice).toHaveBeenCalledWith("Couldn't read that image.")
    click('Default icons')
    expect(bad.a.setMarkerIcon).not.toHaveBeenCalled()
  })
})

describe('notes and pin prompts', () => {
  it('a note for each tool', () => {
    expect(toolNote('wall', M())).toBe(' Tap or drag to draw walls.')
    expect(toolNote('dr', M())).toMatch(/has no doors/)
    expect(toolNote('dr', M({ dr: { a: { p: [1, 1] } } }))).toBe(' Tap a door to open or close it.')
    expect(toolNote('nd', M())).toMatch(/place a door/)
    expect(toolNote('pin', M())).toMatch(/add a pin/)
    expect(toolNote('en', M())).toMatch(/should arrive/)
    expect(toolNote('rev', M())).toBe(' Tap or drag to reveal areas.')
    expect(toolNote('hid', M())).toBe(' Tap or drag to hide areas.')
    expect(toolNote('move', M())).toBe('')
  })

  it('a tap on a pin: travel, rename, delete, or nothing', () => {
    const maps = { m: M({ pn: { p: { x: 1, y: 1, to: 'n', l: 'Down' } } }), n: M({ name: 'Cave' }), o: M({ name: 'Tower', pn: { q: { x: 1, y: 1, to: 'gone', l: 'Lost' } } }) }
    const a = { travel: vi.fn(), renamePin: vi.fn(), deletePin: vi.fn(), addPin: vi.fn(), notice: vi.fn() }
    const answers = (...xs: (string | null)[]) => vi.fn((_q: string, _d?: string) => xs.shift() ?? null)
    const ask = answers('1')
    pinPrompts(maps, 'm', { pin: 'p' }, ask, a)
    expect(ask.mock.calls[0]![0]).toBe('Pin "Down" leads to "Cave".\n1 = travel there now (moves the whole party)\n2 = rename\n3 = delete')
    expect(a.travel).toHaveBeenCalledWith('n')
    const ren = answers('2', 'Stairs')
    pinPrompts(maps, 'm', { pin: 'p' }, ren, a)
    expect(ren.mock.calls[1]).toEqual(['New label:', 'Down'])
    expect(a.renamePin).toHaveBeenCalledWith('p', 'Stairs')
    pinPrompts(maps, 'm', { pin: 'p' }, answers('2', ''), a)
    pinPrompts(maps, 'm', { pin: 'p' }, answers('3'), a)
    expect(a.deletePin).toHaveBeenCalledWith('p')
    pinPrompts(maps, 'm', { pin: 'p' }, answers(null), a)
    const lost = answers(null)
    pinPrompts(maps, 'o', { pin: 'q' }, lost, a)
    expect(lost.mock.calls[0]![0]).toMatch(/leads to "\?"/)
    expect(a.renamePin).toHaveBeenCalledTimes(1)
  })

  it('a new pin: which map (numbered), its label (the map name by default, 24 letters)', () => {
    const maps = { m: M(), n: M({ name: 'Cave' }), o: M({ name: 'Tower' }) }
    const a = { travel: vi.fn(), renamePin: vi.fn(), deletePin: vi.fn(), addPin: vi.fn(), notice: vi.fn() }
    const ask = vi.fn((_q: string, _d?: string): string | null => null).mockReturnValueOnce('2').mockReturnValueOnce('')
    pinPrompts(maps, 'm', { newPin: { x: 1.5, y: 2.5 } }, ask, a)
    expect(ask.mock.calls[0]![0]).toBe('Link this pin to which map? Type a number:\n1. Cave\n2. Tower')
    expect(ask.mock.calls[1]).toEqual(['Pin label (shown on the map):', 'Tower'])
    expect(a.addPin).toHaveBeenCalledWith(1.5, 2.5, 'o', 'Tower')
    pinPrompts(maps, 'm', { newPin: { x: 1, y: 1 } }, vi.fn().mockReturnValueOnce('1').mockReturnValueOnce('A label far longer than twenty four'), a)
    expect(a.addPin).toHaveBeenLastCalledWith(1, 1, 'n', 'A label far longer than ')
    pinPrompts(maps, 'm', { newPin: { x: 1, y: 1 } }, () => '9', a)
    pinPrompts(maps, 'm', { newPin: { x: 1, y: 1 } }, () => null, a)
    expect(a.addPin).toHaveBeenCalledTimes(2)
    pinPrompts({ m: M() }, 'm', { newPin: { x: 1, y: 1 } }, () => '1', a)
    expect(a.notice).toHaveBeenCalledWith('Add another map first, then link a pin to it.')
  })
})

describe('the overview', () => {
  const maps = { top: M({ name: 'World', w: 400, h: 200, pn: { p: { x: 2, y: 3, to: 'm', l: 'Crypt gate' } } }), m: M(), lone: M() }
  it('"you are here" on the map with a pin leading here', () => {
    render(<Overview maps={maps} id="m" images={{ top: 'data:top' }} />)
    const o = screen.getByLabelText('Overview')
    expect(o).toHaveTextContent('You are here: Crypt gate')
    expect(o.querySelector('img')).toHaveAttribute('src', 'data:top')
    expect(o.querySelector('i')).toHaveStyle({ left: '20%', top: '60%' })
  })

  it('the map name when the pin has none; nothing when off, without a parent or its picture', () => {
    const noLabel = { ...maps, top: M({ w: 240, h: 10, cols: undefined, pn: { p: { x: 1, y: 1, to: 'm', l: '' } } }) }
    render(<Overview maps={noLabel} id="m" images={{ top: 'd' }} />)
    expect(screen.getByLabelText('Overview')).toHaveTextContent('You are here: Crypt')
    expect(screen.getByLabelText('Overview').querySelector('i')).toHaveStyle({ top: '100%' })
    cleanup()
    for (const [mm, id, im] of [
      [{ ...maps, m: M({ ov: false }) }, 'm', { top: 'd' }],
      [maps, 'lone', { top: 'd' }],
      [maps, 'm', {}],
      [maps, null, { top: 'd' }],
    ] as [Record<string, MapEntry>, string | null, Record<string, string>][]) {
      const { container } = render(<Overview maps={mm} id={id} images={im} />)
      expect(container).toBeEmptyDOMElement()
      cleanup()
    }
  })
})
