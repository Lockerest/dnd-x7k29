// Parity for the GM's test lab and sound tools: the scene each lab button plays
// (and the Attacker, Target and Ability choices), the Boss themes rows, and what
// each upload, removal and import saves, against the live page.
import { expect, test } from '../harness.ts'
import type { Board } from '../../src/logic/board.ts'
import type { Sheet } from '../../src/logic/sheet.ts'
import { TEST_KINDS, TEST_OUTCOMES, testAbilities, testOptions, testScene, themeRows } from '../../src/logic/soundTools.ts'
import type { Enemy } from '../../src/logic/types.ts'
import { createGameStore } from '../../src/state/store.ts'
import { importAbilityFiles, importAbilitySounds, importBaseSounds, importThemes, type ImportDeps } from '../../src/ui/sound/importers.ts'
import { wavTone } from '../wav.ts'
import { clean, rng } from './random.ts'
import { CAPTURE, recDb, type W } from './store.ts'

type R = ReturnType<typeof rng>
type Plan = Record<string, 'junk' | 404 | 'throw' | 'retry'>

const WAV = wavTone(0.05)
const WAV64 = WAV.toString('base64')
const bytes = (b: Buffer) => new Uint8Array(b)
const AUDIO = `data:audio/wav;base64,${WAV64}`

const SETUP = (extra = '') =>
  `${CAPTURE}$("#err").textContent="";pin="t";role="gm";canGM=true;dm=true;me="gm";hideL=false;confirm=()=>true;
   chars={};enemies={};maps={};cur=null;combat=false;ini=null;view="table";tlShow=true;SD={};SB={};TH={};THB={};${extra};last="";render()`

/** Meta stamps are times: they differ between the two runs. */
const norm = (w: W[]) => w.map(([m, p, b]) => [m, p, p === 'meta' ? Object.fromEntries(Object.keys(b as object).map((k) => [k, 0])) : b])

function gmStore() {
  const w: W[] = []
  const s = createGameStore(() => recDb(w))
  s.getState().connect({ pin: 't', role: 'gm', me: 'gm' })
  return { s, w }
}
const theirs = async (legacy: { run: <T>(e: string) => Promise<T> }) => norm(await legacy.run<W[]>('__w'))
/** The backup page's own lists: entries added to the app since the cutover are not compared. */
type Lists = { base: Record<string, string>; themes: { key: string; name: string; id: string }[]; abilities: Record<string, string>; bosses: string[] }
const listsOf = (legacy: { run: <T>(e: string) => Promise<T> }) => legacy.run<Lists>('({base:BSU,themes:THU.map(([key,name,id])=>({key,name,id})),abilities:ABU,bosses:BOSSN})')

test('the test lab: its choices and the scene each button plays', async ({ legacy }) => {
  const r = rng(901)
  for (let k = 0; k < 40; k++) {
    const chars: Record<string, Sheet> = clean(
      Object.fromEntries(Array.from({ length: r.int(0, 3) }, (_, i) => [`c${i}`, { name: r.pick(['Lyra', 'Bram', '']), cls: r.maybe(r.pick(['fighter', 'mage'])), ha: r.maybe(r.next() < 0.5, 0.3) }])),
    )
    const enemies: Record<string, Enemy> = clean(
      Object.fromEntries(Array.from({ length: r.int(0, 3) }, (_, i) => [`e${i}`, { name: r.pick(['Wolf', 'Ogre', '']), cls: r.maybe('fighter', 0.2), ha: r.maybe(true, 0.2) }])),
    ) as Record<string, Enemy>
    const extra = Object.fromEntries(
      Array.from({ length: r.int(0, 4) }, (_, i) => [
        `x${i}`,
        { n: r.pick(['Fire Lance', 'Big Swing', 'Volley', 'Shield Slam', 'Zap Bolt', 'Aimed']), k: r.pick(['atk', 'atk', 'util']), r: r.pick([0, 1, 2, '3', 6]), c: 1, l: 1, v: 'any' },
      ]),
    )
    await legacy.run(SETUP(`chars=${JSON.stringify(chars)};enemies=${JSON.stringify(enemies)};applyBoard(Object.assign(defBoard(),${JSON.stringify(extra)}))`))
    const board = await legacy.run<Board>('board')
    expect(testOptions(chars, enemies)).toEqual(await legacy.run('tlOpts()'))
    expect(testAbilities(board)).toEqual(await legacy.run('[...document.querySelectorAll("#tlab option")].slice(1).map(o=>[o.value,o.textContent])'))
    const ids = testOptions(chars, enemies).map(([key]) => key)
    const abs = ['', ...testAbilities(board).map(([key]) => key)]
    for (let j = 0; j < 4; j++) {
      const p = { a: r.pick(ids), t: r.pick(ids), ab: r.pick(abs), k: r.pick(TEST_KINDS)[0] }
      const o = r.pick(TEST_OUTCOMES)[0]
      const live = await legacy.run(
        `window.__sc=null;playScene=f=>{__sc=JSON.parse(JSON.stringify(f))};tlA=${JSON.stringify(p.a)};tlT=${JSON.stringify(p.t)};tlAb=${JSON.stringify(p.ab)};tlK=${JSON.stringify(p.k)};document.querySelector('[data-a="tlab"][data-o="${o}"]').click();__sc`,
      )
      expect(clean(testScene(o, p, chars, enemies, board)), JSON.stringify({ o, p })).toEqual(live)
    }
  }
})

