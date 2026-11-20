// The built new app in a real browser, served the way GitHub Pages serves it
// (the live page at /<repo>/, the new app at /<repo>/next/). Run after `vite build`.
import { expect, test, type Page } from '@playwright/test'
import { createReadStream, existsSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { extname, join, resolve } from 'node:path'
import { FakeDb } from '../harness.ts'

const DIST = resolve(import.meta.dirname, '../../dist')
const LEGACY = resolve(import.meta.dirname, '../../../index.html')
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }

let server: Server
let base = ''

test.beforeAll(async () => {
  if (!existsSync(join(DIST, 'index.html'))) throw new Error('Build the app first (npm run build).')
  server = createServer((req, res) => {
    const p = decodeURIComponent((req.url ?? '/').split('?')[0]!)
    let file = p === '/repo/' ? LEGACY : p.startsWith('/repo/next/') ? join(DIST, p.slice('/repo/next/'.length) || 'index.html') : ''
    if (file && !extname(file)) file = join(file, 'index.html')
    if (!file || !existsSync(file)) return void res.writeHead(404).end()
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
    createReadStream(file).pipe(res)
  })
  await new Promise<void>((r) => server.listen(0, r))
  const addr = server.address()
  base = `http://localhost:${typeof addr === 'object' && addr ? addr.port : 0}/repo/`
})
test.afterAll(() => new Promise<void>((r) => server.close(() => r())))

/** Serves a FakeDb as Firebase for one browser page and records every request. */
async function useFakeFirebase(page: Page, db: FakeDb, requests: string[] = []) {
  await page.route('**/*', (route) => {
    const req = route.request()
    const u = new URL(req.url())
    if (u.hostname === 'localhost') return route.continue()
    if (!u.hostname.includes('firebaseio')) return route.abort()
    const path = u.pathname.replace(/\.json$/, '')
    requests.push(`${req.method()} ${path}`)
    if (req.method() !== 'GET') {
      const body = JSON.parse(req.postData() || 'null') as unknown
      if (req.method() === 'PUT') db.set(path, body)
      else if (req.method() === 'DELETE') db.set(path, null)
      else if (req.method() === 'PATCH') for (const [k, v] of Object.entries(body as object)) db.set(`${path}/${k}`, v)
      else if (req.method() === 'POST') return route.fulfill({ json: db.apply('POST', path, body) })
      return route.fulfill({ json: body })
    }
    const v = db.get(path)
    const shallow = u.searchParams.get('shallow') === 'true' && v && typeof v === 'object'
    return route.fulfill({ json: shallow ? Object.fromEntries(Object.keys(v as object).map((k) => [k, true])) : v })
  })
}

test('a GM opens a table, a player joins and creates a character, the GM lets them in', async ({ browser }) => {
  const db = new FakeDb()
  const errors: string[] = []
  const gmCtx = await browser.newContext()
  const plCtx = await browser.newContext()
  const gm = await gmCtx.newPage()
  const pl = await plCtx.newPage()
  for (const p of [gm, pl]) p.on('pageerror', (e) => errors.push(e.message))
  await useFakeFirebase(gm, db)
  const playerRequests: string[] = []
  await useFakeFirebase(pl, db, playerRequests)
  // The live page's own saved session must survive the new app.
  await gm.addInitScript(() => localStorage.setItem('st', '{"pin":"real","role":"gm","me":"gm"}'))

  await gm.goto(base + 'next/')
  await gm.getByLabel(/Table PIN/).fill('dragon42')
  await gm.getByLabel(/Game Master PIN/).fill('secret')
  await gm.getByRole('button', { name: 'Open as Game Master' }).click()
  await expect(gm.getByText('Game Master', { exact: true })).toBeVisible()
  expect(db.get('tables/dragon42/meta')).toMatchObject({ dm: expect.stringMatching(/^[0-9a-f]{64}$/) })

  await pl.goto(base + 'next/')
  await pl.getByLabel(/Table PIN/).fill('dragon42')
  await pl.getByRole('button', { name: 'Join as player' }).click()
  await pl.getByLabel(/^Name/).fill('Lyra')
  await pl.getByRole('button', { name: /^Archer/ }).click()
  await expect(pl.getByRole('heading', { name: 'Waiting to be allowed to play' })).toBeVisible()

  await expect(gm.getByRole('heading', { name: 'Join requests' })).toBeVisible({ timeout: 10_000 })
  await gm.getByRole('button', { name: 'Allow' }).click()
  await expect(pl.getByRole('heading', { name: 'The table' })).toBeVisible({ timeout: 10_000 })
  await expect(pl.getByText('Lyra: HP 110 / 110, stamina 100 / 100')).toBeVisible()
  // The player only wrote its own character; the GM's PIN never left the GM's browser.
  expect(playerRequests.filter((r) => !r.startsWith('GET ')).map((r) => r.replace(/p[a-z0-9]+$/, 'ID'))).toEqual(['PUT /tables/dragon42/chars/ID'])
  expect(await gm.evaluate(() => localStorage.getItem('st'))).toBe('{"pin":"real","role":"gm","me":"gm"}')
  expect(errors).toEqual([])
  await gmCtx.close()
  await plCtx.close()
})

