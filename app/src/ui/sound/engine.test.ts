import { describe, expect, it, vi } from 'vitest'
import { createSoundEngine, elementOf, SOUND_SLOTS, type SoundSettings } from './engine'

/** A stand-in for Web Audio that records what was started: tones by frequency, noise, and clips. */
function fakeAudio(o: { state?: string; throws?: boolean; badDecode?: boolean } = {}) {
  const played: string[] = []
  const param = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() })
  const node = (kind: string) => {
    const n = {
      kind,
      type: '',
      buffer: null as unknown,
      gain: param(),
      frequency: param(),
      Q: param(),
      playbackRate: param(),
      connect: vi.fn(),
      start: vi.fn(() => {
        if (kind === 'osc') played.push(`tone ${n.frequency.setValueAtTime.mock.calls[0]![0]}`)
        else played.push(n.buffer && (n.buffer as { tag?: string }).tag ? `clip ${(n.buffer as { tag: string }).tag}` : 'noise')
      }),
      stop: vi.fn(),
    }
    return n
  }
  const ctxs: Ctx[] = []
  class Ctx {
    state = o.state ?? 'running'
    sampleRate = 200
    currentTime = 0
    destination = {}
    resume = vi.fn(async () => {
      await Promise.resolve()
      this.state = 'running'
    })
    constructor() {
      if (o.throws) throw new Error('no audio')
      ctxs.push(this)
    }
    createBuffer = (ch: number, n: number) => ({ numberOfChannels: ch, duration: n / 200, getChannelData: () => new Float32Array(n) })
    createDynamicsCompressor = () => node('comp')
    createConvolver = () => node('conv')
    createBiquadFilter = () => node('filter')
    createGain = () => node('gain')
    createBufferSource = () => node('src')
    createOscillator = () => node('osc')
    decodeAudioData = vi.fn(async () => {
      if (o.badDecode) throw new Error('bad')
      return clip('decoded')
    })
  }
  return { Ctor: Ctx as unknown as new () => AudioContext, played, ctxs }
}

/** A decoded clip: a tag to recognise it, a length, and some samples. */
const clip = (tag: string, duration = 0.5) => ({ tag, duration, numberOfChannels: 1, getChannelData: () => new Float32Array([0.1, -0.2, 0.05, 0.3]) }) as unknown as AudioBuffer

function setup(s: Partial<SoundSettings> = {}, o: Parameters<typeof fakeAudio>[0] = {}) {
  const a = fakeAudio(o)
  const settings: SoundSettings = { on: true, volume: 0.5, reverb: 0.5, ...s }
  const e = createSoundEngine({ AudioContext: a.Ctor, random: () => 0.5, settings: () => settings })
  return { e, a, settings }
}
const tones = (p: string[]) => p.filter((x) => x.startsWith('tone')).length
const noises = (p: string[]) => p.filter((x) => x === 'noise').length

describe('starting audio', () => {
  it('silent until unlocked; nothing without Web Audio or when it fails', () => {
    const { e, a } = setup()
    e.sfx({})
    expect(a.played).toEqual([])
    expect(e.live()).toBe(false)
    expect(e.unlock()).not.toBeNull()
    expect(e.unlock()).toBe(a.ctxs[0]) // made once
    expect(e.live()).toBe(true)
    const none = createSoundEngine({ AudioContext: undefined, random: Math.random, settings: () => ({ on: true, volume: 1, reverb: 0 }) })
    expect(none.unlock()).toBeNull()
    expect(setup({}, { throws: true }).e.unlock()).toBeNull()
  })

  it('a suspended context is resumed; sound off or volume 0 plays nothing', async () => {
    const { e, a } = setup({}, { state: 'suspended' })
    e.unlock()
    expect(a.ctxs[0]!.resume).toHaveBeenCalled()
    expect(e.live()).toBe(false)
    await vi.waitFor(() => expect(e.live()).toBe(true))
    a.ctxs[0]!.resume.mockRejectedValueOnce(new Error('no'))
    a.ctxs[0]!.state = 'suspended'
    e.unlock() // a failed resume is ignored
    a.ctxs[0]!.state = 'running'
    const off = setup({ on: false })
    off.e.unlock()
    off.e.sfx({})
    const quiet = setup({ volume: 0 })
    quiet.e.unlock()
    quiet.e.sfx({})
    expect([...off.a.played, ...quiet.a.played]).toEqual([])
  })
})