test('the Boss themes rows', async ({ legacy }) => {
  const r = rng(902)
  const { themes: THEMES, bosses } = await listsOf(legacy)
  for (let k = 0; k < 20; k++) {
    const keys = Array.from({ length: r.int(0, 5) }, () => r.pick([...THEMES.map((t) => t.key), 'thewarden', 'odiram', 'x']))
    const loaded = Object.fromEntries(keys.map((key) => [key, r.pick(['', 'The Warden', 'Some Name'])]))
    await legacy.run(SETUP(`TH=${JSON.stringify(Object.fromEntries(Object.entries(loaded).map(([key, n]) => [key, { n, data: 'x' }])))}`))
    const live = await legacy.run<string[][]>('[...thHtml().matchAll(/data-a="thup" data-k="([^"]*)" data-n="([^"]*)"/g)].map(m=>[m[1],m[2].replace(/&#39;/g,"\'")])')
    expect(themeRows(loaded, bosses), JSON.stringify(loaded)).toEqual(live)
  }
})

test('uploading and removing clips and themes, and removing every ability sound', async ({ legacy, page }) => {
  const file = (name: string) => ({ name, mimeType: 'audio/wav', buffer: WAV })
  const until = (n: number) => page.waitForFunction((n) => (window as unknown as { __w: unknown[] }).__w.length >= n, n)
  const r = rng(903)
  const { base: BASE_SOUNDS, themes: THEMES } = await listsOf(legacy)
  for (let k = 0; k < 6; k++) {
    const slot = r.pick(Object.keys(BASE_SOUNDS))
    const theme = r.pick(THEMES)
    await legacy.run(SETUP())
    await legacy.run(`sndFor=${JSON.stringify(slot)}`)
    await page.setInputFiles('#sndf', file('clip.wav'))
    await until(2)
    await page.locator(`[data-a="sndel"][data-k="${slot}"]`).click()
    await until(4)
    await legacy.run(`thFor=${JSON.stringify({ k: theme.key, n: theme.name })}`)
    await page.setInputFiles('#thf', file('theme.wav'))
    await until(6)
    await page.locator(`[data-a="thdel"][data-k="${theme.key}"]`).click()
    await until(8)
    await page.locator('[data-a="abdel"]').click()
    await until(9)
    const { s, w } = gmStore()
    await s.getState().saveClip(slot, AUDIO)
    await s.getState().removeClip(slot)
    await s.getState().saveTheme(theme.key, theme.name, AUDIO)
    await s.getState().removeTheme(theme.key)
    await s.getState().removeAbilitySounds()
    expect(norm(w)).toEqual(await theirs(legacy))
  }
  // "Add another boss theme": the name becomes its key.
  await legacy.run(SETUP('prompt=()=>"  The Warden of Ash  "'))
  await page.locator('[data-a="thnew"]').click()
  await page.setInputFiles('#thf', file('theme.wav'))
  await until(2)
  const { s, w } = gmStore()
  await s.getState().saveTheme('thewardenofash', 'The Warden of Ash', AUDIO)
  expect(norm(w)).toEqual(await theirs(legacy))
})

// The same fake audio host on both sides: each file id gives a WAV, junk, an error or a refusal.
const pagePlan = (plan: Plan) => `window.__plan=${JSON.stringify(plan)};window.__seen={};{const b=Uint8Array.from(atob(${JSON.stringify(WAV64)}),c=>c.charCodeAt(0));
  window.fetch=async u=>{const id=u.slice(u.lastIndexOf("/")+1,-4),p=__plan[id];__seen[id]=(__seen[id]||0)+1;
   if(p==="throw")throw new TypeError("Failed to fetch");if(p===404||(p==="retry"&&__seen[id]===1))return new Response("",{status:p===404?404:503});
   return new Response(new Blob([p==="junk"?"not audio at all":b],{type:p==="junk"?"application/octet-stream":"audio/wav"}))}}`

