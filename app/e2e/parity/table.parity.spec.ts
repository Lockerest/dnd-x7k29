// Parity for the play table: fog, reach, who stands where, tapping the map to move,
// and the table's buttons must work exactly like the live page.
import { expect, test } from '../harness.ts'
import type { MapData } from '../../src/logic/geometry.ts'
import type { Sheet } from '../../src/logic/sheet.ts'
import { enemyHidden, enemyReach, fogHidden, fogPath, grid, heroReach, occupant, type Maps } from '../../src/logic/table.ts'
import type { Enemy } from '../../src/logic/types.ts'
import { createGameStore, emptyTables, type Tables } from '../../src/state/store.ts'
import { clean, rng } from './random.ts'
import { CAPTURE, noTs, recDb, type W } from './store.ts'

type R = ReturnType<typeof rng>

function randomMap(r: R, cols: number, rows: number): MapData {
  const sq = () => `${r.int(0, cols - 1)},${r.int(0, rows - 1)}`
  const list = (n: number, f: () => string) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`k${i}`, f()]))
  const edge = () => `${r.pick(['v', 'h'])},${r.int(0, cols)},${r.int(0, rows)}`
  return clean({
    name: 'Crypt',
    v2: 1,
    w: cols * 50,
    h: rows * 50,
    cols,
    fog: r.maybe(1, 0.7),
    fg: r.maybe(r.str('0001', cols * rows, cols * rows), 0.5),
    walls: list(r.int(0, 10), sq),
    ew: list(r.int(0, 10), edge),
    dr: Object.fromEntries(Array.from({ length: r.int(0, 2) }, (_, i) => [`d${i}`, { c: sq(), o: r.maybe(1), p: [r.int(0, cols - 1) + 0.5, r.int(0, rows - 1) + 0.5] }])),
    al: list(r.int(0, 2), sq),
    bf: list(r.int(0, 2), sq),
  })
}

const hero = (r: R, cols: number, rows: number, extra: object = {}): Sheet =>
  clean({
    name: r.pick(['Lyra', 'Bram', 'Cid']),
    x10: true,
    cls: r.pick(['fighter', 'archer']),
    hp: r.pick([0, 20, 50]),
    maxHp: 50,
    st: r.int(0, 80),
    maxSt: 100,
    rg: 15,
    spd: r.maybe(r.int(3, 8)),
    mvd: r.maybe(r.int(0, 4)),
    exh: r.maybe(true, 0.2),
    stn: r.maybe(true, 0.1),
    dth: r.maybe(r.int(1, 3), 0.2),
    used: r.maybe(r.int(0, 2)),
    pr: r.maybe(true, 0.2),
    ap: r.maybe(r.pick([false, 'no', true]), 0.2),
    mx: r.maybe(r.int(0, cols - 1), 0.9),
    my: r.int(0, rows - 1),
    mp: r.maybe(r.pick(['m', 'other']), 0.3),
    mt: r.maybe(r.pick(['climb', 'down']), 0.1),
    mon: r.maybe('e0', 0.1),
    ...extra,
  })

const monster = (r: R, cols: number, rows: number, extra: object = {}): Enemy =>
  clean({ name: r.pick(['Wolf', 'Ogre']), x10: true, hp: r.pick([0, 30]), max: 30, sz: r.maybe(r.int(1, 3)), spd: r.maybe(r.int(2, 6)), bon: r.maybe(r.int(0, 2)), mx: r.maybe(r.int(0, cols - 2), 0.85), my: r.int(0, rows - 2), mp: r.maybe(r.pick(['m', 'other']), 0.2), hd: r.maybe('c:c0', 0.1), ...extra })

