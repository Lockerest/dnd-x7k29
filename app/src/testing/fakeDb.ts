// Test helper (not shipped): a Db over an in-memory tree that records writes.
import type { Db } from '../db/client'

export function fakeDb(tree: Record<string, unknown> = {}) {
  const writes: [string, string, unknown][] = []
  const at = (path: string) => path.split('/').filter(Boolean).reduce<unknown>((n, k) => (n && typeof n === 'object' ? (n as Record<string, unknown>)[k] : undefined), tree) ?? null
  const w = async (m: string, p: string, v: unknown) => {
    writes.push([m, p, v])
    return null
  }
  const db: Db = {
    pin: 't',
    url: (p) => p,
    get: async <T,>(p: string) => at(p) as T | null,
    keys: async (p) => Object.keys((at(p) as object) || {}),
    put: (p, v) => w('PUT', p, v),
    patch: (p, v) => w('PATCH', p, v),
    post: async (p, v) => (await w('POST', p, v), '-k'),
    del: (p) => w('DELETE', p, null),
  }
  return { db, writes }
}
