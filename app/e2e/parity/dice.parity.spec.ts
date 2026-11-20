// Parity for dice: the styles, the log, the 3D notation, and what a Dice card
// button saves (or keeps secret) must match the live page.
import { expect, test } from '../harness.ts'
import { SKINS } from '../../src/data/dice.ts'
import { diceLog, libNotation, rollLine, trayLabel, type RollEntry } from '../../src/logic/dice.ts'
import { createGameStore, emptyTables } from '../../src/state/store.ts'
import { clean, rng } from './random.ts'
import { CAPTURE, noTs, recDb, type W } from './store.ts'

const RAND = 0.61
const SIZES = [4, 6, 8, 10, 12, 20, 100]

test('dice styles', async ({ legacy }) => {
  expect(SKINS).toEqual(await legacy.run('SKINS'))
})

test('labels and the 3D notation', async ({ legacy }) => {
  const r = rng(7)
  for (let k = 0; k < 200; k++) {
    const ds = Array.from({ length: r.int(0, 6) }, () => r.pick(SIZES))
    const res = ds.map((d) => ({ d, r: r.int(1, d) }))
    const remote = r.next() < 0.5
    const theirs = await legacy.run<[string, string | null]>(`[trayLabel(${JSON.stringify(ds)}),libNotation(${JSON.stringify(ds)},${JSON.stringify(res)},${remote})]`)
    expect([trayLabel(ds), libNotation(ds, res, remote)], JSON.stringify({ ds, res, remote })).toEqual(theirs)
  }
})

test('the dice log', async ({ legacy }) => {
  const r = rng(11)
  const entry = (i: number): RollEntry =>
    clean(
      r.pick([
        () => ({ ev: `Line ${i}`, ts: r.int(0, 50) }),
        () => {
          const ds = Array.from({ length: r.int(1, 4) }, () => r.pick(SIZES)).map((d) => ({ d, r: r.int(1, d) }))
          return { n: r.pick(['Lyra', 'Bo', 'GM']), ds, m: r.maybe(r.int(-3, 6)), ts: r.int(0, 50), sk: r.maybe(r.pick(SKINS.map((s) => s[0]))), by: 'a' }
        },
        () => ({ n: 'Old', d: r.pick(SIZES), r: r.int(1, 20), m: r.maybe(r.int(-2, 4)), ts: r.int(0, 50) }),
        () => ({ fx: { o: 'hit' }, ts: r.int(0, 50) }),
        () => ({ wave: {}, ts: r.int(0, 50) }),
        () => ({ boss: {}, ts: r.int(0, 50) }),
      ])(),
    )
  for (let k = 0; k < 40; k++) {
    const dm = r.next() < 0.5
    const rolls = Object.fromEntries(Array.from({ length: r.int(0, 30) }, (_, i) => [`k${i}`, entry(i)]))
    const secret = Array.from({ length: r.int(0, 3) }, (_, i) => ({ n: 'GM', ds: [{ d: 20, r: r.int(1, 20) }], m: 0, ts: r.int(0, 50) + i / 10, sk: 'gold' }))
    const theirs = await legacy.run<[string, string][]>(
      `(()=>{rolls=${JSON.stringify(rolls)};secret=${JSON.stringify(secret)};dm=${dm};me="a";chars={a:{name:"Lyra"}};enemies={};const d=document.createElement("div");d.innerHTML=diceHtml();return[...d.querySelectorAll(".rl li")].map(li=>[li.textContent,(li.querySelector(".sw")||{style:{}}).style.background||""])})()`,
    )
    const swatchCss = await legacy.run<Record<string, string>>(`(()=>{const o={};const e=document.createElement("i");${JSON.stringify(SKINS.map((s) => s[2]))}.forEach(c=>{e.style.background="";e.style.background=c;o[c]=e.style.background});return o})()`)
    const log = diceLog(rolls, secret, dm)
    const mine = log.length
      ? log.map((e): [string, string] => {
          if (e.ev) return [e.ev, '']
          const l = rollLine(e)
          return [`${l.secret ? '🔒 ' : ''}${l.who} rolled ${l.what}: ${l.dice}${l.extra}${l.total != null ? ` = ${l.total}` : ''}`, l.swatch ? swatchCss[l.swatch]! : '']
        })
      : [['No rolls yet.', '']]
    expect(mine, JSON.stringify({ dm, rolls, secret })).toEqual(theirs)
  }
})

test('a Dice card button: how many, bonus, stat, style, and the GM\'s Secret box', async ({ legacy, page }) => {
  const r = rng(23)
  for (let k = 0; k < 40; k++) {
    const dm = r.next() < 0.4
    const secretOn = r.next() < 0.5
    const count = r.int(1, 10)
    const bonus = r.int(-3, 5)
    const stat = r.pick(['', 'str', 'dex', 'wis'])
    const skin = r.pick(SKINS.map((s) => s[0]))
    const n = r.pick(SIZES.filter((d) => d !== 4))
    const sheet = clean({ name: 'Lyra', str: r.maybe(r.int(3, 20)), dex: r.maybe(r.int(3, 20)), wis: 14, hp: 10, maxHp: 10, st: 50, maxSt: 100, x10: true })
    await legacy.run(
      `${CAPTURE}Math.random=()=>${RAND};pin="t";role=${dm ? '"gm"' : '"player"'};canGM=${dm};dm=${dm};me=${dm ? '"gm"' : '"a"'};chars={a:${JSON.stringify(sheet)}};enemies={};maps={};cur=null;
       rolls={};secret=[];secOn=${secretOn};dcount=${count};bonus=${bonus};dstat=${JSON.stringify(stat)};skin=${JSON.stringify(skin)};view="table";last="";render()`,
    )
    await page.locator(`[data-a="die"][data-n="${n}"]`).click()
    const theirs = (await legacy.run<W[]>('__w')).filter(([, p]) => p === 'rolls')
    const theirSecret = await legacy.run<unknown[]>('secret')
    const w: W[] = []
    const s = createGameStore(() => recDb(w), Date.now, () => RAND)
    s.getState().connect({ pin: 't', role: dm ? 'gm' : 'player', me: dm ? 'gm' : 'a' })
    s.getState().applySnapshot({ ...emptyTables(), chars: { a: sheet } })
    s.getState().setDice({ count, bonus, stat, skin, secret: secretOn })
    await s.getState().rollDie(n)
    const c = JSON.stringify({ dm, secretOn, count, bonus, stat, skin, n, sheet })
    expect(noTs(w), c).toEqual(noTs(theirs))
    expect(s.getState().secretRolls.map((e) => ({ ...e, ts: 0 })), c).toEqual(theirSecret.map((e) => ({ ...(e as object), ts: 0 })))
  }
})
