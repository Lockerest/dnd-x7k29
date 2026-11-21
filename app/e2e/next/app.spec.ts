// The built new app in a real browser, served the way GitHub Pages serves it
// (the app at /<repo>/, the old page kept as a backup at /<repo>/classic/). Run after `vite build`.
import { expect, test, type Page } from '@playwright/test'
import { createReadStream, existsSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { extname, join, resolve } from 'node:path'
import { FakeDb } from '../harness.ts'
import { wavTone } from '../wav.ts'

const DIST = resolve(import.meta.dirname, '../../dist')
const LEGACY = resolve(import.meta.dirname, '../../../classic/index.html')
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }

let server: Server
let base = ''

test.beforeAll(async () => {
  if (!existsSync(join(DIST, 'index.html'))) throw new Error('Build the app first (npm run build).')
  server = createServer((req, res) => {
    const p = decodeURIComponent((req.url ?? '/').split('?')[0]!)
    let file = p === '/repo/classic/' ? LEGACY : p.startsWith('/repo/') ? join(DIST, p.slice('/repo/'.length) || 'index.html') : ''
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

  await gm.goto(base)
  await gm.getByLabel(/Table PIN/).fill('dragon42')
  await gm.getByLabel(/Game Master PIN/).fill('secret')
  await gm.getByRole('button', { name: 'Open as Game Master' }).click()
  await expect(gm.getByText('Game Master', { exact: true })).toBeVisible()
  expect(db.get('tables/dragon42/meta')).toMatchObject({ dm: expect.stringMatching(/^[0-9a-f]{64}$/) })

  await pl.goto(base)
  await pl.getByLabel(/Table PIN/).fill('dragon42')
  await pl.getByRole('button', { name: 'Join as player' }).click()
  await pl.getByLabel(/^Name/).fill('Lyra')
  await pl.getByRole('button', { name: /^Archer/ }).click()
  await expect(pl.getByRole('heading', { name: 'Waiting to be allowed to play' })).toBeVisible()

  await expect(gm.getByRole('heading', { name: 'Join requests' })).toBeVisible({ timeout: 10_000 })
  await gm.getByRole('button', { name: 'Allow' }).click()
  const status = pl.getByLabel('Status: Lyra')
  await expect(status).toBeVisible({ timeout: 10_000 })
  await expect(status.getByRole('meter').first()).toHaveAttribute('aria-valuenow', '110')
  await expect(pl.getByText("The GM hasn't set a map yet.")).toBeVisible()
  // The player only wrote its own character; the GM's PIN never left the GM's browser.
  expect(playerRequests.filter((r) => !r.startsWith('GET ')).map((r) => r.replace(/p[a-z0-9]+$/, 'ID'))).toEqual(['PUT /tables/dragon42/chars/ID'])
  // Saved under the old page's name, so a login from before the cutover carries over.
  expect(await gm.evaluate(() => localStorage.getItem('st'))).toBe('{"pin":"dragon42","role":"gm","me":"gm"}')
  expect(errors).toEqual([])
  await gmCtx.close()
  await plCtx.close()
})

test('the footer links to the backup page', async ({ page }) => {
  await useFakeFirebase(page, new FakeDb())
  await page.goto(base)
  await expect(page.getByTestId('db-status')).toHaveText('Database reachable.')
  await page.getByRole('link', { name: 'backup' }).click()
  await expect(page).toHaveTitle('Curse of the Golden Wave')
  expect(page.url()).toBe(base + 'classic/')
  // The old /next/ address sends you to the app.
  await page.goto(base + 'next/')
  await expect(page.getByTestId('db-status')).toHaveText('Database reachable.')
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
  await gm.addInitScript(() => localStorage.setItem('st', '{"pin":"dragon42","role":"gm","me":"gm"}'))
  await pl.addInitScript(() => localStorage.setItem('st', '{"pin":"dragon42","role":"player","me":"p1"}'))
  await pl.goto(base)
  await expect(pl.getByLabel('Status: Lyra')).toBeVisible()
  await expect(pl.getByRole('button', { name: /settings$/ })).toHaveCount(0) // the GM's enemy editor is not shown to players

  await gm.goto(base)
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
  await pl.addInitScript(() => localStorage.setItem('st', '{"pin":"dragon42","role":"player","me":"p1"}'))

  await pl.goto(base)
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
  await gm.goto(base + 'classic/')
  await gm.locator('#tab').click()
  const card = gm.locator('.card', { has: gm.getByRole('heading', { name: 'Lyra' }) })
  await expect(card.locator('textarea[data-f="notes"]')).toHaveValue('Owes Bram 5 gold')
  await expect(card.getByText('Rested at the altar')).toBeVisible()
  await expect(card.getByText('Drank a flask (+44 HP)')).toBeVisible()
  expect(errors).toEqual([])
  await gmCtx.close()
  await plCtx.close()
})

test('the ability board: the GM edits it in the new app, a player equips at an altar, the live page agrees', async ({ browser }) => {
  const db = new FakeDb()
  db.set('tables/dragon42', {
    meta: { dm: 'x', abv: 0 },
    chars: { p1: { name: 'Bram', cls: 'fighter', level: 2, hp: 140, maxHp: 140, st: 100, maxSt: 100, rg: 20, mx: 1, my: 1, x10: true } },
    maps: { m: { name: 'Crypt', w: 500, h: 500, cols: 10, v2: 1, al: { a: '0,0' } } },
    cur: 'm',
  })
  const errors: string[] = []
  const gmCtx = await browser.newContext()
  const plCtx = await browser.newContext()
  const gm = await gmCtx.newPage()
  const pl = await plCtx.newPage()
  for (const p of [gm, pl]) p.on('pageerror', (e) => errors.push(e.message))
  await useFakeFirebase(gm, db)
  await useFakeFirebase(pl, db)
  gm.on('dialog', (d) => void d.accept())
  await gm.addInitScript(() => localStorage.setItem('st', '{"pin":"dragon42","role":"gm","me":"gm"}'))
  await pl.addInitScript(() => localStorage.setItem('st', '{"pin":"dragon42","role":"player","me":"p1"}'))

  // The GM loads the 9-class board and renames an ability.
  await gm.goto(base)
  await gm.getByRole('button', { name: 'Abilities' }).click()
  await gm.getByRole('button', { name: 'Load 9-class abilities' }).click()
  await expect.poll(() => Object.keys((db.get('tables/dragon42/board') as object) || {}).length).toBeGreaterThan(100)
  await gm.getByRole('button', { name: /^Fighter \(/ }).click()
  const strike = gm.getByLabel('Ability: Power Strike')
  await expect(strike.locator('svg.abi')).toBeVisible()
  await strike.getByLabel('Name').fill('Mighty Strike')
  await strike.getByLabel('Name').blur()
  await expect.poll(() => db.get('tables/dragon42/board/fighter_power_strike/n')).toBe('Mighty Strike')

  // The player, standing by the altar, equips and checks the reference.
  await pl.goto(base)
  await pl.getByRole('button', { name: 'Abilities' }).click()
  await expect(pl.getByText(/You are at an altar, bonfire or guild/)).toBeVisible()
  const row = pl.locator('.ab', { has: pl.getByText('Mighty Strike', { exact: true }) })
  await row.getByRole('button', { name: 'Unequip' }).click()
  await expect(row.getByRole('button', { name: 'Equip' })).toBeVisible()
  await expect.poll(() => Object.keys((db.get('tables/dragon42/chars/p1/eq') as object) || {})).not.toContain('fighter_power_strike')
  await pl.getByRole('button', { name: 'Reference' }).click()
  await expect(pl.getByRole('heading', { name: 'Fighter' })).toBeVisible()
  await expect(pl.getByRole('cell', { name: 'Mighty Strike' })).toBeVisible()

  // The live page shows the same board and the same choice.
  const live = await gmCtx.newPage()
  live.on('pageerror', (e) => errors.push(e.message))
  await useFakeFirebase(live, db)
  await live.addInitScript(() => localStorage.setItem('st', '{"pin":"dragon42","role":"player","me":"p1"}'))
  await live.goto(base + 'classic/')
  await live.locator('#tab2').click()
  const liveRow = live.locator('.ab', { has: live.getByText('Mighty Strike', { exact: true }) })
  await expect(liveRow.getByRole('button', { name: 'Equip' })).toBeVisible()
  expect(errors).toEqual([])
  await gmCtx.close()
  await plCtx.close()
})

test('the table: a player walks on the map in the new app, the GM moves a monster, the live page shows both', async ({ browser }) => {
  const db = new FakeDb()
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
  db.set('tables/dragon42', {
    meta: { dm: 'x' },
    chars: { p1: { name: 'Lyra', cls: 'archer', hp: 110, maxHp: 110, st: 100, maxSt: 100, rg: 15, mx: 1, my: 1, mp: 'm', x10: true } },
    enemies: { w: { name: 'Wolf', hp: 30, max: 30, mx: 8, my: 6, mp: 'm', x10: true } },
    maps: { m: { name: 'Crypt', w: 500, h: 400, cols: 10, v2: 1, iv: 1, fog: 1 } },
    mapimg: { m: { data: png } },
    cur: 'm',
    combat: true,
  })
  const errors: string[] = []
  const gmCtx = await browser.newContext({ viewport: { width: 1400, height: 1000 } })
  const plCtx = await browser.newContext({ viewport: { width: 1400, height: 1000 } })
  const gm = await gmCtx.newPage()
  const pl = await plCtx.newPage()
  for (const p of [gm, pl]) p.on('pageerror', (e) => errors.push(e.message))
  await useFakeFirebase(gm, db)
  await useFakeFirebase(pl, db)
  await gm.addInitScript(() => localStorage.setItem('st', '{"pin":"dragon42","role":"gm","me":"gm"}'))
  await pl.addInitScript(() => localStorage.setItem('st', '{"pin":"dragon42","role":"player","me":"p1"}'))

  // The player taps three squares to the right: in combat that costs 30 stamina.
  await pl.goto(base)
  const map = pl.getByRole('img', { name: 'Map: Crypt' })
  await expect(map).toBeVisible()
  await expect(pl.getByText(/Combat: moving costs 1 stamina per square, 6 squares left this round/)).toBeVisible()
  const tapAt = async (p: typeof pl, x: number, y: number) => {
    const b = (await p.getByRole('img', { name: 'Map: Crypt' }).boundingBox())!
    await p.mouse.click(b.x + ((x + 0.5) / 10) * b.width, b.y + ((y + 0.5) / 8) * b.height)
  }
  await tapAt(pl, 4, 1)
  await expect.poll(() => db.get('tables/dragon42/chars/p1/mx')).toBe(4)
  expect(db.get('tables/dragon42/chars/p1')).toMatchObject({ st: 70, mvd: 3 })
  await expect.poll(() => String(db.get('tables/dragon42/maps/m/fg'))).toMatch(/1/) // the fog around her is revealed (saved just after the move)

  // The GM picks the wolf and moves it next to her.
  await gm.goto(base)
  await gm.getByRole('button', { name: '👹 Wolf' }).click()
  await tapAt(gm, 5, 2)
  await expect.poll(() => db.get('tables/dragon42/enemies/w/mx')).toBe(5)

  // The live page shows both where they now stand.
  const live = await plCtx.newPage()
  live.on('pageerror', (e) => errors.push(e.message))
  await useFakeFirebase(live, db)
  await live.addInitScript(() => localStorage.setItem('st', '{"pin":"dragon42","role":"player","me":"p1"}'))
  await live.goto(base + 'classic/')
  await expect(live.locator('#map')).toBeVisible()
  expect(await live.evaluate('[chars.p1.mx, chars.p1.my, enemies.w.mx, enemies.w.my]')).toEqual([4, 1, 5, 2])
  expect(errors).toEqual([])
  await gmCtx.close()
  await plCtx.close()
})

test('initiative: the GM starts it in the new app, the player rolls, combat begins, turns pass; the live page agrees', async ({ browser }) => {
  const db = new FakeDb()
  db.set('tables/dragon42', {
    meta: { dm: 'x' },
    chars: { p1: { name: 'Lyra', cls: 'archer', hp: 110, maxHp: 110, st: 40, maxSt: 100, rg: 15, dex: 14, mx: 1, my: 1, x10: true } },
    enemies: { w: { name: 'Wolf', hp: 30, max: 30, mx: 5, my: 5, ib: 1, x10: true } },
    maps: { m: { name: 'Crypt', w: 500, h: 400, cols: 10, v2: 1 } },
    cur: 'm',
  })
  const errors: string[] = []
  const gmCtx = await browser.newContext({ viewport: { width: 1400, height: 1000 } })
  const plCtx = await browser.newContext({ viewport: { width: 1400, height: 1000 } })
  const gm = await gmCtx.newPage()
  const pl = await plCtx.newPage()
  for (const p of [gm, pl]) p.on('pageerror', (e) => errors.push(e.message))
  await useFakeFirebase(gm, db)
  await useFakeFirebase(pl, db)
  await gm.addInitScript(() => localStorage.setItem('st', '{"pin":"dragon42","role":"gm","me":"gm"}'))
  await pl.addInitScript(() => localStorage.setItem('st', '{"pin":"dragon42","role":"player","me":"p1"}'))

  await gm.goto(base)
  await gm.getByRole('button', { name: 'Start initiative' }).click()
  await expect.poll(() => (db.get('tables/dragon42/init') as { ph?: string } | null)?.ph).toBe('roll')

  await pl.goto(base)
  const order = pl.getByLabel('Turn order')
  await order.getByRole('button', { name: 'Roll' }).click()
  await expect.poll(() => (db.get('tables/dragon42/init/l/0') as { v: number | null }).v ?? 0, { timeout: 15_000 }).toBeGreaterThan(2) // d20 + 2 (DEX 14), once the dice land
  const rolled = Object.values(db.get('tables/dragon42/rolls') as object).find((r: { ds?: unknown }) => r.ds) as { n: string; m: number }
  expect(rolled).toMatchObject({ n: 'Lyra', m: 2 }) // the dice are shared with the table

  await gm.getByRole('button', { name: 'Roll enemies' }).click()
  await expect(gm.getByRole('button', { name: 'Begin combat' })).toBeEnabled()
  await gm.getByRole('button', { name: 'Begin combat' }).click()
  await expect.poll(() => db.get('tables/dragon42/combat')).toBe(true)
  await expect(gm.getByRole('heading', { name: 'Turn order · Round 1' })).toBeVisible()

  // Whoever goes first, the GM passes turns until a new round: Lyra regains stamina.
  await gm.getByRole('button', { name: 'Next turn' }).click()
  await gm.getByRole('button', { name: 'Next turn' }).click()
  await expect.poll(() => (db.get('tables/dragon42/init') as { r: number }).r).toBe(2)
  await expect.poll(() => db.get('tables/dragon42/chars/p1/st')).toBe(55)
  await expect(pl.getByRole('heading', { name: 'Turn order · Round 2' })).toBeVisible()

  // The live page shows the same order.
  const live = await plCtx.newPage()
  live.on('pageerror', (e) => errors.push(e.message))
  await useFakeFirebase(live, db)
  await live.addInitScript(() => localStorage.setItem('st', '{"pin":"dragon42","role":"player","me":"p1"}'))
  await live.goto(base + 'classic/')
  await expect(live.getByRole('heading', { name: 'Turn order · Round 2' })).toBeVisible()
  expect(errors).toEqual([])
  await gmCtx.close()
  await plCtx.close()
})

test('attacks: the GM attacks the player in the new app, the player dodges; the player strikes back; the live page agrees', async ({ browser }) => {
  const db = new FakeDb()
  db.set('tables/dragon42', {
    meta: { dm: 'x' },
    chars: { p1: { name: 'Lyra', cls: 'fighter', hp: 110, maxHp: 110, st: 100, maxSt: 100, str: 14, dex: 14, ac: 5, mx: 4, my: 4, mp: 'm', x10: true } },
    enemies: { w: { name: 'Wolf', hp: 300, max: 300, ac: 5, ab: 4, dm: '1d6', mx: 5, my: 4, mp: 'm', x10: true } },
    maps: { m: { name: 'Crypt', w: 500, h: 400, cols: 10, v2: 1, iv: 1 } },
    mapimg: { m: { data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' } },
    cur: 'm',
  })
  const errors: string[] = []
  const gmCtx = await browser.newContext({ viewport: { width: 1400, height: 1000 } })
  const plCtx = await browser.newContext({ viewport: { width: 1400, height: 1000 } })
  const gm = await gmCtx.newPage()
  const pl = await plCtx.newPage()
  for (const p of [gm, pl]) p.on('pageerror', (e) => errors.push(e.message))
  await useFakeFirebase(gm, db)
  await useFakeFirebase(pl, db)
  // Fixed dice: the wolf rolls 13 (a hit), the player's saves and attacks roll 20.
  await gm.addInitScript(() => {
    localStorage.setItem('st', '{"pin":"dragon42","role":"gm","me":"gm"}')
    Math.random = () => 0.6
  })
  await pl.addInitScript(() => {
    localStorage.setItem('st', '{"pin":"dragon42","role":"player","me":"p1"}')
    Math.random = () => 0.99
  })
  const tapAt = async (p: Page, x: number, y: number) => {
    const b = (await p.getByRole('img', { name: 'Map: Crypt' }).boundingBox())!
    await p.mouse.click(b.x + ((x + 0.5) / 10) * b.width, b.y + ((y + 0.5) / 8) * b.height)
  }
  await pl.goto(base)
  await expect(pl.getByRole('img', { name: 'Map: Crypt' })).toBeVisible()

  // The GM picks the wolf, taps Lyra and attacks.
  await gm.goto(base)
  await gm.getByRole('button', { name: '👹 Wolf' }).click()
  await tapAt(gm, 4, 4)
  const menu = gm.getByLabel('Actions')
  await expect(menu.getByText('Wolf → Lyra')).toBeVisible()
  await menu.getByRole('button', { name: 'Light attack' }).click()

  // Lyra gets 3 seconds to react and dodges.
  await expect(pl.getByText('⚠ Wolf is attacking you!')).toBeVisible()
  await pl.getByRole('button', { name: 'Dodge · 30 St' }).click()
  const said = () => Object.values((db.get('tables/dragon42/rolls') as object) ?? {}).flatMap((r: { ev?: string }) => (r.ev ? [r.ev] : []))
  await expect.poll(said, { timeout: 15_000 }).toContain("Lyra dodges Wolf's attack (save 22 vs 17)")
  expect(db.get('tables/dragon42/chars/p1')).toMatchObject({ hp: 110, st: 70 })
  await expect.poll(() => db.get('tables/dragon42/qte')).toBeNull()

  // Lyra strikes back with a light attack: a natural 20.
  await tapAt(pl, 5, 4)
  await pl.getByLabel('Actions').getByRole('button', { name: 'Light attack' }).click()
  // (Each roll waits for its dice on screen.)
  await expect.poll(said, { timeout: 15_000 }).toContain('Lyra rolls 20 +4 = 24 vs AC 5 (Light attack on Wolf): CRITICAL HIT')
  await expect.poll(() => (db.get('tables/dragon42/enemies/w/hp') as number) < 300, { timeout: 15_000 }).toBe(true)

  // The live page shows the same hit points and stamina.
  const live = await plCtx.newPage()
  live.on('pageerror', (e) => errors.push(e.message))
  await useFakeFirebase(live, db)
  await live.addInitScript(() => localStorage.setItem('st', '{"pin":"dragon42","role":"player","me":"p1"}'))
  await live.goto(base + 'classic/')
  await expect(live.locator('#map')).toBeVisible()
  expect(await live.evaluate('[chars.p1.st, enemies.w.hp]')).toEqual([db.get('tables/dragon42/chars/p1/st'), db.get('tables/dragon42/enemies/w/hp')])
  expect(errors).toEqual([])
  await gmCtx.close()
  await plCtx.close()
})

test('dice: a player rolls from the Dice card; the other player sees the dice fly; everyone, the live page too, sees the log', async ({ browser }) => {
  const db = new FakeDb()
  db.set('tables/dragon42', {
    meta: { dm: 'x' },
    chars: {
      p1: { name: 'Lyra', cls: 'archer', hp: 110, maxHp: 110, st: 100, maxSt: 100, dex: 16, x10: true },
      p2: { name: 'Bram', cls: 'fighter', hp: 140, maxHp: 140, st: 100, maxSt: 100, x10: true },
    },
    maps: {},
  })
  const errors: string[] = []
  const ctxA = await browser.newContext({ viewport: { width: 1400, height: 1000 } })
  const ctxB = await browser.newContext({ viewport: { width: 1400, height: 1000 } })
  const a = await ctxA.newPage()
  const b = await ctxB.newPage()
  for (const p of [a, b]) p.on('pageerror', (e) => errors.push(e.message))
  await useFakeFirebase(a, db)
  await useFakeFirebase(b, db)
  await a.addInitScript(() => {
    localStorage.setItem('st', '{"pin":"dragon42","role":"player","me":"p1"}')
    localStorage.setItem('sk', 'gold')
    Math.random = () => 0.6
  })
  await b.addInitScript(() => localStorage.setItem('st', '{"pin":"dragon42","role":"player","me":"p2"}'))
  await b.goto(base)
  await expect(b.getByText('No rolls yet.')).toBeVisible()

  // Lyra rolls two d20s with +1 and her DEX (+3), in gold.
  await a.goto(base)
  const card = a.getByLabel('Dice', { exact: true })
  await expect(card.getByLabel('Dice style')).toHaveValue('gold')
  await card.getByLabel('How many').fill('2')
  await card.getByLabel('Bonus').fill('1')
  await card.getByLabel('Stat').selectOption('dex')
  await card.getByRole('button', { name: 'd20', exact: true }).click()
  // The dice tumble on her screen, then the result shows.
  await expect(a.locator('.dov.sk-gold')).toBeVisible()
  await expect(a.locator('.dres')).toHaveText('d2013d201313 + 13 + 4 = 30', { timeout: 6000 })
  await expect(a.locator('.dov')).toHaveCount(0, { timeout: 5000 })
  const saved = Object.values(db.get('tables/dragon42/rolls') as object)[0]
  expect(saved).toMatchObject({ n: 'Lyra', ds: [{ d: 20, r: 13 }, { d: 20, r: 13 }], m: 4, sk: 'gold', by: 'p1' })
  await expect(a.getByLabel('Dice log')).toContainText('Lyra rolled 2d20: 13, 13 +4 = 30')

  // Bram sees her roll fly on his screen too.
  await expect(b.locator('.dres .dw')).toHaveText('Lyra rolls', { timeout: 8000 })
  await expect(b.getByLabel('Dice log')).toContainText('Lyra rolled 2d20: 13, 13 +4 = 30')

  // The live page lists it too.
  const live = await ctxB.newPage()
  live.on('pageerror', (e) => errors.push(e.message))
  await useFakeFirebase(live, db)
  await live.addInitScript(() => localStorage.setItem('st', '{"pin":"dragon42","role":"player","me":"p2"}'))
  await live.goto(base + 'classic/')
  await expect(live.locator('.rl')).toContainText('Lyra rolled 2d20: 13, 13 +4 = 30')
  expect(errors).toEqual([])
  await ctxA.close()
  await ctxB.close()
})

test('scenes and sound: an attack plays its scene with sound on both screens; an altar rest sends the Golden Wave to the other screen', async ({ browser }) => {
  const db = new FakeDb()
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
  db.set('tables/dragon42', {
    meta: { dm: 'x' },
    chars: { p1: { name: 'Lyra', cls: 'fighter', hp: 110, maxHp: 110, st: 100, maxSt: 100, str: 14, ac: 5, mx: 4, my: 4, mp: 'm', x10: true } },
    enemies: { w: { name: 'Wolf', hp: 300, max: 300, ac: 30, mx: 5, my: 4, mp: 'm', x10: true } },
    maps: { m: { name: 'Crypt', w: 500, h: 400, cols: 10, v2: 1, iv: 1, al: { a: '3,4' } } },
    mapimg: { m: { data: png } },
    cur: 'm',
  })
  const errors: string[] = []
  const gmCtx = await browser.newContext({ viewport: { width: 1400, height: 1000 } })
  const plCtx = await browser.newContext({ viewport: { width: 1400, height: 1000 } })
  const gm = await gmCtx.newPage()
  const pl = await plCtx.newPage()
  for (const p of [gm, pl]) {
    p.on('pageerror', (e) => errors.push(e.message))
    await useFakeFirebase(p, db)
    // Count the sounds the page synthesises (tones and noise).
    await p.addInitScript(() => {
      const C = window.AudioContext
      const w = window as unknown as { __tones: number }
      w.__tones = 0
      window.AudioContext = class extends C {
        createOscillator() {
          w.__tones++
          return super.createOscillator()
        }
        createBufferSource() {
          w.__tones++
          return super.createBufferSource()
        }
      }
    })
  }
  await gm.addInitScript(() => localStorage.setItem('st', '{"pin":"dragon42","role":"gm","me":"gm"}'))
  await pl.addInitScript(() => {
    localStorage.setItem('st', '{"pin":"dragon42","role":"player","me":"p1"}')
    Math.random = () => 0.5
  })
  await gm.goto(base)
  await pl.goto(base)
  // Sound starts after a first tap on each screen.
  await gm.getByRole('heading', { name: 'Dice' }).click()
  await pl.getByRole('heading', { name: 'Dice' }).click()
  await expect(pl.getByLabel('Attack scenes')).toBeChecked()

  // Lyra swings at the wolf (AC 30): a miss, shown as a scene on both screens.
  const b = (await pl.getByRole('img', { name: 'Map: Crypt' }).boundingBox())!
  await pl.mouse.click(b.x + (5.5 / 10) * b.width, b.y + (4.5 / 8) * b.height)
  await pl.getByLabel('Actions').getByRole('button', { name: 'Light attack' }).click()
  await expect(pl.getByRole('img', { name: 'Lyra attacks Wolf' })).toBeVisible({ timeout: 10_000 })
  await expect(pl.locator('.scn .dmg')).toHaveText('MISS')
  await expect(gm.getByRole('img', { name: 'Lyra attacks Wolf' })).toBeVisible({ timeout: 10_000 })
  await expect.poll(() => pl.evaluate(() => (window as unknown as { __tones: number }).__tones)).toBeGreaterThan(0)
  await expect.poll(() => gm.evaluate(() => (window as unknown as { __tones: number }).__tones)).toBeGreaterThan(0)
  await expect(pl.locator('.scn')).toHaveCount(0, { timeout: 6000 })

  // She rests at the altar beside her: the Golden Wave sweeps across the GM's screen too.
  await pl.getByRole('button', { name: 'Sheet' }).click()
  await pl.getByRole('button', { name: 'Altar rest', exact: true }).click()
  await expect(pl.locator('canvas.gwave')).toHaveCount(1)
  await expect(gm.locator('canvas.gwave')).toHaveCount(1, { timeout: 8000 })
  await expect(gm.locator('canvas.gwave')).toHaveCount(0, { timeout: 8000 })

  // Turning scenes off (remembered on this device) stops them here.
  await pl.getByRole('button', { name: 'Table', exact: true }).click()
  await pl.getByLabel('Attack scenes').uncheck()
  expect(await pl.evaluate(() => localStorage.getItem('sc'))).toBe('0')
  expect(errors).toEqual([])
  await gmCtx.close()
  await plCtx.close()
})

test("the GM's map tools: upload a map, draw walls, place an altar, add a pin and move the party; the player and the live page agree", async ({ browser }) => {
  const db = new FakeDb()
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
  db.set('tables/dragon42', {
    meta: { dm: 'x' },
    chars: { p1: { name: 'Lyra', cls: 'archer', hp: 110, maxHp: 110, st: 100, maxSt: 100, mx: 1, my: 1, mp: 'm', x10: true } },
    maps: { m: { name: 'World', w: 500, h: 400, cols: 10, v2: 1, iv: 1 } },
    mapimg: { m: { data: png } },
    cur: 'm',
  })
  const errors: string[] = []
  const gmCtx = await browser.newContext({ viewport: { width: 1400, height: 1000 } })
  const plCtx = await browser.newContext({ viewport: { width: 1400, height: 1000 } })
  const gm = await gmCtx.newPage()
  const pl = await plCtx.newPage()
  for (const p of [gm, pl]) {
    p.on('pageerror', (e) => errors.push(e.message))
    await useFakeFirebase(p, db)
  }
  await gm.addInitScript(() => localStorage.setItem('st', '{"pin":"dragon42","role":"gm","me":"gm"}'))
  await pl.addInitScript(() => localStorage.setItem('st', '{"pin":"dragon42","role":"player","me":"p1"}'))
  await gm.goto(base)
  await expect(gm.getByRole('img', { name: 'Map: World' })).toBeVisible()

  // A new map from a picture file (a 400 x 300 PNG drawn in the page).
  const pngBytes = await gm.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 400
    c.height = 300
    const g = c.getContext('2d')!
    g.fillStyle = '#446'
    g.fillRect(0, 0, 400, 300)
    return c.toDataURL('image/png').split(',')[1]!
  })
  await gm.getByLabel('Map picture').setInputFiles({ name: 'Crypt.png', mimeType: 'image/png', buffer: Buffer.from(pngBytes, 'base64') })
  await expect(gm.getByRole('img', { name: 'Map: Crypt' })).toBeVisible()
  const crypt = Object.keys(db.get('tables/dragon42/maps') as object).find((k) => k !== 'm')!
  expect(db.get(`tables/dragon42/maps/${crypt}`)).toMatchObject({ name: 'Crypt', cols: 24, grid: true, w: 400, h: 300 })
  expect(String((db.get(`tables/dragon42/mapimg/${crypt}`) as { data: string }).data)).toMatch(/^data:image\/jpeg;base64,/)

  // Ten squares across, then draw a wall by dragging across three squares.
  const cols = gm.getByLabel('Squares across')
  await cols.fill('10')
  await cols.press('Enter')
  await expect.poll(() => (db.get(`tables/dragon42/maps/${crypt}`) as { cols: number }).cols).toBe(10)
  const at = async (x: number, y: number) => {
    await gm.getByRole('img', { name: 'Map: Crypt' }).scrollIntoViewIfNeeded()
    const b = (await gm.getByRole('img', { name: 'Map: Crypt' }).boundingBox())!
    return [b.x + ((x + 0.5) / 10) * b.width, b.y + ((y + 0.5) / 7) * b.height] as const
  }
  await gm.getByRole('button', { name: 'Draw walls' }).click()
  await gm.mouse.move(...(await at(2, 3)))
  await gm.mouse.down()
  await gm.mouse.move(...(await at(3, 3)), { steps: 4 })
  await gm.mouse.move(...(await at(4, 3)), { steps: 4 })
  await gm.mouse.up()
  await expect.poll(() => (db.get(`tables/dragon42/maps/${crypt}`) as { walls?: string[] }).walls).toEqual(['2,3', '3,3', '4,3'])

  // An altar, and the arrival point.
  await gm.getByRole('button', { name: 'Altar', exact: true }).click()
  await gm.mouse.click(...(await at(6, 1)))
  await expect.poll(() => (db.get(`tables/dragon42/maps/${crypt}`) as { al?: string[] }).al).toEqual(['6,1'])
  await gm.getByRole('button', { name: 'Entry' }).click()
  await gm.mouse.click(...(await at(5, 5)))
  await expect.poll(() => (db.get(`tables/dragon42/maps/${crypt}`) as { en?: number[] }).en).toEqual([5.5, 5.5])

  // On the World map, a pin to the Crypt; then the party travels through it.
  await gm.getByLabel('Map', { exact: true }).selectOption('m')
  await gm.getByRole('button', { name: 'Pins' }).click()
  const answers = ['1', 'Crypt gate', '1']
  gm.on('dialog', (d) => void d.accept(answers.shift()))
  await gm.getByRole('img', { name: 'Map: World' }).scrollIntoViewIfNeeded()
  const w = (await gm.getByRole('img', { name: 'Map: World' }).boundingBox())!
  await gm.mouse.click(w.x + (7.5 / 10) * w.width, w.y + (2.5 / 8) * w.height)
  await expect.poll(() => Object.values((db.get('tables/dragon42/maps/m') as { pn?: object }).pn ?? {})).toEqual([{ x: 7.5, y: 2.5, to: crypt, l: 'Crypt gate' }])
  await gm.mouse.click(w.x + (7.5 / 10) * w.width, w.y + (2.5 / 8) * w.height)
  await expect.poll(() => db.get('tables/dragon42/cur')).toBe(crypt)
  expect(db.get('tables/dragon42/chars/p1')).toMatchObject({ mp: crypt, mx: 5, my: 5 })

  // The player now sees the Crypt, with the overview of where it is on the World map.
  await pl.goto(base)
  await expect(pl.getByRole('img', { name: 'Map: Crypt' })).toBeVisible()
  await expect(pl.getByLabel('Overview')).toContainText('You are here: Crypt gate')

  // The live page shows the same map, walls and altar.
  const live = await plCtx.newPage()
  live.on('pageerror', (e) => errors.push(e.message))
  await useFakeFirebase(live, db)
  await live.addInitScript(() => localStorage.setItem('st', '{"pin":"dragon42","role":"player","me":"p1"}'))
  await live.goto(base + 'classic/')
  await expect(live.locator('#map')).toBeVisible()
  expect(await live.evaluate(`[mapId(), [...geo().W].sort(), altars(), chars.p1.mx, chars.p1.my]`)).toEqual([crypt, ['2,3', '3,3', '4,3'], ['6,1'], 5, 5])
  await expect(live.locator('#ovw')).toContainText('You are here: Crypt gate')
  expect(errors).toEqual([])
  await gmCtx.close()
  await plCtx.close()
})

test('pictures: portraits, token icons, boss art, skill and ability icons come out byte for byte like the live page', async ({ browser }) => {
  const tree = () => ({
    meta: { dm: 'x' },
    chars: { p1: { name: 'Lyra', cls: 'fighter', hp: 140, maxHp: 140, st: 100, maxSt: 100, x10: true } },
    enemies: { w: { name: 'Wolf', hp: 30, max: 30, x10: true, sk: { s1: { n: 'Bite', d: '1d6', r: 1, t: 's' } } } },
    board: { k1: { n: 'Cleave', v: 'fighter', l: 1, c: 2, k: 'atk', d: '2d6', r: 1 } },
    maps: {},
  })
  const mine = new FakeDb()
  const theirs = new FakeDb()
  mine.set('tables/dragon42', tree())
  theirs.set('tables/dragon42', tree())
  const errors: string[] = []
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } })
  const next = await ctx.newPage()
  next.on('pageerror', (e) => errors.push(e.message))
  await useFakeFirebase(next, mine)
  await next.addInitScript(() => localStorage.setItem('st', '{"pin":"dragon42","role":"gm","me":"gm"}'))
  await next.goto(base)
  await expect(next.getByText('No maps yet. Upload one to begin.')).toBeVisible()

  // A test picture with detail in it (a gradient and a shape), drawn by the browser.
  const b64 = await next.evaluate(() => {
    const c = document.createElement('canvas')
    // Taller than a portrait, so its crop and placement matter too.
    c.width = 500
    c.height = 900
    const g = c.getContext('2d')!
    const gr = g.createLinearGradient(0, 0, 500, 900)
    gr.addColorStop(0, '#c33')
    gr.addColorStop(1, '#36c')
    g.fillStyle = gr
    g.fillRect(0, 0, 500, 900)
    g.fillStyle = '#fd4'
    g.beginPath()
    g.arc(320, 240, 90, 0, 7)
    g.fill()
    return c.toDataURL('image/png').split(',')[1]!
  })
  const file = { name: 'pic.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') }
  const T = 'tables/dragon42'

  // The new app: the hero's portrait and icon on the sheet, the wolf's pictures and skill icon, the ability icon.
  await next.getByRole('button', { name: 'Sheet' }).click()
  await next.getByLabel('Set portrait file').setInputFiles(file)
  await expect.poll(() => mine.get(`${T}/chars/p1/pv`)).not.toBeNull()
  await next.getByLabel('Set icon file').setInputFiles(file)
  await expect.poll(() => mine.get(`${T}/chars/p1/iv`)).not.toBeNull()
  await next.getByRole('button', { name: 'Table' }).click()
  await next.getByRole('button', { name: "Show or hide Wolf's settings" }).click()
  const wolf = next.getByLabel('Enemies')
  await wolf.getByLabel('Icon file').nth(1).setInputFiles(file)
  await expect.poll(() => mine.get(`${T}/enemies/w/iv`)).not.toBeNull()
  await wolf.getByLabel('Portrait file').setInputFiles(file)
  await expect.poll(() => mine.get(`${T}/enemies/w/pv`)).not.toBeNull()
  await wolf.getByLabel('Boss art file').setInputFiles(file)
  await expect.poll(() => mine.get(`${T}/enemies/w/ba`)).not.toBeNull()
  await wolf.getByLabel('Icon file').nth(0).setInputFiles(file)
  await expect.poll(() => mine.get(`${T}/skicons/bite`)).not.toBeNull()
  await next.getByRole('button', { name: 'Abilities' }).click()
  await next.getByLabel('Custom icon image file').setInputFiles(file)
  await expect.poll(() => mine.get(`${T}/abicons/k1`)).not.toBeNull()

  // The live page, given the same picture through its own file boxes.
  const live = await ctx.newPage()
  live.on('pageerror', (e) => errors.push(e.message))
  await useFakeFirebase(live, theirs)
  await live.addInitScript(() => localStorage.setItem('st', '{"pin":"dragon42","role":"gm","me":"gm"}'))
  await live.goto(base + 'classic/')
  await expect(live.locator('#app')).toContainText('Enemies')
  for (const k of ['p:p1', 'c:p1', 'e:w', 'p:w', 'b:w']) {
    await live.evaluate(`iconFor=${JSON.stringify(k)}`)
    await live.locator('#icf').setInputFiles(file)
    await live.waitForTimeout(400)
  }
  await live.evaluate('skFor="bite"')
  await live.locator('#skf').setInputFiles(file)
  await expect.poll(() => theirs.get(`${T}/skicons/bite`)).not.toBeNull()
  await live.evaluate('view="board";last="";render();abFor="k1"') // its file box is on the board screen
  await live.locator('#abf').setInputFiles(file)
  await expect.poll(() => theirs.get(`${T}/abicons/k1`)).not.toBeNull()
  await expect.poll(() => theirs.get(`${T}/bossart/w`)).not.toBeNull()

  for (const p of ['portraits/p1', 'icons/p1', 'icons/w', 'portraits/w', 'bossart/w', 'skicons/bite', 'abicons/k1']) {
    const a = (mine.get(`${T}/${p}`) as { data: string }).data
    const b = (theirs.get(`${T}/${p}`) as { data: string }).data
    expect(a.slice(0, 30), p).toBe(b.slice(0, 30))
    expect(a.length, p).toBe(b.length)
    expect(a === b, p).toBe(true)
  }

  // "Import icons" on the board: many pictures at once, matched by file name, made the same way.
  const singles = { ab: mine.get(`${T}/abicons/k1`), sk: mine.get(`${T}/skicons/bite`) }
  mine.set(`${T}/abicons/k1`, null)
  mine.set(`${T}/skicons/bite`, null)
  await next.getByLabel('Icon files').setInputFiles([
    { ...file, name: 'Cleave.png' },
    { ...file, name: 'bite.png' },
    { ...file, name: 'Fireball.png' },
  ])
  await expect(next.getByText('2 imported; no ability named Fireball.png')).toBeVisible()
  expect(mine.get(`${T}/abicons/k1`)).toEqual(singles.ab)
  expect(mine.get(`${T}/skicons/bite`)).toEqual(singles.sk)
  expect(errors).toEqual([])
  await ctx.close()
})

