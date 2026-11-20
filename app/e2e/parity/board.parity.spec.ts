// Parity for the ability board and reference: the same board, character and button
// presses on the live page and in the new rules, screens and store must show and
// save exactly the same things.
import { expect, test } from '../harness.ts'
import { BONUSES, CLASS_COLORS, GLYPHS, GLYPH_RULES, KINDS, VOCATIONS } from '../../src/data/abilityIcons.ts'
import { VOCATION_ROWS } from '../../src/data/vocationBoard.ts'
import { availableAbilities, equipRow, glyphOf, referenceRows, usedSlots, vocationBoard } from '../../src/logic/abilityBoard.ts'
import { attunedSet, defaultBoard, equippedIds, goldenHidden, slotsOf, type Board } from '../../src/logic/board.ts'
import type { Sheet } from '../../src/logic/sheet.ts'
import { abilityCost } from '../../src/logic/stamina.ts'
import { atRestSpot } from '../../src/state/boardActions.ts'
import { createGameStore, emptyTables, type Tables } from '../../src/state/store.ts'
import { CASES, clean, rng } from './random.ts'
import { CAPTURE, noTs, recDb, type W } from './store.ts'

test('board data matches the page', async ({ legacy }) => {
  const page = await legacy.run<Record<string, unknown>>(
    `({V:VROWS,G:GLY,R:GKW.map(([r,g])=>[r.source,r.flags,g]),C:CCOL,K:KINDS,O:VOC,B:BON,voc:vocBoard()})`,
  )
  expect(VOCATION_ROWS).toEqual(page.V)
  expect(GLYPHS).toEqual(page.G)
  expect(GLYPH_RULES.map(([r, g]) => [r.source, r.flags, g])).toEqual(page.R)
  expect(CLASS_COLORS).toEqual(page.C)
  expect(KINDS).toEqual(page.K)
  expect(VOCATIONS).toEqual(page.O)
  expect(BONUSES).toEqual(page.B)
  expect(vocationBoard()).toEqual(page.voc)
})

test('drawn icon shapes and colours (gKey)', async ({ legacy }) => {
  // The icon pictures themselves are compared with the page in src/ui/screens/AbilityIcon.parity.test.tsx.
  const voc = vocationBoard()
  const custom: Board = { ...voc, z1: { n: 'Odd Thing', v: 'warrior2', k: 'util', ic: '🦊' }, z2: { n: 'Plain', v: 'nobody', k: 'heal' }, z3: { n: 'Hitter', v: 'any', k: 'atk' } }
  // The shape and colour choice itself, for every ability.
  const keys = Object.keys(custom)
  const page = await legacy.run<unknown[]>(`applyBoard(${JSON.stringify(custom)});${JSON.stringify(keys)}.map(k=>gKey(board[k].n))`)
  const byName: Record<string, string> = {}
  for (const k of keys) byName[custom[k]!.n] = k
  expect(keys.map((k) => glyphOf(custom, byName[custom[k]!.n]!)).map((g) => ({ g: g.glyph, col: g.golden ? '#f2c14e' : g.color, gd: g.golden }))).toEqual(page)
})

const CLASSES_ = ['fighter', 'archer', 'mage', 'thief', 'warrior', 'sorcerer', 'spearhand', 'magickarcher', 'trickster']

