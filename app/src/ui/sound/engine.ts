// The sound system, ported from the live page: every effect is synthesised with
// Web Audio (noise and tones through a compressor and a shared reverb) unless the
// GM uploaded a clip for that slot, and abilities can have their own hit sound.
// Nothing plays until the browser allows audio (the first tap or key press).
import { loudnessGain } from '../../logic/audio'
import { abilitySlug } from '../../logic/text'
import { EFFECT_KEYWORDS } from '../../data/effects'

export type SoundSettings = { on: boolean; volume: number; reverb: number }

/** What an attack scene needs to sound right (the "fx" entry in the shared list). */
export type FxEvent = { a?: string; t?: string; k?: string; k2?: string | null; o?: string; d?: number; c?: boolean; an?: string; tn?: string; l?: string; ha?: boolean }

/** Clip slots the GM can fill: [key, label]. */
export const SOUND_SLOTS: [string, string][] = [
  ['swing', 'Swing (before every attack)'],
  ['bow', 'Bow release (before an arrow)'],
  ['slash', 'Slash hit'],
  ['heavy', 'Double slash hit'],
  ['bash', 'Shield bash'],
  ['parry', 'Parry'],
  ['dodge', 'Dodge, light armor'],
  ['dodgeh', 'Dodge, heavy armor'],
  ['fire', 'Fire hit'],
  ['ice', 'Frost hit'],
  ['bolt', 'Lightning hit'],
  ['arrow', 'Arrow hit'],
  ['poison', 'Poison hit'],
  ['altar', 'Altar and Golden Wave'],
  ['boss', 'Boss intro'],
]

/** Scenes play slower than written (the live page's SS). */
export const SCENE_SLOW = 1.4

/** The element of an ability name, for the extra hit after an arrow (not bash or arrow itself). */
export function elementOf(l: unknown): string | null {
  const s = String(l ?? '')
  for (const [x, k] of EFFECT_KEYWORDS) if (k !== 'bash' && k !== 'arrow' && x.test(s)) return k
  return null
}

type NoiseOpts = { type: string; q?: number; f1: number; f2?: number; g: number; att: number }
type ToneOpts = { type?: string; f2?: number; g: number; att?: number }

type Ctx = AudioContext
export type SoundEnv = {
  /** The browser's AudioContext (missing in old browsers and tests). */
  AudioContext: (new () => Ctx) | undefined
  random: () => number
  settings: () => SoundSettings
}

export type SoundEngine = ReturnType<typeof createSoundEngine>

