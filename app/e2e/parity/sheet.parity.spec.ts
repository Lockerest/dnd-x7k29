// Parity for the character sheet: the same sheet data and the same button presses
// on the live page and in the new rules and store must save exactly the same data.
import { expect, test } from '../harness.ts'
import { COMMON_ABILITIES, PARRY, CLASS_FRAMES, STAT_FIELDS } from '../../src/data/abilities.ts'
import { attunedSet, boardIndex, defaultBoard, equippedIds, goldenHidden, parryMode, sheetAbilities, spoilerList, type Board } from '../../src/logic/board.ts'
import { altarsOf, bonfiresOf, nearSpot, revealAround, type MapData } from '../../src/logic/geometry.ts'
import { characterPills, respawnPatches, type Sheet } from '../../src/logic/sheet.ts'
import { createGameStore, emptyTables, type Tables } from '../../src/state/store.ts'
import type { Db } from '../../src/db/client.ts'
import type { Enemy } from '../../src/logic/types.ts'
import { CASES, clean, rng } from './random.ts'

type W = [method: string, path: string, body: unknown]

/** Replaces the page's database calls: writes are recorded, reads give the page's own state. */
const CAPTURE = `window.__w=[];api=async(p,m,b)=>{if(m&&m!=="GET"){__w.push([m,p,b===undefined?null:JSON.parse(JSON.stringify(b))]);return m==="POST"?{name:"-k"+__w.length}:null}
 return({chars,enemies,maps,cur,board,"meta/sp":SPS})[p]??null};`

/** A recording database for the new store. */
function recDb(w: W[]): Db {
  return {
    pin: 't',
    url: () => '',
    get: async () => null,
    keys: async () => [],
    put: async (p, v) => void w.push(['PUT', p, clean(v)]),
    patch: async (p, v) => void w.push(['PATCH', p, clean(v)]),
    post: async (p, v) => (w.push(['POST', p, clean(v)]), `-k${w.length}`),
    del: async (p) => void w.push(['DELETE', p, null]),
  }
}

/** Timestamps differ between the two runs; everything else must match. */
const noTs = (w: W[]) => w.map(([m, p, b]) => [m, p, b && typeof b === 'object' && 'ts' in b ? { ...b, ts: 0 } : b])

const CLASSES_ = ['fighter', 'archer', 'mage', 'thief', 'warrior', 'sorcerer', 'spearhand', 'magickarcher', 'trickster']

test('sheet data matches the page', async ({ legacy }) => {
  const page = await legacy.run<Record<string, unknown>>(`({COM,PARRY,FR,NUM,def:defBoard()})`)
  expect(COMMON_ABILITIES).toEqual(page.COM)
  expect(PARRY).toEqual(page.PARRY)
  expect(CLASS_FRAMES).toEqual(page.FR)
  expect(STAT_FIELDS).toEqual(page.NUM)
  expect(defaultBoard()).toEqual(page.def)
})

test('board lookups (applyBoard) for the default and 9-class boards', async ({ legacy }) => {
  for (const which of ['defBoard', 'vocBoard']) {
    const page = await legacy.run<{ b: Board; AD: unknown; HEAL: unknown; CHK: unknown; HC: unknown }>(`(()=>{const b=${which}();applyBoard(b);return{b,AD,HEAL,CHK,HC}})()`)
    expect(boardIndex(page.b)).toEqual({ attack: page.AD, heal: page.HEAL, check: page.CHK, hpCost: page.HC })
  }
})

