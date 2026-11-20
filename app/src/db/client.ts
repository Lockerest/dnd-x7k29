// Typed wrapper around the Firebase Realtime Database REST API. It matches what
// the live page does (fetch + .json paths under tables/<pin>/), so both apps
// read and write the same data.
import { DB_URL } from '../config'

export type Query = Record<string, string | number | boolean>

/** Builds `<db>/tables/<pin>/<path>.json?<query>` (pin and path are optional). */
export function dbUrl(path = '', opts: { pin?: string; query?: Query; base?: string } = {}): string {
  const base = (opts.base ?? DB_URL).replace(/\/+$/, '')
  const parts = [opts.pin ? `tables/${encodeURIComponent(opts.pin)}` : '', path.replace(/^\/+|\/+$/g, '')]
    .filter(Boolean)
    .join('/')
  const q = opts.query
    ? '?' + Object.entries(opts.query).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')
    : ''
  return `${base}/${parts}.json${q}`
}

export class DbError extends Error {
  readonly status: number
  constructor(status: number) {
    super(`HTTP ${status}`)
    this.status = status
  }
}

/** Read-only GET. Returns the parsed JSON (null when the path is empty). */
export async function dbGet<T>(path = '', opts: { pin?: string; query?: Query } = {}, f: typeof fetch = fetch): Promise<T | null> {
  const r = await f(dbUrl(path, opts))
  if (!r.ok) throw new DbError(r.status)
  return (await r.json()) as T | null
}

export type Method = 'GET' | 'PUT' | 'PATCH' | 'POST' | 'DELETE'

/** A database client bound to one table (PIN). */
export type Db = {
  readonly pin: string
  url: (path: string, query?: Query) => string
  get: <T>(path: string, query?: Query) => Promise<T | null>
  /** Keys under a path without downloading the values (Firebase shallow read). */
  keys: (path: string) => Promise<string[]>
  put: (path: string, value: unknown) => Promise<unknown>
  patch: (path: string, value: Record<string, unknown>) => Promise<unknown>
  /** Adds a child with a generated key; returns that key. */
  post: (path: string, value: unknown) => Promise<string>
  del: (path: string) => Promise<unknown>
}

export function createDb(pin: string, opts: { base?: string; fetch?: typeof fetch } = {}): Db {
  const f = opts.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a))
  const url = (path: string, query?: Query) => dbUrl(path, { pin, query, base: opts.base })
  const send = async (method: Method, path: string, body?: unknown, query?: Query): Promise<unknown> => {
    const r = await f(url(path, query), { method, body: body === undefined ? undefined : JSON.stringify(body) })
    if (!r.ok) throw new DbError(r.status)
    return r.json()
  }
  return {
    pin,
    url,
    get: <T>(path: string, query?: Query) => send('GET', path, undefined, query) as Promise<T | null>,
    keys: async (path) => Object.keys(((await send('GET', path, undefined, { shallow: true })) as Record<string, unknown> | null) ?? {}),
    put: (path, value) => send('PUT', path, value),
    patch: (path, value) => send('PATCH', path, value),
    post: async (path, value) => ((await send('POST', path, value)) as { name: string }).name,
    del: (path) => send('DELETE', path),
  }
}
