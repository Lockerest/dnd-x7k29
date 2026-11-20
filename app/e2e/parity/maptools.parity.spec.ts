// Parity for the GM's map tools: every tool tap and drag, the map buttons, pins
// (with their prompts), party travel, and adding or deleting maps must save
// exactly what the live page saves. The live page is driven through its own map
// and buttons, with its prompt and confirm boxes answered by the test.
import type { Page } from '@playwright/test'
import { expect, test } from '../harness.ts'
import type { MapEntry, Tool } from '../../src/logic/mapTools.ts'
import type { Sheet } from '../../src/logic/sheet.ts'
import type { Enemy } from '../../src/logic/types.ts'
import { createGameStore, emptyTables } from '../../src/state/store.ts'
import { clean, rng } from './random.ts'
import { CAPTURE, noTs, recDb, type W } from './store.ts'

type R = ReturnType<typeof rng>
type Case = { maps: Record<string, MapEntry>; cur: string; gmMap: string; chars: Record<string, Sheet>; enemies: Record<string, Enemy> }

const COLS = 10
const ROWS = 8

function randomMap(r: R, name: string, extra: Partial<MapEntry> = {}): MapEntry {
  const sq = () => `${r.int(0, COLS - 1)},${r.int(0, ROWS - 1)}`
  const list = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`k${i}`, sq()]))
  return clean({
    name,
    v2: 1,
    w: COLS * 50,
    h: ROWS * 50,
    cols: COLS,
    iv: 1,
    grid: r.maybe(false, 0.3),
    ov: r.maybe(false, 0.3),
    fog: r.maybe(1, 0.6),
    fg: r.maybe(r.str('0001', COLS * ROWS, COLS * ROWS), 0.5),
    walls: list(r.int(0, 8)),
    ew: r.maybe(['h,1,1', 'v,2,2'], 0.4),
    dr: Object.fromEntries(Array.from({ length: r.int(0, 2) }, (_, i) => [`d${i}`, { c: sq(), o: r.maybe(1), p: [r.int(0, COLS - 1) + 0.5, r.int(0, ROWS - 1) + 0.5] }])),
    al: list(r.int(0, 2)),
    bf: list(r.int(0, 2)),
    gd: r.maybe(list(r.int(0, 2)), 0.5),
    en: r.maybe([r.int(0, COLS - 1) + 0.5, r.int(0, ROWS - 1) + 0.5], 0.5),
    pn: r.maybe({ p0: { x: r.int(0, COLS - 1) + 0.5, y: r.int(0, ROWS - 1) + 0.5, to: 'n', l: 'Stairs' } }, 0.6),
    ...extra,
  })
}

function randomCase(r: R): Case {
  const maps = { m: randomMap(r, 'Crypt'), n: randomMap(r, 'Cave'), o: randomMap(r, 'Tower') }
  const unit = (name: string) => clean({ name, x10: true, hp: r.pick([0, 20]), maxHp: 20, mp: r.maybe(r.pick(['m', 'n']), 0.6), mx: r.maybe(r.int(0, COLS - 1), 0.8), my: r.int(0, ROWS - 1), ap: r.maybe('no', 0.15) })
  const chars = { a: unit('Lyra'), b: unit('Bram'), c: unit('Cid') } as Record<string, Sheet>
  const enemies = { w: unit('Wolf'), o: unit('Ogre') } as Record<string, Enemy>
  return { maps, cur: r.pick(['m', 'n']), gmMap: r.pick(['m', 'n', 'o']), chars, enemies }
}

const SETUP = (c: Case, tool: Tool, answers: (string | null)[] = []) =>
  `${CAPTURE}$("#err").textContent="";pin="t";role="gm";canGM=true;dm=true;me="gm";hideL=false;
   chars=${JSON.stringify(c.chars)};enemies=${JSON.stringify(c.enemies)};maps=${JSON.stringify(c.maps)};cur=${JSON.stringify(c.cur)};
   IM={m:{data:"data:,"},n:{data:"data:,"},o:{data:"data:,"}};gmMap=${JSON.stringify(c.gmMap)};combat=false;ini=null;sel=null;menu=null;jump=null;tool=${JSON.stringify(tool)};
   window.__a=${JSON.stringify(answers)};prompt=()=>__a.shift()??null;confirm=()=>true;Math.random=()=>0.4242;
   applyBoard(defBoard());view="table";last="";render()`