test('the footer links back to the live table', async ({ page }) => {
  await useFakeFirebase(page, new FakeDb())
  await page.goto(base + 'next/')
  await expect(page.getByTestId('db-status')).toHaveText('Database reachable.')
  await page.getByRole('link', { name: 'live table' }).click()
  await expect(page).toHaveTitle('Curse of the Golden Wave')
  expect(page.url()).toBe(base)
})

test('the GM edits a boss and plays its cinematic; the player sees it too', async ({ browser }) => {
  const db = new FakeDb()
  db.set('tables/dragon42', {
    meta: { dm: 'x' },
    chars: { p1: { name: 'Lyra', cls: 'archer', hp: 110, maxHp: 110, st: 100, maxSt: 100, x10: true } },
    enemies: { a: { name: 'Aethelric', type: 'Undead', hp: 100, max: 100, sz: 4, mx: 2, my: 2, x10: true } },
  })
  const errors: string[] = []
  const gmCtx = await browser.newContext()
  const plCtx = await browser.newContext()
  const gm = await gmCtx.newPage()
  const pl = await plCtx.newPage()
  for (const p of [gm, pl]) p.on('pageerror', (e) => errors.push(e.message))
  await useFakeFirebase(gm, db)
  await useFakeFirebase(pl, db)
  await gm.addInitScript(() => localStorage.setItem('next.st', '{"pin":"dragon42","role":"gm","me":"gm"}'))
  await pl.addInitScript(() => localStorage.setItem('next.st', '{"pin":"dragon42","role":"player","me":"p1"}'))
  await pl.goto(base + 'next/')
  await expect(pl.getByRole('heading', { name: 'The table' })).toBeVisible()
  await expect(pl.getByRole('heading', { name: 'Enemies' })).toHaveCount(0)

  await gm.goto(base + 'next/')
  await gm.getByRole('button', { name: "Show or hide Aethelric's settings" }).click()
  await gm.getByLabel('Phase label').fill('First encounter')
  await gm.getByLabel('Phase label').blur()
  await expect.poll(() => db.get('tables/dragon42/enemies/a/pl')).toBe('First encounter')
  await gm.getByLabel('Load a skill set').selectOption('Aethelric: first encounter (3)')
  await expect(gm.getByLabel("Skill Warden's Cut", { exact: true })).toBeVisible()
  await gm.getByRole('button', { name: 'Load the Aethelric 75% scene' }).click()
  await gm.getByRole('button', { name: 'Play cinematic' }).click()
  await expect(gm.getByRole('dialog', { name: 'Cinematic: Aethelric' })).toBeVisible()
  await expect(pl.getByRole('dialog', { name: 'Cinematic: Aethelric' })).toBeVisible({ timeout: 10_000 })
  await expect(pl.getByRole('dialog').getByText('"ENOUGH GAMES!"')).toBeVisible({ timeout: 30_000 })
  expect(Object.values(db.get('tables/dragon42/enemies/a/sk') as object).map((q: { n: string }) => q.n)).toEqual(["Warden's Cut", 'Rime Guard', 'Chain Pull'])
  expect(errors).toEqual([])
  await gmCtx.close()
  await plCtx.close()
})

