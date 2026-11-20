// Parity: the new TypeScript rules must give exactly the same answers as the live
// page. Each test feeds the same inputs (fixed edge cases plus seeded random ones)
// to the page's function and to the new module and compares the results.
import { expect, test } from '../harness.ts'
import { loudnessGain, themeKeyFor } from '../../src/logic/audio.ts'
import { cinematicSeconds, parseCinematic } from '../../src/logic/cinematic.ts'
import { adjacent, attackInfo, effectKind, elementOf, gap, isHeavy, poiseHit, recover } from '../../src/logic/combat.ts'
import { effectiveMaxHp, fatigueFromDamage, hpCost, scaleCharacter, scaleEnemy } from '../../src/logic/health.ts'
import { damageEnemy, nextPhasePatch } from '../../src/logic/phases.ts'
import { abilityCost, spend, startTurn } from '../../src/logic/stamina.ts'
import { bonusOf, clamp, mod, proficiency } from '../../src/logic/stats.ts'
import { abilitySlug, parseDice, shortText, slug, tightSlug } from '../../src/logic/text.ts'
import type { Character, Enemy } from '../../src/logic/types.ts'
import { CASES, clean, rng } from './random.ts'

/** Runs `fn` (a page expression taking one input) over all inputs inside the page. */
const inPage = <T>(legacy: { run: <R>(x: string) => Promise<R> }, fn: string, inputs: unknown[]) =>
  legacy.run<T[]>(`(${JSON.stringify(inputs)}).map(x=>(${fn})(x))`)

const CLASSES = ['fighter', 'archer', 'mage', 'thief', 'warrior', 'sorcerer', 'spearhand', 'magickarcher', 'trickster', 'bard']
const WORDS = ['Shield', 'Bash', 'Ember', 'Burst', 'Frost', 'Arrow', 'Chain', 'Lightning', 'Venom', 'Spit', 'Heavy', 'Light', 'attack', 'Cleave', 'Thunder', 'Slam', 'Rot', 'Claw', 'Spark', 'Volley', 'Golden', '(Golden)', "Warden's", 'Cut', 'Silk', 'Snare', 'Izat\'al', '!!', '--', '  ', '.', ';']

const words = (r: ReturnType<typeof rng>, lo = 0, hi = 5) => Array.from({ length: r.int(lo, hi) }, () => r.pick(WORDS)).join(r.pick([' ', '', ' ', '-']))

test.describe('stats', () => {
  test('mod, prof, clamp, bonusOf', async ({ legacy }) => {
    const r = rng(1)
    const xs = Array.from({ length: CASES }, () => ({
      s: r.maybe(r.int(0, 30), 0.9),
      level: r.maybe(r.int(1, 20), 0.8),
      v: r.int(-50, 200),
      m: r.int(0, 150),
      b: r.pick(['level', 'str', 'dex', 'con', 'int', 'wis', 'cha', 'luck']),
    }))
    const page = await inPage<number[]>(legacy, 'x=>[mod(x.s),prof({level:x.level}),clamp(x.v,x.m),bonusOf({level:x.level,str:x.s,dex:x.s,con:x.s,int:x.s,wis:x.s,cha:x.s},x.b)]', xs)
    const mine = xs.map((x) => [mod(x.s), proficiency({ level: x.level }), clamp(x.v, x.m), bonusOf({ level: x.level, str: x.s, dex: x.s, con: x.s, int: x.s, wis: x.s, cha: x.s }, x.b)])
    expect(mine).toEqual(page)
  })
})

test.describe('text', () => {
  test('dice notation', async ({ legacy }) => {
    const r = rng(2)
    const term = () => r.pick([`${r.maybe(r.int(0, 25), 0.8) ?? ''}d${r.int(1, 20)}`, `${r.int(0, 9)}`, 'none', '-', '', `d${r.int(2, 12)}`, 'x'])
    const xs: unknown[] = [null, undefined, 0, '', '0', ...Array.from({ length: CASES }, () => Array.from({ length: r.int(1, 4) }, term).join(r.pick(['+', '+', ' + ', '-'])))]
    expect(xs.map(parseDice)).toEqual(await inPage(legacy, 'parseD', xs))
  })
  test('slugs and short text', async ({ legacy }) => {
    const r = rng(3)
    const xs: unknown[] = ['', null, 'Frostbite Cleave (Golden)', ...Array.from({ length: CASES }, () => words(r, 0, 30))]
    const page = await inPage<string[]>(legacy, 'x=>[x==null?"":slug(x),abSlug(x),tslug(x),shortT(x)]', xs)
    expect(xs.map((x) => [x == null ? '' : slug(x), abilitySlug(x), tightSlug(x), shortText(x)])).toEqual(page)
  })
})

