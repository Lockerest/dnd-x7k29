// Lazy loading of boss themes and ability sounds. Nothing big is downloaded up
// front: a theme is fetched the first time it is needed (or prefetched for the
// bosses on the table), from the table's database copy, else from the audio host.
import { ABILITY_SOUNDS, THEMES, themeUrl } from '../data/audio'
import type { Db } from '../db/client'

/** Turns a data: URL (how the database stores audio) into bytes. */
export function dataUrlBytes(u: string): ArrayBuffer {
  const b64 = u.slice(u.indexOf(',') + 1)
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out.buffer
}

export type AudioLoader<T> = {
  /** Theme keys stored for this table (names only, no audio). */
  themeKeys: () => Promise<string[]>
  /** Decoded theme, or null when it exists nowhere. Each theme downloads once. */
  theme: (key: string) => Promise<T | null>
  /** Downloads these themes one after another, in order (for the bosses on the table). */
  prefetch: (keys: string[]) => Promise<void>
  /** Decoded ability sound by ability slug, or null. */
  abilitySound: (slug: string) => Promise<T | null>
  /** Forgets everything (the GM changed themes or sounds). */
  reset: () => void
  /** Themes already decoded, for synchronous lookups while playing. */
  ready: () => Map<string, T>
}

export function createAudioLoader<T>(db: Db, decode: (bytes: ArrayBuffer) => Promise<T>, f: typeof fetch = (...a) => fetch(...a)): AudioLoader<T> {
  let keys: Promise<string[]> | null = null
  let themes = new Map<string, Promise<T | null>>()
  let sounds = new Map<string, Promise<T | null>>()
  const done = new Map<string, T>()

  const fromHost = async (id: string | undefined) => {
    if (!id) return null
    const r = await f(themeUrl(id))
    return r.ok ? decode(await r.arrayBuffer()) : null
  }
  const load = async (dbPath: string, hostId: string | undefined): Promise<T | null> => {
    try {
      const d = await db.get<{ data?: string }>(dbPath)
      if (d?.data) return await decode(dataUrlBytes(d.data))
    } catch {
      // Fall through to the audio host.
    }
    try {
      return await fromHost(hostId)
    } catch {
      return null
    }
  }

  const loader: AudioLoader<T> = {
    themeKeys: () => (keys ??= db.keys('themes').catch(() => [])),
    theme: (key) => {
      let p = themes.get(key)
      if (!p) {
        p = load(`themes/${key}`, THEMES.find((t) => t.key === key)?.id).then((b) => {
          if (b) done.set(key, b)
          else themes.delete(key) // try again next time
          return b
        })
        themes.set(key, p)
      }
      return p
    },
    prefetch: async (ks) => {
      for (const k of ks) await loader.theme(k)
    },
    abilitySound: (slug) => {
      let p = sounds.get(slug)
      if (!p) {
        p = load(`absnd/${slug}`, ABILITY_SOUNDS[slug])
        sounds.set(slug, p)
      }
      return p
    },
    reset: () => {
      keys = null
      themes = new Map()
      sounds = new Map()
      done.clear()
    },
    ready: () => done,
  }
  return loader
}