test('the reference table (refHtml)', async ({ legacy }) => {
  const r = rng(71)
  const voc = vocationBoard()
  const xs = Array.from({ length: 80 }, () => ({
    dm: r.next() < 0.3,
    all: r.next() < 0.3,
    sp: r.pick([null, '-', 'golden']),
    me: r.pick(['a', 'nobody']),
    c: clean({ cls: r.pick([...CLASSES_, 'bard']), level: r.maybe(r.int(1, 10), 0.9) }),
    pick: r.maybe(r.pick([...CLASSES_, 'nope']), 0.5),
    board: r.pick(['voc', 'def']),
  }))
  const page = await legacy.run<unknown[]>(
    `(${JSON.stringify(xs)}).map(x=>{applyBoard(x.board==="voc"?vocBoard():defBoard());dm=x.dm;abAll=x.all;SPS=x.sp;me=x.me;chars={a:x.c};refCls=x.pick||null;
      const d=new DOMParser().parseFromString(refHtml(),"text/html");
      return{h:d.querySelector("h2").textContent,on:d.querySelector("button.pri").textContent,note:d.querySelectorAll("p.note")[1].textContent,
        rows:[...d.querySelectorAll("tbody tr")].map(tr=>[...tr.children].map(td=>td.textContent))}})`,
  )
  const { CLASSES } = await import('../../src/data/classes.ts')
  const mine = xs.map((x) => {
    const board = x.board === 'voc' ? voc : defaultBoard()
    const c = x.me === 'a' ? x.c : undefined
    const cls = x.pick && CLASSES[x.pick as keyof typeof CLASSES] ? x.pick : c && CLASSES[c.cls as keyof typeof CLASSES] ? c.cls! : 'fighter'
    const lv = x.dm || x.all ? 99 : c?.level || 1
    const rows = referenceRows(board, cls, lv, goldenHidden(x.dm, x.sp))
    const info = CLASSES[cls as keyof typeof CLASSES]
    return {
      h: info.name,
      on: info.name,
      note: `You can learn every ability here, but you can only equip 6 at a time. A cost of 1 is 10 stamina.${lv < 99 ? ' Abilities you have not unlocked yet are hidden.' : ''}`,
      rows: rows.length
        ? rows.map((q) => [String(q.level), q.name, String(q.cost), q.effect + (q.golden ? `Golden: ${q.golden.dice ? `${q.golden.dice} damage, ` : ''}cost ${q.golden.cost}, ${q.golden.hc}% max HP` : '')])
        : [['Nothing to show yet.']],
    }
  })
  expect(mine).toEqual(page)
})


/** A random hero for the player's board, sometimes standing at an altar, bonfire or guild. */
function hero(r: ReturnType<typeof rng>, board: Board): Sheet {
  const keys = Object.keys(board)
  const cls = r.pick(CLASSES_)
  const mine = keys.filter((k) => board[k]!.v === cls || board[k]!.v === 'any')
  const eq = r.maybe(Object.fromEntries([['_', true], ...Array.from({ length: r.int(0, 7) }, () => [r.pick(r.next() < 0.8 ? mine : keys), true])]), 0.7)
  const goldens = mine.filter((k) => board[k]!.gb)
  return clean({
    name: 'Hero',
    x10: true,
    cls,
    level: r.int(1, 10),
    st: 100,
    maxSt: 100,
    hp: 50,
    maxHp: 50,
    dth: r.maybe(r.int(1, 3), 0.2),
    eq,
    at: r.maybe(Object.fromEntries(Array.from({ length: r.int(0, 3) }, () => [r.pick(goldens.length ? goldens : keys), 1])), 0.5),
    atn: r.maybe(r.int(0, 2), 0.6),
    mx: r.maybe(r.int(0, 6), 0.9),
    my: r.int(0, 6),
  })
}

const MAP = { w: 500, h: 500, cols: 10, v2: 1, al: { a: '0,0' }, bf: { a: '6,0' }, gd: { a: '0,6' } }