describe('attack sounds', () => {
  const run = (f: Parameters<ReturnType<typeof createSoundEngine>['sfx']>[0], clips: Record<string, AudioBuffer> = {}) => {
    const { e, a } = setup()
    e.unlock()
    for (const [k, b] of Object.entries(clips)) e.setClip(k, b)
    e.sfx(f)
    return a.played
  }

  it('melee: a swing then the hit; heavy is a double slice; bash a clang; a crit adds a low boom', () => {
    const slash = run({})
    expect(slash[0]).toBe('noise') // whoosh
    expect(tones(slash)).toBe(1)
    expect(noises(slash)).toBe(3)
    const heavy = run({ k: 'heavy' })
    expect(tones(heavy)).toBe(2)
    expect(noises(heavy)).toBe(5)
    expect(tones(run({ k: 'bash' }))).toBe(7)
    expect(run({ c: true })).toContain('tone 70')
  })

  it('ranged and magic: a bow release or a cast, then the hit (an elemental arrow adds its element)', () => {
    const arrow = run({ k: 'arrow', l: 'Fire Arrow' })
    expect(arrow.slice(0, 1)).toEqual(['tone 300']) // the twang
    expect(arrow).toContain('tone 90') // the fire burst after the thunk
    expect(run({ k: 'arrow', l: 'Fire Arrow', k2: null })).not.toContain('tone 90')
    expect(run({ k: 'arrow', k2: 'ice' })).toContain('tone 200')
    expect(run({ k: 'fire' })).toContain('tone 90')
    expect(run({ k: 'ice' })).toContain('tone 2600')
    expect(run({ k: 'bolt' })).toContain('tone 500')
    expect(tones(run({ k: 'poison' }))).toBe(5)
  })

  it('parry rings, a dodge rolls (heavier in heavy armor), a miss is just the swing', () => {
    expect(tones(run({ o: 'parry' }))).toBe(9)
    expect(run({ o: 'dodge' })).toContain('tone 80')
    expect(run({ o: 'dodge', ha: true })).toContain('tone 90')
    expect(run({ o: 'miss' })).toEqual(['noise'])
  })

  it("the GM's clips replace the built-in sounds; an ability's own sound replaces the hit", () => {
    const c = (t: string) => clip(t)
    expect(run({}, { swing: c('swing'), slash: c('slash') })).toEqual(['clip swing', 'clip slash'])
    expect(run({ k: 'heavy' }, { heavy: c('heavy') })).toContain('clip heavy')
    expect(run({ k: 'bash' }, { bash: c('bash') })).toContain('clip bash')
    expect(run({ k: 'arrow', k2: 'fire' }, { bow: c('bow'), arrow: c('arrow'), fire: c('fire') })).toEqual(['clip bow', 'clip arrow', 'clip fire'])
    expect(run({ k: 'ice' }, { ice: c('ice') })).toContain('clip ice')
    expect(run({ o: 'parry' }, { parry: c('parry') })).toContain('clip parry')
    expect(run({ o: 'dodge' }, { dodge: c('dodge') })).toContain('clip dodge')
    expect(run({ o: 'dodge', ha: true }, { dodgeh: c('dodgeh') })).toContain('clip dodgeh')
    const ab = run({ l: 'Frost Cleave (Golden)', c: true }, { 'ab:frost_cleave': c('cleave') })
    expect(ab).toContain('clip cleave')
    expect(ab).toContain('tone 70')
    expect(run({ l: 'Frost Cleave' }, { 'ab:frost_cleave': c('cleave') })).not.toContain('tone 70')
  })

  it('long clips get more reverb toward their end', () => {
    const { e, a } = setup()
    e.unlock()
    e.setClip('slash', clip('long', 2))
    e.sfx({})
    expect(a.played).toContain('clip long')
  })
})

describe('other sounds', () => {
  it('the Golden Wave chime, the boss sting, slot previews, the volume and reverb tests, cinematic beats', () => {
    const { e, a } = setup()
    e.unlock()
    e.wave()
    expect(tones(a.played)).toBe(24) // six bells of four partials
    a.played.length = 0
    e.boss()
    expect(a.played).toContain('tone 55')
    for (const [k] of SOUND_SLOTS) e.preview(k)
    e.preview('nothing')
    a.played.length = 0
    e.volumeTest()
    expect(tones(a.played)).toBe(1)
    e.setReverb(0.2)
    for (const f of Object.values(e.cinematic)) f()
    expect(a.played.length).toBeGreaterThan(20)
    e.setClip('altar', clip('altar'))
    e.setClip('boss', clip('boss'))
    a.played.length = 0
    e.wave()
    e.boss()
    e.preview('altar')
    expect(a.played).toEqual(['clip altar', 'clip boss', 'clip altar'])
  })

  it('reverb before audio starts does nothing; decoding needs audio and survives bad files', async () => {
    const { e } = setup({}, { throws: true })
    e.setReverb(0.3)
    expect(await e.decode(new ArrayBuffer(1))).toBeNull()
    const ok = setup()
    expect(await ok.e.decode(new ArrayBuffer(1))).toMatchObject({ tag: 'decoded' })
    expect(await setup({}, { badDecode: true }).e.decode(new ArrayBuffer(1))).toBeNull()
  })

  it('clips can be removed; new GM clips replace the old ones but keep ability sounds', () => {
    const { e } = setup()
    e.setClip('slash', clip('a'))
    e.setClip('ab:x', clip('b'))
    e.clearSlots()
    expect([e.hasClip('slash'), e.hasClip('ab:x')]).toEqual([false, true])
    e.setClip('ab:x', null)
    expect(e.hasClip('ab:x')).toBe(false)
  })

  it('every ability sound can be dropped at once, keeping the GM clips', () => {
    const { e } = setup()
    e.setClip('slash', clip('a'))
    e.setClip('ab:x', clip('b'))
    e.clearAbilities()
    expect([e.hasClip('slash'), e.hasClip('ab:x')]).toEqual([true, false])
  })
})