test('enemy extras: combat begins with the boss intro and its battle music on every screen; the GM runs the boss turn', async ({ browser }) => {
  // A 4-second test tone as the boss theme (a WAV the browser can decode).
  const wav = wavTone(4)
  const db = new FakeDb()
  db.set('tables/dragon42', {
    meta: { dm: 'x', thv: 1 },
    themes: { aethelric: { n: 'Aethelric', data: `data:audio/wav;base64,${wav.toString('base64')}` } },
    chars: { p1: { name: 'Lyra', cls: 'fighter', hp: 140, maxHp: 140, st: 100, maxSt: 100, dex: 10, ac: 30, mx: 1, my: 1, mp: 'm', x10: true } },
    enemies: { a: { name: 'Aethelric', bt: 'The Fallen King', rk: 'u', hp: 300, max: 300, mx: 6, my: 1, mp: 'm', ib: -20, x10: true } },
    maps: { m: { name: 'Crypt', w: 500, h: 400, cols: 10, v2: 1 } },
    cur: 'm',
  })
  const errors: string[] = []
  const gmCtx = await browser.newContext({ viewport: { width: 1400, height: 1000 } })
  const plCtx = await browser.newContext({ viewport: { width: 1400, height: 1000 } })
  const gm = await gmCtx.newPage()
  const pl = await plCtx.newPage()
  for (const p of [gm, pl]) {
    p.on('pageerror', (e) => errors.push(e.message))
    await useFakeFirebase(p, db)
    // Record how long each sound that starts is (the theme is the 4-second one).
    await p.addInitScript(() => {
      const w = window as unknown as { __long: number }
      w.__long = 0
      const C = window.AudioContext
      window.AudioContext = class extends C {
        createBufferSource() {
          const s = super.createBufferSource()
          const start = s.start.bind(s)
          s.start = (...a: number[]) => {
            if (s.buffer && s.buffer.duration > 3.5) w.__long++
            return start(...(a as []))
          }
          return s
        }
      }
    })
  }
  await gm.addInitScript(() => localStorage.setItem('st', '{"pin":"dragon42","role":"gm","me":"gm"}'))
  await pl.addInitScript(() => {
    localStorage.setItem('st', '{"pin":"dragon42","role":"player","me":"p1"}')
    Math.random = () => 0.5
  })
  await gm.goto(base)
  await pl.goto(base)
  // A first tap on each screen lets sound play (and the boss theme get ready).
  await gm.getByRole('heading', { name: 'Dice' }).click()
  await pl.getByRole('heading', { name: 'Dice' }).click()

  await gm.getByRole('button', { name: 'Start initiative' }).click()
  await pl.getByLabel('Turn order').getByRole('button', { name: 'Roll' }).click()
  await gm.getByRole('button', { name: 'Roll enemies' }).click()
  await expect(gm.getByRole('button', { name: 'Begin combat' })).toBeEnabled({ timeout: 15_000 })
  await gm.getByRole('button', { name: 'Begin combat' }).click()

  // The boss intro on both screens, with the theme as battle music.
  await expect(gm.getByRole('img', { name: 'Boss: Aethelric' })).toBeVisible({ timeout: 5000 })
  await expect(gm.getByRole('img', { name: 'Boss: Aethelric' })).toContainText('The Fallen King')
  await expect(pl.getByRole('img', { name: 'Boss: Aethelric' })).toBeVisible({ timeout: 8000 })
  await expect.poll(() => gm.evaluate(() => (window as unknown as { __long: number }).__long)).toBeGreaterThan(0)
  await expect.poll(() => pl.evaluate(() => (window as unknown as { __long: number }).__long)).toBeGreaterThan(0)
  expect(db.get('tables/dragon42/enemies/a/bi')).toBe(true)

  // Lyra goes first (the boss rolled low); then the GM lets the computer run the boss's turn.
  await gm.getByRole('button', { name: 'Next turn' }).click()
  await gm.getByRole('button', { name: "Run Aethelric's turn" }).click()
  const said = () => Object.values((db.get('tables/dragon42/rolls') as object) ?? {}).flatMap((r: { ev?: string }) => (r.ev ? [r.ev] : []))
  await expect.poll(said, { timeout: 10_000 }).toContain('Aethelric advances on Lyra')
  await expect.poll(said, { timeout: 15_000 }).toContainEqual(expect.stringMatching(/^Aethelric (misses|hits) Lyra/))
  expect(db.get('tables/dragon42/enemies/a/mx')).toBe(2)
  expect(errors).toEqual([])
  await gmCtx.close()
  await plCtx.close()
})

