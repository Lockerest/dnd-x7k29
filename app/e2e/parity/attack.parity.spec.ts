// Parity for attacks: the action menu, and pressing its buttons (attacks with rolls,
// the defender's prompt timing out, readied reactions, damage, stagger, phase gates,
// fatigue, knock-downs, push, mount, pick up, throw, monster skills and area attacks)
// must save exactly what the live page saves, in the same order.
import { ATTACK_RULES } from '../../src/data/abilityTexts.ts'
import { expect, test } from '../harness.ts'
import { actionMenu, type U } from '../../src/logic/attack.ts'
import { defaultBoard, goldenHidden, type Board } from '../../src/logic/board.ts'
import { unitOf } from '../../src/logic/initiative.ts'
import { isMyTurn, type Sheet } from '../../src/logic/sheet.ts'
import type { Enemy } from '../../src/logic/types.ts'
import { createGameStore, emptyTables, type Tables } from '../../src/state/store.ts'
import { clean, rng } from './random.ts'
import { CAPTURE, noTs, recDb, type W } from './store.ts'

type R = ReturnType<typeof rng>
type Case = { dm: boolean; me: string; chars: Record<string, Sheet>; enemies: Record<string, Enemy>; ini?: Tables['ini']; combat?: boolean; a: string; t: string; board?: Board; walls?: string[] }

const MAP = (walls: string[] = []) => ({ name: 'Crypt', w: 500, h: 400, cols: 10, v2: 1, walls })

const SETUP = (c: Case, rand: number) =>
  `${CAPTURE}Math.random=()=>${rand};$("#err").textContent="";pin="t";role=${c.dm ? '"gm"' : '"player"'};canGM=${c.dm};dm=${c.dm};me=${JSON.stringify(c.me)};hideL=false;
   chars=${JSON.stringify(c.chars)};enemies=${JSON.stringify(c.enemies)};maps={m:${JSON.stringify(MAP(c.walls))}};cur="m";IM={m:{data:"data:,"}};gmMap=null;
   combat=${!!c.combat};ini=${JSON.stringify(c.ini ?? null)};sel=${c.dm ? JSON.stringify(c.a) : 'null'};jump=null;tool="move";SPS=null;bonus=0;secOn=true;sceneOn=false;
   ${c.board ? `applyBoard(${JSON.stringify(c.board)});boardDB=true;board=${JSON.stringify(c.board)};` : 'applyBoard(defBoard());boardDB=false;'}
   menu={a:${JSON.stringify(c.a)},t:${JSON.stringify(c.t)}};view="table";last="";render()`

/** The store with a fake clock: waits pass at once, and the clock moves on by the wait. */
async function inStore(c: Case, rand: number, act: (s: ReturnType<typeof createGameStore>) => Promise<unknown>) {
  const w: W[] = []
  let clock = 1_000_000
  const s = createGameStore(
    () => recDb(w),
    () => clock,
    () => rand,
    (f, ms) => {
      clock += ms
      queueMicrotask(() => void f())
    },
  )
  s.getState().connect({ pin: 't', role: c.dm ? 'gm' : 'player', me: c.me })
  s.getState().applySnapshot({ ...emptyTables(), chars: structuredClone(c.chars), enemies: structuredClone(c.enemies), maps: { m: MAP(c.walls) }, cur: 'm', combat: !!c.combat, ini: structuredClone(c.ini ?? null), board: c.board ? structuredClone(c.board) : null })
  s.getState().openMenu(c.a, c.t)
  await act(s)
  await new Promise((r) => setTimeout(r, 30)) // phase swaps run a little later
  return { w, error: s.getState().error, menu: s.getState().menu }
}

/** Timestamps and prompt ids differ between the two runs; everything else must match. */
const norm = (w: W[]) =>
  noTs(w).map(([m, p, b]) => {
    if (!b || typeof b !== 'object') return [m, p, b]
    const o = { ...(b as Record<string, unknown>) }
    if (p === 'qte' && 'id' in o) o.id = 0
    if ('ht' in o) o.ht = 0 // the moment of the hit
    return [m, p, o]
  })
const theirs = async (legacy: { run: <T>(e: string) => Promise<T> }) => (await legacy.run<W[]>('__w')).filter(([, p]) => p !== 'meta')

