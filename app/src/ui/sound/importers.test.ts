import { describe, expect, it, vi } from 'vitest'
import { ABILITY_SOUNDS, BASE_SOUNDS, THEMES, themeUrl } from '../../data/audio'
import { importAbilityFiles, importAbilitySounds, importBaseSounds, importThemes, type ImportDeps } from './importers'

type Opt = { fail?: (id: string) => number | 'throw' | null; data?: string; decode?: (u: string) => unknown; audio?: boolean; save?: boolean }

function deps(o: Opt = {}) {
  const statuses: string[] = []
  const saved: unknown[][] = []
  const ok = async (...a: unknown[]) => (saved.push(a), o.save ?? true)
  const d: ImportDeps<{ b: string }> = {
    fetch: vi.fn(async (url: string) => {
      const id = url.slice(url.lastIndexOf('/') + 1, -4)
      const f = o.fail?.(id) ?? null
      if (f === 'throw') throw new Error('blocked')
      return { ok: !f, status: f || 200, blob: async () => new Blob([id]) }
    }),
    dataUrl: async (b) => o.data ?? `data:;base64,${await b.text()}`,
    decode: async (u) => (o.decode ? (o.decode(u) as { b: string } | null) : { b: u }),
    audio: () => o.audio ?? true,
    actions: {
      saveClip: (...a) => ok('clip', ...a),
      saveTheme: (...a) => ok('theme', ...a),
      saveAbilitySound: (...a) => ok('ab', ...a),
      stampSounds: (...a) => ok('stamp', ...a),
    },
    status: (t) => void statuses.push(t),
    onClip: vi.fn(),
    onTheme: vi.fn(),
    onAbility: vi.fn(),
  }
  return { d, statuses, saved }
}

describe('base attack sounds from the web', () => {
  it('saves each slot, then stamps once', async () => {
    const ids = Object.values(BASE_SOUNDS)
    const { d, statuses, saved } = deps({ fail: (id) => (id === ids[1] ? 404 : id === ids[2] ? 'throw' : null) })
    expect(await importBaseSounds(d)).toBe(ids.length - 2)
    expect(d.fetch).toHaveBeenCalledWith(themeUrl(ids[0]!))
    expect(saved[0]).toEqual(['clip', 'swing', `data:audio/mpeg;base64,${ids[0]}`, false])
    expect(saved.at(-1)).toEqual(['stamp', 'snd'])
    expect(d.onClip).toHaveBeenCalledWith('swing', `data:audio/mpeg;base64,${ids[0]}`, { b: `data:audio/mpeg;base64,${ids[0]}` })
    expect(statuses.slice(0, 3)).toEqual(['1 imported', '1 imported, 1 failed', '1 imported, 2 failed'])
    expect(statuses.at(-1)).toBe(`${ids.length - 2} imported`)
  })

  it('nothing comes: the browser blocked it', async () => {
    const { d, statuses } = deps({ decode: () => null })
    expect(await importBaseSounds(d)).toBe(0)
    expect(statuses.at(-1)).toBe('Blocked by the browser. Use the Upload buttons.')
    const s = deps({ save: false })
    expect(await importBaseSounds(s.d)).toBe(0)
  })
})

describe('the lists to import can be given', () => {
  it('base sounds, themes and ability sounds', async () => {
    const { d, saved } = deps()
    d.lists = { base: { slash: 'i1' }, themes: [{ key: 'k', name: 'K', id: 'i2' }], abilities: { firebolt: 'i3' } }
    await importBaseSounds(d)
    await importThemes(d)
    await importAbilitySounds(d)
    expect(saved.map((s) => s.slice(0, 2))).toEqual([
      ['clip', 'slash'],
      ['stamp', 'snd'],
      ['theme', 'k'],
      ['stamp', 'thv'],
      ['ab', 'firebolt'],
    ])
  })
})