test("the GM's test lab: test scenes and the wave here only; clips, ability sounds and boss themes saved for every screen", async ({ browser }) => {
  const wav = wavTone(1)
  const audio = (name: string) => ({ name, mimeType: 'audio/wav', buffer: wav })
  const db = new FakeDb()
  db.set('tables/dragon42', {
    meta: { dm: 'x', snd: 1, thv: 1 },
    chars: { p1: { name: 'Lyra', cls: 'fighter', hp: 30, maxHp: 30, st: 100, maxSt: 100, x10: true } },
    enemies: { w: { name: 'Wolf', hp: 20, max: 20, x10: true } },
    maps: { m: { name: 'Crypt', w: 500, h: 400, cols: 10, v2: 1 } },
    cur: 'm',
  })
  const errors: string[] = []
  const gmCtx = await browser.newContext({ viewport: { width: 1400, height: 1000 } })
  const plCtx = await browser.newContext({ viewport: { width: 1400, height: 1000 } })
  const gm = await gmCtx.newPage()
  const pl = await plCtx.newPage()
  const plRequests: string[] = []
  for (const p of [gm, pl]) p.on('pageerror', (e) => errors.push(e.message))
  await useFakeFirebase(gm, db)
  await useFakeFirebase(pl, db, plRequests)
  gm.on('dialog', (d) => void d.accept())
  await gm.addInitScript(() => localStorage.setItem('st', '{"pin":"dragon42","role":"gm","me":"gm"}'))
  await pl.addInitScript(() => localStorage.setItem('st', '{"pin":"dragon42","role":"player","me":"p1"}'))
  await gm.goto(base)
  await pl.goto(base)
  await gm.getByRole('heading', { name: 'Dice' }).click()
  await pl.getByRole('heading', { name: 'Dice' }).click()
  await expect(pl.getByRole('button', { name: 'Show test lab' })).toHaveCount(0)

  // Scenes are off on the GM's screen, yet the lab still plays one there (and only there).
  await gm.getByLabel('Attack scenes').uncheck()
  await gm.getByRole('button', { name: 'Show test lab' }).click()
  const lab = gm.getByLabel('Test lab')
  await lab.getByLabel('Attacker').selectOption({ label: 'Lyra (player)' })
  await lab.getByLabel('Target').selectOption({ label: 'Wolf (enemy)' })
  await lab.getByRole('button', { name: 'Critical hit' }).click()
  await expect(gm.getByRole('img', { name: 'Lyra attacks Wolf' })).toBeVisible()
  await lab.getByRole('button', { name: 'Golden Wave' }).click()
  await expect(gm.locator('canvas.gwave')).toHaveCount(1)
  await gm.waitForTimeout(1500)
  await expect(pl.locator('.scn')).toHaveCount(0)
  await expect(pl.locator('canvas.gwave')).toHaveCount(0)

  // A clip for the slash hit: saved, stamped, and loaded by the player's screen.
  const slot = lab.getByLabel('Slot: Slash hit')
  await expect(slot).toContainText('Slash hit: built-in')
  const upload = async (b: ReturnType<typeof gm.getByRole>, file: { name: string; mimeType: string; buffer: Buffer }) => {
    const chooser = gm.waitForEvent('filechooser')
    await b.click()
    await (await chooser).setFiles(file)
  }
  await upload(slot.getByRole('button', { name: 'Upload' }), audio('slash.wav'))
  await expect(slot).toContainText('Slash hit: custom')
  expect(db.get('tables/dragon42/sounds/slash/data')).toBe(`data:audio/wav;base64,${wav.toString('base64')}`)
  expect(db.get('tables/dragon42/meta/snd')).not.toBe(1)
  await expect.poll(() => plRequests.filter((r) => r === 'GET /tables/dragon42/sounds').length, { timeout: 10_000 }).toBeGreaterThan(1)
  // A clip that is too big is refused.
  await upload(lab.getByLabel('Slot: Parry').getByRole('button', { name: 'Upload' }), { name: 'big.wav', mimeType: 'audio/wav', buffer: Buffer.alloc(460_000) })
  await expect(gm.getByText('That clip is too big (max about 450 KB). Trim it or lower its quality first.')).toBeVisible()
  await slot.getByRole('button', { name: 'Remove' }).click()
  await expect(slot).toContainText('Slash hit: built-in')
  expect(db.get('tables/dragon42/sounds/slash')).toBeNull()

  // The audio host is out of reach here: the web import says so.
  await lab.getByRole('button', { name: 'Import base attack sounds from web' }).click()
  await expect(lab.getByText('Blocked by the browser. Use the Upload buttons.')).toBeVisible({ timeout: 10_000 })

  // Ability sound files, matched by name; then all removed.
  const chooser = gm.waitForEvent('filechooser')
  await lab.getByRole('button', { name: 'Import files' }).click()
  await (await chooser).setFiles([audio('Firebolt.mp3'), audio('mystery.mp3')])
  await expect(lab.getByText('1 imported, 1 unmatched/failed')).toBeVisible()
  expect(db.get('tables/dragon42/absnd/firebolt/data')).toBeTruthy()
  await lab.getByRole('button', { name: 'Remove all' }).click()
  await expect(lab.getByText('Removed.')).toBeVisible()
  expect(db.get('tables/dragon42/absnd')).toBeNull()

  // A boss theme: uploaded, played, removed; and one for a boss of the GM's own.
  const arachne = lab.getByLabel('Theme: Arachne')
  await upload(arachne.getByRole('button', { name: 'Upload' }), audio('arachne.wav'))
  await expect(arachne).toContainText('Arachne: theme loaded')
  expect(db.get('tables/dragon42/themes/arachne/n')).toBe('Arachne')
  await arachne.getByRole('button', { name: 'Play' }).click()
  await arachne.getByRole('button', { name: 'Remove' }).click()
  await expect(arachne).toContainText('Arachne: none')
  gm.removeAllListeners('dialog')
  gm.once('dialog', (d) => void d.accept('The Warden'))
  await upload(lab.getByRole('button', { name: 'Add another boss theme' }), audio('warden.wav'))
  await expect(lab.getByLabel('Theme: The Warden')).toContainText('The Warden: theme loaded')
  expect(db.get('tables/dragon42/themes/thewarden/n')).toBe('The Warden')
  // Opened again later, the lab lists the saved themes.
  await gm.getByRole('button', { name: 'Hide test lab' }).click()
  await gm.getByRole('button', { name: 'Show test lab' }).click()
  await expect(gm.getByLabel('Theme: The Warden')).toContainText('theme loaded')
  // The reverb slider is this device's setting.
  await gm.getByLabel('Reverb').fill('20')
  expect(await gm.evaluate(() => localStorage.getItem('rv'))).toBe('0.2')
  expect(errors).toEqual([])
  await gmCtx.close()
  await plCtx.close()
})
