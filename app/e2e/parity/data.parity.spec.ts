// Parity: the data files in src/data must keep every table entry the backup page has
// (entries added since the cutover are left out, see kept.ts).
import { expect, test } from '../harness.ts'
import { SOUND_SLOTS } from '../../src/ui/sound/engine.ts'
import { ABILITY_SOUNDS, AUDIO_BASE, BASE_SOUNDS, BOSS_NAMES, THEME_GROUPS, THEMES } from '../../src/data/audio.ts'
import { AETHELRIC_75 } from '../../src/data/cinematics.ts'
import { CLASSES } from '../../src/data/classes.ts'
import { EFFECT_EMOJI, EFFECT_KEYWORDS } from '../../src/data/effects.ts'
import { ABILITY_DAMAGE, ABILITY_HEAL, CLASS_STAT, SC, WEAPON_REACH } from '../../src/data/rules.ts'
import { SKILL_SETS } from '../../src/data/skillSets.ts'
import { addSkillSet } from '../../src/logic/skills.ts'
import { buildNextPhase, enemyListOrder } from '../../src/logic/phases.ts'
import type { Enemy } from '../../src/logic/types.ts'
import { kept, keptList } from './kept.ts'
import { rng } from './random.ts'

test('rule tables', async ({ legacy }) => {
  const p = await legacy.run<Record<string, unknown>>('({SC,CS,WR,AD0,HEAL0:Object.fromEntries(Object.entries(HEAL0).map(([k,v])=>[k,{d:v.d,b:v.b({level:7,int:16})}]))})')
  expect(SC).toBe(p.SC)
  expect(kept(CLASS_STAT, p.CS as object)).toEqual(p.CS)
  expect(kept(WEAPON_REACH, p.WR as object)).toEqual(p.WR)
  const dmg = Object.fromEntries(Object.entries(ABILITY_DAMAGE).map(([k, v]) => [k, { r: v.range, d: v.dice, ...(v.autoHit ? { t: 1 } : {}) }]))
  expect(kept(dmg, p.AD0 as object)).toEqual(p.AD0)
  // Level 7, INT 16: the "level" bonus is 7, the "int" bonus is +3.
  const heal = Object.fromEntries(Object.entries(ABILITY_HEAL).map(([k, v]) => [k, { d: v.dice, b: v.bonus === 'level' ? 7 : 3 }]))
  expect(kept(heal, p.HEAL0 as object)).toEqual(p.HEAL0)
})

test('classes', async ({ legacy }) => {
  const p = await legacy.run<object>('C')
  const mine = Object.fromEntries(
    Object.entries(kept(CLASSES, p)).map(([k, c]) => [k, { n: c.name, d: c.description, hp: c.hp, st: c.stamina, rg: c.regen, ab: c.abilities.map((a) => [a.name, a.cost, a.text]) }]),
  )
  expect(mine).toEqual(p)
})

test('skill sets, cinematic preset and effects', async ({ legacy }) => {
  const p = await legacy.run<{ SKP: unknown; CINP: string; FXK: [string, string, string][]; FXE: unknown }>('({SKP,CINP,FXK:FXK.map(([r,k])=>[r.source,r.flags,k]),FXE})')
  expect(Object.fromEntries(Object.entries(kept(SKILL_SETS, p.SKP as object)).map(([k, rows]) => [k, rows.map((r) => [r.name, r.dice, r.range, r.target])]))).toEqual(p.SKP)
  expect(AETHELRIC_75).toBe(p.CINP)
  const kw = EFFECT_KEYWORDS.map(([r, k]): [string, string, string] => [r.source, r.flags, k])
  expect(keptList(kw, p.FXK, (x) => x.join('|'))).toEqual(p.FXK)
  expect(kept(EFFECT_EMOJI, p.FXE as object)).toEqual(p.FXE)
})

test('audio lists', async ({ legacy }) => {
  const p = await legacy.run<{ THU: string[][]; ABU: unknown; ABBASE: string; BSU: unknown; BOSSN: string[]; SLOTS: string[][] }>('({THU,ABU,ABBASE,BSU,BOSSN,SLOTS})')
  expect(
    keptList(
      THEMES,
      p.THU,
      (t) => t.key,
      (x: string[]) => x[0],
    ).map((t) => [t.key, t.name, t.id]),
  ).toEqual(p.THU)
  expect(kept(ABILITY_SOUNDS, p.ABU as object)).toEqual(p.ABU)
  expect(AUDIO_BASE).toBe(p.ABBASE)
  expect(kept(BASE_SOUNDS, p.BSU as object)).toEqual(p.BSU)
  expect(BOSS_NAMES.filter((n) => p.BOSSN.includes(n))).toEqual(p.BOSSN)
  expect(keptList(SOUND_SLOTS, p.SLOTS, (x) => x[0])).toEqual(p.SLOTS)
})