test('fog, hidden monsters, reach and who stands where', async ({ legacy }) => {
  const r = rng(81)
  const xs = Array.from({ length: 120 }, () => {
    const cols = r.int(5, 12)
    const rows = r.int(5, 10)
    const chars = Object.fromEntries(Array.from({ length: r.int(0, 3) }, (_, i) => [`c${i}`, hero(r, cols, rows)]))
    const enemies = Object.fromEntries(Array.from({ length: r.int(0, 3) }, (_, i) => [`e${i}`, monster(r, cols, rows)]))
    return { m: randomMap(r, cols, rows), chars, enemies, combat: r.next() < 0.5, x: r.int(0, cols - 1), y: r.int(0, rows - 1), cols, rows }
  })
  const page = await legacy.run<unknown[]>(
    `(${JSON.stringify(xs)}).map(x=>{dm=false;gmMap=null;maps={m:x.m,other:{w:100,h:100}};cur="m";IM={m:{data:"x"}};chars=x.chars;enemies=x.enemies;combat=x.combat;const g=geo();
      const cells=[];for(let y=0;y<g.rows;y++)for(let i=0;i<g.cols;i++)cells.push(fogHid(g,i,y)?1:0);
      return{cells,path:fogD(g),eh:Object.keys(enemies).filter(i=>enemies[i].mx!=null).map(i=>eHid(g,enemies[i])),
        rc:Object.keys(chars).filter(i=>chars[i].mx!=null).map(i=>reach(chars[i],g)),re:Object.keys(enemies).filter(i=>enemies[i].mx!=null).map(i=>reachE(enemies[i],g)),occ:occ(x.x,x.y)}})`,
  )
  const mine = xs.map((x) => {
    const g = grid({ m: x.m, other: { w: 100, h: 100 } } as Maps, 'm')!
    const ok = (c: Sheet) => c.ap !== false && c.ap !== 'no'
    const seers = Object.values(x.chars).filter(ok)
    const cells: number[] = []
    for (let y = 0; y < g.rows; y++) for (let i = 0; i < g.cols; i++) cells.push(fogHidden(g, seers, i, y) ? 1 : 0)
    return {
      cells,
      path: fogPath(g, seers),
      eh: Object.values(x.enemies)
        .filter((e) => e.mx != null)
        .map((e) => enemyHidden(g, seers, e)),
      rc: Object.values(x.chars)
        .filter((c) => c.mx != null)
        .map((c) => heroReach(c, g, x.combat)),
      re: Object.values(x.enemies)
        .filter((e) => e.mx != null)
        .map((e) => enemyReach(e, g)),
      occ: occupant(x.chars, x.enemies, 'm', x.x, x.y),
    }
  })
  expect(mine).toEqual(page)
})

// ---- Taps and buttons on the table screen ----

type Case = { dm: boolean; me: string; chars: Record<string, Sheet>; enemies: Record<string, Enemy>; map: MapData; combat?: boolean; ini?: Tables['ini']; sel?: string | null; sp?: string | null }

const SETUP = (c: Case) =>
  `${CAPTURE}$("#err").textContent="";pin="t";role=${c.dm ? '"gm"' : '"player"'};canGM=${c.dm};dm=${c.dm};me=${JSON.stringify(c.me)};lastWave=0;hideL=false;
   chars=${JSON.stringify(c.chars)};enemies=${JSON.stringify(c.enemies)};maps={m:${JSON.stringify(c.map)}};cur="m";IM={m:{data:"data:,"}};gmMap=null;
   combat=${!!c.combat};ini=${JSON.stringify(c.ini ?? null)};sel=${JSON.stringify(c.sel ?? null)};menu=null;jump=null;tool="move";SPS=${JSON.stringify(c.sp ?? null)};
   applyBoard(defBoard());view="table";last="";render()`

async function inStore(c: Case, act: (s: ReturnType<typeof createGameStore>) => Promise<unknown>) {
  const w: W[] = []
  const queued: (() => unknown)[] = []
  const s = createGameStore(
    () => recDb(w),
    Date.now,
    Math.random,
    (f) => void queued.push(f),
  )
  s.getState().connect({ pin: 't', role: c.dm ? 'gm' : 'player', me: c.me })
  s.getState().applySnapshot({ ...emptyTables(), chars: structuredClone(c.chars), enemies: structuredClone(c.enemies), maps: { m: structuredClone(c.map) }, cur: 'm', combat: !!c.combat, ini: c.ini ?? null, sp: c.sp ?? null })
  const out = await act(s)
  for (const f of queued) await f()
  return { w, error: s.getState().error, out, jump: !!s.getState().jump }
}

const theirWrites = async (legacy: { run: <T>(e: string) => Promise<T> }) => (await legacy.run<W[]>('__w')).filter(([, p]) => p !== 'meta')