describe('boss themes from the web', () => {
  it('tries each twice and lists what failed', async () => {
    let tries = 0
    const { d, statuses, saved } = deps({ fail: (id) => (id === THEMES[0]!.id ? (tries++ ? null : 503) : id === THEMES[1]!.id ? 500 : null) })
    expect(await importThemes(d)).toBe(THEMES.length - 1)
    expect(saved[0]).toEqual(['theme', 'aethelric', 'Aethelric', `data:audio/mpeg;base64,${THEMES[0]!.id}`, false])
    expect(saved.at(-1)).toEqual(['stamp', 'thv'])
    expect(d.onTheme).toHaveBeenCalledTimes(THEMES.length - 1)
    expect(statuses[1]).toBe('1 imported, 1 failed')
    expect(statuses.at(-1)).toBe(`${THEMES.length - 1} imported. Failed: ${THEMES[1]!.name}: HTTP 500`)
  })

  it('too big, not audio, not saved', async () => {
    const big = deps({ data: `data:audio/mpeg;base64,${'A'.repeat(5000001)}` })
    expect(await importThemes(big.d)).toBe(0)
    expect(big.statuses.at(-1)).toMatch(/^Nothing imported\. Failed: Aethelric: too big \(5 MB\);/)
    expect(big.d.fetch).toHaveBeenCalledTimes(THEMES.length)
    const bad = deps({ decode: () => null })
    await importThemes(bad.d)
    expect(bad.statuses.at(-1)).toContain('Aethelric: not audio')
    const ns = deps({ save: false })
    await importThemes(ns.d)
    expect(ns.statuses.at(-1)).toContain('Aethelric: not saved')
    const odd = deps({
      decode: () => {
        throw 'odd'
      },
    })
    await importThemes(odd.d)
    expect(odd.statuses.at(-1)).toContain('Aethelric: odd')
  })
})

describe('ability sounds', () => {
  const n = Object.keys(ABILITY_SOUNDS).length

  it('from the web, four at a time', async () => {
    const first = Object.values(ABILITY_SOUNDS)[0]!
    const { d, statuses, saved } = deps({ fail: (id) => (id === first ? 404 : null) })
    expect(await importAbilitySounds(d)).toBe(n - 1)
    expect(saved.filter((s) => s[0] === 'ab')).toHaveLength(n - 1)
    expect(d.onAbility).toHaveBeenCalledTimes(n - 1)
    expect(statuses.at(-1)).toBe(`${n - 1} imported, 1 failed`)
  })

  it('gives up after six failures with none imported', async () => {
    const { d, statuses } = deps({ audio: false })
    expect(await importAbilitySounds(d)).toBe(0)
    expect((d.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeLessThan(12)
    expect(statuses.at(-1)).toBe('Blocked by the browser. Use Import files instead.')
  })

  it('too big, not audio, not saved', async () => {
    for (const o of [{ data: 'data:audio/mpeg;base64,' + 'A'.repeat(300000) }, { decode: () => null }, { save: false }]) {
      const { d } = deps(o)
      expect(await importAbilitySounds(d)).toBe(0)
    }
  })

  it('files, matched by name or id', async () => {
    const { d, statuses, saved } = deps({ data: 'data:audio/mpeg;base64,AA' })
    const files = [
      { name: 'Firebolt.mp3', blob: new Blob(['x']) },
      { name: 'nope.mp3', blob: new Blob(['x']) },
      { name: `${ABILITY_SOUNDS.thorn_whip}.mp3`, blob: new Blob(['x']) },
    ]
    expect(await importAbilityFiles(d, files)).toBe(2)
    expect(saved).toEqual([
      ['ab', 'firebolt', 'data:audio/mpeg;base64,AA'],
      ['ab', 'thorn_whip', 'data:audio/mpeg;base64,AA'],
    ])
    expect(statuses).toEqual(['1 imported', '2 imported, 1 unmatched/failed', '2 imported, 1 unmatched/failed'])
    const bad = deps({ decode: () => null })
    expect(await importAbilityFiles(bad.d, files.slice(0, 1))).toBe(0)
    expect(bad.statuses.at(-1)).toBe('0 imported, 1 unmatched/failed')
  })
})