export function createSoundEngine(env: SoundEnv) {
  const R = env.random
  let AC: Ctx | null = null
  let NB: AudioBuffer | null = null
  let OUT: AudioNode | null = null
  let RVG: GainNode | null = null
  let REV: ConvolverNode | null = null
  const buffers = new Map<string, AudioBuffer>()
  const gains = new WeakMap<AudioBuffer, number>()

  /** The audio context, made on first use (only after a tap, or the browser keeps it silent). */
  const ac = (): Ctx | null => {
    if (!AC && env.AudioContext) {
      try {
        const c = new env.AudioContext()
        const n = Math.floor(c.sampleRate * 1.5)
        const b = c.createBuffer(1, n, c.sampleRate)
        const d = b.getChannelData(0)
        for (let i = 0; i < n; i++) d[i] = R() * 2 - 1
        NB = b
        const out = c.createDynamicsCompressor()
        out.connect(c.destination)
        OUT = out
        const cv = c.createConvolver()
        REV = cv
        const n2 = Math.floor(c.sampleRate * 3)
        const ib = c.createBuffer(2, n2, c.sampleRate)
        for (let ch = 0; ch < 2; ch++) {
          const d2 = ib.getChannelData(ch)
          let yy = 0
          for (let i = 0; i < n2; i++) {
            const q = i / n2
            const al = 0.85 * Math.pow(1 - q, 0.6) + 0.06
            yy += (R() * 2 - 1 - yy) * al // smoothed noise: a soft, dark tail
            d2[i] = yy * Math.pow(1 - q, 2.2) * (i < 400 ? i / 400 : 1) * 1.8
          }
        }
        cv.buffer = ib
        const lp = c.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = 4800
        RVG = c.createGain()
        RVG.gain.value = env.settings().reverb * 1.2
        out.connect(cv)
        cv.connect(lp)
        lp.connect(RVG)
        RVG.connect(c.destination)
        AC = c
      } catch {
        AC = null
      }
    }
    if (AC && AC.state === 'suspended') AC.resume().catch(() => {})
    return AC
  }
  /** The context when sound may play now. */
  const mg = (): Ctx | null => {
    const s = env.settings()
    return AC && s.on && s.volume > 0 && AC.state === 'running' ? AC : null
  }
  const vol = () => env.settings().volume

  const noise = (t: number, d: number, o: NoiseOpts) => {
    const c = mg()
    if (!c) return
    const T0 = c.currentTime + t
    const s0 = c.createBufferSource()
    const f = c.createBiquadFilter()
    const v = c.createGain()
    s0.buffer = NB
    s0.playbackRate.value = 0.85 + R() * 0.3
    f.type = o.type as BiquadFilterType
    f.Q.value = o.q || 1
    f.frequency.setValueAtTime(o.f1, T0)
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, T0 + d)
    v.gain.setValueAtTime(0.0001, T0)
    v.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.g * vol()), T0 + o.att)
    v.gain.exponentialRampToValueAtTime(0.0001, T0 + d)
    s0.connect(f)
    f.connect(v)
    v.connect(OUT!)
    s0.start(T0, R() * 0.2, d + 0.05)
  }
  const tone = (t: number, fr: number, d: number, o: ToneOpts) => {
    const c = mg()
    if (!c) return
    const T0 = c.currentTime + t
    const x = c.createOscillator()
    const v = c.createGain()
    x.type = (o.type || 'sine') as OscillatorType
    x.frequency.setValueAtTime(fr, T0)
    if (o.f2) x.frequency.exponentialRampToValueAtTime(o.f2, T0 + d)
    v.gain.setValueAtTime(0.0001, T0)
    v.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.g * vol()), T0 + (o.att || 0.003))
    v.gain.exponentialRampToValueAtTime(0.0001, T0 + d)
    x.connect(v)
    v.connect(OUT!)
    x.start(T0)
    x.stop(T0 + d + 0.05)
  }

  const whoosh = (t: number, h: boolean) => noise(t, h ? 0.32 : 0.24, { type: 'bandpass', f1: 500, f2: h ? 2200 : 3000, q: 0.7, g: h ? 0.4 : 0.3, att: 0.1 })
  const slice = (t: number) => {
    noise(t, 0.13, { type: 'highpass', f1: 3200, g: 0.55, att: 0.002 })
    noise(t, 0.09, { type: 'bandpass', f1: 1800, f2: 900, q: 1.2, g: 0.35, att: 0.002 })
    tone(t, 150, 0.14, { g: 0.3, f2: 60 })
  }
  const thunk = (t: number) => {
    tone(t, 120, 0.14, { g: 0.4, f2: 55 })
    noise(t, 0.08, { type: 'lowpass', f1: 900, g: 0.3, att: 0.002 })
  }
  const clang = (t: number, parry: boolean, gs?: number) => {
    const b = parry ? 1050 + R() * 120 : 700 + R() * 100
    const g = (gs || 1) * (parry ? 0.16 : 0.12)
    const dec = parry ? 0.9 : 0.45
    ;[
      [1, 1],
      [1.58, 0.7],
      [2.76, 0.8],
      [4.1, 0.5],
      [5.43, 0.45],
      [8.1, 0.3],
    ].forEach(([r, a], i) => tone(t, b * r!, dec / (1 + i * 0.3), { type: i % 2 ? 'triangle' : 'sine', g: g * a!, att: 0.001 }))
    noise(t, 0.06, { type: 'highpass', f1: 4000, g: parry ? 0.7 : 0.5, att: 0.001 })
    noise(t, 0.2, { type: 'bandpass', f1: 6000, f2: 3500, q: 4, g: parry ? 0.18 : 0.1, att: 0.004 })
    if (parry) {
      tone(Math.max(0, t - 0.02), 2400, 0.12, { type: 'sawtooth', g: 0.05, f2: 6500 })
      tone(t + 0.06, b * 2.76, 0.5, { g: 0.06, att: 0.001 })
      tone(t + 0.06, b * 1.58, 0.6, { g: 0.05, att: 0.001 })
    }
  }
  const bash = (t: number) => {
    tone(t, 100, 0.3, { g: 0.6, f2: 40 })
    noise(t, 0.12, { type: 'lowpass', f1: 1200, g: 0.45, att: 0.002 })
    clang(t, false, 0.55)
  }
  const roll = (t: number, heavy: boolean) => {
    if (heavy) {
      for (let i = 0; i < 6; i++) {
        const q = t + i * 0.07 + R() * 0.03
        noise(q, 0.07, { type: 'bandpass', f1: 2000 + R() * 2500, q: 6, g: 0.22, att: 0.002 })
        tone(q, 1500 + R() * 2500, 0.05, { type: 'square', g: 0.04 })
      }
      noise(t, 0.4, { type: 'lowpass', f1: 500, g: 0.25, att: 0.08 })
      tone(t + 0.38, 90, 0.2, { g: 0.35, f2: 50 })
    } else {
      noise(t, 0.28, { type: 'bandpass', f1: 350, f2: 900, q: 0.5, g: 0.2, att: 0.08 })
      noise(t + 0.2, 0.22, { type: 'bandpass', f1: 500, f2: 1200, q: 0.6, g: 0.15, att: 0.06 })
      tone(t + 0.38, 80, 0.15, { g: 0.25, f2: 50 })
    }
  }
  const twang = (t: number) => {
    tone(t, 300, 0.3, { type: 'triangle', g: 0.25, f2: 190 })
    noise(t, 0.1, { type: 'highpass', f1: 2500, g: 0.2, att: 0.003 })
    noise(t + 0.15, 0.2, { type: 'bandpass', f1: 2500, f2: 1500, q: 1, g: 0.15, att: 0.05 })
  }
  const cast = (t: number, k: string) => {
    if (k === 'fire') noise(t, 0.5, { type: 'lowpass', f1: 2000, f2: 500, g: 0.35, att: 0.15 })
    else if (k === 'ice') [2600, 3300, 3900].forEach((f, i) => tone(t + i * 0.06, f, 0.4, { g: 0.09 }))
    else if (k === 'bolt') tone(t, 500, 0.3, { type: 'sawtooth', g: 0.08, f2: 1500 })
    else noise(t, 0.35, { type: 'bandpass', f1: 300, f2: 1200, q: 2, g: 0.2, att: 0.12 })
  }
  const elem = (t: number, k: string) => {
    if (k === 'fire') {
      noise(t, 0.55, { type: 'lowpass', f1: 2200, f2: 600, g: 0.5, att: 0.01 })
      tone(t, 90, 0.4, { g: 0.5, f2: 40 })
      for (let i = 0; i < 6; i++) noise(t + 0.05 + R() * 0.4, 0.03, { type: 'highpass', f1: 3000, g: 0.3, att: 0.001 })
    } else if (k === 'ice') {
      noise(t, 0.1, { type: 'highpass', f1: 4500, g: 0.5, att: 0.001 })
      ;[2800, 3600, 4700, 5600].forEach((f, i) => tone(t + i * 0.03, f, 0.5, { g: 0.08 }))
      tone(t, 200, 0.2, { g: 0.3, f2: 70 })
    } else if (k === 'bolt') {
      noise(t, 0.25, { type: 'highpass', f1: 1500, g: 0.6, att: 0.001 })
      tone(t, 2200, 0.3, { type: 'sawtooth', g: 0.1, f2: 90 })
      tone(t, 70, 0.4, { g: 0.4, f2: 35 })
    } else {
      for (let i = 0; i < 5; i++) tone(t + i * 0.06, 250 + R() * 350, 0.1, { g: 0.18, f2: 500 + R() * 400 })
      noise(t, 0.35, { type: 'bandpass', f1: 3500, q: 2, g: 0.12, att: 0.05 })
    }
  }
  const bell = (t: number, f: number, g: number) =>
    [
      [1, 1, 1.6],
      [2.41, 0.45, 1],
      [3.92, 0.3, 0.6],
      [5.95, 0.15, 0.35],
    ].forEach(([r, a, d]) => tone(t, f * r!, d!, { g: g * a!, att: 0.002 }))
  const chime = () => [0, 0.16, 0.31, 0.52, 0.74, 1.05].forEach((t, i) => bell(t, [2350, 2900, 2620, 3300, 2480, 3100][i]!, 0.11 * (1 - i * 0.1)))
  const boss = () => {
    tone(0, 70, 1.6, { g: 0.5, f2: 35, att: 0.01 })
    noise(0, 1.4, { type: 'lowpass', f1: 300, f2: 80, g: 0.5, att: 0.4 })
    ;[110, 116.5, 165].forEach((f) => tone(0.1, f, 1.8, { type: 'sawtooth', g: 0.07, att: 0.25 }))
    clang(0.55, false, 0.9)
    tone(0.55, 55, 1.2, { g: 0.6, f2: 28 })
  }

  const bufGain = (b: AudioBuffer) => {
    let g = gains.get(b)
    if (g == null) {
      g = loudnessGain(Array.from({ length: b.numberOfChannels }, (_, ch) => b.getChannelData(ch)))
      gains.set(b, g)
    }
    return g
  }
  /** Plays an uploaded clip (with a touch of reverb); false when there is none. */
  const playBuf = (k: string, t: number) => {
    const c = mg()
    const b = buffers.get(k)
    if (!c || !b) return false
    const T = c.currentTime + t
    const d = b.duration
    const x = c.createBufferSource()
    const v = c.createGain()
    const w = c.createGain()
    const vl = Math.min(1, vol() * 1.4) * bufGain(b)
    const fo = Math.min(0.25, Math.max(0.03, d * 0.08))
    const fi = Math.min(0.02, d * 0.1)
    x.buffer = b
    v.gain.setValueAtTime(0.0001, T)
    v.gain.exponentialRampToValueAtTime(vl, T + fi)
    v.gain.setValueAtTime(vl, T + d - fo)
    v.gain.linearRampToValueAtTime(0.0001, T + d)
    if (d > 1.2) {
      w.gain.setValueAtTime(0.12, T)
      w.gain.linearRampToValueAtTime(0.12, T + d * 0.7)
      w.gain.linearRampToValueAtTime(vl * 1.6, T + d - fo * 0.4)
    } else w.gain.setValueAtTime(0.3, T)
    x.connect(v)
    v.connect(c.destination)
    x.connect(w)
    w.connect(REV!)
    x.start(T)
    x.stop(T + d + 0.05)
    return true
  }

  const SS = SCENE_SLOW
  /** The sounds of an attack scene: the swing or cast, then the hit, parry or dodge. */
  const sfx = (f: FxEvent) => {
    if (!mg()) return
    const k = f.k || 'slash'
    const o = f.o || 'hit'
    const k2 = k === 'arrow' ? (f.k2 === undefined ? elementOf(f.l) : f.k2) : null
    const ranged = k !== 'slash' && k !== 'heavy' && k !== 'bash'
    if (!ranged) {
      if (!playBuf('swing', 0.3 * SS)) whoosh(0.3 * SS, k === 'heavy')
    } else if (k === 'arrow') {
      if (!playBuf('bow', 0.25 * SS)) twang(0.25 * SS)
    } else cast(0.2 * SS, k)
    const abk = `ab:${abilitySlug(f.l)}`
    if (o === 'hit' && buffers.has(abk)) {
      playBuf(abk, 0.6 * SS)
      if (f.c) tone(0.62 * SS, 70, 0.45, { g: 0.45, f2: 32 })
    } else if (o === 'hit') {
      if (k === 'slash') {
        if (!playBuf('slash', 0.62 * SS)) slice(0.62 * SS)
      } else if (k === 'heavy') {
        if (!playBuf('heavy', 0.6 * SS)) {
          slice(0.6 * SS)
          slice(0.77 * SS)
        }
      } else if (k === 'bash') {
        if (!playBuf('bash', 0.62 * SS)) bash(0.62 * SS)
      } else if (k === 'arrow') {
        if (!playBuf('arrow', 0.6 * SS)) thunk(0.6 * SS)
        if (k2 && !playBuf(k2, 0.6 * SS + 0.4)) elem(0.6 * SS + 0.4, k2)
      } else if (!playBuf(k, 0.6 * SS)) elem(0.6 * SS, k)
      if (f.c) tone(0.62 * SS, 70, 0.45, { g: 0.45, f2: 32 })
    } else if (o === 'parry') {
      if (!playBuf('parry', 0.62 * SS)) clang(0.62 * SS, true)
    } else if (o === 'dodge') {
      if (!playBuf(f.ha ? 'dodgeh' : 'dodge', 0.5 * SS)) roll(0.5 * SS, !!f.ha)
    }
  }

  /** The built-in sound for a clip slot (the GM's Play button when no clip is loaded). */
  const builtIn: Record<string, () => void> = {
    swing: () => whoosh(0, false),
    bow: () => twang(0),
    slash: () => slice(0),
    heavy: () => {
      slice(0)
      slice(0.17)
    },
    bash: () => bash(0),
    parry: () => clang(0, true),
    dodge: () => roll(0, false),
    dodgeh: () => roll(0, true),
    fire: () => elem(0, 'fire'),
    ice: () => elem(0, 'ice'),
    bolt: () => elem(0, 'bolt'),
    arrow: () => thunk(0),
    poison: () => elem(0, 'poison'),
    altar: chime,
    boss,
  }

  return {
    /** Starts audio (call on a tap or key press). */
    unlock: () => ac(),
    /** True when a sound would play right now. */
    live: () => !!mg(),
    sfx,
    /** The Golden Wave's chime (or the altar clip). */
    wave: () => playBuf('altar', 0) || chime(),
    /** The boss intro sting (or the boss clip). */
    boss: () => playBuf('boss', 0) || boss(),
    /** A slot's sound: the clip, else the built-in one. */
    preview: (k: string) => {
      ac()
      if (!playBuf(k, 0)) builtIn[k]?.()
    },
    /** The volume slider's test sound. */
    volumeTest: () => {
      ac()
      slice(0)
    },
    /** Sets the reverb on this device (and plays a clang to hear it). */
    setReverb: (v: number) => {
      ac()
      if (RVG) RVG.gain.value = v * 1.2
      clang(0, false, 0.6)
    },
    /** Cinematic beat sounds. */
    cinematic: {
      thunk: () => thunk(0),
      glow: () => tone(0, 110, 3.5, { g: 0.18, f2: 230, att: 1.8 }),
      slam: () => {
        thunk(0)
        tone(0, 45, 1.6, { g: 0.6, f2: 24 })
        noise(0, 0.7, { type: 'lowpass', f1: 700, f2: 90, g: 0.5, att: 0.003 })
      },
      crack: () => {
        noise(0, 1, { type: 'highpass', f1: 2200, g: 0.28, att: 0.01 })
        for (let k = 0; k < 7; k++) tone(k * 0.08, 900 + R() * 1500, 0.12, { g: 0.12, f2: 300 })
      },
      collapse: () => {
        noise(0, 5, { type: 'lowpass', f1: 500, f2: 70, g: 0.6, att: 0.4 })
        for (let k = 0; k < 6; k++) thunk(k * 0.45)
        tone(0.2, 38, 4, { g: 0.55, f2: 22 })
      },
    },
    /** Decodes clip bytes with this device's audio (null when audio is not running yet or it fails). */
    decode: async (bytes: ArrayBuffer): Promise<AudioBuffer | null> => {
      const c = ac()
      if (!c) return null
      try {
        return await c.decodeAudioData(bytes)
      } catch {
        return null
      }
    },
    /** Sets (or with null removes) a decoded clip: a slot key, or "ab:<slug>" for an ability. */
    setClip: (k: string, b: AudioBuffer | null) => (b ? buffers.set(k, b) : buffers.delete(k)),
    hasClip: (k: string) => buffers.has(k),
    /** Drops the GM's slot clips (they changed); ability sounds stay. */
    clearSlots: () => {
      for (const k of [...buffers.keys()]) if (!k.startsWith('ab:')) buffers.delete(k)
    },
  }
}