describe('elements', () => {
  it('reads the element from an ability name, never bash or arrow', () => {
    expect(elementOf('Flame Arrow')).toBe('fire')
    expect(elementOf('Shield Bash')).toBeNull()
    expect(elementOf(undefined)).toBeNull()
  })
})

describe('battle music', () => {
  function music(o: { music?: boolean; on?: boolean } = {}) {
    const a = fakeAudio()
    const timers: [() => void, number][] = []
    const cleared: unknown[] = []
    const settings = { on: o.on ?? true, volume: 0.5, reverb: 0.5, music: o.music ?? true }
    const e = createSoundEngine({
      AudioContext: a.Ctor,
      random: () => 0.5,
      settings: () => settings,
      setTimeout: (f, ms) => (timers.push([f, ms]), timers.length),
      clearTimeout: (h) => void cleared.push(h),
    })
    e.unlock()
    return { e, a, timers, cleared, settings }
  }
  const theme = clip('theme', 8)

  it('loops a theme, each pass overlapping the last, until stopped', () => {
    const { e, a, timers, cleared } = music()
    expect(e.bgStart(theme, 'w')).toBe(true)
    expect(e.bgId()).toBe('w')
    expect(a.played).toEqual(['clip theme'])
    expect(timers.map((t) => t[1])).toEqual([6000]) // 8 s minus the 2 s overlap
    for (let i = 0; i < 4; i++) timers[i]![0]()
    expect(a.played).toHaveLength(5)
    e.bgStop()
    expect(e.bgId()).toBeNull()
    expect(cleared).toHaveLength(1)
    timers[4]![0]() // a pass due after stopping does nothing
    expect(a.played).toHaveLength(5)
    e.bgStop() // already stopped
  })

  it('a new theme replaces the old; nothing without a theme, with music off (unless forced) or without sound', () => {
    const { e } = music()
    e.bgStart(theme, 'w')
    e.bgStart(theme, 'o')
    expect(e.bgId()).toBe('o')
    expect(e.bgStart(null, 'w')).toBe(false)
    const off = music({ music: false })
    expect(off.e.bgStart(theme, 'w')).toBe(false)
    expect(off.e.bgStart(theme, 'pv', true)).toBe(true)
    const quiet = music({ on: false })
    expect(quiet.e.bgStart(theme, 'w')).toBe(false)
  })

  it('a pass that comes due once sound is off does nothing; a stopped node is skipped', () => {
    const { e, a, timers, settings } = music()
    e.bgStart(theme, 'w')
    settings.on = false
    timers[0]![0]()
    expect(a.played).toHaveLength(1)
  })

  it('stopping copes with nodes that are already gone', () => {
    const { e, a } = music()
    // Nodes that throw when touched, as closed ones do.
    const make = a.ctxs[0]!.createGain
    a.ctxs[0]!.createGain = () =>
      ({
        ...make(),
        gain: {
          value: 1,
          cancelScheduledValues: () => {
            throw new Error('closed')
          },
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
        },
      }) as never
    e.bgStart(theme, 'w')
    expect(() => e.bgStop()).not.toThrow()
    expect(e.bgId()).toBeNull()
  })

  it("the theme's opening once (when battle music is off), and clips played on demand", () => {
    const { e, a } = music({ music: false })
    expect(e.playTheme(theme, 4)).toBe(true)
    expect(e.playTheme(null, 4)).toBe(false)
    expect(e.playClip('ab:x')).toBe(false)
    e.setClip('ab:x', clip('bite'))
    expect(e.playClip('ab:x')).toBe(true)
    expect(a.played).toEqual(['clip theme', 'clip bite'])
    expect(music({ on: false }).e.playTheme(theme, 4)).toBe(false)
  })

  it('the window timers by default', () => {
    vi.useFakeTimers()
    const a = fakeAudio()
    const e = createSoundEngine({ AudioContext: a.Ctor, random: () => 0.5, settings: () => ({ on: true, volume: 0.5, reverb: 0.5, music: true }) })
    e.unlock()
    e.bgStart(clip('t', 4), 'w')
    vi.advanceTimersByTime(3100)
    expect(a.played).toHaveLength(2)
    e.bgStop()
    vi.useRealTimers()
  })
})