test('equipped abilities, parry, attunements and spoilers', async ({ legacy }) => {
  const r = rng(61)
  const board = await legacy.run<Board>('vocBoard()')
  const keys = Object.keys(board)
  const xs = Array.from({ length: CASES }, () => ({
    dm: r.next() < 0.3,
    sp: r.pick([null, '-', 'golden', 'altar, Golden ,x', '']),
    c: clean({
      cls: r.pick(CLASSES_),
      level: r.maybe(r.int(1, 10), 0.9),
      eq: r.maybe(Object.fromEntries(Array.from({ length: r.int(0, 8) }, () => [r.pick(keys), 1])), 0.6),
      at: r.maybe(Object.fromEntries(Array.from({ length: r.int(0, 4) }, () => [r.pick(keys), 1])), 0.5),
      atn: r.maybe(r.int(0, 3)),
      pw: r.maybe(r.pick(['', 'n', 'd', 'x'])),
      shield: r.maybe(r.pick([true, false])),
    }),
  }))
  const page = await legacy.run<unknown[]>(
    `applyBoard(vocBoard());(${JSON.stringify(xs)}).map(x=>{dm=x.dm;SPS=x.sp;return{sp:spList(),gh:goldHid(),eq:eqIds(x.c),abs:ABS(x.c),pm:parryMode(x.c),at:Object.keys(atSet(x.c))}})`,
  )
  const mine = xs.map((x) => {
    const gh = goldenHidden(x.dm, x.sp)
    return { sp: spoilerList(x.sp), gh, eq: equippedIds(x.c, board, gh), abs: sheetAbilities(x.c, board, gh), pm: parryMode(x.c), at: attunedSet(x.c, board) }
  })
  expect(mine).toEqual(page)
})

test('status labels (pillsOf)', async ({ legacy }) => {
  const r = rng(62)
  const xs = Array.from({ length: CASES }, () =>
    clean({
      mt: r.maybe(r.pick(['climb', 'down'])),
      exh: r.maybe(true),
      exn: r.maybe(r.int(1, 3)),
      stn: r.maybe(true, 0.2),
      ddg: r.maybe(true, 0.2),
      pry: r.maybe(true, 0.2),
      chg: r.maybe('Meteor Fall', 0.2),
      ctr: r.maybe(true, 0.2),
      hp: r.int(-5, 50),
      dth: r.maybe(r.int(1, 3), 0.3),
      ft: r.maybe(r.int(1, 10), 0.3),
      pr: r.maybe(true, 0.2),
      conds: r.maybe(r.pick(['Poisoned', 'Exhausted by <b>fire</b>', '']), 0.4),
    }),
  )
  const page = await legacy.run<unknown[]>(
    `(${JSON.stringify(xs)}).map(c=>[...new DOMParser().parseFromString(pillsOf(c),"text/html").querySelectorAll(".pill")].map(i=>({text:i.textContent,bad:i.classList.contains("bad")})))`,
  )
  expect(xs.map((c) => characterPills(c as Sheet))).toEqual(page)
})

/** A random map with walls, wall edges, doors, altars, bonfires and fog. */
function randomMap(r: ReturnType<typeof rng>): MapData {
  const cols = r.int(6, 14)
  const cs = 50
  const rows = r.int(6, 12)
  const sq = () => `${r.int(0, cols - 1)},${r.int(0, rows - 1)}`
  const list = (n: number, f: () => string) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`k${i}`, f()]))
  return clean({
    w: cols * cs,
    h: rows * cs + r.int(0, 49),
    cols: r.maybe(cols, 0.95),
    fog: r.maybe(1, 0.85),
    fg: r.maybe(r.str('01', 0, cols * rows), 0.5),
    walls: list(r.int(0, 12), sq),
    ew: list(r.int(0, 14), () => `${r.pick(['v', 'h'])},${r.int(0, cols)},${r.int(0, rows)}`),
    dr: Object.fromEntries(Array.from({ length: r.int(0, 3) }, (_, i) => [`d${i}`, { c: r.maybe(sq()), o: r.maybe(1), e: list(r.int(0, 2), () => `${r.pick(['v', 'h'])},${r.int(0, cols)},${r.int(0, rows)}`) }])),
    al: list(r.int(0, 3), sq),
    bf: list(r.int(0, 2), sq),
  })
}