async function inStore(c: Case, tool: Tool, act: (s: ReturnType<typeof createGameStore>) => Promise<unknown>) {
  const w: W[] = []
  const s = createGameStore(() => recDb(w), () => 1_700_000_000_000, () => 0.4242)
  s.getState().connect({ pin: 't', role: 'gm', me: 'gm' })
  s.getState().applySnapshot({ ...emptyTables(), chars: structuredClone(c.chars), enemies: structuredClone(c.enemies), maps: structuredClone(c.maps), cur: c.cur })
  s.getState().setGmMap(c.gmMap)
  s.getState().setTool(tool)
  await act(s)
  return w
}
const theirs = async (legacy: { run: <T>(e: string) => Promise<T> }) => (await legacy.run<W[]>('__w')).filter(([, p]) => p !== 'meta')
/** Map ids and timestamps are made from the clock: compare without them. */
const norm = (w: W[]) => JSON.parse(JSON.stringify(noTs(w)).replace(/m[a-z0-9]{8}/g, 'mID').replace(/"iv":\d+/g, '"iv":0').replace(/"p[a-z0-9]{8}"/g, '"pID"'))

const center = async (page: Page, x: number, y: number) => {
  const b = (await page.locator('#map').boundingBox())!
  return [b.x + ((x + 0.5) / COLS) * b.width, b.y + ((y + 0.5) / ROWS) * b.height] as const
}

test('tool taps: altar, bonfire, guild, place door, doors, entry', async ({ legacy, page }) => {
  const r = rng(101)
  for (let k = 0; k < 60; k++) {
    const c = randomCase(r)
    const tool = r.pick(['al', 'bf', 'gd', 'nd', 'dr', 'en'] as Tool[])
    // Doors near an existing door half of the time.
    const dr = Object.values(c.maps[c.gmMap]!.dr || {})
    // On a door, or one square (straight or diagonal) away: the edge of the 1.7-square reach.
    const near = (v: number, max: number) => Math.max(0, Math.min(max, v + r.pick([-1, 0, 1])))
    const [x, y] = dr.length && r.next() < 0.7 ? [near(Math.floor(dr[0]!.p[0]!), COLS - 1), near(Math.floor(dr[0]!.p[1]!), ROWS - 1)] : [r.int(0, COLS - 1), r.int(0, ROWS - 1)]
    await legacy.run(SETUP(c, tool))
    await page.mouse.click(...(await center(page, x, y)))
    const mine = await inStore(c, tool, (s) => s.getState().toolTap(x, y))
    expect(norm(mine), JSON.stringify({ tool, x, y, c })).toEqual(norm(await theirs(legacy)))
  }
})

test('drags: walls, reveal and hide', async ({ legacy, page }) => {
  const r = rng(202)
  for (let k = 0; k < 40; k++) {
    const c = randomCase(r)
    const tool = r.pick(['wall', 'rev', 'hid'] as Tool[])
    const cells: [number, number][] = []
    // Half the drags start on a wall (they erase walls).
    const walls = Object.values(c.maps[c.gmMap]!.walls || {}) as string[]
    let [x, y] = walls.length && r.next() < 0.5 ? walls[0]!.split(',').map(Number) as [number, number] : [r.int(0, COLS - 1), r.int(0, ROWS - 1)]
    for (let i = r.int(1, 6); i > 0; i--) {
      cells.push([x, y])
      x = Math.max(0, Math.min(COLS - 1, x + r.int(-1, 1)))
      y = Math.max(0, Math.min(ROWS - 1, y + r.int(-1, 1)))
    }
    await legacy.run(SETUP(c, tool))
    await page.mouse.move(...(await center(page, ...cells[0]!)))
    await page.mouse.down()
    for (const cell of cells.slice(1)) await page.mouse.move(...(await center(page, ...cell)))
    await page.mouse.up()
    const unique = cells.filter((a, i) => cells.findIndex((b) => b[0] === a[0] && b[1] === a[1]) === i)
    const mine = await inStore(c, tool, (s) => s.getState().paint(unique))
    expect(norm(mine), JSON.stringify({ tool, cells, c })).toEqual(norm(await theirs(legacy)))
  }
})