test('a player uses their sheet in the new app; the GM on the live page sees the same sheet', async ({ browser }) => {
  const db = new FakeDb()
  db.set('tables/dragon42', {
    meta: { dm: 'x' },
    chars: { p1: { name: 'Lyra', cls: 'archer', level: 1, ac: 13, hp: 80, maxHp: 110, st: 100, maxSt: 100, rg: 15, fl: 3, maxFl: 3, pv: 1, mx: 2, my: 2, x10: true } },
    portraits: { p1: { data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' } },
    maps: { m: { name: 'Crypt', w: 500, h: 500, cols: 10, v2: 1, al: { a: '1,1' } } },
    cur: 'm',
    enemies: { w: { name: 'Wolf', hp: 0, max: 30, mx: 6, my: 6, x10: true } },
  })
  const errors: string[] = []
  const plCtx = await browser.newContext()
  const gmCtx = await browser.newContext()
  const pl = await plCtx.newPage()
  const gm = await gmCtx.newPage()
  for (const p of [gm, pl]) p.on('pageerror', (e) => errors.push(e.message))
  await useFakeFirebase(pl, db)
  await useFakeFirebase(gm, db)
  await pl.addInitScript(() => localStorage.setItem('next.st', '{"pin":"dragon42","role":"player","me":"p1"}'))

  await pl.goto(base + 'next/')
  await pl.getByRole('button', { name: 'Sheet' }).click()
  const sheet = pl.getByLabel('Sheet: Lyra')
  await expect(sheet.getByRole('heading', { name: 'Lyra' })).toBeVisible()
  await expect(sheet.locator('.art')).toHaveCSS('background-image', /data:image\/png/)
  await expect(sheet.getByText('Archer · AC 13')).toBeVisible()

  await sheet.getByRole('button', { name: 'Flask (3/3)' }).click()
  await expect.poll(() => db.get('tables/dragon42/chars/p1/hp')).toBe(110)
  await sheet.getByRole('button', { name: '30 St' }).click() // Dodge Roll
  await expect(sheet.getByText('Dodging')).toBeVisible()
  await expect.poll(() => db.get('tables/dragon42/chars/p1/st')).toBe(70)
  await sheet.getByLabel('Notes').fill('Owes Bram 5 gold')
  await sheet.getByLabel('Notes').blur()
  await expect.poll(() => db.get('tables/dragon42/chars/p1/notes')).toBe('Owes Bram 5 gold')

  // Resting at the altar next to her refills her and sends the Golden Wave; the wolf comes back.
  await sheet.getByRole('button', { name: 'Altar rest', exact: true }).click()
  await expect.poll(() => db.get('tables/dragon42/chars/p1/st')).toBe(100)
  await expect.poll(() => db.get('tables/dragon42/enemies/w/hp'), { timeout: 10_000 }).toBe(30)
  const events = () => Object.values((db.get('tables/dragon42/rolls') as object) || {}).map((r: { ev?: string; wave?: object }) => r.ev ?? (r.wave ? 'wave' : '?'))
  await expect.poll(events).toEqual(['wave', 'The Golden Wave sweeps across the land...', 'The monsters return to their posts (unique foes stay dead)'])

  // The GM, still on the live page, sees the same sheet.
  await gm.addInitScript(() => localStorage.setItem('st', '{"pin":"dragon42","role":"gm","me":"gm"}'))
  await gm.goto(base)
  await gm.locator('#tab').click()
  const card = gm.locator('.card', { has: gm.getByRole('heading', { name: 'Lyra' }) })
  await expect(card.locator('textarea[data-f="notes"]')).toHaveValue('Owes Bram 5 gold')
  await expect(card.getByText('Rested at the altar')).toBeVisible()
  await expect(card.getByText('Drank a flask (+44 HP)')).toBeVisible()
  expect(errors).toEqual([])
  await gmCtx.close()
  await plCtx.close()
})