test('tapping the map places and moves tokens the same way', async ({ legacy, page }) => {
  await page.setViewportSize({ width: 1400, height: 1000 })
  const r = rng(82)
  let moved = 0
  for (let k = 0; k < 70; k++) {
    const cols = 10
    const rows = 8
    const dm = r.next() < 0.4
    const chars = { c0: hero(r, cols, rows, { ap: undefined, mp: undefined, hp: r.pick([0, 30, 30, 30]) }), c1: hero(r, cols, rows, { ap: undefined }) }
    const enemies = { e0: monster(r, cols, rows), e1: monster(r, cols, rows) }
    const map = randomMap(r, cols, rows)
    const c: Case = {
      dm,
      me: 'c0',
      chars,
      enemies,
      map,
      combat: r.next() < 0.5,
      ini: r.maybe({ ph: 'go', t: 0, l: [{ k: r.pick(['c:c0', 'e:e0']) }] }, 0.3) ?? null,
      sel: dm ? r.pick(['c:c0', 'c:c1', 'e:e0', 'e:e1', null]) : null,
    }
    // Aim near the selected unit most of the time, so moves are in reach.
    const unit = (c.sel ?? 'c:c0').startsWith('e') ? enemies[c.sel!.slice(2) as 'e0'] : chars[(c.sel ?? 'c:c0').slice(2) as 'c0']
    const x = Math.max(0, Math.min(cols - 1, ((unit?.mx as number) ?? 4) + r.int(-3, 3)))
    const y = Math.max(0, Math.min(rows - 1, ((unit?.my as number) ?? 4) + r.int(-3, 3)))
    await legacy.run(SETUP(c))
    const box = (await page.locator('#map').boundingBox())!
    await page.mouse.click(box.x + ((x + 0.5) / cols) * box.width, box.y + ((y + 0.5) / rows) * box.height)
    const theirs = await theirWrites(legacy)
    const err = await legacy.run<string>('$("#err").textContent')
    const menu = await legacy.run<{ t: string } | null>('menu')
    const mine = await inStore(c, (s) => s.getState().tapMap(x, y, c.sel ?? null))
    expect(noTs(mine.w), `tap ${x},${y} ${JSON.stringify(c)}`).toEqual(noTs(theirs))
    expect(mine.error).toBe(err)
    expect(mine.out).toEqual(menu ? { target: menu.t } : null)
    if (theirs.length) moved++
  }
  expect(moved).toBeGreaterThan(25)
})

test("the GM's round, rest and combat buttons", async ({ legacy, page }) => {
  const r = rng(83)
  for (const [btn, act, wait] of [
    ['regenAll', (s: ReturnType<typeof createGameStore>) => s.getState().nextRoundAll(), 0],
    ['restAll', (s: ReturnType<typeof createGameStore>) => s.getState().restAll('al'), 1700],
    ['bfAll', (s: ReturnType<typeof createGameStore>) => s.getState().restAll('bf'), 0],
    ['combat', (s: ReturnType<typeof createGameStore>) => s.getState().setCombat(true), 0],
  ] as const) {
    for (let k = 0; k < 4; k++) {
      const chars = { c0: hero(r, 10, 8, { hp: 30 }), c1: hero(r, 10, 8, { hp: 30 }), c2: hero(r, 10, 8, { ap: false }) }
      const enemies = { e0: monster(r, 10, 8, { sg: r.maybe(true), rec: r.maybe(true), pm: 20, stun: true }), e1: monster(r, 10, 8) }
      const c: Case = { dm: true, me: 'gm', chars, enemies, map: { ...randomMap(r, 10, 8), al: { a: '1,1' } } }
      await legacy.run(SETUP(c))
      await page.locator(`[data-a="${btn}"]`).click()
      if (wait) await page.waitForTimeout(wait)
      const theirs = await theirWrites(legacy)
      const mine = await inStore(c, act)
      expect(noTs(mine.w), btn).toEqual(noTs(theirs))
    }
  }
})

test('doors next to a hero, in and out of combat', async ({ legacy, page }) => {
  const r = rng(84)
  let opened = 0
  for (let k = 0; k < 24; k++) {
    const dm = k % 3 === 0
    const combat = r.next() < 0.6
    const map: MapData = { ...randomMap(r, 10, 8), dr: { d1: { c: '3,3', o: r.maybe(1), p: [3.5, 3.5] } } }
    const chars = { c0: hero(r, 10, 8, { hp: 30, mx: 2, my: 3, mp: undefined, ap: undefined }) }
    const c: Case = { dm, me: dm ? 'gm' : 'c0', chars, enemies: {}, map, combat, ini: r.maybe({ ph: 'go', t: 0, l: [{ k: r.pick(['c:c0', 'e:x']) }] }, 0.5) ?? null }
    await legacy.run(SETUP(c))
    const b = page.locator('[data-a="door"][data-id="c0"]')
    if (!(await b.count())) continue
    await legacy.run('$("#err").textContent=""')
    await b.click()
    const theirs = await theirWrites(legacy)
    const err = await legacy.run<string>('$("#err").textContent')
    const mine = await inStore(c, (s) => s.getState().toggleDoor('c0', 'd1'))
    expect(noTs(mine.w), JSON.stringify(c)).toEqual(noTs(theirs))
    expect(mine.error).toBe(err)
    opened++
  }
  expect(opened).toBeGreaterThan(15)
})

