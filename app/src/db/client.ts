// Thin typed wrapper around the Firebase Realtime Database REST API.
// It matches what the legacy page does (fetch + .json paths) so data stays
// compatible; writes and live subscriptions are added in the data-layer phase.
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
