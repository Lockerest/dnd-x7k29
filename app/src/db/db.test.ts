import { describe, expect, it, vi } from 'vitest'
import { createDb, DbError } from './client'
import { applyStreamEvent, subscribe, type Json } from './stream'

const B = 'https://x.firebaseio.com'
const ok = (v: unknown) => new Response(JSON.stringify(v))

describe('createDb', () => {
  const setup = (reply: unknown = null, status = 200) => {
    const f = vi.fn(async (_u: string, _i?: RequestInit) => (status === 200 ? ok(reply) : new Response('', { status })))
    return { f, db: createDb('tbl', { base: B, fetch: f as unknown as typeof fetch }) }
  }
  it('reads under tables/<pin>/', async () => {
    const { f, db } = setup({ a: 1 })
    await expect(db.get('enemies')).resolves.toEqual({ a: 1 })
    expect(f.mock.calls[0]![0]).toBe(`${B}/tables/tbl/enemies.json`)
    expect(f.mock.calls[0]![1]).toEqual({ method: 'GET', body: undefined })
    expect(db.pin).toBe('tbl')
    expect(db.url('x', { a: 1 })).toBe(`${B}/tables/tbl/x.json?a=1`)
  })
  it('passes queries', async () => {
    const { f, db } = setup({})
    await db.get('rolls', { orderBy: '"$key"', limitToLast: 20 })
    expect(f.mock.calls[0]![0]).toBe(`${B}/tables/tbl/rolls.json?orderBy=%22%24key%22&limitToLast=20`)
  })
  it('lists keys with a shallow read', async () => {
    const { f, db } = setup({ a: true, b: true })
    await expect(db.keys('themes')).resolves.toEqual(['a', 'b'])
    expect(f.mock.calls[0]![0]).toBe(`${B}/tables/tbl/themes.json?shallow=true`)
    const empty = setup(null)
    await expect(empty.db.keys('themes')).resolves.toEqual([])
  })
  it('writes with the right method and JSON body', async () => {
    const { f, db } = setup({ name: '-k1' })
    await db.put('a', { x: 1 })
    await db.patch('b', { y: 2 })
    await expect(db.post('rolls', { ev: 'hi' })).resolves.toBe('-k1')
    await db.del('c')
    expect(f.mock.calls.map((c) => [c[0], c[1]?.method, c[1]?.body])).toEqual([
      [`${B}/tables/tbl/a.json`, 'PUT', '{"x":1}'],
      [`${B}/tables/tbl/b.json`, 'PATCH', '{"y":2}'],
      [`${B}/tables/tbl/rolls.json`, 'POST', '{"ev":"hi"}'],
      [`${B}/tables/tbl/c.json`, 'DELETE', undefined],
    ])
  })
  it('throws DbError on HTTP errors', async () => {
    const { db } = setup(null, 401)
    await expect(db.put('a', 1)).rejects.toBeInstanceOf(DbError)
  })
  it('uses the global fetch by default', async () => {
    const f = vi.fn(async () => ok(7))
    vi.stubGlobal('fetch', f)
    await expect(createDb('p').get('x')).resolves.toBe(7)
    vi.unstubAllGlobals()
  })
})

describe('applyStreamEvent', () => {
  const t: Json = { chars: { a: { hp: 10, st: 5 } }, cur: 'm1' }
  it('put at the root replaces everything', () => expect(applyStreamEvent(t, 'put', { path: '/', data: { x: 1 } })).toEqual({ x: 1 }))
  it('put at a path replaces that value only', () => {
    expect(applyStreamEvent(t, 'put', { path: '/chars/a/hp', data: 7 })).toEqual({ chars: { a: { hp: 7, st: 5 } }, cur: 'm1' })
    expect(t).toEqual({ chars: { a: { hp: 10, st: 5 } }, cur: 'm1' })
  })
  it('put null removes, and empty parents disappear', () => {
    expect(applyStreamEvent(t, 'put', { path: '/cur', data: null })).toEqual({ chars: { a: { hp: 10, st: 5 } } })
    expect(applyStreamEvent({ a: { b: 1 } }, 'put', { path: '/a/b', data: null })).toBeNull()
  })
  it('patch merges children, null children are removed', () =>
    expect(applyStreamEvent(t, 'patch', { path: '/chars/a', data: { hp: 3, st: null, mx: 2 } })).toEqual({ chars: { a: { hp: 3, mx: 2 } }, cur: 'm1' }))
  it('patch keys can be deep paths', () => expect(applyStreamEvent(null, 'patch', { path: '/', data: { 'a/b': 1 } })).toEqual({ a: { b: 1 } }))
  it('a patch without an object is ignored', () => expect(applyStreamEvent(t, 'patch', { path: '/x', data: 5 })).toBe(t))
  it('put into a non-object turns it into one', () => expect(applyStreamEvent({ a: 5 }, 'put', { path: '/a/b', data: 1 })).toEqual({ a: { b: 1 } }))
})

describe('subscribe', () => {
  class FakeES {
    static last: FakeES
    url: string
    closed = false
    onerror: ((e: Event) => void) | null = null
    handlers: Record<string, (e: MessageEvent) => void> = {}
    constructor(url: string) {
      this.url = url
      FakeES.last = this
    }
    addEventListener(k: string, f: (e: MessageEvent) => void) {
      this.handlers[k] = f
    }
    close() {
      this.closed = true
    }
    emit(k: string, data: string) {
      this.handlers[k]!(new MessageEvent(k, { data }))
    }
  }
  it('builds the tree from put and patch events and stops on close', () => {
    const seen: Json[] = []
    const stop = subscribe('u', (t) => seen.push(t), (u) => new FakeES(u))
    const es = FakeES.last
    expect(es.url).toBe('u')
    es.emit('put', JSON.stringify({ path: '/', data: { a: 1 } }))
    es.emit('patch', JSON.stringify({ path: '/', data: { b: 2 } }))
    es.emit('put', 'not json')
    es.onerror!(new Event('error'))
    expect(seen).toEqual([{ a: 1 }, { a: 1, b: 2 }])
    stop()
    expect(es.closed).toBe(true)
  })
  it('uses the browser EventSource by default', () => {
    const made: string[] = []
    vi.stubGlobal(
      'EventSource',
      class extends FakeES {
        constructor(u: string) {
          super(u)
          made.push(u)
        }
      },
    )
    subscribe('v', () => {})()
    expect(made).toEqual(['v'])
    vi.unstubAllGlobals()
  })
})