const character = (r: ReturnType<typeof rng>): Character & { st: number; rg: number; maxSt: number; hp: number } => {
  const maxHp = r.int(50, 200)
  return clean({
    cls: r.pick(CLASSES),
    level: r.maybe(r.int(1, 20), 0.9),
    str: r.int(6, 20),
    dex: r.int(6, 20),
    int: r.int(6, 20),
    st: r.int(0, 150),
    rg: r.pick([10, 20, 30]),
    maxSt: r.pick([100, 110, 140]),
    hp: r.int(1, maxHp),
    maxHp,
    bmh: r.maybe(maxHp + r.int(0, 30), 0.3),
    dth: r.maybe(r.int(0, 5), 0.5),
    fa: r.maybe(r.int(0, 100), 0.5),
    ft: r.maybe(r.int(0, 10), 0.5),
    exh: r.maybe(r.next() < 0.5, 0.4),
    exn: r.maybe(r.int(0, 4), 0.4),
    mt: r.maybe(r.pick(['climb', 'ride', '']), 0.5),
    mon: r.maybe('e1', 0.3),
    stn: r.maybe(r.next() < 0.5, 0.3),
    chg: r.maybe('Ember Burst', 0.3),
  })
}

test.describe('stamina and health', () => {
  test('turn, spend, ability cost', async ({ legacy }) => {
    const r = rng(4)
    const xs = Array.from({ length: CASES }, () => ({ c: character(r), cost: r.int(0, 5), label: words(r, 1, 3) }))
    const page = await inPage(legacy, 'x=>[turn(x.c),spend(x.c,x.cost,x.label),cst(x.c,x.cost)]', xs)
    expect(clean(xs.map((x) => [startTurn(x.c), spend(x.c, x.cost, x.label), abilityCost(x.c, x.cost)]))).toEqual(page)
  })
  test('max HP, fatigue and HP costs', async ({ legacy }) => {
    const r = rng(5)
    const xs = Array.from({ length: CASES }, () => ({ c: character(r), base: r.int(1, 300), d: r.maybe(r.int(0, 6)), f: r.maybe(r.int(0, 15)), dmg: r.int(0, 120), pct: r.maybe(r.int(0, 60), 0.8) }))
    const page = await inPage(legacy, 'x=>{HC.__t=x.pct;const nh=Math.max(0,x.c.hp-x.dmg);return[effMax(x.base,x.d,x.f),fatPatch(x.c,x.dmg,nh),hcPatch(x.c,"__t")]}', xs)
    const mine = xs.map((x) => [effectiveMaxHp(x.base, x.d, x.f), fatigueFromDamage(x.c, x.dmg, Math.max(0, x.c.hp - x.dmg)), hpCost(x.c, x.pct)])
    expect(clean(mine)).toEqual(page)
  })
  test('x10 migration', async ({ legacy }) => {
    const r = rng(6)
    const xs = Array.from({ length: 100 }, () => ({
      c: clean({ name: 'C', hp: r.int(1, 20), maxHp: r.maybe(r.int(1, 20)), st: r.maybe(r.int(0, 15)), maxSt: 10, rg: r.maybe(2), bmh: r.maybe(r.int(1, 20), 0.2), x10: r.maybe(true, 0.2) }),
      e: clean({ name: 'E', hp: r.int(1, 99), max: r.maybe(r.int(1, 99)), pm: r.maybe(r.int(0, 9)), po: r.maybe(r.int(0, 9)), hv: r.maybe(r.int(0, 9), 0.2), x10: r.maybe(true, 0.2) }),
    }))
    const page = await inPage(legacy, 'x=>{migDone=new Set();maps={};chars={c:x.c};enemies={e:x.e};migrate();return[chars.c,enemies.e]}', xs)
    const mine = xs.map((x) => [{ ...x.c, ...(scaleCharacter(x.c) || {}) }, { ...x.e, ...(scaleEnemy(x.e) || {}) }])
    expect(mine).toEqual(page)
  })
})