test('helping an ally up', async ({ legacy, page }) => {
  const r = rng(85)
  for (let k = 0; k < 8; k++) {
    const chars = { c0: hero(r, 10, 8, { hp: 30, exh: undefined, used: r.maybe(1), ap: undefined }), c1: hero(r, 10, 8, { exh: true, pr: r.maybe(true), ap: undefined, log: ['a', 'b'] }) }
    const c: Case = { dm: false, me: 'c0', chars, enemies: {}, map: randomMap(r, 10, 8) }
    await legacy.run(SETUP(c))
    await page.locator('[data-a="help"][data-id="c1"]').click()
    const mine = await inStore(c, (s) => s.getState().helpUp('c1'))
    expect(noTs(mine.w)).toEqual(noTs(await theirWrites(legacy)))
  }
})

test('the hidden words and "Show to players"', async ({ legacy, page }) => {
  const c: Case = { dm: true, me: 'gm', chars: {}, enemies: {}, map: randomMap(rng(86), 10, 8), sp: 'golden, altar' }
  for (const [sel, words, before] of [
    ['[data-a="spx"][data-k="golden"]', ['altar'], undefined],
    ['[data-a="spall"]', [], undefined],
    ['[data-a="spdef"]', 'altar,altars,bonfire,bonfires,revive,revives,revived,revival,curse,cursed,golden,attune,attuned,attunement,attunements,crystal,crystals'.split(','), undefined],
    ['[data-a="spsave"]', [' Crystal', 'crystal ', 'Ghost', ''], ' Crystal, crystal , Ghost,'],
  ] as const) {
    await legacy.run(SETUP(c))
    if (before !== undefined) await page.locator('#spl').fill(before)
    await page.locator(sel).click()
    const mine = await inStore(c, (s) => s.getState().saveSpoilers([...words]))
    expect(noTs(mine.w), sel).toEqual(noTs(await legacy.run<W[]>('__w')))
  }
  await legacy.run(SETUP({ ...c, map: { ...c.map } }) + ';maps.n={name:"Two",w:100,h:100,v2:1};IM.n={data:"data:,"};gmMap="n";last="";render()')
  await page.locator('[data-m="mshow"]').click()
  const mine = await inStore(c, (s) => s.getState().showMap('n'))
  expect(noTs(mine.w)).toEqual(noTs(await theirWrites(legacy)))
})