/** The live page's map buttons by data-m, and the new store's matching action. */
const BUTTONS: [string, (s: ReturnType<typeof createGameStore>, m: MapEntry) => Promise<unknown>][] = [
  ['grid', (s, m) => s.getState().setMap({ grid: m.grid === false })],
  ['fog', (s, m) => s.getState().setMap({ fog: !m.fog })],
  ['ovt', (s, m) => s.getState().setMap({ ov: m.ov === false })],
  ['revall', async (s, m) => s.getState().setMap({ fog: true, fg: '1'.repeat((m.cols || 24) * Math.floor(m.h! / (m.w! / (m.cols || 24)))) })],
  ['hideall', (s) => s.getState().setMap({ fog: true, fg: '' })],
  ['clr', (s) => s.getState().setMap({ walls: [] })],
  ['clrew', (s) => s.getState().setMap({ ew: [], dr: {} })],
  ['mshow', (s) => s.getState().showMap(s.getState().gmMap!)],
  ['mdel', (s) => s.getState().deleteMap()],
]

test('map buttons: grid, fog, overview, reveal and hide all, clear walls, show, delete', async ({ legacy, page }) => {
  const r = rng(303)
  for (let k = 0; k < 45; k++) {
    const c = randomCase(r)
    const [b, act] = BUTTONS[k % BUTTONS.length]!
    await legacy.run(SETUP(c, 'move'))
    await page.locator(`[data-m="${b}"]`).click()
    const mine = await inStore(c, 'move', (s) => act(s, c.maps[c.gmMap]!))
    expect(norm(mine), JSON.stringify({ b, c })).toEqual(norm(await theirs(legacy)))
  }
})

test('rename and squares across', async ({ legacy, page }) => {
  // (A number box turns "x" into an empty value, read as the default 24.)
  const r = rng(404)
  for (let k = 0; k < 20; k++) {
    const c = randomCase(r)
    const name = r.pick(['Deep Crypt', 'A map with a really long name for sure', ''])
    await legacy.run(SETUP(c, 'move', [name]))
    await page.locator('[data-m="mren"]').click()
    const mine = await inStore(c, 'move', (s) => s.getState().renameMap(name))
    expect(norm(mine), name).toEqual(norm(await theirs(legacy)))
    const cols = r.pick(['3', '12', '500', 'x'])
    await legacy.run(SETUP(c, 'move') + `;{const t=$("#mc");t.value=${JSON.stringify(cols)};t.dispatchEvent(new Event("change",{bubbles:true}))}`)
    const mine2 = await inStore(c, 'move', (s) => s.getState().setCols(cols))
    expect(norm(mine2), cols).toEqual(norm(await theirs(legacy)))
  }
})

test('pins: add (with its prompts), rename, delete, travel', async ({ legacy, page }) => {
  const r = rng(505)
  for (let k = 0; k < 80; k++) {
    const c = randomCase(r)
    const m = c.maps[c.gmMap]!
    const pins = Object.keys(m.pn || {})
    const others = Object.keys(c.maps).filter((i) => i !== c.gmMap)
    const onPin = pins.length > 0 && r.next() < 0.6
    // On a pin, or one square from it (straight is within reach, diagonal is not).
    const off = onPin ? r.pick([[0, 0], [1, 0], [0, -1], [1, 1], [-1, -1]]) : [0, 0]
    const clampXY = (v: number, max: number) => Math.max(0, Math.min(max, v))
    const [x, y] = onPin ? [clampXY(Math.floor(m.pn![pins[0]!]!.x) + off[0]!, COLS - 1), clampXY(Math.floor(m.pn![pins[0]!]!.y) + off[1]!, ROWS - 1)] : [r.int(0, COLS - 1), r.int(0, ROWS - 1)]
    const long = 'A label far longer than twenty four'
    const answers: (string | null)[] = onPin ? [r.pick(['1', '2', '2', '3', '9', null]), r.pick(['Down the hole', long, '', null])] : [r.pick(['1', '2', '1', '7', 'x', null]), r.pick(['Gate', long, long, '', null])]
    await legacy.run(SETUP(c, 'pin', [...answers]))
    await page.mouse.click(...(await center(page, x, y)))
    const mine = await inStore(c, 'pin', async (s) => {
      const tap = await s.getState().toolTap(x, y)
      // The screen's prompts, answered the same way.
      const { pinPrompts } = await import('../../src/ui/screens/mapPrompts.ts')
      const a = [...answers]
      pinPrompts(s.getState().tables.maps as Record<string, MapEntry>, c.gmMap, tap!, () => a.shift() ?? null, s.getState())
      await new Promise((res) => setTimeout(res, 10))
    })
    expect(norm(mine), JSON.stringify({ x, y, answers, onPin, others, c })).toEqual(norm(await theirs(legacy)))
  }
})

