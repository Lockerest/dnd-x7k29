// Build 63 loading fix: the table appears before the big downloads (boss themes,
// sounds, icons) finish, and the themes of bosses on the map download first.
import { expect, test } from '@playwright/test'
import { openLegacy } from '../harness.ts'

const AUDIO = 'data:audio/mpeg;base64,AAAA'
const HEAVY = /^(themes|sounds|skicons|mkicons|abicons)(\/|$)/

test('the table shows before themes and sounds finish downloading', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('st', JSON.stringify({ pin: 'tbl', role: 'gm', me: 'gm' })))
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  const themeGets: string[] = []
  page.on('request', (r) => {
    const m = new URL(r.url()).pathname.match(/\/themes\/(\w+)\.json$/)
    if (m && r.method() === 'GET') themeGets.push(m[1]!)
  })
  // Every big download takes 2 s; before build 63 the page waited for all of them.
  const l = await openLegacy(page, { slow: { match: HEAVY, ms: 2000 } })
  l.db.set('meta', { thv: 1, snd: 1, skiv: 1, mki: 1 })
  l.db.set('themes', { firstdefier: { n: 'The First Defier', data: AUDIO }, aethelric: { n: 'Aethelric', data: AUDIO } })
  l.db.set('sounds', { swing: { data: AUDIO } })
  l.db.set('skicons', { warden_s_cut: { data: 'data:image/png;base64,AAAA' } })
  l.db.set('mkicons', {})
  l.db.set('enemies', { a: { name: 'Aethelric', type: 'boss', hp: 1000, max: 1000, x10: true, mx: 2, my: 2, mp: 'm' } })
  l.db.set('chars', {})
  const t0 = Date.now()
  await page.reload()

  await expect(page.locator('body')).toContainText('Aethelric', { timeout: 1500 })
  expect(Date.now() - t0).toBeLessThan(2000)
  expect(await l.run('Object.keys(TH).length')).toBe(0)

  // Then everything arrives in the background, the placed boss's theme first.
  await expect.poll(() => l.run('Object.keys(TH).sort()'), { timeout: 12_000 }).toEqual(['aethelric', 'firstdefier'])
  expect(themeGets.slice(0, 2)).toEqual(['aethelric', 'firstdefier'])
  await expect.poll(() => l.run('[Object.keys(SD),Object.keys(BSI)]'), { timeout: 8_000 }).toEqual([['swing'], ['warden_s_cut']])
  expect(errors).toEqual([])
})

test('a theme deleted from the database is dropped on the next refresh', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('st', JSON.stringify({ pin: 'tbl', role: 'gm', me: 'gm' })))
  const l = await openLegacy(page)
  l.db.set('meta', { thv: 1 })
  l.db.set('themes', { aethelric: { n: 'Aethelric', data: AUDIO }, arachne: { n: 'Arachne', data: AUDIO } })
  await page.reload()
  await expect.poll(() => l.run('Object.keys(TH).sort()'), { timeout: 8_000 }).toEqual(['aethelric', 'arachne'])
  l.db.set('themes/arachne', null)
  l.db.set('meta/thv', 2)
  await expect.poll(() => l.run('Object.keys(TH)'), { timeout: 10_000 }).toEqual(['aethelric'])
})

test('the old "etheric" theme is renamed to "aethelric" by the GM page', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('st', JSON.stringify({ pin: 'tbl', role: 'gm', me: 'gm' })))
  const l = await openLegacy(page)
  l.db.set('meta', { thv: 1 })
  l.db.set('themes', { etheric: { n: 'Etheric', data: AUDIO } })
  await page.reload()
  await expect.poll(() => l.db.get('themes'), { timeout: 8_000 }).toEqual({ aethelric: { n: 'Aethelric', data: AUDIO } })
  await expect.poll(() => l.run('Object.keys(TH)'), { timeout: 10_000 }).toEqual(['aethelric'])
})
