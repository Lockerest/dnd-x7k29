// Parity for the data layer: changes to characters and enemies, map migration
// and the paths read on every refresh must match the live page.
import { expect, test } from '../harness.ts'
import { refreshPaths, mapMigration } from '../../src/state/sync.ts'
import { characterChange, enemyChange } from '../../src/state/updates.ts'
import type { Character } from '../../src/logic/types.ts'
import { CASES, clean, rng } from './random.ts'

const CAPTURE = `window.__w=[];api=async(p,m,b)=>{if(m&&m!=="GET")__w.push([m,p,b]);return null};render=()=>{};`

test('character changes (upd)', async ({ legacy }) => {
  const r = rng(31)
  const xs = Array.from({ length: CASES }, () => ({
    c: clean({ name: 'A', st: r.int(0, 100), exh: r.maybe(r.next() < 0.5, 0.4), exn: r.maybe(r.int(0, 3)), mt: r.maybe('climb'), mon: r.maybe('w'), log: r.maybe(Array.from({ length: r.int(0, 14) }, (_, i) => `l${i}`)) }),
    p: clean({ st: r.maybe(r.int(-20, 60), 0.7), exh: r.maybe(r.pick([true, false]), 0.3), hp: r.maybe(r.int(0, 99), 0.3) }),
    msg: r.maybe(r.pick(['Used X', 'Dash', '']), 0.7),
  }))
  const page = await legacy.run<{ c: unknown; w: unknown }[]>(
    `(${JSON.stringify(xs)}).map(x=>{${CAPTURE}dm=true;chars={a:JSON.parse(JSON.stringify(x.c))};upd("a",x.p,x.msg);return{c:chars.a,w:__w}})`,
  )
  const mine = xs.map((x) => {
    const { patch, next } = characterChange(x.c, x.p, x.msg)
    return { c: next, w: [['PATCH', 'chars/a', patch]] }
  })
  expect(clean(mine)).toEqual(clean(page))
})

test('enemy changes and climbers (updE)', async ({ legacy }) => {
  const r = rng(32)
  const xs = Array.from({ length: CASES }, () => ({
    e: r.next() < 0.9 ? clean({ name: 'W', hx: r.maybe(1, 0.3), mp: r.maybe('m2', 0.3) }) : null,
    p: clean({ mx: r.maybe(r.int(0, 9), 0.7) ?? r.maybe(null, 0.5), my: r.maybe(r.int(0, 9)), mp: r.maybe('m3', 0.2), hx: r.maybe(4, 0.1), hp: r.maybe(5, 0.3) }),
    chars: Object.fromEntries(Array.from({ length: r.int(0, 3) }, (_, i) => [`c${i}`, clean({ name: `C${i}`, mon: r.maybe(r.pick(['w', 'x'])), mt: r.maybe(r.pick(['climb', ''])) })])),
    maps: r.pick([{}, { m1: {} }, { m1: {}, m9: {} }]),
    cur: r.maybe(r.pick(['m1', 'm9', 'gone'])),
  }))
  const page = await legacy.run<{ e: unknown; chars: unknown; w: unknown }[]>(
    `(${JSON.stringify(xs)}).map(x=>{${CAPTURE}maps=x.maps;cur=x.cur;chars=JSON.parse(JSON.stringify(x.chars));enemies=x.e?{w:JSON.parse(JSON.stringify(x.e))}:{};updE("w",x.p);return{e:enemies.w,chars,w:__w}})`,
  )
  const mine = xs.map((x) => {
    const live = () => (x.cur && (x.maps as Record<string, unknown>)[x.cur] ? x.cur : Object.keys(x.maps)[0])
    const { patch, next, riders } = enemyChange(x.e ?? undefined, x.p, x.chars as Record<string, Character>, 'w', live)
    const chars = { ...x.chars } as Record<string, object>
    for (const [i, pos] of Object.entries(riders)) chars[i] = { ...chars[i], ...pos }
    return { e: next, chars, w: [...Object.entries(riders).map(([i, pos]) => ['PATCH', `chars/${i}`, pos]), ['PATCH', 'enemies/w', patch]] }
  })
  expect(clean(mine)).toEqual(clean(page))
})

test('old map migration', async ({ legacy }) => {
  const r = rng(33)
  const xs = Array.from({ length: 100 }, () => clean({ n: 'M', v2: r.maybe(1, 0.3), bf: r.maybe(Object.fromEntries(Array.from({ length: r.int(0, 3) }, (_, i) => [`b${i}`, { x: i }]))) }))
  const page = await legacy.run<unknown[]>(`(${JSON.stringify(xs)}).map(m=>{${CAPTURE}migDone=new Set();chars={};enemies={};maps={m:JSON.parse(JSON.stringify(m))};migrate();return maps.m})`)
  expect(clean(xs.map((m) => ({ ...m, ...(mapMigration(m) || {}) })))).toEqual(clean(page))
})

for (const role of ['gm', 'player'] as const) {
  test(`a refresh reads the same small paths as the live page (${role})`, async ({ legacy, page }) => {
    const gets: string[] = []
    page.on('request', (q) => {
      const u = new URL(q.url())
      if (q.method() === 'GET' && u.hostname.includes('firebaseio')) gets.push(u.pathname.replace(/^\/tables\/tbl\//, '').replace(/\.json$/, '') + u.search)
    })
    await legacy.run(`pin="tbl";role="${role}";dm=${role === 'gm'};me="${role === 'gm' ? 'gm' : 'c1'}";load()`)
    await expect.poll(() => gets.length).toBeGreaterThanOrEqual(17)
    const mine = refreshPaths(role === 'gm', role === 'gm' ? 'gm' : 'c1').map(
      (p) => p.path + (p.query ? '?' + Object.entries(p.query).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&') : ''),
    )
    expect(gets.slice(0, 17)).toEqual(mine)
  })
}