const hero = (r: R, name: string, extra: object = {}): Sheet =>
  clean({
    name,
    x10: true,
    cls: r.pick(['fighter', 'archer', 'mage', 'thief', 'warrior', 'trickster']),
    level: r.int(1, 3),
    hp: r.pick([0, 30, 60]),
    maxHp: 60,
    st: r.pick([0, 15, 80]),
    maxSt: 100,
    rg: 15,
    ac: r.pick([5, 12, 25]),
    str: r.int(8, 18),
    dex: r.int(8, 18),
    int: r.int(8, 18),
    used: r.maybe(r.int(0, 2)),
    exh: r.maybe(true, 0.15),
    stn: r.maybe(true, 0.1),
    ddg: r.maybe(true, 0.15),
    pry: r.maybe(true, 0.15),
    ctr: r.maybe(true, 0.15),
    chg: r.maybe('Meteor Fall', 0.05),
    shield: r.maybe(true, 0.2),
    pw: r.maybe(r.pick(['n', 'd', 'x']), 0.3),
    lh: r.maybe(r.int(0, 2)),
    mx: r.int(0, 9),
    my: r.int(0, 7),
    ...extra,
  })
const monster = (r: R, name: string, extra: object = {}): Enemy =>
  clean({
    name,
    x10: true,
    hp: r.pick([0, 20, 50]),
    max: 50,
    ac: r.pick([5, 12, 25]),
    ab: r.maybe(r.int(0, 8)),
    dm: r.maybe(r.pick(['1d6', '2d4', '1d12'])),
    er: r.maybe(r.int(1, 4)),
    sz: r.maybe(r.int(1, 3)),
    pm: r.maybe(r.pick([5, 30]), 0.5),
    po: r.maybe(r.int(0, 30), 0.3),
    stun: r.maybe(true, 0.2),
    pg: r.maybe(r.pick([50, 75]), 0.2),
    sw: r.maybe(true, 0.15),
    nx: r.maybe('p2', 0.2),
    sk: r.maybe({ s1: { n: 'Bite', d: '1d8', r: 1, t: 's' }, s2: { n: 'Roar', d: '2d6', r: 3, t: 'a' }, s3: { n: 'Glare', d: '0', r: 2, t: 's' } }, 0.4),
    mx: r.int(0, 8),
    my: r.int(0, 6),
    ...extra,
  })

function table(r: R) {
  const chars: Record<string, Sheet> = { a: hero(r, 'Lyra'), b: hero(r, 'Bram') }
  const enemies: Record<string, Enemy> = { w: monster(r, 'Wolf'), o: monster(r, 'Ogre'), p2: monster(r, 'Ogre Reborn', { mx: undefined, my: undefined, hp: 80, max: 80 }) }
  // Keep them close, so melee and pushes happen.
  const x0 = r.int(1, 6)
  const y0 = r.int(1, 4)
  chars.a = { ...chars.a!, mx: x0, my: y0 }
  enemies.w = { ...enemies.w!, mx: x0 + r.pick([1, 2, 4]), my: y0 + r.pick([0, 1]) }
  chars.b = { ...chars.b!, mx: x0 + r.pick([-1, 0, 2]), my: y0 + r.pick([1, 2]) }
  if (r.next() < 0.3) chars.a = { ...chars.a!, mt: 'climb', mon: 'w' }
  if (r.next() < 0.3) enemies.o = { ...enemies.o!, hd: 'c:a', sz: 1, mx: x0, my: y0 }
  return { chars, enemies }
}

test('the action menu (menuHtml)', async ({ legacy }) => {
  const r = rng(101)
  const def = defaultBoard()
  const xs = Array.from({ length: 200 }, () => {
    const t = table(r)
    const pairs = [['c:a', 'e:w'], ['c:a', 'c:b'], ['e:w', 'c:a'], ['e:w', 'c:b'], ['c:b', 'e:w'], ['c:a', 'e:o']]
    const [a, tg] = r.pick(pairs)
    const dm = a![0] === 'e' || r.next() < 0.3
    return { dm, me: dm ? 'gm' : a!.slice(2), ...t, a: a!, t: tg!, ini: r.maybe({ ph: 'go', t: 0, l: [{ k: r.pick(['c:a', 'e:w']) }] }, 0.3) ?? null } as Case
  })
  const page = await legacy.run<unknown[]>(
    `(${JSON.stringify(xs)}).map(c=>{dm=c.dm;me=c.me;chars=c.chars;enemies=c.enemies;ini=c.ini;SPS=null;applyBoard(defBoard());maps={m:${JSON.stringify(MAP())}};cur="m";menu={a:c.a,t:c.t};
      const h=menuHtml();if(!h)return null;const d=new DOMParser().parseFromString(h,"text/html");
      return{title:d.querySelector("b").textContent,buttons:[...d.querySelectorAll("button[data-a=mact]")].map(b=>({k:b.dataset.k,...(b.dataset.i!=null?{i:b.dataset.i}:{}),label:b.textContent,disabled:b.disabled,warn:b.classList.contains("warn"),primary:b.classList.contains("pri")})),notes:[...d.querySelectorAll("p.note")].map(p=>p.textContent)}})`,
  )
  const mine = xs.map((c) => {
    const A = unitOf(c.chars, c.enemies, c.a) as U | null
    const T = unitOf(c.chars, c.enemies, c.t) as U | null
    if (!A || !T || A.o.mx == null || T.o.mx == null) return null
    const m = actionMenu(A, T, { dm: c.dm, myTurn: isMyTurn(c.ini, c.a), board: def, hideGolden: goldenHidden(c.dm, null), enemies: c.enemies })
    return { ...m, buttons: m.buttons.map((b) => ({ k: b.k, ...(b.i != null ? { i: String(b.i) } : {}), label: b.label, disabled: b.disabled, warn: b.warn, primary: !!b.primary })) }
  })
  expect(mine).toEqual(page)
})