test.describe('combat', () => {
  test('effects, elements, heavy reactions', async ({ legacy }) => {
    const r = rng(7)
    const xs = Array.from({ length: CASES }, () => ({ l: words(r, 0, 4), h: r.next() < 0.5, rng: r.int(1, 8), o: clean({ ha: r.maybe(r.pick([0, 1, true, false]), 0.3), cls: r.maybe(r.pick(CLASSES)) }) }))
    const page = await inPage(legacy, 'x=>[fxKind(x.l,x.h,x.rng),elemOf(x.l),isHeavy(x.o)]', xs)
    expect(xs.map((x) => [effectKind(x.l, x.h, x.rng), elementOf(x.l), isHeavy(x.o)])).toEqual(page)
  })
  test('attack numbers', async ({ legacy }) => {
    const r = rng(8)
    const xs = Array.from({ length: CASES }, () => {
      const e = r.next() < 0.5
      const o = e ? clean({ dm: r.maybe(`${r.int(1, 4)}d${r.pick([6, 8, 10])}`), er: r.maybe(r.int(1, 6)), ab: r.maybe(r.int(0, 9)) }) : character(r)
      return { u: { e, o }, k: r.pick(['l', 'h'] as const) }
    })
    const page = await inPage(legacy, 'x=>atkInfo(x.u,x.k)', xs)
    expect(clean(xs.map((x) => attackInfo(x.u, x.k)))).toEqual(page)
  })
  test('grid distance and adjacency', async ({ legacy }) => {
    const r = rng(9)
    const unit = () => ({ e: r.next() < 0.5, o: clean({ mx: r.int(-5, 12), my: r.int(-5, 12), sz: r.maybe(r.int(1, 4)) }) })
    const xs = Array.from({ length: CASES }, () => ({ a: unit(), t: unit() }))
    const page = await inPage(legacy, 'x=>[gap(x.a,x.t),adj(x.a,x.t)]', xs)
    expect(xs.map((x) => [gap(x.a, x.t), adjacent(x.a, x.t)])).toEqual(page)
  })
  test('poise and recovery', async ({ legacy }) => {
    const r = rng(10)
    const xs = Array.from({ length: CASES }, () => ({
      e: clean({ name: 'E', hp: 10, max: 10, x10: true, pm: r.maybe(r.int(0, 50), 0.8), po: r.maybe(r.int(0, 50)), stun: r.maybe(true, 0.2), sg: r.maybe(true, 0.3), rec: r.maybe(true, 0.2) }),
      d: r.int(0, 60),
    }))
    const page = await inPage(legacy, 'x=>{chars={};enemies={a:{...x.e}};poiseHit("a",x.d);const p=enemies.a;enemies={a:{...x.e}};tick();return[p,enemies.a]}', xs)
    const mine = xs.map((x) => [{ ...x.e, ...(poiseHit(x.e, x.d) || {}) }, { ...x.e, ...(recover(x.e) || {}) }])
    expect(mine).toEqual(page)
  })
})

test.describe('phases', () => {
  test('damage and gates', async ({ legacy }) => {
    const r = rng(11)
    const xs = Array.from({ length: CASES }, () => {
      const max = r.int(10, 3000)
      return {
        o: clean({ name: 'Boss', x10: true, hp: r.int(0, max), max, pg: r.maybe(r.pick([0, 10, 25, 50, 75, 90])), sw: r.maybe(1, 0.4), nx: r.maybe('b', 0.6) }),
        dmg: r.int(0, 4000),
        next: r.next() < 0.7,
      }
    })
    // Capture what applyDmg decides instead of letting it write and animate.
    const page = await inPage<{ hp: number; gate: string | false; full: boolean }>(
      legacy,
      `x=>{const calls=[];let go=null;updE=(id,p)=>calls.push(p);poiseHit=()=>{};fxScene=()=>{};phaseGo=(id,hp)=>{go=[hp]};
        const st=window.setTimeout;window.setTimeout=(f)=>{f();return 0};
        chars={c:{name:"H",hp:10,maxHp:10}};enemies={a:{...x.o},...(x.next?{b:{name:"B",hp:5,max:5,x10:true}}:{})};
        try{applyDmg({e:false,id:"c",o:chars.c},{e:true,id:"a",o:enemies.a},x.dmg,{label:"T",heavy:false,rng:1})}finally{window.setTimeout=st}
        const gr=calls.find(p=>"gr" in p);return{hp:calls[0].hp,gate:go?"swap":gr?"event":false,full:!!go&&go[0]===null}}`,
      xs,
    )
    expect(xs.map((x) => damageEnemy(x.o, x.dmg, x.next))).toEqual(page)
  })
  test('switching to the next sheet', async ({ legacy }) => {
    const r = rng(12)
    const xs = Array.from({ length: CASES }, () => ({
      cur: clean({ name: 'A', nx: 'b', x10: true, mx: r.maybe(r.int(0, 9)), my: r.maybe(r.int(0, 9)), mp: r.maybe('m') }),
      // Every real sheet has a max HP (the page would produce NaN without one; the new code uses 0).
      next: clean({ name: 'B', x10: true, max: r.int(1, 2000), pm: r.maybe(r.int(0, 50)) }),
      hp: r.maybe(r.int(-50, 2500), 0.7) ?? null,
    }))
    const page = await inPage(
      legacy,
      'x=>{const calls={};updE=(id,p)=>{calls[id]=calls[id]||p};bossIntro=()=>{};render=()=>{};ini=null;enemies={a:{...x.cur},b:{...x.next}};phaseGo("a",x.hp);return calls.b}',
      xs,
    )
    expect(clean(xs.map((x) => nextPhasePatch(x.cur, x.next as Enemy, x.hp)))).toEqual(page)
  })
})

