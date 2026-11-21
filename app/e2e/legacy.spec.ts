// Safety net for the migration: characterization tests that pin down how the
// live single-file page (repo-root index.html) behaves today. Firebase and every
// other network call are faked, so the tests never touch your real tables.
// The legacy code keeps its state in top-level `let` variables, which are not on
// `window`, so each check runs as a script string inside the page.
import { expect, test, type Page } from '@playwright/test'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const LEGACY = pathToFileURL(resolve(import.meta.dirname, '../../classic/index.html')).href

type Tree = Record<string, unknown>

/** Serves `tables/<pin>/enemies` from memory and records PATCH/PUT writes. */
async function fakeFirebase(page: Page, enemies: Tree = {}) {
  const writes: { method: string; path: string; body: unknown }[] = []
  await page.route('**/*', (route) => {
    const req = route.request()
    const u = new URL(req.url())
    if (u.protocol === 'file:') return route.continue()
    if (!u.hostname.includes('firebaseio')) return route.abort()
    const path = u.pathname.replace(/^\/tables\/[^/]+\//, '').replace(/^\//, '').replace(/\.json$/, '')
    const method = req.method()
    if (method !== 'GET') writes.push({ method, path, body: JSON.parse(req.postData() || 'null') })
    if (path === 'enemies' && method === 'GET') return route.fulfill({ json: enemies })
    return route.fulfill({ json: null })
  })
  return writes
}

function trackErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

/** Puts the page into GM mode on the table view with the given enemies. */
const GM_SETUP = (enemies: Tree) => `
  pin="tbl";role="gm";dm=true;canGM=true;me="gm";applyBoard(vocBoard());
  enemies=${JSON.stringify(enemies)};chars={c1:{name:"P",hp:100,max:100}};
  view="table";sel="e:a";last="";try{eOpen.add("a")}catch(e){}render();`

test('loads without script errors and shows its build number', async ({ page }) => {
  const errors = trackErrors(page)
  await fakeFirebase(page)
  await page.goto(LEGACY)
  await expect(page).toHaveTitle('Curse of the Golden Wave')
  await expect(page.locator('#bld')).toHaveText(/^build \d+$/)
  await expect(page.locator('#app')).not.toBeEmpty()
  expect(errors).toEqual([])
})

test('GM table renders an enemy sheet with its phase label', async ({ page }) => {
  const errors = trackErrors(page)
  await fakeFirebase(page)
  await page.goto(LEGACY)
  const enemies = { a: { name: 'Aethelric', type: 'boss', hp: 1000, max: 1000, sz: 3, pm: 0, x10: true, pl: 'First encounter' } }
  await page.evaluate(GM_SETUP(enemies))
  await expect(page.locator('body')).toContainText('Aethelric')
  await expect(page.locator('body')).toContainText('First encounter')
  expect(errors).toEqual([])
})

test('damage past a swap-at-0 gate hands over to the next phase sheet', async ({ page }) => {
  const errors = trackErrors(page)
  const enemies = {
    a: { name: 'King', type: 'boss', hp: 1000, max: 1000, nx: 'b', sw: 1, sz: 3, pm: 0, x10: true, mx: 2, my: 2, mp: 'm' },
    b: { name: 'King on foot', type: 'boss', hp: 700, max: 700, sz: 2, pm: 0, x10: true },
  }
  const writes = await fakeFirebase(page, enemies)
  await page.goto(LEGACY)
  await page.evaluate(GM_SETUP(enemies))
  await page.evaluate(`applyDmg({e:false,id:"c1",o:chars.c1},{e:true,id:"a",o:enemies.a},5000,{label:"Test",heavy:false,rng:0})`)
  const patches = (id: string) => writes.filter((w) => w.method === 'PATCH' && w.path === `enemies/${id}`).map((w) => w.body)
  // The hit stops at 1 HP instead of 0 because a next phase exists...
  await expect.poll(() => patches('a')).toContainEqual(expect.objectContaining({ hp: 1 }))
  // ...then after the 1.7 s beat, phase 2 takes phase 1's map spot at full HP and phase 1 leaves the map.
  await expect.poll(() => patches('b'), { timeout: 5_000 }).toContainEqual(expect.objectContaining({ mx: 2, my: 2, mp: 'm', hp: 700 }))
  await expect.poll(() => patches('a')).toContainEqual(expect.objectContaining({ mx: null, my: null }))
  expect(errors).toEqual([])
})

test('loading a skill-set preset fills the skills of an enemy', async ({ page }) => {
  const errors = trackErrors(page)
  const enemies = { a: { name: 'Aethelric', type: 'boss', hp: 1000, max: 1000, sz: 3, pm: 0, x10: true } }
  const writes = await fakeFirebase(page, enemies)
  await page.goto(LEGACY)
  await page.evaluate(GM_SETUP(enemies))
  const pick = page.locator('[data-skp="a"]')
  await pick.selectOption('Aethelric: first encounter (3)')
  const skillNames = () => {
    const w = writes.filter((x) => x.method === 'PUT' && x.path === 'enemies/a/sk').at(-1)
    return w ? Object.values(w.body as Record<string, { n: string }>).map((s) => s.n) : []
  }
  await expect.poll(skillNames).toEqual([
    "Warden's Cut",
    'Rime Guard',
    'Chain Pull',
  ])
  expect(errors).toEqual([])
})

test('a cinematic script plays its beats in an overlay', async ({ page }) => {
  const errors = trackErrors(page)
  await fakeFirebase(page)
  await page.goto(LEGACY)
  const seconds = await page.evaluate(`playCin({t:"[flash] The cave trembles\\n[big] ENOUGH",n:"Test",k:""})`)
  expect(seconds).toBeGreaterThan(0)
  await expect(page.locator('.cin .ct')).toContainText('The cave trembles')
  await expect(page.locator('.cin .ct')).toContainText('ENOUGH', { timeout: 10_000 })
  expect(errors).toEqual([])
})
