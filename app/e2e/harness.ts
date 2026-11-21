// Shared harness for unit tests of the live page's game rules.
// The legacy code is one script with top-level functions and `let` state, so each
// test opens a fresh copy of the page (with Firebase and all other network calls
// faked) and calls the function under test inside it with `run`.
import { test as base, type Page } from '@playwright/test'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const LEGACY = pathToFileURL(resolve(import.meta.dirname, '../../classic/index.html')).href

export type Write = { method: string; path: string; body: unknown }

export type Legacy = {
  page: Page
  /** Evaluates a JavaScript expression in the page's global scope and returns its JSON value. */
  run: <T = unknown>(expr: string) => Promise<T>
  /** Every non-GET request the page sent to Firebase (path relative to the table). */
  writes: Write[]
  /** Uncaught page errors. Each test checks this is empty when it finishes. */
  errors: string[]
}

type Tree = { [k: string]: unknown }
const isTree = (v: unknown): v is Tree => typeof v === 'object' && v !== null && !Array.isArray(v)
/** Lists count as containers too: like Firebase, "l/0" is item 0 of a list. */
const isNode = (v: unknown): v is Tree => typeof v === 'object' && v !== null

/** A tiny in-memory Realtime Database: GET reads, PUT sets, PATCH merges, POST appends, DELETE removes. */
export class FakeDb {
  root: Tree = {}
  private keys = 0
  private parts = (path: string) => path.split('/').filter(Boolean)
  get(path: string): unknown {
    let n: unknown = this.root
    for (const p of this.parts(path)) n = isNode(n) ? n[p] : undefined
    return n === undefined ? null : n
  }
  set(path: string, v: unknown) {
    const ps = this.parts(path)
    if (!ps.length) {
      this.root = isTree(v) ? structuredClone(v) : {}
      return
    }
    let n = this.root
    for (const p of ps.slice(0, -1)) n = (isNode(n[p]) ? n[p] : (n[p] = {})) as Tree
    const last = ps[ps.length - 1]!
    if (v === null) delete n[last]
    else n[last] = structuredClone(v) // a copy, so recorded request bodies never change afterwards
  }
  apply(method: string, path: string, body: unknown): unknown {
    if (method === 'PUT') this.set(path, body)
    else if (method === 'DELETE') this.set(path, null)
    else if (method === 'PATCH' && isTree(body)) for (const [k, v] of Object.entries(body)) this.set(`${path}/${k}`, v)
    else if (method === 'POST') {
      const name = `-k${String(++this.keys).padStart(6, '0')}`
      this.set(`${path}/${name}`, body)
      return { name }
    }
    return body
  }
}

export type LegacyOptions = {
  /** Extra delay in ms for GETs whose path matches, to simulate big downloads. */
  slow?: { match: RegExp; ms: number }
}

export async function openLegacy(page: Page, opts: LegacyOptions = {}): Promise<Legacy & { db: FakeDb }> {
  const writes: Write[] = []
  const errors: string[] = []
  const db = new FakeDb()
  page.on('pageerror', (e) => errors.push(e.message))
  await page.route('**/*', (route) => {
    const req = route.request()
    const u = new URL(req.url())
    if (u.protocol === 'file:') return route.continue()
    if (!u.hostname.includes('firebaseio')) return route.abort()
    const path = u.pathname.replace(/^\/tables\/[^/]+\//, '').replace(/^\//, '').replace(/\.json$/, '')
    const method = req.method()
    if (method === 'GET') {
      const v = db.get(path)
      // ?shallow=true lists the keys only, like Firebase.
      const json = u.searchParams.get('shallow') === 'true' && isTree(v) ? Object.fromEntries(Object.keys(v).map((k) => [k, true])) : v
      if (opts.slow?.match.test(path)) return new Promise<void>((done) => setTimeout(() => done(route.fulfill({ json }).catch(() => {})), opts.slow!.ms))
      return route.fulfill({ json })
    }
    const body = JSON.parse(req.postData() || 'null') as unknown
    writes.push({ method, path, body })
    return route.fulfill({ json: db.apply(method, path, body) ?? null })
  })
  await page.goto(LEGACY)
  const run = <T,>(expr: string) => page.evaluate(expr) as Promise<T>
  return { page, run, writes, errors, db }
}

/**
 * Puts the page in GM mode on the table with the given characters and enemies.
 * The same data is put in the fake database, so the page's background refresh
 * reads it back instead of wiping it.
 */
export const gmTable = (chars: object, enemies: object) => `
  pin="tbl";role="gm";dm=true;canGM=true;me="gm";applyBoard(vocBoard());
  chars=${JSON.stringify(chars)};enemies=${JSON.stringify(enemies)};
  view="table";sel=null;last="";render();`

export const test = base.extend<{ legacy: Legacy & { db: FakeDb; table: (chars: object, enemies: object) => Promise<void> } }>({
  legacy: async ({ page }, provide) => {
    const o = await openLegacy(page)
    const l = {
      ...o,
      table: async (chars: object, enemies: object) => {
        // x10: sheets are already on the x10 scale, so the page does not migrate them.
        const x10 = (t: object) => Object.fromEntries(Object.entries(t).map(([k, v]) => [k, { x10: true, ...(v as object) }]))
        const c = x10(chars)
        const e = x10(enemies)
        o.db.set('chars', c)
        o.db.set('enemies', e)
        await o.run(gmTable(c, e))
      },
    }
    await provide(l)
    if (l.errors.length) throw new Error('Page errors: ' + l.errors.join(' | '))
  },
})

export { expect } from '@playwright/test'

/** Filters recorded writes. */
export const writesTo = (w: Write[], method: string, path: string) =>
  w.filter((x) => x.method === method && x.path === path).map((x) => x.body)