test.describe('audio and cinematic', () => {
  test('loudness gain', async ({ legacy }) => {
    const r = rng(13)
    const xs = Array.from({ length: 60 }, () => {
      const amp = r.pick([0, 0.0005, 0.01, 0.05, 0.2, 0.9, 1])
      const kind = r.int(0, 2)
      return Array.from({ length: r.int(1, 2) }, () => Array.from({ length: r.int(0, 3000) }, (_, i) => (kind === 0 ? amp * Math.sin(i / r.int(2, 40)) : kind === 1 ? (r.next() * 2 - 1) * amp : i % 997 === 0 ? amp : 0)))
    })
    const page = await inPage<number>(
      legacy,
      'x=>{const n=Math.max(1,...x.map(c=>c.length));const b=new AudioBuffer({length:n,sampleRate:44100,numberOfChannels:x.length});x.forEach((c,i)=>b.getChannelData(i).set(c));return bGain(b)}',
      xs,
    )
    // The page stores samples as 32-bit floats; do the same before comparing.
    const mine = xs.map((chs) => {
      const n = Math.max(1, ...chs.map((c) => c.length))
      return loudnessGain(chs.map((c) => Float32Array.from({ length: n }, (_, i) => c[i] ?? 0)))
    })
    mine.forEach((g, i) => expect(g, `case ${i}`).toBeCloseTo(page[i]!, 12))
  })
  test('theme matching', async ({ legacy }) => {
    const r = rng(14)
    const keys = ['aethelric', 'firstdefier', 'arachne', 'thecollector', 'kernunos', 'rotforest', 'namelessking', 'kingonfoot', 'ox']
    const xs = Array.from({ length: CASES }, () => ({
      loaded: keys.filter(() => r.next() < 0.6),
      name: r.pick(['Aethelric', 'Aethelric (phase 2)', 'The Nameless King', 'King', 'Arachne', 'Collector', 'Wolf', 'Ae', '', 'Oxen', 'kernunos rot forest']),
      sel: r.maybe(r.pick(keys), 0.5),
    }))
    const page = await inPage(legacy, 'x=>{THB=Object.fromEntries(x.loaded.map(k=>[k,k]));return themeFor(x.name,x.sel)}', xs)
    expect(xs.map((x) => themeKeyFor(x.name, x.sel, x.loaded))).toEqual(page)
  })
  test('cinematic beats and length', async ({ legacy }) => {
    const r = rng(15)
    const tag = () => r.pick(['[portrait]', '[stagger]', '[glow]', '[flash]', '[shake]', '[SLAM]', '[crack]', '[black]', '[big]', `[wait=${r.int(0, 4)}]`, '[wait]', '[odd]'])
    const line = () => Array.from({ length: r.int(0, 3) }, tag).join(r.pick(['', ' '])) + (r.next() < 0.8 ? ' ' + words(r, 1, 12) : '')
    const xs = Array.from({ length: 80 }, () => Array.from({ length: r.int(0, 7) }, line).join(r.pick(['\n', '\n\n', '\n  '])))
    // Run every scheduled step at once, recording when it was meant to happen and the text it shows.
    const page = await inPage<{ D: number; times: number[]; texts: string[] }>(
      legacy,
      `x=>{const st=window.setTimeout,times=[],texts=[];window.setTimeout=(f,ms)=>{times.push(ms);f();const t=document.querySelector(".cin:last-of-type .ct");texts.push(t?t.textContent:null);return 0};
        let D;try{D=playCin({t:x,n:"",k:""})}finally{window.setTimeout=st}document.querySelectorAll(".cin").forEach(e=>e.remove());return{D,times,texts}}`,
      xs,
    )
    xs.forEach((script, i) => {
      const beats = parseCinematic(script)
      const p = page[i]!
      expect(cinematicSeconds(beats), `case ${i}`).toBeCloseTo(p.D, 9)
      expect(beats.map((b) => b.at), `case ${i}`).toEqual(p.times.slice(0, beats.length))
      beats.forEach((b, j) => {
        if (b.text) expect(p.texts[j], `case ${i} beat ${j}`).toBe(b.text)
      })
    })
  })
})