/** Presses one menu button on both sides and compares the saves. */
async function press(legacy: { run: <T>(e: string) => Promise<T> }, page: import('@playwright/test').Page, c: Case, k: string, i: string | number | undefined, rand: number, slow: boolean) {
  await legacy.run(SETUP(c, rand))
  const sel = `[data-a="mact"][data-k="${k}"]${i != null ? `[data-i="${i}"]` : ''}`
  const btn = page.locator(sel)
  if (!(await btn.count()) || (await btn.isDisabled())) return null
  // Changed since the cutover (1.20.0): these abilities roll each hit on its own, or at -2.
  const label = (await btn.textContent()) ?? ''
  if (k === 'ab' && Object.keys(ATTACK_RULES).some((n) => label.includes(n))) return null
  await btn.click()
  const mine = await inStore(c, rand, (s) => s.getState().act(k, k === 'sp' ? 'Tail Swipe' : i))
  // The page shows its dice and waits for the defender: wait until it has saved as much.
  if (process.env.DBG) console.log('DBG', k, i, rand, JSON.stringify(mine.w.map((x) => x[1])), await legacy.run('JSON.stringify(__w.map(x=>x[1]))'))
  if (slow) await expect.poll(async () => (await theirs(legacy)).length, { timeout: 25_000 }).toBeGreaterThanOrEqual(mine.w.length)
  await page.waitForTimeout(slow ? 300 : 50)
  return { mine, theirs: await theirs(legacy), err: await legacy.run<string>('$("#err").textContent') }
}

test('monsters attacking: rolls, the prompt timing out, readied reactions, damage, knock-downs, skills and area attacks', async ({ legacy, page }) => {
  test.setTimeout(400_000)
  page.on('dialog', (d) => void d.accept('Tail Swipe'))
  const r = rng(102)
  let n = 0
  for (let k = 0; k < 55; k++) {
    const t = table(r)
    const c: Case = { dm: true, me: 'gm', ...t, a: 'e:w', t: r.pick(['c:a', 'c:b']), combat: true }
    const what = r.pick(['l', 'h', 'aoe', 'sk:s1', 'sk:s2', 'sk:s3', 'sp'])
    const [kk, ii] = what.split(':')
    const rand = r.pick([0.02, 0.37, 0.97])
    const res = await press(legacy, page, c, kk!, ii, rand, true)
    if (!res) continue
    expect(norm(res.mine.w), `${what} @${rand} ${JSON.stringify(c)}`).toEqual(norm(res.theirs))
    expect(res.mine.error).toBe(res.err)
    n++
  }
  expect(n).toBeGreaterThan(18)
})

test('heroes attacking monsters: dice, hits and misses, criticals, poise and stagger, phase gates and swaps, charging', async ({ legacy, page }) => {
  test.setTimeout(400_000)
  const r = rng(103)
  let n = 0
  for (let k = 0; k < 30; k++) {
    const t = table(r)
    const dm = r.next() < 0.3
    t.chars.a = { ...t.chars.a!, hp: 40, exh: undefined, stn: undefined, used: 0, mt: undefined, mon: undefined }
    t.enemies.w = { ...t.enemies.w!, hp: r.pick([20, 50]) }
    const c: Case = { dm, me: dm ? 'gm' : 'a', ...t, a: 'c:a', t: 'e:w', combat: true }
    const kk = r.pick(['l', 'h', 'ctr', 'ab', 'ab', 'ab'])
    const ii = kk === 'ab' ? r.int(0, 6) : undefined
    const rand = r.pick([0.02, 0.37, 0.97])
    const res = await press(legacy, page, c, kk, ii, rand, true)
    if (!res) continue
    expect(norm(res.mine.w), `${kk}${ii ?? ''} @${rand} ${JSON.stringify(c)}`).toEqual(norm(res.theirs))
    expect(res.mine.error).toBe(res.err)
    n++
  }
  expect(n).toBeGreaterThan(12)
})