test("a player's ability board (boardHtml)", async ({ legacy }) => {
  const r = rng(72)
  const voc = vocationBoard()
  const xs = Array.from({ length: CASES }, () => ({ c: hero(r, voc), all: r.next() < 0.3, sp: r.pick([null, '-']) }))
  const page = await legacy.run<unknown[]>(
    `applyBoard(vocBoard());aicOn=false;dm=false;me="a";maps={m:${JSON.stringify(MAP)}};cur="m";IM={m:{}};gmMap=null;(${JSON.stringify(xs)}).map(x=>{abAll=x.all;SPS=x.sp;chars={a:x.c};
      const d=new DOMParser().parseFromString(boardHtml(),"text/html");
      return{note:d.querySelector("p.note").textContent,rows:[...d.querySelectorAll(".ab")].map(a=>({b:a.querySelector("b").textContent,sub:a.querySelector(".abt>.sub").textContent,small:a.querySelector("small").textContent,
        att:a.querySelector(":scope>span.sub")?a.querySelector(":scope>span.sub").textContent:null,btn:[...a.querySelectorAll("button")].map(b=>[b.textContent,b.disabled])})),empty:d.querySelectorAll(".card")[1].textContent}})`,
  )
  const mine = xs.map((x) => {
    const t: Tables = { ...emptyTables(), maps: { m: MAP }, cur: 'm', chars: { a: x.c }, showAll: x.all, sp: x.sp }
    const c = x.c
    const hide = goldenHidden(false, x.sp)
    const here = atRestSpot(t, c)
    const eq = new Set(equippedIds(c, voc, hide))
    const atn = Number(c.atn) || 0
    const avail = availableAbilities(c, voc, x.all, hide)
    return {
      note: `Equipped ${usedSlots(c, eq, voc)} / ${slotsOf(c)}.${atn ? ` Attuned ${attunedSet(c, voc).length} / ${atn} (attuned Golden abilities use no slot).` : ''} ${here ? 'You are at an altar, bonfire or guild: you can change your abilities.' : 'You can only change abilities next to an altar, a bonfire or at a guild.'} More slots and abilities unlock as you level up.`,
      rows: avail.map((k) => {
        const e = voc[k]!
        const q = equipRow(c, voc, k, eq, here)
        return {
          b: e.n,
          sub: `Lv ${e.l || 1} · ${abilityCost(c, Number(e.c) || 0)} St${e.hc ? ` + ${e.hc}% HP` : ''}`,
          small: q.text,
          att: q.attune === 'attuned' ? 'Attuned' : null,
          btn: [...(q.attune === 'button' ? [['Attune', false]] : []), [q.on ? 'Unequip' : 'Equip', !q.canToggle]],
        }
      }),
      empty: avail.length ? expect.any(String) : 'No abilities available yet.',
    }
  })
  expect(mine).toEqual(page)
})

// ---- Presses: equipping, attuning, and the GM's editor ----

const SETUP = (o: { dm: boolean; me: string; chars?: object; board?: Board | null; all?: boolean; aic?: boolean; view?: string }) =>
  `${CAPTURE}pin="t";role=${o.dm ? '"gm"' : '"player"'};canGM=${o.dm};dm=${o.dm};me=${JSON.stringify(o.me)};chars=${JSON.stringify(o.chars ?? {})};enemies={};
   maps={m:${JSON.stringify(MAP)}};cur="m";IM={m:{}};gmMap=null;ini=null;SPS=null;abAll=${!!o.all};aicOn=${o.aic !== false};bFil="";
   ${o.board ? `applyBoard(${JSON.stringify(o.board)});boardDB=true;` : 'applyBoard(defBoard());boardDB=false;'}view=${JSON.stringify(o.view ?? 'board')};last="";render()`

async function inStore(o: { dm: boolean; me: string; chars?: Tables['chars']; board?: Board | null; all?: boolean; aic?: boolean }, act: (s: ReturnType<typeof createGameStore>) => Promise<void>) {
  const w: W[] = []
  const s = createGameStore(() => recDb(w))
  s.getState().connect({ pin: 't', role: o.dm ? 'gm' : 'player', me: o.me })
  s.getState().applySnapshot({ ...emptyTables(), chars: structuredClone(o.chars ?? {}), maps: { m: MAP }, cur: 'm', board: o.board ? structuredClone(o.board) : null, showAll: !!o.all, drawnIcons: o.aic !== false })
  await act(s)
  return { w, error: s.getState().error }
}

test('equipping, unequipping and attuning save the same changes and say the same things', async ({ legacy, page }) => {
  const r = rng(73)
  const voc = vocationBoard()
  let pressed = 0
  for (let k = 0; k < 70; k++) {
    const c = hero(r, voc)
    const o = { dm: false, me: 'a', chars: { a: c }, board: voc, all: r.next() < 0.5 }
    await legacy.run(SETUP(o))
    const btns = page.locator('#app [data-a="learn"], #app [data-a="forget"], #app [data-a="attune"]')
    const n = await btns.count()
    if (!n) continue
    const btn = btns.nth(r.int(0, n - 1))
    const a = (await btn.getAttribute('data-a'))!
    const id = (await btn.getAttribute('data-id'))!
    // Disabled buttons can't be pressed; call the page's handler path anyway by enabling it, to cover the refusals.
    await btn.evaluate((el) => ((el as HTMLButtonElement).disabled = false))
    await legacy.run(`$("#err").textContent=""`)
    await btn.click()
    pressed++
    const theirs = (await legacy.run<W[]>('__w')).filter(([, p]) => p !== 'meta')
    const err = await legacy.run<string>('$("#err").textContent')
    const mine = await inStore(o, (s) => (a === 'attune' ? s.getState().attune(id) : s.getState().equip(id, a === 'learn')))
    expect(noTs(mine.w), `${a} ${id} ${JSON.stringify(c)}`).toEqual(noTs(theirs))
    expect(mine.error, `${a} ${id}`).toBe(err)
  }
  expect(pressed).toBeGreaterThan(50)
})