function nodeDeps(plan: Plan, actions: ImportDeps<object>['actions'], lists?: Lists): ImportDeps<object> & { text: () => string } {
  const seen: Record<string, number> = {}
  let text = ''
  return {
    fetch: async (u) => {
      const id = u.slice(u.lastIndexOf('/') + 1, -4)
      const p = plan[id]
      seen[id] = (seen[id] || 0) + 1
      if (p === 'throw') throw new TypeError('Failed to fetch')
      if (p === 404 || (p === 'retry' && seen[id] === 1)) return { ok: false, status: p === 404 ? 404 : 503, blob: async () => new Blob([]) }
      return { ok: true, status: 200, blob: async () => new Blob([p === 'junk' ? 'not audio at all' : bytes(WAV)], { type: p === 'junk' ? 'application/octet-stream' : 'audio/wav' }) }
    },
    dataUrl: async (b) => `data:${b.type || 'application/octet-stream'};base64,${Buffer.from(await b.arrayBuffer()).toString('base64')}`,
    decode: async (u) =>
      Buffer.from(u.slice(u.indexOf(',') + 1), 'base64')
        .subarray(0, 4)
        .toString() === 'RIFF'
        ? {}
        : null,
    audio: () => true,
    actions,
    lists,
    status: (t) => void (text = t),
    text: () => text,
  }
}
const randomPlan = (r: R, ids: string[], p: number): Plan => Object.fromEntries(ids.flatMap((id) => (r.next() < p ? [[id, r.pick(['junk', 404, 'throw', 'retry'] as const)]] : [])))
const byPath = (w: unknown[][]) => [...w].sort((a, b) => String(a[1]).localeCompare(String(b[1])))

test('base attack sounds from the web', async ({ legacy, page }) => {
  const r = rng(904)
  const lists = await listsOf(legacy)
  const BASE_SOUNDS = lists.base
  for (let k = 0; k < 5; k++) {
    const plan = randomPlan(r, Object.values(BASE_SOUNDS), k ? 0.3 : 1)
    await legacy.run(SETUP(pagePlan(plan)))
    await page.locator('[data-a="bsweb"]').click()
    await page.waitForFunction(() => (window as unknown as { __w: W[] }).__w.some((x) => x[1] === 'meta'))
    const { s, w } = gmStore()
    const d = nodeDeps(plan, s.getState(), lists)
    await importBaseSounds(d)
    expect(norm(w), JSON.stringify(plan)).toEqual(await theirs(legacy))
    await expect(page.locator('#bsst')).toHaveText(d.text())
  }
})

test('boss themes from the web: each tried twice', async ({ legacy, page }) => {
  const r = rng(905)
  const lists = await listsOf(legacy)
  const THEMES = lists.themes
  for (let k = 0; k < 4; k++) {
    const plan = randomPlan(
      r,
      THEMES.map((t) => t.id),
      0.35,
    )
    await legacy.run(SETUP(pagePlan(plan)))
    await page.locator('[data-a="thweb"]').click()
    await page.waitForFunction(() => (window as unknown as { __w: W[] }).__w.some((x) => x[1] === 'meta'), undefined, { timeout: 20000 })
    const { s, w } = gmStore()
    const d = nodeDeps(plan, s.getState(), lists)
    await importThemes(d)
    expect(norm(w), JSON.stringify(plan)).toEqual(await theirs(legacy))
    // The same count and the same failed themes (the browser words its reasons its own way).
    const names = (t: string) => [t.split('. Failed: ')[0], (t.split('. Failed: ')[1] ?? '').split('; ').map((x) => x.split(': ')[0])]
    await expect.poll(async () => names(await page.locator('#thst').innerText())).toEqual(names(d.text()))
  }
})

test('ability sounds from the web, four at a time', async ({ legacy, page }) => {
  const r = rng(906)
  const lists = await listsOf(legacy)
  const ids = Object.values(lists.abilities)
  for (const p of [0.1, 0.4, 1]) {
    const plan = randomPlan(r, ids, p)
    const { s, w } = gmStore()
    const d = nodeDeps(plan, s.getState(), lists)
    await importAbilitySounds(d)
    await legacy.run(SETUP(pagePlan(plan)))
    await page.locator('[data-a="abweb"]').click()
    await expect(page.locator('#abst')).toHaveText(d.text(), { timeout: 30000 })
    // Four downloads run side by side, so only the set of saves must match.
    expect(byPath(norm(w))).toEqual(byPath(await theirs(legacy)))
  }
})

test('ability sound files: matched by ability name or id', async ({ legacy, page }) => {
  const r = rng(907)
  const { abilities: ABILITY_SOUNDS } = await listsOf(legacy)
  const keys = Object.keys(ABILITY_SOUNDS)
  for (let k = 0; k < 6; k++) {
    const files = Array.from({ length: r.int(1, 6) }, (_, i) => {
      const key = r.pick(keys)
      const name = r.pick([`${key}.mp3`, `${key.replace(/_/g, ' ').toUpperCase()}.wav`, `sound-${ABILITY_SOUNDS[key]}.mp3`, `nothing ${i}.mp3`, `${key}`])
      const junk = r.next() < 0.2
      return { name, mimeType: junk ? 'application/octet-stream' : 'audio/wav', buffer: junk ? Buffer.from('not audio at all') : WAV }
    })
    const { s, w } = gmStore()
    const d = nodeDeps({}, s.getState())
    await importAbilityFiles(
      d,
      files.map((f) => ({ name: f.name, blob: new Blob([bytes(f.buffer)], { type: f.mimeType }) })),
    )
    await legacy.run(SETUP())
    await page.setInputFiles('#absf', files)
    await expect(page.locator('#abst')).toHaveText(d.text())
    expect(norm(w), JSON.stringify(files.map((f) => f.name))).toEqual(await theirs(legacy))
  }
})
