// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ABILITY_SOUNDS, BASE_SOUNDS, THEMES } from '../../data/audio'
import { fakeDb } from '../../testing/fakeDb'
import { fakeEngine } from '../../testing/fakeEngine'
import { createGameStore, emptyTables } from '../../state/store'
import type { SoundEngine } from './engine'
import { useEffectsPlayer, type EffectsOptions } from './useEffects'
import { newThemeFor } from './useSoundTools'

afterEach(cleanup)
afterEach(() => vi.unstubAllGlobals())
let fetched: string[] = []
beforeEach(() => {
  fetched = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (u: string) => {
      fetched.push(u)
      return { ok: true, status: 200, blob: async () => new Blob(['abc'], { type: 'audio/mpeg' }) }
    }),
  )
})

const mem = () => {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
}
const box: { r?: ReturnType<typeof useEffectsPlayer> } = {}
function Harness(p: EffectsOptions) {
  const r = useEffectsPlayer(p)
  useEffect(() => {
    box.r = r
  })
  return <>{r.scene}</>
}
const flush = () => act(async () => void (await new Promise((r) => setTimeout(r, 0))))
const file = (n: number, name = 'a.mp3') => new File(['x'.repeat(n)], name, { type: 'audio/mpeg' })

function setup(o: { role?: 'gm' | 'player'; live?: boolean; tree?: Record<string, unknown>; db?: boolean; maps?: Record<string, unknown>; scenes?: boolean; shownMap?: string | null } = {}) {
  const f = fakeDb(o.tree ?? {})
  const store = createGameStore(
    () => (o.db === false ? null : f.db),
    () => 9,
  )
  store.getState().connect({ pin: 'p', role: o.role ?? 'gm', me: 'gm' })
  store.getState().applySnapshot({ ...emptyTables(), maps: (o.maps ?? {}) as never })
  const engine = fakeEngine(o.live ?? true)
  engine.decode.mockImplementation(async () => ({ tag: 'buf', duration: 7 }) as unknown as AudioBuffer)
  const storage = mem()
  if (o.scenes === false) storage.setItem('sc', '0')
  const props: EffectsOptions = {
    store,
    db: o.db === false ? null : f.db,
    storage,
    soundVersion: null,
    board: {},
    abilityImages: {},
    drawnIcons: false,
    picture: () => null,
    shownMap: o.shownMap === undefined ? 'm' : o.shownMap,
    cols: 10,
    engine: engine as unknown as SoundEngine,
  }
  render(<Harness {...props} />)
  return { f, store, engine }
}
const t = () => box.r!.tools

describe('clips for the sound slots', () => {
  it('upload: checked, saved, played; then removed', async () => {
    const { f, store, engine } = setup()
    await act(() => t().uploadSlot('slash', file(450001)))
    expect(store.getState().error).toBe('That clip is too big (max about 450 KB). Trim it or lower its quality first.')
    engine.decode.mockResolvedValueOnce(null as never)
    await act(() => t().uploadSlot('slash', file(10)))
    expect(store.getState().error).toBe("That file couldn't be read as audio.")
    await act(() => t().uploadSlot('slash', file(10)))
    expect(f.writes).toEqual([
      ['PUT', 'sounds/slash', { data: `data:audio/mpeg;base64,${btoa('x'.repeat(10))}` }],
      ['PATCH', 'meta', { snd: 9 }],
    ])
    expect(t().slots).toEqual(['slash'])
    expect(engine.setClip).toHaveBeenCalledWith('slash', expect.objectContaining({ tag: 'buf' }))
    expect(engine.playClip).toHaveBeenCalledWith('slash')
    await act(() => t().removeSlot('slash'))
    expect(t().slots).toEqual([])
    expect(f.writes.at(-2)).toEqual(['DELETE', 'sounds/slash', null])
    act(() => t().previewSlot('parry'))
    expect(engine.preview).toHaveBeenCalledWith('parry')
  })

  it('players cannot, and without audio it says so', async () => {
    const pl = setup({ role: 'player' })
    await act(() => t().uploadSlot('slash', file(10)))
    expect(pl.f.writes).toEqual([])
    cleanup()
    const off = setup({ live: false })
    await act(() => t().uploadSlot('slash', file(10)))
    expect(off.store.getState().error).toBe("Audio isn't available in this browser.")
    await act(() => t().importAbilityFiles([file(10, 'Firebolt.mp3')]))
    expect(off.f.writes).toEqual([])
  })

  it('a failed save keeps the slot as it was', async () => {
    const { f } = setup()
    f.db.put = async () => {
      throw new Error('offline')
    }
    await act(() => t().uploadSlot('slash', file(10)))
    expect(t().slots).toEqual([])
  })

  it('base attack sounds from the web', async () => {
    const { f } = setup()
    await act(() => t().importBase())
    expect(fetched).toHaveLength(Object.keys(BASE_SOUNDS).length)
    expect(t().slots).toEqual(Object.keys(BASE_SOUNDS))
    expect(t().status.bs).toBe(`${Object.keys(BASE_SOUNDS).length} imported`)
    expect(f.writes.at(-1)).toEqual(['PATCH', 'meta', { snd: 9 }])
  })
})