test('push, mount, pick up and throw', async ({ legacy, page }) => {
  const r = rng(104)
  let n = 0
  for (let k = 0; k < 80; k++) {
    const t = table(r)
    t.chars.a = { ...t.chars.a!, hp: 40, exh: undefined, stn: undefined, used: r.pick([0, 0, 1]) }
    const kk = r.pick(['push', 'push', 'mount', 'pick', 'throw'])
    const walls = r.maybe(['0,0', '9,7', `${(t.enemies.w!.mx as number) + 1},${t.enemies.w!.my}`], 0.4)
    const tg = kk === 'push' ? r.pick(['e:w', 'c:b']) : 'e:w'
    if (kk === 'pick') t.enemies.w = { ...t.enemies.w!, stun: true, sz: r.pick([undefined, 1]) }
    if (kk === 'mount') t.enemies.w = { ...t.enemies.w!, sz: 2 }
    if (kk === 'push' && r.next() < 0.6) t.enemies.w = { ...t.enemies.w!, sz: r.pick([undefined, 1]), mx: (t.chars.a.mx as number) + 1, my: t.chars.a.my }
    const dm = r.next() < 0.3
    const c: Case = { dm, me: dm ? 'gm' : 'a', ...t, a: r.next() < 0.2 && kk === 'push' ? 'e:w' : 'c:a', t: tg, walls }
    if (c.a === 'e:w') c.t = 'c:a'
    if (c.a[0] === 'e') c.dm = true
    const res = await press(legacy, page, c, kk, undefined, 0.5, false)
    if (!res) continue
    expect(norm(res.mine.w), `${kk} ${JSON.stringify(c)}`).toEqual(norm(res.theirs))
    n++
  }
  expect(n).toBeGreaterThan(25)
})

test('the defender answers the prompt: dodge or parry, with full, half or no success', async ({ legacy, page }) => {
  test.setTimeout(300_000)
  const r = rng(105)
  let n = 0
  for (let k = 0; k < 24; k++) {
    const t = table(r)
    t.chars.a = { ...t.chars.a!, hp: 60, exh: undefined, stn: undefined, chg: undefined, ddg: undefined, pry: undefined, ac: 5, mt: undefined, mon: undefined, shield: r.maybe(true, 0.5), pw: r.maybe('d', 0.3) }
    const c: Case = { dm: true, me: 'gm', ...t, a: 'e:w', t: 'c:a', combat: true, ini: null }
    t.enemies.w = { ...t.enemies.w!, hp: 30, er: 9, sk: undefined }
    const res = r.pick(['dodge', 'parry'])
    // The attack total is d20 (8 here) + the wolf's attack bonus; saves land right around it.
    const total = 8 + ((t.enemies.w!.ab as number | undefined) ?? 4)
    const sv = { r: r.int(1, 20), t: total + r.pick([-4, -3, -2, -1, 0, 1]) }
    // Both sides read back the prompt they wrote, with the defender's answer added.
    const answer = `(()=>{const q=[...__w].reverse().find(x=>x[0]==="PUT"&&x[1]==="qte");return q?{...q[2],res:${JSON.stringify(res)},sv:${JSON.stringify(sv)}}:null})()`
    await legacy.run(SETUP(c, 0.37).replace('return({chars', `if(p==="qte")return ${answer};return({chars`))
    const btn = page.locator('[data-a="mact"][data-k="l"]')
    if (await btn.isDisabled()) continue
    await btn.click()
    const w: W[] = []
    let clock = 1_000_000
    const db = recDb(w)
    db.get = (async (p: string) => {
      if (p !== 'qte') return null
      const q = [...w].reverse().find((x) => x[0] === 'PUT' && x[1] === 'qte')
      return q ? { ...(q[2] as object), res, sv } : null
    }) as typeof db.get
    const s = createGameStore(() => db, () => clock, () => 0.37, (f, ms) => {
      clock += ms
      queueMicrotask(() => void f())
    })
    s.getState().connect({ pin: 't', role: 'gm', me: 'gm' })
    s.getState().applySnapshot({ ...emptyTables(), chars: structuredClone(c.chars), enemies: structuredClone(t.enemies), maps: { m: MAP() }, cur: 'm', combat: true })
    s.getState().openMenu('e:w', 'c:a')
    await s.getState().act('l')
    await new Promise((rr) => setTimeout(rr, 30))
    await expect.poll(async () => (await theirs(legacy)).length, { timeout: 10_000 }).toBeGreaterThanOrEqual(w.length)
    await page.waitForTimeout(200)
    expect(norm(w), `${res} ${JSON.stringify(sv)} ${JSON.stringify(c.chars.a)}`).toEqual(norm(await theirs(legacy)))
    n++
  }
  expect(n).toBeGreaterThan(15)
})
