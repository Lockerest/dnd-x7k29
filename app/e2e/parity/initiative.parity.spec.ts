// Parity for initiative and turn order: starting, rolling (heroes and monsters),
// beginning combat, passing turns (with new rounds) and ending combat must save
// exactly what the live page saves.
import { expect, test } from '../harness.ts'
import type { Sheet } from '../../src/logic/sheet.ts'
import type { Enemy } from '../../src/logic/types.ts'
import { createGameStore, emptyTables, type Tables } from '../../src/state/store.ts'
import { clean, rng } from './random.ts'
import { CAPTURE, noTs, recDb, type W } from './store.ts'

type R = ReturnType<typeof rng>
type Case = { dm: boolean; me: string; chars: Record<string, Sheet>; enemies: Record<string, Enemy>; ini?: Tables['ini']; combat?: boolean }

const MAP = { name: 'Crypt', w: 500, h: 400, cols: 10, v2: 1 }
const RAND = 0.37

const SETUP = (c: Case) =>
  `${CAPTURE}Math.random=()=>${RAND};$("#err").textContent="";pin="t";role=${c.dm ? '"gm"' : '"player"'};canGM=${c.dm};dm=${c.dm};me=${JSON.stringify(c.me)};hideL=false;
   chars=${JSON.stringify(c.chars)};enemies=${JSON.stringify(c.enemies)};maps={m:${JSON.stringify(MAP)},n:${JSON.stringify(MAP)}};cur="m";IM={m:{data:"data:,"}};gmMap=null;
   combat=${!!c.combat};ini=${JSON.stringify(c.ini ?? null)};sel=null;menu=null;jump=null;tool="move";SPS=null;bonus=0;secOn=true;
   applyBoard(defBoard());view="table";last="";render()`

async function inStore(c: Case, act: (s: ReturnType<typeof createGameStore>) => Promise<unknown>) {
  const w: W[] = []
  const s = createGameStore(() => recDb(w), Date.now, () => RAND, () => {})
  s.getState().connect({ pin: 't', role: c.dm ? 'gm' : 'player', me: c.me })
  s.getState().applySnapshot({ ...emptyTables(), chars: structuredClone(c.chars), enemies: structuredClone(c.enemies), maps: { m: MAP, n: MAP }, cur: 'm', combat: !!c.combat, ini: structuredClone(c.ini ?? null) })
  await act(s)
  return w
}
const theirs = async (legacy: { run: <T>(e: string) => Promise<T> }) => (await legacy.run<W[]>('__w')).filter(([, p]) => p !== 'meta')

const hero = (r: R, name: string, extra: object = {}): Sheet =>
  clean({ name, x10: true, cls: 'fighter', hp: r.pick([0, 20, 40]), maxHp: 40, st: r.int(0, 100), maxSt: 100, rg: 15, dex: r.maybe(r.int(6, 18)), used: r.maybe(r.int(0, 2)), exh: r.maybe(true, 0.2), exn: r.maybe(r.int(1, 3)), ap: r.maybe(r.pick([false, 'no']), 0.15), mp: r.maybe(r.pick(['m', 'n']), 0.3), ...extra })
const monster = (r: R, name: string, extra: object = {}): Enemy =>
  clean({ name, x10: true, hp: r.pick([0, 10, 30]), max: 30, ib: r.maybe(r.int(-2, 5)), mx: r.maybe(r.int(0, 8), 0.8), my: 2, hd: r.maybe('c:a', 0.1), mp: r.maybe(r.pick(['m', 'n']), 0.3), sg: r.maybe(true, 0.2), rec: r.maybe(true, 0.2), pm: r.maybe(r.int(0, 20)), ...extra })

function table(r: R) {
  const chars: Record<string, Sheet> = { a: hero(r, 'Lyra'), b: hero(r, 'Bram'), c: hero(r, 'Cid') }
  const enemies: Record<string, Enemy> = { w: monster(r, 'Wolf'), o: monster(r, 'Ogre'), x: monster(r, 'Imp') }
  return { chars, enemies }
}
const keys = (t: ReturnType<typeof table>) => [...Object.keys(t.chars).map((k) => `c:${k}`), ...Object.keys(t.enemies).map((k) => `e:${k}`), 'e:gone']