test('fog revealed around a spot, and standing by an altar or bonfire', async ({ legacy }) => {
  const r = rng(63)
  const xs = Array.from({ length: CASES }, () => {
    const m = randomMap(r)
    const cols = m.cols || 24
    return { m, x: r.int(0, cols - 1), y: r.int(0, 11), c: clean({ mx: r.maybe(r.int(0, cols), 0.9), my: r.int(0, 12) }) }
  })
  const page = await legacy.run<unknown[]>(
    `(${JSON.stringify(xs)}).map(x=>{${CAPTURE}dm=false;gmMap=null;maps={m:JSON.parse(JSON.stringify(x.m))};cur="m";IM={m:{}};revealAround(x.x,x.y);return{fg:x.m.fog?maps.m.fg:null,al:altars(),bf:bonfires(),na:nearAl(x.c),nb:nearBf(x.c)}})`,
  )
  const mine = xs.map((x) => ({ fg: revealAround(x.m, x.x, x.y), al: altarsOf(x.m), bf: bonfiresOf(x.m), na: nearSpot(x.c, altarsOf(x.m)), nb: nearSpot(x.c, bonfiresOf(x.m)) }))
  expect(mine).toEqual(page)
})

test('the world reset after an altar rest (respawnEnemies)', async ({ legacy }) => {
  const r = rng(64)
  const xs = Array.from({ length: 120 }, () => {
    const ids = ['a', 'b', 'c', 'd', 'e'].slice(0, r.int(1, 5))
    return Object.fromEntries(
      ids.map((i) => [
        i,
        clean({
          name: i,
          x10: true,
          hp: r.int(0, 50),
          max: 50,
          sz: r.maybe(r.int(1, 5)),
          rk: r.maybe(r.pick(['n', 'l', 'm', 'u']), 0.3),
          pm: r.maybe(r.int(0, 30)),
          nx: r.maybe(r.pick(ids), 0.3),
          mx: r.maybe(r.int(0, 9), 0.6),
          my: r.int(0, 9),
          mp: r.maybe('m1'),
          hx: r.maybe(r.int(0, 9), 0.4),
          hy: r.int(0, 9),
          hm: r.maybe('m2', 0.3),
        }),
      ]),
    ) as Record<string, Enemy>
  })
  const page = await legacy.run<unknown[]>(`(${JSON.stringify(xs)}).map(x=>{${CAPTURE}dm=true;chars={};maps={m1:{}};cur="m1";enemies=JSON.parse(JSON.stringify(x));respawnEnemies();return __w})`)
  const mine = await Promise.all(
    xs.map(async (x) => {
      const w: W[] = []
      const s = createGameStore(() => recDb(w))
      s.getState().connect({ pin: 't', role: 'gm', me: 'gm' })
      s.getState().applySnapshot({ ...emptyTables(), enemies: structuredClone(x), maps: { m1: {} }, cur: 'm1' })
      for (const [i, p] of respawnPatches(s.getState().tables.enemies)) await s.getState().updateEnemy(i, p)
      if (respawnPatches(x).length) await s.getState().log('The monsters return to their posts (unique foes stay dead)')
      return w
    }),
  )
  expect(mine.map(noTs)).toEqual((page as W[][]).map(noTs))
})

// ---- Button presses on the sheet ----

type Case = { dm: boolean; me: string; chars: Record<string, Sheet>; enemies?: Record<string, Enemy>; map?: MapData; ini?: Tables['ini'] }

const SETUP = (c: Case) =>
  `${CAPTURE}pin="t";role=${c.dm ? '"gm"' : '"player"'};canGM=${c.dm};dm=${c.dm};me=${JSON.stringify(c.me)};lastWave=0;
   chars=${JSON.stringify(c.chars)};enemies=${JSON.stringify(c.enemies ?? {})};maps=${JSON.stringify(c.map ? { m: { ...c.map, v2: 1 } } : {})};cur=${c.map ? '"m"' : 'null'};IM=${c.map ? '{m:{}}' : '{}'};
   gmMap=null;ini=${JSON.stringify(c.ini ?? null)};applyBoard(defBoard());SPS=null;view="sheet";last="";render()`