test('the map picture is drawn the same (mapHtml)', async ({ legacy }) => {
  const { mapSvg } = await import('../../src/ui/map/mapSvg.ts')
  const r = rng(87)
  const T = 1_000_000
  const xs = Array.from({ length: 60 }, () => {
    const cols = r.int(5, 10)
    const rows = r.int(5, 8)
    const map: MapData = {
      ...randomMap(r, cols, rows),
      grid: r.maybe(false, 0.2),
      gd: r.maybe({ a: `${r.int(0, cols - 1)},${r.int(0, rows - 1)}` }),
      pn: r.maybe({ p1: { x: r.int(0, cols - 1) + 0.5, y: r.int(0, rows - 1) + 0.5, l: r.pick(['Gate <b>', 'Crypt']) } }),
      en: r.maybe([1.5, 2.5]),
    }
    const dr = map.dr as Record<string, object>
    if (r.next() < 0.5) dr.seg = clean({ a: [1, 1], b: [2, 1], o: r.maybe(1), p: [1.5, 1] })
    const chars = Object.fromEntries(
      Array.from({ length: r.int(0, 3) }, (_, i) => [`c${i}`, hero(r, cols, rows, { iv: r.maybe(1), ht: r.maybe(r.pick([T - 1000, T - 9000])), hv: r.maybe(12), name: r.pick(['Lyra', '<i>x', '']) })]),
    )
    const enemies = Object.fromEntries(
      Array.from({ length: r.int(0, 3) }, (_, i) => [`e${i}`, monster(r, cols, rows, { iv: r.maybe(1), stun: r.maybe(true, 0.3), ht: r.maybe(T - 500), name: r.pick(['Wolf', 'A very long monster name']) })]),
    )
    const dm = r.next() < 0.5
    const keys = [...Object.keys(chars).map((k) => `c:${k}`), ...Object.keys(enemies).map((k) => `e:${k}`)]
    return {
      map,
      chars,
      enemies,
      dm,
      combat: r.next() < 0.5,
      sel: dm ? (r.maybe(r.pick(keys.length ? keys : ['c:none'])) ?? null) : null,
      me: r.pick(['c0', 'c1', 'nobody']),
      icons: Object.fromEntries([...Object.keys(chars), ...Object.keys(enemies)].filter(() => r.next() < 0.5).map((k) => [k, 'data:icon'])),
      markers: r.pick<Record<string, string>>([{}, { al: 'data:al', bf: 'data:bf', gd: 'data:gd' }]),
    }
  })
  const canon = `window.canon=h=>{const d=new DOMParser().parseFromString(h,"image/svg+xml").documentElement;
    const f=n=>n.nodeType===3?n.nodeValue:{t:n.tagName,a:[...n.attributes].map(a=>[a.name,a.value]).sort(),c:[...n.childNodes].map(f)};return f(d)};`
  const page = await legacy.run<unknown[]>(
    `${canon}Date.now=()=>${T};(${JSON.stringify(xs)}).map(x=>{dm=x.dm;sel=x.sel;me=x.me;combat=x.combat;maps={m:x.map};cur="m";gmMap=null;IM={m:{data:"data:map"}};chars=x.chars;enemies=x.enemies;
      IC=Object.fromEntries(Object.entries(x.icons).map(([k,v])=>[k,{data:v}]));MK=x.markers;return canon(mapHtml(true))})`,
  )
  const mine = xs.map((x) => {
    const g = grid({ m: x.map } as Maps, 'm')!
    const inner = mapSvg({ g, image: 'data:map', chars: x.chars, enemies: x.enemies, dm: x.dm, selected: x.dm ? x.sel : `c:${x.me}`, combat: x.combat, icons: x.icons, markers: x.markers, now: T })
    return `<svg xmlns="http://www.w3.org/2000/svg" id="map" viewBox="0 0 ${x.map.w} ${x.map.h}">${inner}</svg>`
  })
  const canonMine = await legacy.run<unknown[]>(`${canon}(${JSON.stringify(mine)}).map(canon)`)
  // The live page's string has no xmlns (it is parsed as HTML); add it for the comparison.
  const strip = (n: unknown): unknown => (typeof n === 'object' && n ? { ...(n as object), a: (n as { a: [string, string][] }).a.filter(([k]) => k !== 'xmlns') } : n)
  expect(canonMine.map(strip)).toEqual(page.map(strip))
})

test('jumping off a monster lands the same way', async ({ legacy, page }) => {
  await page.setViewportSize({ width: 1400, height: 1000 })
  const r = rng(88)
  let landed = 0
  for (let k = 0; k < 40; k++) {
    const cols = 10
    const rows = 8
    const ride = r.next() < 0.9
    const chars = { c0: hero(r, cols, rows, { ap: undefined, mp: undefined, hp: 30, mt: 'climb', mon: 'e0' }), c1: hero(r, cols, rows, { ap: undefined }) }
    const enemies = { e0: monster(r, cols, rows, { hp: 30, mp: undefined, hd: undefined, mx: r.int(0, cols - 2), my: r.int(0, rows - 2) }), e1: monster(r, cols, rows) }
    const c: Case = { dm: false, me: 'c0', chars, enemies: ride ? enemies : { e1: enemies.e1 }, map: randomMap(r, cols, rows) }
    const x = Math.max(0, Math.min(cols - 1, (enemies.e0.mx as number) + r.int(-4, 4)))
    const y = Math.max(0, Math.min(rows - 1, (enemies.e0.my as number) + r.int(-4, 4)))
    await legacy.run(SETUP(c) + ';jump={id:"c0",on:"e0"};render()')
    const box = (await page.locator('#map').boundingBox())!
    await page.mouse.click(box.x + ((x + 0.5) / cols) * box.width, box.y + ((y + 0.5) / rows) * box.height)
    const theirs = await theirWrites(legacy)
    const err = await legacy.run<string>('$("#err").textContent')
    const stillJumping = await legacy.run<boolean>('!!jump')
    const mine = await inStore(c, async (s) => {
      s.getState().startJump('c0')
      if (!ride) s.setState({ jump: { id: 'c0', on: 'e0' } })
      return s.getState().tapMap(x, y, null)
    })
    expect(noTs(mine.w), `jump to ${x},${y} ${JSON.stringify(c)}`).toEqual(noTs(theirs))
    expect(mine.error).toBe(err)
    expect(mine.jump).toBe(stillJumping)
    if (theirs.length) landed++
  }
  expect(landed).toBeGreaterThan(10)
})