test('starting initiative and rolling the monsters', async ({ legacy, page }) => {
  const r = rng(91)
  for (let k = 0; k < 30; k++) {
    const t = table(r)
    const c: Case = { dm: true, me: 'gm', ...t }
    await legacy.run(SETUP(c))
    await page.locator('[data-a="istart"]').first().click()
    const mine = await inStore(c, (s) => s.getState().startInitiative())
    expect(noTs(mine), JSON.stringify(c)).toEqual(noTs(await theirs(legacy)))
    // Rolling the monsters on a random half-rolled list.
    const ini = { ph: 'roll' as const, t: 0, r: 1, l: keys(t).map((kk) => ({ k: kk, v: r.maybe(r.int(1, 20), 0.4) ?? null })) }
    const c2: Case = { ...c, ini }
    await legacy.run(SETUP(c2))
    await page.locator('[data-a="ienemies"]').click()
    const mine2 = await inStore(c2, (s) => s.getState().rollMonsters())
    expect(noTs(mine2), JSON.stringify(c2)).toEqual(noTs(await theirs(legacy)))
  }
})

test('rolling one unit: the GM rolls monsters, a player rolls their own hero with the dice', async ({ legacy, page }) => {
  test.setTimeout(120_000) // the page shows its dice for a few seconds
  const r = rng(92)
  let rolled = 0
  for (let k = 0; k < 16; k++) {
    const t = table(r)
    const dm = k % 2 === 0
    const ini = { ph: 'roll' as const, t: 0, r: 1, l: keys(t).map((kk) => ({ k: kk, v: null })) }
    const c: Case = { dm, me: dm ? 'gm' : 'a', ...t, ini }
    await legacy.run(SETUP(c))
    const btns = page.locator('[data-a="iself"]')
    const n = await btns.count()
    if (!n) continue
    const btn = btns.nth(r.int(0, n - 1))
    const i = Number(await btn.getAttribute('data-i'))
    await btn.click()
    const mine = await inStore(c, (s) => s.getState().rollInitiative(i))
    await expect.poll(async () => (await theirs(legacy)).length, { timeout: 15_000 }).toBe(mine.length)
    expect(noTs(mine), JSON.stringify({ c, i })).toEqual(noTs(await theirs(legacy)))
    rolled++
  }
  expect(rolled).toBeGreaterThan(10)
})

test('beginning combat, passing turns (new rounds) and ending combat', async ({ legacy, page }) => {
  const r = rng(93)
  for (let k = 0; k < 40; k++) {
    const t = table(r)
    const l = keys(t).map((kk) => ({ k: kk, v: r.int(1, 6) })) // small values: plenty of ties
    // Begin.
    const c: Case = { dm: true, me: 'gm', ...t, ini: { ph: 'roll', t: 0, r: 1, l } }
    await legacy.run(SETUP(c))
    await page.locator('[data-a="ibegin"]').click()
    const mine = await inStore(c, (s) => s.getState().beginCombat())
    expect(noTs(mine), 'begin ' + JSON.stringify(c)).toEqual(noTs(await theirs(legacy)))
    // Next turn, from a random turn (often the last, so the round wraps).
    const go: Case = { dm: true, me: 'gm', ...t, combat: true, ini: { ph: 'go', t: r.pick([0, l.length - 2, l.length - 1]), r: r.int(1, 4), l } }
    await legacy.run(SETUP(go))
    await page.locator('[data-a="inext"]').click()
    const mine2 = await inStore(go, (s) => s.getState().passTurn())
    expect(noTs(mine2), 'next ' + JSON.stringify(go)).toEqual(noTs(await theirs(legacy)))
    // End.
    await legacy.run(SETUP(go))
    await page.locator('[data-a="iend"]').click()
    const mine3 = await inStore(go, (s) => s.getState().endCombat())
    expect(noTs(mine3)).toEqual(noTs(await theirs(legacy)))
  }
})

test('a player ends their own turn (but not the last of the round)', async ({ legacy, page }) => {
  const r = rng(94)
  let ended = 0
  for (let k = 0; k < 30; k++) {
    const t = table(r)
    t.chars.a = { ...t.chars.a!, hp: 30, ap: undefined, mp: undefined }
    const l = keys(t).map((kk) => ({ k: kk, v: 5 }))
    const ti = r.int(0, l.length - 1)
    l[ti] = { k: 'c:a', v: 5 }
    const c: Case = { dm: false, me: 'a', ...t, combat: true, ini: { ph: 'go', t: ti, r: 2, l } }
    await legacy.run(SETUP(c))
    const btn = page.locator('[data-a="endturn"]')
    const shown = (await btn.count()) > 0
    const { canEndTurn } = await import('../../src/logic/initiative.ts')
    expect(canEndTurn(c.ini as never, 'a', false), JSON.stringify(c.ini)).toBe(shown)
    if (!shown) continue
    await btn.click()
    const mine = await inStore(c, (s) => s.getState().passTurn())
    expect(noTs(mine), JSON.stringify(c)).toEqual(noTs(await theirs(legacy)))
    ended++
  }
  expect(ended).toBeGreaterThan(10)
})