test('theme groups match the "+ Add next phase sheet" button', async ({ legacy, page }) => {
  // The groups live inside a click handler, so compare through the button: for every
  // boss and phase, the new sheet must get the same theme the new module picks.
  // Only the bosses and themes the backup page knows.
  const known = await legacy.run<string[]>('THU.map(t=>t[0])')
  for (const [boss, all_] of Object.entries(THEME_GROUPS)) {
    const keys = all_.filter((k) => known.includes(k))
    if (keys.length !== all_.length) continue
    for (let depth = 0; depth < keys.length; depth++) {
      const all: Record<string, Enemy> = {}
      await page.reload()
      for (let i = 0; i <= depth; i++) all[`p${i}`] = { name: i ? `${boss} (phase ${i + 1})` : boss, hp: 10, max: 10, ...(i < depth ? { nx: `p${i + 1}`, pg: 50 } : {}) }
      await legacy.table({}, all)
      await legacy.run(`TH=Object.fromEntries(${JSON.stringify(keys)}.map(k=>[k,{data:""}]));eOpen.add("p0");last="";render()`)
      await page.locator('[data-a="phadd"][data-id="p0"]').click()
      const theirs = await legacy.run(`enemies[enemies.p${depth}.nx].th`)
      const mine = buildNextPhase(all, 'p0', () => true)!.sheet.th
      expect(mine, `${boss} after phase ${depth + 1}`).toBe(theirs ?? undefined)
    }
  }
})

test('"+ Add next phase sheet" on random chains', async ({ legacy, page }) => {
  const r = rng(21)
  for (let n = 0; n < 15; n++) {
    const len = r.int(1, 4)
    const boss = r.pick(['Aethelric', 'Kernunos', 'Arachne', "Izat'al", 'Wolf', 'The Nameless King'])
    const all: Record<string, Enemy> = {}
    for (let i = 0; i < len; i++)
      all[`p${i}`] = JSON.parse(
        JSON.stringify({
          name: i ? `${boss} (phase ${i + 1})` : boss,
          hp: r.int(1, 99),
          max: 100,
          pm: r.maybe(r.int(1, 20)),
          po: 0,
          mx: r.maybe(2),
          my: r.maybe(3),
          mp: r.maybe('m'),
          pg: r.maybe(r.pick([10, 50])),
          gr: r.maybe(5),
          sk: { s: { n: 'Cut', d: '2d8', r: 1, t: 's' } },
          ...(i < len - 1 ? { nx: `p${i + 1}` } : {}),
        }),
      )
    const from = `p${r.int(0, len - 1)}`
    await page.reload()
    const available = ['firstdefier', 'rotforest', 'rotarena', 'thecollector', 'kingonfoot', 'dragonqueen'].filter(() => r.next() < 0.6)
    await legacy.table({}, all)
    await legacy.run(`TH=Object.fromEntries(${JSON.stringify(available)}.map(k=>[k,{data:""}]));eOpen.add("${from}");last="";render()`)
    await page.locator(`[data-a="phadd"][data-id="${from}"]`).click()
    const mine = buildNextPhase(all, from, (k) => available.includes(k))!
    const theirs = await legacy.run<{ sheet: Enemy; patch: { pg: number; nx: string } }>(
      `(()=>{const last="${mine.lastId}",nx=enemies[last].nx;const {x10,...sheet}=enemies[nx];return{sheet,patch:{pg:enemies[last].pg,nx}}})()`,
    )
    expect(mine.sheet, `chain ${n}`).toEqual(theirs.sheet)
    expect(mine.lastPatch.pg, `chain ${n}`).toBe(theirs.patch.pg)
  }
})

test('enemy list order and indenting', async ({ legacy }) => {
  const r = rng(22)
  for (let n = 0; n < 20; n++) {
    const all: Record<string, Enemy> = {}
    await legacy.page.reload()
    const ids = Array.from({ length: r.int(1, 8) }, (_, i) => `e${i}`)
    for (const id of ids) all[id] = { name: `N${id}`, hp: 1, max: 1, ...(r.next() < 0.5 ? { nx: r.pick([...ids, 'gone']) } : {}) }
    await legacy.table({}, all)
    const theirs = await legacy.run<[string, number][]>(
      `[...document.querySelectorAll(".card")].find(c=>c.querySelector("h2")?.textContent==="Enemies").querySelectorAll(":scope > .ab")?[...[...document.querySelectorAll(".card")].find(c=>c.querySelector("h2")?.textContent==="Enemies").querySelectorAll(":scope > .ab")].map(d=>[d.querySelector("b").textContent.slice(1),(+(d.style.marginLeft||"0px").replace("px",""))/12]):[]`,
    )
    expect(enemyListOrder(all, ids), `list ${n}`).toEqual(theirs)
  }
})

test('loading skill-set presets', async ({ legacy, page }) => {
  const r = rng(23)
  const known = await legacy.run<object>('SKP')
  const sets = Object.keys(kept(SKILL_SETS, known))
  for (let n = 0; n < 8; n++) {
    const set = r.pick(sets)
    await page.reload()
    const existing = Object.fromEntries(
      SKILL_SETS[r.pick(sets)]!.filter(() => r.next() < 0.4).map((s, i) => [`x${i}`, { n: r.next() < 0.5 ? s.name : s.name.toUpperCase(), d: '1d4', r: 1, t: 's' as const }]),
    )
    await legacy.table({}, { a: { name: 'Boss', hp: 1, max: 1, sk: existing } })
    await legacy.run('eOpen.add("a");last="";render()')
    const before = legacy.writes.length
    await page.locator('[data-skp="a"]').selectOption(set)
    await expect.poll(() => legacy.writes.length).toBeGreaterThan(before)
    const saved = legacy.writes.at(-1)!.body as Record<string, unknown>
    const mine = addSkillSet(existing, SKILL_SETS[set]!, (i) => `k${i}`)
    const norm = (o: Record<string, unknown>) =>
      Object.values(o)
        .map((v) => JSON.stringify(v))
        .sort()
    expect(norm(mine), `${set} #${n}`).toEqual(norm(saved))
  }
})
