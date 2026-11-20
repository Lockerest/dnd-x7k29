import { describe, expect, it, vi } from 'vitest'
import { DbError, dbGet, dbUrl } from './client'

const B = 'https://x.firebaseio.com'

describe('dbUrl', () => {
  it('builds a table path like the legacy api() helper', () => {
    expect(dbUrl('enemies', { pin: 'tbl', base: B })).toBe(`${B}/tables/tbl/enemies.json`)
  })
  it('handles the root, trailing slashes and queries', () => {
    expect(dbUrl('', { base: B + '/', query: { shallow: true } })).toBe(`${B}/.json?shallow=true`)
    expect(dbUrl('/meta/skiv/', { pin: 'a b', base: B })).toBe(`${B}/tables/a%20b/meta/skiv.json`)
  })
})

describe('dbUrl defaults', () => {
  it('uses the configured database when no base is given', () => {
    expect(dbUrl('enemies', { pin: 'p' })).toMatch(/^https:\/\/.+firebaseio\.com\/tables\/p\/enemies\.json$/)
  })
  it('encodes query keys and values', () => {
    expect(dbUrl('', { base: B, query: { orderBy: '"$key"', limitToFirst: 2 } })).toBe(
      `${B}/.json?orderBy=%22%24key%22&limitToFirst=2`,
    )
  })
})

describe('dbGet', () => {
  it('requests the built URL and returns null for empty paths', async () => {
    const f = vi.fn(async (_u: string) => new Response('null'))
    await expect(dbGet('enemies', { pin: 't' }, f as unknown as typeof fetch)).resolves.toBeNull()
    expect(f.mock.calls[0]?.[0]).toMatch(/\/tables\/t\/enemies\.json$/)
  })
  it('exposes the HTTP status on DbError', async () => {
    const f = vi.fn(async () => new Response('', { status: 503 }))
    const err = await dbGet('x', {}, f as unknown as typeof fetch).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(DbError)
    expect((err as DbError).status).toBe(503)
    expect((err as DbError).message).toBe('HTTP 503')
  })

  it('returns parsed JSON', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ a: 1 })))
    await expect(dbGet<{ a: number }>('x', {}, f as unknown as typeof fetch)).resolves.toEqual({ a: 1 })
  })
  it('throws DbError with the status on failure', async () => {
    const f = vi.fn(async () => new Response('no', { status: 401 }))
    await expect(dbGet('x', {}, f as unknown as typeof fetch)).rejects.toBeInstanceOf(DbError)
  })
})
