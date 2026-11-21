// Parity for the enemy extras: the computer's monster turn (who it picks, where it
// walks, which attack it chooses), the spawn point, and the boss intros (the
// shared entry, and which boss gets one when combat begins).
import { expect, test } from '../harness.ts'
import type { Sheet } from '../../src/logic/sheet.ts'
import type { Enemy } from '../../src/logic/types.ts'
import { createGameStore, emptyTables } from '../../src/state/store.ts'
import { clean, rng } from './random.ts'
import { CAPTURE, noTs, recDb, type W } from './store.ts'

type R = ReturnType<typeof rng>
type Case = { chars: Record<string, Sheet>; enemies: Record<string, Enemy>; walls: string[]; fog?: string; ini?: unknown }

const COLS = 12
const ROWS = 9
const MAP = (walls: string[], fog?: string) => clean({ name: 'Crypt', v2: 1, w: COLS * 50, h: ROWS * 50, cols: COLS, walls, fog: fog ? 1 : undefined, fg: fog })

function randomCase(r: R): Case {
  const sq = () => [r.int(0, COLS - 1), r.int(0, ROWS - 1)] as const
  const hero = (name: string): Sheet => {
    const [mx, my] = sq()
    return clean({ name, x10: true, cls: 'fighter', hp: r.pick([0, 30, 30, 30]), maxHp: 30, st: 50, maxSt: 100, mx: r.maybe(mx, 0.9), my, mt: r.maybe('climb', 0.1), ap: r.maybe('no', 0.1), mp: r.maybe(r.pick(['m', 'n']), 0.15) })
  }
  const monster = (name: string): Enemy => {
    const [mx, my] = sq()
    const sk = Object.fromEntries(Array.from({ length: r.int(0, 3) }, (_, i) => [`s${i}`, clean({ n: `Skill ${i}`, d: '1d6', r: r.maybe(r.int(0, 4)), t: r.pick(['s', 'a']) })]))
    return clean<Enemy>({ name, x10: true, hp: r.pick([0, 20, 20, 20]), max: 20, mx: r.maybe(mx, 0.9), my, sz: r.maybe(r.int(2, 3), 0.3), spd: r.maybe(r.int(1, 8)), bon: r.maybe(r.int(0, 2)), er: r.maybe(r.int(1, 4), 0.4), stun: r.maybe(true, 0.1), hd: r.maybe('c:a', 0.05), sk, rk: r.maybe(r.pick(['n', 'l', 'm', 'u']), 0.6), bi: r.maybe(true, 0.2), mp: r.maybe(r.pick(['m', 'n']), 0.15), bt: r.maybe('The Fallen'), th: r.maybe('aethelric', 0.3) } as unknown as Enemy)
  }
  const walls = Array.from({ length: r.int(0, 25) }, () => sq().join(','))
  return {
    chars: { a: hero('Lyra'), b: hero('Bram'), c: hero('Cid') },
    enemies: { w: monster('Wolf'), o: monster('Ogre') },
    walls,
    fog: r.maybe(r.str('0001', COLS * ROWS, COLS * ROWS), 0.3),
  }
}

const SETUP = (c: Case, rand: number) =>
  `${CAPTURE}Math.random=()=>${rand};$("#err").textContent="";pin="t";role="gm";canGM=true;dm=true;me="gm";hideL=false;
   chars=${JSON.stringify(c.chars)};enemies=${JSON.stringify(c.enemies)};maps={m:${JSON.stringify(MAP(c.walls, c.fog))},n:${JSON.stringify(MAP([]))}};cur="m";IM={m:{data:"data:,"},n:{data:"data:,"}};gmMap=null;
   combat=true;ini=null;sel=null;jump=null;tool="move";SPS=null;sceneOn=false;menu=null;
   window.__act=null;doAct=(k,i)=>{__act=[k,i??null,menu]};applyBoard(defBoard());view="table";last="";render()`

async function inStore(c: Case, rand: number, act: (s: ReturnType<typeof createGameStore>) => Promise<unknown>) {
  const w: W[] = []
  const s = createGameStore(() => recDb(w), Date.now, () => rand, () => {})
  s.getState().connect({ pin: 't', role: 'gm', me: 'gm' })
  s.getState().applySnapshot({ ...emptyTables(), chars: structuredClone(c.chars), enemies: structuredClone(c.enemies), maps: { m: MAP(c.walls, c.fog), n: MAP([]) }, cur: 'm', combat: true })
  let acted: unknown = null
  s.setState({ act: async (k: string, i?: unknown) => void (acted = [k, i ?? null, s.getState().menu]) })
  await act(s)
  return { w, acted }
}
const theirs = async (legacy: { run: <T>(e: string) => Promise<T> }) => (await legacy.run<W[]>('__w')).filter(([, p]) => p !== 'meta')

test("a monster's turn played by the computer: target, walk, attack choice", async ({ legacy }) => {
  const r = rng(808)
  let acted = 0
  for (let k = 0; k < 200; k++) {
    const c = randomCase(r)
    const id = r.pick(['w', 'o'])
    // Values at the 0.3 (heavy) and 0.5 (skill) thresholds and either side.
    const rand = r.pick([0.05, 0.29, 0.3, 0.31, 0.47, 0.5, 0.6, 0.95])
    await legacy.run(SETUP(c, rand) + `;enemyAuto(${JSON.stringify(id)})`)
    const live = { w: await theirs(legacy), acted: await legacy.run('__act') }
    const mine = await inStore(c, rand, (s) => s.getState().autoTurn(id))
    expect(noTs(mine.w), `${id} @${rand} ${JSON.stringify(c)}`).toEqual(noTs(live.w))
    expect(mine.acted, `${id} @${rand} ${JSON.stringify(c)}`).toEqual(live.acted)
    if (mine.acted) acted++
  }
  expect(acted).toBeGreaterThan(40)
})

test('the spawn point', async ({ legacy, page }) => {
  const r = rng(809)
  for (let k = 0; k < 20; k++) {
    const c = randomCase(r)
    await legacy.run(SETUP(c, 0.5) + ';eOpen=new Set(["w"]);last="";render()')
    await page.locator('[data-a="espawn"][data-id="w"]').click()
    const mine = await inStore(c, 0.5, (s) => s.getState().setSpawn('w'))
    expect(noTs(mine.w), JSON.stringify(c.enemies.w)).toEqual(noTs(await theirs(legacy)))
  }
})

test('boss intros: the shared entry, and which boss gets one when combat begins', async ({ legacy }) => {
  const r = rng(810)
  let intros = 0
  for (let k = 0; k < 120; k++) {
    const c = randomCase(r)
    await legacy.run(SETUP(c, 0.5) + ';introBosses()')
    const mine = await inStore(c, 0.5, (s) => s.getState().introBosses())
    const live = await theirs(legacy)
    expect(noTs(mine.w), JSON.stringify(c)).toEqual(noTs(live))
    if (live.length) intros++
  }
  expect(intros).toBeGreaterThan(10)
  // The GM's Boss intro button.
  const c = randomCase(r)
  await legacy.run(SETUP(c, 0.5) + ';bossIntro("o")')
  const mine = await inStore(c, 0.5, (s) => s.getState().bossIntro('o'))
  expect(noTs(mine.w)).toEqual(noTs(await theirs(legacy)))
})