test("the GM's board editor saves the same changes", async ({ legacy, page }) => {
  const r = rng(74)
  const def = defaultBoard()
  let done = 0
  for (let k = 0; k < 60; k++) {
    const saved = r.next() < 0.5
    const board = saved ? def : null
    const o = { dm: true, me: 'gm', board }
    await legacy.run(SETUP(o))
    const ids = Object.keys(def)
    const id = r.pick(ids)
    const kind = r.pick(['text', 'num', 'select', 'check'] as const)
    const f = kind === 'text' ? r.pick(['n', 'd', 'ic', 't', 'sd']) : kind === 'num' ? r.pick(['l', 'c', 'r', 'hc']) : kind === 'select' ? r.pick(['v', 'k', 'b', 'gb']) : r.pick(['a', 'ch'])
    const v =
      kind === 'text'
        ? r.pick(['', '  Fireball ', 'Power Strike', 'x'.repeat(40), '3d6', '🔥'])
        : kind === 'num'
          ? r.pick(['', '0', '3', '-1', 'abc', '2.5'])
          : kind === 'select'
            ? f === 'v'
              ? r.pick(['any', 'mage', 'trickster'])
              : f === 'k'
                ? r.pick(['atk', 'heal', 'util', 'check'])
                : f === 'b'
                  ? r.pick(['', 'level', 'wis'])
                  : r.pick(['', r.pick(ids.filter((x) => x !== id))])
            : r.next() < 0.5
    const sel = `[data-bf="${id}"][data-f="${f}"]`
    if (!(await page.locator(sel).count())) continue
    await page.locator(sel).evaluate((el, val) => {
      const i = el as HTMLInputElement
      if (typeof val === 'boolean') i.checked = val
      else i.value = val
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }, v)
    const theirs = (await legacy.run<W[]>('__w')).filter(([, p]) => p !== 'meta')
    const mine = await inStore(o, (s) => s.getState().setAbilityField(id, f, v))
    expect(noTs(mine.w), `${f}=${JSON.stringify(v)} saved=${saved}`).toEqual(noTs(theirs))
    done++
  }
  expect(done).toBeGreaterThan(50)
})

test("the GM's board buttons: add, remove, load, icon and visibility settings", async ({ legacy, page }) => {
  const def = defaultBoard()
  page.on('dialog', (d) => void d.accept())
  for (const saved of [false, true]) {
    const o = { dm: true, me: 'gm', board: saved ? def : null }
    const cases: [string, (s: ReturnType<typeof createGameStore>) => Promise<void>][] = [
      ['[data-a="bdel"][data-id="mage_firebolt"]', (s) => s.getState().removeAbility('mage_firebolt')],
      ['[data-a="bdef"]', (s) => s.getState().replaceBoard(defaultBoard())],
      ['[data-a="bvoc"]', (s) => s.getState().replaceBoard(vocationBoard())],
      ['[data-a="aict"]', (s) => s.getState().setBoardSetting('drawnIcons', false)],
      ['[data-a="abvt"]', (s) => s.getState().setBoardSetting('showAll', true)],
    ]
    for (const [sel, act] of cases) {
      await legacy.run(SETUP(o))
      await page.locator(sel).click()
      const theirs = await legacy.run<W[]>('__w')
      const mine = await inStore(o, act)
      expect(noTs(mine.w), `${sel} saved=${saved}`).toEqual(noTs(theirs))
    }
    // Add: the new key is random, so compare with it swapped in.
    await legacy.run(SETUP(o))
    await legacy.run('Math.random=()=>0.123456789')
    await page.locator('[data-a="badd"]').click()
    const theirs = await legacy.run<W[]>('__w')
    const key = String(theirs.at(-1)![1]).split('/')[1]!
    const mine = await inStore(o, (s) => s.getState().addAbility(key))
    expect(noTs(mine.w)).toEqual(noTs(theirs))
  }
})