describe('ability sounds', () => {
  it('from the web and from files; each is looked for again', async () => {
    const { f, engine } = setup()
    await act(() => t().importAbilities())
    expect(t().status.ab).toMatch(/^\d+ imported$/)
    expect(engine.setClip).toHaveBeenCalledWith('ab:firebolt', null)
    const n = f.writes.length
    const fb = () => fetched.filter((u) => u.includes(ABILITY_SOUNDS.firebolt!)).length
    await act(() => box.r!.playSkillSound('Firebolt'))
    const before = fb()
    await act(() => box.r!.playSkillSound('Firebolt'))
    expect(fb()).toBe(before) // looked for once
    await act(() => t().importAbilityFiles([]))
    await act(() => t().importAbilityFiles([file(10, 'Firebolt.mp3'), file(10, 'zzz.mp3')]))
    expect(f.writes.slice(n)).toEqual([['PUT', 'absnd/firebolt', { data: `data:audio/mpeg;base64,${btoa('x'.repeat(10))}` }]])
    expect(t().status.ab).toBe('1 imported, 1 unmatched/failed')
    // After the import it is looked for again.
    await act(() => box.r!.playSkillSound('Firebolt'))
    expect(fb()).toBe(before + 1)
  })

  it('remove all, after asking', async () => {
    const { f, engine } = setup()
    const ask = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValue(true)
    await act(() => t().removeAbilities())
    expect(f.writes).toEqual([])
    await act(() => t().removeAbilities())
    expect(ask).toHaveBeenCalledWith('Remove every imported ability sound?')
    expect(f.writes).toEqual([['DELETE', 'absnd', null]])
    expect(engine.clearAbilities).toHaveBeenCalled()
    expect(t().status.ab).toBe('Removed.')
    f.db.del = async () => {
      throw new Error('offline')
    }
    engine.clearAbilities.mockClear()
    await act(() => t().removeAbilities())
    expect(engine.clearAbilities).not.toHaveBeenCalled()
  })
})