/** The same press in the new store, with the same starting tables. */
async function inStore(c: Case, act: (s: ReturnType<typeof createGameStore>) => Promise<void>, rand: () => number = Math.random) {
  const w: W[] = []
  const queued: (() => unknown)[] = []
  const s = createGameStore(
    () => recDb(w),
    Date.now,
    rand,
    (f) => void queued.push(f), // the world reset, run below after the press (the page waits 1.5 s)
  )
  s.getState().connect({ pin: 't', role: c.dm ? 'gm' : 'player', me: c.me })
  s.getState().applySnapshot({ ...emptyTables(), chars: structuredClone(c.chars), enemies: structuredClone(c.enemies ?? {}), maps: c.map ? { m: { ...structuredClone(c.map), v2: 1 } } : {}, cur: c.map ? 'm' : null, ini: c.ini ?? null })
  await act(s)
  for (const f of queued) await f()
  return w
}

const hero = (r: ReturnType<typeof rng>, extra: object = {}): Sheet =>
  clean({
    name: 'Hero',
    cls: r.pick(CLASSES_),
    x10: true,
    level: r.int(1, 4),
    hp: r.int(0, 140),
    maxHp: 140,
    bmh: r.maybe(150, 0.3),
    st: r.int(0, 120),
    maxSt: 120,
    rg: r.pick([10, 15, 20]),
    fl: r.int(0, 4),
    maxFl: 4,
    used: r.maybe(r.int(0, 2)),
    exh: r.maybe(true, 0.15),
    exn: r.maybe(r.int(1, 3), 0.2),
    stn: r.maybe(true, 0.1),
    mt: r.maybe(r.pick(['climb', 'down']), 0.2),
    mon: r.maybe('w', 0.2),
    dth: r.maybe(r.int(1, 3), 0.3),
    ft: r.maybe(r.int(1, 5), 0.2),
    fa: r.maybe(r.int(0, 50), 0.2),
    cb: r.maybe('1,1', 0.3),
    shield: r.maybe(true, 0.3),
    pw: r.maybe(r.pick(['', 'n', 'd', 'x']), 0.4),
    ha: r.maybe(r.pick([true, false]), 0.3),
    int: r.int(8, 18),
    mx: r.maybe(r.int(0, 4), 0.8),
    my: r.int(0, 4),
    log: r.maybe(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'].slice(0, r.int(0, 11))),
    ...extra,
  })

const MAP: MapData = { w: 500, h: 500, cols: 10, fog: 1, fg: '', al: { a: '1,1', b: '3,3' }, bf: { a: '0,4' } }

test('sheet buttons save the same changes', async ({ legacy, page }) => {
  const r = rng(65)
  const buttons: { a: string; n?: string; pick?: (c: Sheet) => boolean }[] = [
    { a: 'hp', n: '-50' },
    { a: 'hp', n: '-10' },
    { a: 'hp', n: '10' },
    { a: 'hp', n: '50' },
    { a: 'flask' },
    { a: 'regen' },
    { a: 'st', n: '-10' },
    { a: 'st', n: '10' },
    { a: 'shield' },
    { a: 'pw' },
    { a: 'armor' },
    { a: 'mtd' },
    { a: 'unmount' },
    { a: 'restb' },
    { a: 'rest' },
  ]
  const pressed: Record<string, number> = {}
  for (let k = 0; k < 150; k++) {
    const b = buttons[k % buttons.length]!
    const dm = b.a === 'regen' || b.a === 'st' || b.a === 'pw' || b.a === 'unmount' ? true : r.next() < 0.5
    const c: Case = { dm, me: dm ? 'gm' : 'a', chars: { a: hero(r, b.a === 'mtd' || b.a === 'unmount' ? { mt: r.pick(['climb', 'down']), mon: 'w' } : b.a.startsWith('rest') ? { hp: r.int(1, 140), dth: r.pick([0, 1, 2, 3]), cb: r.pick(['1,1', '3,3', undefined]), mx: r.pick([0, 1, 2, 3, 4, undefined]), my: r.pick([1, 2, 3, 4]) } : {}) }, map: MAP, enemies: { w: { name: 'Wolf', x10: true, hp: 10, max: 10 } } }
    const sel = `[data-a="${b.a}"][data-id="a"]${b.n ? `[data-n="${b.n}"]` : ''}`
    await legacy.run(SETUP(c))
    const btn = page.locator(sel).first()
    if (!(await btn.count()) || (await btn.isDisabled())) continue
    await btn.click()
    pressed[b.a] = (pressed[b.a] || 0) + 1
    // The altar rest resets the world 1.5 s later on the page.
    if (b.a === 'rest') await page.waitForTimeout(1700)
    const theirs = (await legacy.run<W[]>('__w')).filter(([, p]) => p !== 'meta')
    const mine = await inStore(c, async (s) => {
      const st = s.getState()
      const ch = st.tables.chars.a as Sheet
      const { hpChange, drinkFlask, staminaChange, toggleShield, cycleParry, toggleArmor, toggleFoeDown, dismount } = await import('../../src/logic/sheet.ts')
      const { startTurn } = await import('../../src/logic/stamina.ts')
      const u = (p: [Record<string, unknown>, string?] | null) => (p ? st.updateCharacter('a', p[0], p[1]) : Promise.resolve())
      if (b.a === 'hp') await u(hpChange(ch, Number(b.n)))
      else if (b.a === 'flask') await u(drinkFlask(ch))
      else if (b.a === 'regen') await u(startTurn(ch as Parameters<typeof startTurn>[0]))
      else if (b.a === 'st') await u(staminaChange(ch, Number(b.n)))
      else if (b.a === 'shield') await u(toggleShield(ch))
      else if (b.a === 'pw') await u(cycleParry(ch))
      else if (b.a === 'armor') await u(toggleArmor(ch))
      else if (b.a === 'mtd') await u(toggleFoeDown(ch))
      else if (b.a === 'unmount') {
        await u(dismount(true))
        await st.log('Hero is dropped from the monster. The GM decides where they land.')
      } else await st.rest('a', b.a === 'rest' ? 'al' : 'bf')
    })
    expect(noTs(mine), `${b.a} ${JSON.stringify(c)}`).toEqual(noTs(theirs))
  }
  // Every kind of button was really pressed (most several times).
  expect(Object.keys(pressed).sort()).toEqual(buttons.map((b) => b.a).filter((a, i, l) => l.indexOf(a) === i).sort())
  expect(Object.values(pressed).reduce((a, b) => a + b, 0)).toBeGreaterThan(100)
})

test('reviving at an altar (with and without a party wipe)', async ({ legacy, page }) => {
  const r = rng(66)
  for (let k = 0; k < 16; k++) {
    const wipe = k % 2 === 0
    const c: Case = {
      dm: r.next() < 0.5,
      me: 'a',
      chars: { a: hero(r, { hp: 0 }), b: hero(r, { name: 'Ally', hp: wipe ? 0 : 30 }), c: hero(r, { name: 'Waiting', hp: 50, ap: false }) },
      map: { ...randomMap(r), al: { a: '1,1', b: '3,2' } },
      enemies: { w: { name: 'Wolf', x10: true, hp: 0, max: 10, mx: 5, my: 5 }, u: { name: 'Dragon', x10: true, hp: 0, max: 99, sz: 4 } },
    }
    if (c.dm) c.me = 'gm'
    const altar = r.pick(['1,1', '3,2'])
    await legacy.run(SETUP(c))
    await page.locator(`[data-a="revive"][data-id="a"][data-b="${altar}"]`).click()
    if (wipe) await page.waitForTimeout(1700)
    const theirs = (await legacy.run<W[]>('__w')).filter(([, p]) => p !== 'meta')
    const mine = await inStore(c, (s) => s.getState().reviveAt('a', altar))
    expect(noTs(mine), JSON.stringify(c)).toEqual(noTs(theirs))
  }
})

test('using abilities: stamina, actions, turns, Golden HP costs and reactions', async ({ legacy, page }) => {
  const r = rng(67)
  const board = await legacy.run<Board>('vocBoard()')
  const golden = Object.keys(board).filter((k) => board[k]!.gb && board[k]!.k !== 'atk' && board[k]!.k !== 'heal' && board[k]!.k !== 'check')
  let pressed = 0
  for (let k = 0; k < 60; k++) {
    const dm = r.next() < 0.4
    const g = r.maybe(r.pick(golden), 0.5)
    const eq = g ? { [board[g]!.gb!]: 1, [g]: 1 } : undefined
    const c: Case = {
      dm,
      me: dm ? 'gm' : 'a',
      chars: { a: hero(r, { eq, hp: r.int(1, 140), exh: r.maybe(true, 0.1), stn: undefined }) },
      ini: r.maybe({ ph: 'go', t: 0, l: [{ k: r.pick(['c:a', 'e:w']) }, { k: 'c:a' }] }, 0.3) ?? null,
    }
    const setup = SETUP(c).replace('applyBoard(defBoard())', 'applyBoard(vocBoard());board=vocBoard()')
    await legacy.run(setup)
    const btns = page.locator(`[data-a="use"][data-id="a"]`)
    const n = await btns.count()
    if (!n) continue
    const i = r.int(0, n - 1)
    const btn = btns.nth(i)
    if (await btn.isDisabled()) continue
    const idx = Number(await btn.getAttribute('data-i'))
    const name = sheetAbilities(c.chars.a!, board, goldenHidden(dm, null))[idx]![0]
    if (boardIndex(board).heal[name] || boardIndex(board).check[name]) continue // they roll dice: tested below
    await btn.click()
    pressed++
    const theirs = (await legacy.run<W[]>('__w')).filter(([, p]) => p !== 'meta')
    const ab = sheetAbilities(c.chars.a!, board, goldenHidden(dm, null))[idx]!
    const mine = await inStore(c, async (s) => {
      s.getState().applySnapshot({ ...s.getState().tables, board })
      await s.getState().castAbility('a', ab[0], ab[1], ab[3] === 'r')
    })
    expect(noTs(mine), JSON.stringify({ c, ab })).toEqual(noTs(theirs))
  }
  expect(pressed).toBeGreaterThan(20)
})

test('typed boxes, attunement release and removing a character', async ({ legacy, page }) => {
  const r = rng(68)
  const board = await legacy.run<Board>('vocBoard()')
  const goldens = Object.keys(board).filter((k) => board[k]!.gb)
  const kinds = [0, 0, 0, 0]
  for (let k = 0; k < 30; k++) {
    const at = Object.fromEntries([r.pick(goldens), r.pick(goldens)].map((x) => [x, 1]))
    const c: Case = { dm: true, me: 'gm', chars: { a: hero(r, { at, atn: 2 }) } }
    await legacy.run(SETUP(c).replace('applyBoard(defBoard())', 'applyBoard(vocBoard());board=vocBoard()'))
    const kind = k % 4
    let mine: W[]
    if (kind === 0) {
      const f = r.pick(['level', 'atn', 'ac', 'maxHp', 'souls', 'str', 'cha'])
      const v = r.pick(['', '0', '7', '-2', 'abc', '15'])
      await page.locator(`[data-f="${f}"][data-id="a"]`).evaluate((el, value) => {
        ;(el as HTMLInputElement).value = value
        el.dispatchEvent(new Event('change', { bubbles: true }))
      }, v)
      mine = await inStore(c, (s) => s.getState().patchCharacter('a', { [f]: Number(v) || 0 }))
    } else if (kind === 1) {
      const f = r.pick(['conds', 'notes'])
      const v = r.pick(['', 'Poisoned', ' spaced <b> '])
      await page.locator(`[data-f="${f}"][data-id="a"]`).evaluate((el, value) => {
        ;(el as HTMLInputElement).value = value
        el.dispatchEvent(new Event('change', { bubbles: true }))
      }, v)
      mine = await inStore(c, (s) => s.getState().patchCharacter('a', { [f]: v }))
    } else if (kind === 2) {
      const btn = page.locator('[data-a="atrel"][data-id="a"]').first()
      if (!(await btn.count())) continue
      const key = (await btn.getAttribute('data-k'))!
      await btn.click()
      const { releaseAttunement } = await import('../../src/logic/sheet.ts')
      mine = await inStore(c, (s) => {
        const [p, m] = releaseAttunement(s.getState().tables.chars.a as Sheet, key, board)
        return s.getState().updateCharacter('a', p, m)
      })
    } else {
      page.once('dialog', (d) => void d.accept())
      await page.locator('[data-a="del"][data-id="a"]').click()
      mine = await inStore(c, (s) => s.getState().removeCharacter('a'))
    }
    const theirs = (await legacy.run<W[]>('__w')).filter(([, p]) => p !== 'meta')
    expect(noTs(mine), `${kind} ${JSON.stringify(c)}`).toEqual(noTs(theirs))
    kinds[kind]!++
  }
  expect(kinds.every((n) => n >= 3)).toBe(true)
})

test('putting down a carried monster', async ({ legacy, page }) => {
  const c: Case = { dm: false, me: 'a', chars: { a: { name: 'Hero', x10: true, hp: 50, maxHp: 50, st: 10, maxSt: 10, mx: 2, my: 2 } as Sheet }, enemies: { w: { name: 'Imp', x10: true, hp: 3, max: 3, hd: 'c:a' } } }
  await legacy.run(SETUP(c))
  await page.locator('[data-a="putdown"][data-id="w"]').click()
  const theirs = (await legacy.run<W[]>('__w')).filter(([, p]) => p !== 'meta')
  const mine = await inStore(c, (s) => s.getState().putDown('w'))
  expect(noTs(mine)).toEqual(noTs(theirs))
})

test('healing and check abilities roll their dice and apply the result', async ({ legacy, page }) => {
  test.setTimeout(180_000) // the page shows its dice for a few seconds each time
  const r = rng(69)
  const board = await legacy.run<Board>('vocBoard()')
  const ix = boardIndex(board)
  let done = 0
  for (let k = 0; k < 14; k++) {
    const dm = k % 3 === 0
    const key = r.pick(Object.keys(board).filter((x) => (board[x]!.k === 'heal' || board[x]!.k === 'check') && !board[x]!.gb))
    const e = board[key]!
    const cls = e.v === 'any' ? 'fighter' : e.v
    const c: Case = { dm, me: dm ? 'gm' : 'a', chars: { a: hero(r, { cls, level: 10, eq: { [key]: 1 }, hp: r.int(1, 100), exh: undefined, stn: undefined, chg: undefined, used: 0 }) } }
    await legacy.run(SETUP(c).replace('applyBoard(defBoard())', 'applyBoard(vocBoard());board=vocBoard()') + ';Math.random=()=>0.37')
    const abs = sheetAbilities(c.chars.a!, board, goldenHidden(dm, null))
    const idx = abs.findIndex(([n]) => ix.heal[n] || ix.check[n])
    if (idx < 0) continue
    const btn = page.locator(`[data-a="use"][data-id="a"][data-i="${idx}"]`)
    if (await btn.isDisabled()) continue
    await btn.click()
    const ab = abs[idx]!
    const mine = await inStore(
      c,
      async (s) => {
        s.getState().applySnapshot({ ...s.getState().tables, board })
        await s.getState().castAbility('a', ab[0], ab[1], false)
      },
      () => 0.37,
    )
    // The page shows its dice first, then applies the result.
    await expect.poll(async () => (await legacy.run<W[]>('__w')).filter(([, p]) => p !== 'meta').length, { timeout: 15000 }).toBe(mine.length)
    const theirs = (await legacy.run<W[]>('__w')).filter(([, p]) => p !== 'meta')
    expect(noTs(mine), JSON.stringify({ c, ab })).toEqual(noTs(theirs))
    done++
  }
  expect(done).toBeGreaterThan(9)
})
