import { describe, expect, it, vi } from 'vitest'
import { ABILITY_SOUNDS, THEMES, themeUrl } from '../data/audio'
import type { Db } from '../db/client'
import { createAudioLoader, dataUrlBytes } from './loader'

const dataUrl = (s: string) => `data:audio/mpeg;base64,${btoa(s)}`
const text = (b: ArrayBuffer) => new TextDecoder().decode(b)

function setup(store: Record<string, unknown>, host: Record<string, string> = {}) {
  const gets: string[] = []
  const db = {
    get: vi.fn(async (p: string) => {
      gets.push(p)
      if (p === 'boom/x') throw new Error('down')
      return (store[p] as unknown) ?? null
    }),
    keys: vi.fn(async (p: string) => (p === 'themes' ? Object.keys(store).filter((k) => k.startsWith('themes/')).map((k) => k.slice(7)) : [])),
  } as unknown as Db
  const f = vi.fn(async (u: string) => (host[u] !== undefined ? new Response(host[u]) : new Response('', { status: 404 })))
  const decode = vi.fn(async (b: ArrayBuffer) => `decoded:${text(b)}`)
  return { db, f, decode, gets, loader: createAudioLoader(db, decode, f as unknown as typeof fetch) }
}

describe('dataUrlBytes', () => {
  it('decodes base64 data URLs', () => expect(text(dataUrlBytes(dataUrl('hello')))).toBe('hello'))
})

describe('audio loader', () => {
  it('lists theme keys once', async () => {
    const { loader, db } = setup({ 'themes/a': {}, 'themes/b': {} })
    expect(await loader.themeKeys()).toEqual(['a', 'b'])
    await loader.themeKeys()
    expect(db.keys).toHaveBeenCalledTimes(1)
  })
  it('a failing key list is empty', async () => {
    const { loader, db } = setup({})
    ;(db.keys as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('x'))
    expect(await loader.themeKeys()).toEqual([])
  })
  it('loads a theme from the table database once and keeps it ready', async () => {
    const { loader, gets, decode } = setup({ 'themes/aethelric': { data: dataUrl('A') } })
    const [a, b] = await Promise.all([loader.theme('aethelric'), loader.theme('aethelric')])
    expect(a).toBe('decoded:A')
    expect(b).toBe('decoded:A')
    expect(gets).toEqual(['themes/aethelric'])
    expect(decode).toHaveBeenCalledTimes(1)
    expect(loader.ready().get('aethelric')).toBe('decoded:A')
  })
  it('falls back to the audio host when the database has no copy', async () => {
    const t = THEMES[0]!
    const { loader } = setup({}, { [themeUrl(t.id)]: 'HOST' })
    expect(await loader.theme(t.key)).toBe('decoded:HOST')
  })
  it('null when it exists nowhere, and it tries again next time', async () => {
    const { loader, gets } = setup({})
    expect(await loader.theme('nope')).toBeNull()
    expect(await loader.theme('nope')).toBeNull()
    expect(gets).toEqual(['themes/nope', 'themes/nope'])
    const t = THEMES[1]!
    const missing = setup({})
    expect(await missing.loader.theme(t.key)).toBeNull() // host answered 404
  })
  it('database errors and host errors are survived', async () => {
    const t = THEMES[2]!
    const s = setup({}, { [themeUrl(t.id)]: 'H' })
    ;(s.db.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('down'))
    expect(await s.loader.theme(t.key)).toBe('decoded:H')
    const s2 = setup({})
    s2.f.mockRejectedValueOnce(new Error('offline'))
    expect(await s2.loader.theme(t.key)).toBeNull()
  })
  it('prefetches in order, one at a time', async () => {
    const { loader, gets } = setup({ 'themes/a': { data: dataUrl('1') }, 'themes/b': { data: dataUrl('2') } })
    await loader.prefetch(['b', 'a'])
    expect(gets).toEqual(['themes/b', 'themes/a'])
    expect([...loader.ready().keys()]).toEqual(['b', 'a'])
  })
  it('ability sounds: database first, then the host, cached', async () => {
    const slug = Object.keys(ABILITY_SOUNDS)[0]!
    const { loader, gets } = setup({ 'absnd/mine': { data: dataUrl('M') } }, { [themeUrl(ABILITY_SOUNDS[slug]!)]: 'S' })
    expect(await loader.abilitySound('mine')).toBe('decoded:M')
    expect(await loader.abilitySound(slug)).toBe('decoded:S')
    await loader.abilitySound(slug)
    expect(gets.filter((g) => g === `absnd/${slug}`)).toHaveLength(1)
    expect(await loader.abilitySound('unknown_skill')).toBeNull()
  })
  it('reset forgets everything', async () => {
    const { loader, gets, db } = setup({ 'themes/a': { data: dataUrl('1') } })
    await loader.theme('a')
    await loader.themeKeys()
    loader.reset()
    expect(loader.ready().size).toBe(0)
    await loader.theme('a')
    await loader.themeKeys()
    expect(gets).toEqual(['themes/a', 'themes/a'])
    expect(db.keys).toHaveBeenCalledTimes(2)
  })
  it('uses the global fetch by default', async () => {
    const t = THEMES[0]!
    vi.stubGlobal('fetch', vi.fn(async () => new Response('G')))
    const db = { get: async () => null } as unknown as Db
    expect(await createAudioLoader(db, async (b) => text(b)).theme(t.key)).toBe('G')
    vi.unstubAllGlobals()
  })
})