describe('boss themes', () => {
  it('lists what is saved, uploads, plays and removes', async () => {
    const { f, store, engine } = setup({ tree: { themes: { arachne: { n: 'Arachne' }, halfway: { n: 'The Warden' }, odd: {} } } })
    await act(() => t().refresh())
    expect(t().themes).toEqual({ arachne: 'Arachne', halfway: 'The Warden', odd: 'odd' })
    await act(() => t().uploadTheme('kernunos', 'Kernunos', file(700001)))
    expect(store.getState().error).toMatch(/That theme is too big/)
    await act(() => t().uploadTheme('kernunos', 'Kernunos', file(10)))
    expect(f.writes).toEqual([
      ['PUT', 'themes/kernunos', { n: 'Kernunos', data: `data:audio/mpeg;base64,${btoa('x'.repeat(10))}` }],
      ['PATCH', 'meta', { thv: 9 }],
    ])
    expect(engine.playTheme).toHaveBeenCalledWith(expect.anything(), 7)
    expect(t().themes.kernunos).toBe('Kernunos')
    // Play uses the theme just saved (no download); a second Play stops the preview.
    await act(() => t().previewTheme('kernunos'))
    expect(engine.bgStart).toHaveBeenCalledWith(expect.objectContaining({ tag: 'buf' }), 'pv', true)
    engine.bgId.mockReturnValue('pv')
    await act(() => t().previewTheme('kernunos'))
    expect(engine.bgStop).toHaveBeenCalledWith(0.5)
    engine.bgId.mockReturnValue(null)
    await act(() => t().removeTheme('kernunos'))
    expect(t().themes.kernunos).toBeUndefined()
    expect(f.writes.slice(-2)).toEqual([
      ['DELETE', 'themes/kernunos', null],
      ['PATCH', 'meta', { thv: 9 }],
    ])
    // A theme that exists nowhere plays nothing.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404 })),
    )
    engine.bgStart.mockClear()
    await act(() => t().previewTheme('kernunos'))
    expect(engine.bgStart).not.toHaveBeenCalled()
    // A failed save changes nothing here.
    f.db.put = async () => {
      throw new Error('offline')
    }
    await act(() => t().uploadTheme('xibalba', 'Xibalba', file(10)))
    expect(t().themes.xibalba).toBeUndefined()
  })

  it('all from the web', async () => {
    setup()
    await act(() => t().importThemes())
    expect(Object.keys(t().themes)).toEqual(THEMES.map((x) => x.key))
    expect(t().status.th).toBe(`${THEMES.length} imported`)
  })

  it('without a database there is nothing to list or play', async () => {
    const { engine } = setup({ db: false })
    await act(() => t().refresh())
    expect(t().themes).toEqual({})
    await act(() => t().previewTheme('arachne'))
    expect(engine.bgStart).not.toHaveBeenCalled()
    await act(() => t().removeTheme('arachne'))
    await act(() => t().uploadTheme('arachne', 'Arachne', file(10)))
    await act(() => t().importThemes())
    expect(t().themes).toEqual({})
  })

  it('a name that cannot be read shows the key', async () => {
    const { f } = setup({ tree: { themes: { halfway: { n: 'The Warden' } } } })
    f.db.get = async () => {
      throw new Error('offline')
    }
    await act(() => t().refresh())
    expect(t().themes).toEqual({ halfway: 'halfway' })
  })

  it('a failed listing shows none', async () => {
    const { f } = setup()
    f.db.keys = async () => {
      throw new Error('offline')
    }
    await act(() => t().refresh())
    expect(t().themes).toEqual({})
  })

  it('"Add another boss theme" needs a name of three letters or more', () => {
    expect(newThemeFor('  The Warden  ')).toEqual({ k: 'thewarden', n: 'The Warden' })
    expect(newThemeFor('X!')).toBeNull()
    expect(newThemeFor(null)).toBeNull()
    expect(newThemeFor('a'.repeat(50))!.n).toHaveLength(40)
  })
})

describe('the test lab', () => {
  it('plays a scene here even with scenes off', async () => {
    const { engine } = setup({ scenes: false })
    act(() => box.r!.lab.scene({ a: 't:Test Hero', t: 't:Test Dummy', k: 'slash', o: 'hit', l: 'Test' }))
    await flush()
    expect(engine.sfx).toHaveBeenCalled()
  })

  it('the Golden Wave from the middle of the map', () => {
    const { engine } = setup({ maps: { m: { w: 500, h: 300, cols: 10 } } })
    act(() => box.r!.lab.wave())
    expect(engine.wave).toHaveBeenCalled()
    cleanup()
    const s = setup({ maps: { m: {} } })
    act(() => box.r!.lab.wave())
    cleanup()
    setup({ shownMap: null })
    act(() => box.r!.lab.wave())
    expect(s.engine.wave).toHaveBeenCalled()
  })

  it('the reverb slider sets the reverb here', () => {
    const { engine } = setup()
    act(() => box.r!.lab.reverb(0.2))
    expect(engine.setReverb).toHaveBeenCalledWith(0.2)
    expect(box.r!.fx.reverb).toBe(0.2)
  })
})