test('a new map: the picture, then the map (live when it is the first)', async ({ legacy }) => {
  for (const c of [randomCase(rng(1)), { ...randomCase(rng(2)), cur: '' }]) {
    await legacy.run(SETUP(c, 'move') + `;cur=${JSON.stringify(c.cur || null)};saveMap("data:image/jpeg;base64,AAA",640,480,"Sewers.png",{cols:12})`)
    await expect.poll(() => legacy.run<number>('__w.length')).toBeGreaterThan(1)
    const mine = await inStore({ ...c, cur: c.cur || (null as unknown as string) }, 'move', (s) => s.getState().addMap('data:image/jpeg;base64,AAA', 640, 480, 'Sewers.png', { cols: 12 }))
    expect(norm(mine)).toEqual(norm(await theirs(legacy)))
  }
})

test('a big party travels: everyone lands round the entry, skipping walls, the first squares shared when full', async ({ legacy, page }) => {
  const r = rng(606)
  for (let k = 0; k < 8; k++) {
    const c = randomCase(r)
    const heroes = Object.fromEntries(Array.from({ length: r.int(4, 26) }, (_, i) => [`h${i}`, clean({ name: `H${i}`, x10: true, hp: r.pick([0, 9, 9, 9]), maxHp: 9, mp: r.maybe('m'), mx: 1, my: 1 })]))
    const n = c.maps.n!
    const en = [r.int(0, COLS - 1) + 0.5, r.int(0, ROWS - 1) + 0.5]
    const walls = Array.from({ length: r.int(0, 30) }, () => `${Math.floor(en[0]!) + r.int(-3, 3)},${Math.floor(en[1]!) + r.int(-3, 3)}`)
    const cc: Case = { ...c, chars: heroes as Record<string, Sheet>, cur: 'm', gmMap: 'm', maps: { ...c.maps, m: { ...c.maps.m!, pn: { p0: { x: 1.5, y: 1.5, to: 'n', l: 'Down' } } }, n: { ...n, en, walls, fog: r.maybe(1) } } }
    await legacy.run(SETUP(cc, 'pin', ['1']))
    await page.mouse.click(...(await center(page, 1, 1)))
    const mine = await inStore(cc, 'pin', (s) => s.getState().travel('n'))
    expect(norm(mine), JSON.stringify(cc.maps.n)).toEqual(norm(await theirs(legacy)))
  }
})

test('Dungeondraft exports: squares, walls (in pixels or squares), doors and picture type', async ({ legacy }) => {
  const { parseDungeondraft } = await import('../../src/logic/mapTools.ts')
  const r = rng(707)
  for (let k = 0; k < 120; k++) {
    const cols = r.int(1, 12)
    const rows = r.int(1, 12)
    const ppg = r.pick([50, 70, 100, 256])
    const px = r.next() < 0.5 // points in pixels or in squares
    const unit = px ? ppg : 1
    const ox = r.pick([0, 0, 2.5])
    const pt = () => ({ x: (r.int(-1, cols * 4 + 2) / 4 + ox) * unit, y: (r.int(-1, rows * 4 + 2) / 4 + ox) * unit })
    const line = () => Array.from({ length: r.int(1, 5) }, pt)
    const j = clean({
      resolution: r.maybe({ map_size: r.maybe({ x: cols + r.pick([0, 0.2, -0.3]), y: rows }, 0.95), pixels_per_grid: r.maybe(ppg, 0.9), map_origin: r.maybe({ x: ox, y: ox }, 0.7) }, 0.97),
      image: r.maybe(r.pick(['iVBORw0KGgo', '/9j/4AAQ', 'UklGRiQ', 'data:image/png;base64,AAA']), 0.95),
      line_of_sight: r.maybe(Array.from({ length: r.int(0, 5) }, line), 0.9),
      objects_line_of_sight: r.maybe(Array.from({ length: r.int(0, 3) }, line)),
      portals: r.maybe(Array.from({ length: r.int(0, 3) }, () => ({ bounds: r.maybe([pt(), pt()], 0.9), closed: r.maybe(r.pick([true, false])) }))),
    })
    const theirs = await legacy.run<unknown>(`(()=>{const q=ddParse(${JSON.stringify(j)});return q&&{...q,ew:[...q.ew].sort()}})()`)
    const mine = parseDungeondraft(j)
    expect(mine && { ...mine, ew: [...mine.ew].sort() }, JSON.stringify(j)).toEqual(theirs)
  }
})
